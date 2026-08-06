import type { ClientLoaderFunctionArgs, MetaFunction } from "react-router"
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  ChevronDown,
  CircleAlert,
  ExternalLink,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  RotateCcw,
  Send,
} from "lucide-react"
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useReducer,
  useRef,
} from "react"
import { Link, useLoaderData, useSearchParams } from "react-router"

import { SESSION_EXPIRED_EVENT } from "../lib/api-client"
import {
  characterPath,
  characterStoryPath,
  resolveCharacterRoute,
  resolveCharacterRouteById,
} from "../lib/character-routes"
import {
  getAccessStatus,
  invalidateAccessStatusCache,
  storyLoginUrl,
} from "../lib/session"
import {
  chooseStoryPath,
  getCurrentStoryRun,
  getStoryRunContinuity,
  getStoryWorldCharacter,
  restartStoryRun,
  sendStoryMessage,
  startStoryRun,
  type HistoricalReferenceCategory,
  type StoryRun,
  type StoryRunContinuity,
  type StoryWorldCharacterDetail,
} from "../lib/story-worlds"

import "./story-world-character.css"

type LoaderData = {
  detail: StoryWorldCharacterDetail | null
  slug: string
  error: string
}

type StoryAccessState =
  | "checking"
  | "authenticated"
  | "anonymous"
  | "expired"
  | "error"

type StoryActionKind = "start" | "choice" | "message" | "restart"

type PendingStoryExchange = {
  kind: "choice" | "message"
  content: string
}

type StoryPageState = {
  run: StoryRun | null
  continuity: StoryRunContinuity | null
  runLoading: boolean
  accessState: StoryAccessState
  pendingAction: StoryActionKind | null
  pendingExchange: PendingStoryExchange | null
  failedAction: StoryActionKind | null
  actionError: string
  message: string
}

type StoryPageAction =
  | { type: "scope-changed" }
  | { type: "access-checking" }
  | { type: "access-anonymous" }
  | { type: "run-loading" }
  | {
      type: "run-loaded"
      run: StoryRun | null
      continuity: StoryRunContinuity | null
    }
  | { type: "access-error"; message: string }
  | { type: "session-expired" }
  | {
      type: "action-started"
      kind: StoryActionKind
      optimisticContent?: string
    }
  | { type: "action-succeeded"; run: StoryRun | null }
  | { type: "action-failed"; kind: StoryActionKind; message: string }
  | { type: "message-changed"; message: string }
  | { type: "message-sent"; run: StoryRun | null }

const INITIAL_STORY_PAGE_STATE: StoryPageState = {
  run: null,
  continuity: null,
  runLoading: false,
  accessState: "checking",
  pendingAction: null,
  pendingExchange: null,
  failedAction: null,
  actionError: "",
  message: "",
}

const REFERENCE_CATEGORY_LABELS: Record<
  HistoricalReferenceCategory,
  "史实" | "剧情设定" | "待核验"
> = {
  fixed_fact: "史实",
  story_setting: "剧情设定",
  needs_verification: "待核验",
}

const REFERENCE_CATEGORIES = Object.keys(
  REFERENCE_CATEGORY_LABELS,
) as HistoricalReferenceCategory[]

function storyPageReducer(
  state: StoryPageState,
  action: StoryPageAction,
): StoryPageState {
  switch (action.type) {
    case "scope-changed":
      return {
        ...INITIAL_STORY_PAGE_STATE,
        accessState: "checking",
      }
    case "access-checking":
      return { ...state, accessState: "checking", actionError: "" }
    case "access-anonymous":
      if (state.accessState === "expired") return state
      return {
        ...state,
        run: null,
        continuity: null,
        runLoading: false,
        accessState: "anonymous",
        pendingAction: null,
        pendingExchange: null,
        failedAction: null,
        actionError: "",
        message: "",
      }
    case "run-loading":
      if (state.accessState === "expired") return state
      return {
        ...state,
        runLoading: true,
        accessState: "authenticated",
      }
    case "run-loaded":
      if (state.accessState === "expired") return state
      return {
        ...state,
        run: action.run,
        continuity: action.continuity,
        runLoading: false,
        accessState: "authenticated",
        pendingAction: null,
        pendingExchange: null,
        failedAction: null,
        actionError: "",
        message: "",
      }
    case "access-error":
      if (state.accessState === "expired") {
        return state
      }
      return {
        ...state,
        run: null,
        continuity: null,
        runLoading: false,
        accessState: "error",
        pendingExchange: null,
        actionError: action.message,
      }
    case "session-expired":
      return {
        ...state,
        run: null,
        continuity: null,
        runLoading: false,
        accessState: "expired",
        pendingAction: null,
        pendingExchange: null,
        failedAction: null,
        actionError: "",
        message: "",
      }
    case "action-started": {
      const pendingExchange = (
        (action.kind === "choice" || action.kind === "message")
        && action.optimisticContent
      )
        ? {
            kind: action.kind,
            content: action.optimisticContent,
          }
        : null
      return {
        ...state,
        pendingAction: action.kind,
        pendingExchange,
        failedAction: null,
        actionError: "",
        message: action.kind === "message" && pendingExchange
          ? ""
          : state.message,
      }
    }
    case "action-succeeded":
      if (state.accessState === "expired") return state
      return {
        ...state,
        run: action.run || state.run,
        continuity: action.run ? null : state.continuity,
        pendingAction: null,
        pendingExchange: null,
        failedAction: null,
        actionError: "",
      }
    case "action-failed":
      if (state.accessState === "expired") return state
      return {
        ...state,
        pendingAction: null,
        pendingExchange: null,
        failedAction: action.kind,
        actionError: action.message,
        message: action.kind === "message"
          && state.pendingExchange?.kind === "message"
          ? state.pendingExchange.content
          : state.message,
      }
    case "message-changed":
      if (state.accessState === "expired" || state.failedAction !== null) {
        return state
      }
      return { ...state, message: action.message }
    case "message-sent":
      if (state.accessState === "expired") return state
      return {
        ...state,
        run: action.run || state.run,
        continuity: action.run ? null : state.continuity,
        pendingAction: null,
        pendingExchange: null,
        failedAction: null,
        actionError: "",
        message: "",
      }
  }
}

/** Accept a private run only when it echoes the Story selected in the reviewed public detail. */
function storyRunInScope(run: StoryRun | null, storyId: string) {
  if (run && run.story.id !== storyId) {
    throw new Error("故事进度与当前入口不一致。")
  }
  return run
}

/** Accept continuity only when it belongs to the explicitly selected ReviewedStory. */
function storyContinuityInScope(
  continuity: StoryRunContinuity | null,
  storyId: string,
) {
  if (continuity && continuity.story_id !== storyId) {
    throw new Error("故事连续性与当前入口不一致。")
  }
  return continuity
}

export async function clientLoader({ params }: ClientLoaderFunctionArgs): Promise<LoaderData> {
  const route = resolveCharacterRoute(params.characterSlug || "")
  if (!route) {
    return { detail: null, slug: "", error: "这个角色尚未公开。" }
  }
  try {
    return {
      detail: await getStoryWorldCharacter(route.storyWorldId, route.characterId),
      slug: route.slug,
      error: "",
    }
  } catch (error) {
    return {
      detail: null,
      slug: route.slug,
      error: error instanceof Error ? error.message : "故事暂时无法打开。",
    }
  }
}

/** Use the loaded Character name to distinguish the private story page title. */
export const meta: MetaFunction<typeof clientLoader> = ({ data }) => [{
  title: data?.detail
    ? `${data.detail.character.name}的故事｜FableSpace`
    : "故事｜FableSpace",
}]

export default function CharacterStoryRoute() {
  const { detail, slug, error } = useLoaderData<typeof clientLoader>()
  const route = resolveCharacterRoute(slug)
  const [searchParams] = useSearchParams()
  const [pageState, dispatch] = useReducer(
    storyPageReducer,
    INITIAL_STORY_PAGE_STATE,
  )
  const {
    run,
    continuity,
    runLoading,
    accessState,
    pendingAction,
    pendingExchange,
    failedAction,
    actionError,
    message,
  } = pageState
  const actionInFlightRef = useRef(false)
  const actionVersionRef = useRef(0)
  const autoEntryAttemptedRef = useRef("")
  const privateLoadVersionRef = useRef(0)
  const requestedStoryValues = searchParams.getAll("storyId")
  const requestedStoryId = requestedStoryValues.length === 1
    ? requestedStoryValues[0].trim()
    : ""
  const selectedStory = detail?.stories.find(
    (story) => story.id === requestedStoryId,
  ) || null
  const requestedPlayerRoleValues = searchParams.getAll("playerRoleId")
  const playerRoleQueryIsAbsent = requestedPlayerRoleValues.length === 0
  const requestedPlayerRoleId = requestedPlayerRoleValues.length === 1
    ? requestedPlayerRoleValues[0].trim()
    : ""
  const validatedPlayerRoleId = detail?.player_roles.some(
    (playerRole) => playerRole.id === requestedPlayerRoleId,
  )
    ? requestedPlayerRoleId
    : ""
  const effectivePlayerRoleId = validatedPlayerRoleId
    || (playerRoleQueryIsAbsent && detail?.player_roles.length === 1
      ? detail.player_roles[0].id
      : "")
  const storyWorldId = route?.storyWorldId || ""
  const storyId = selectedStory?.id || ""
  const storyScopeKey = route && storyId
    ? `${route.storyWorldId}:${storyId}:${route.characterId}`
    : ""
  const autoEntryKey = storyScopeKey && effectivePlayerRoleId
    ? `${storyScopeKey}:${effectivePlayerRoleId}`
    : ""

  const loadPrivateStory = useCallback(async (forceRefresh = false) => {
    if (!detail || !route || !storyId) return
    const requestVersion = privateLoadVersionRef.current + 1
    privateLoadVersionRef.current = requestVersion
    dispatch({ type: "access-checking" })
    try {
      const access = await getAccessStatus(forceRefresh)
      if (requestVersion !== privateLoadVersionRef.current) return
      if (!access.access_allowed || !access.user) {
        dispatch({ type: "access-anonymous" })
        return
      }
      dispatch({ type: "run-loading" })
      const [currentRun, latestContinuity] = await Promise.all([
        getCurrentStoryRun(
          route.storyWorldId,
          storyId,
          route.characterId,
        ),
        getStoryRunContinuity(route.storyWorldId, storyId),
      ])
      if (requestVersion !== privateLoadVersionRef.current) return
      dispatch({
        type: "run-loaded",
        run: storyRunInScope(currentRun, storyId),
        continuity: storyContinuityInScope(latestContinuity, storyId),
      })
    } catch (reason) {
      if (requestVersion !== privateLoadVersionRef.current) return
      dispatch({
        type: "access-error",
        message: reason instanceof Error
          ? reason.message
          : "登录状态暂时无法确认。",
      })
    }
  }, [detail, route, storyId])

  useEffect(() => {
    actionVersionRef.current += 1
    actionInFlightRef.current = false
    privateLoadVersionRef.current += 1
    dispatch({ type: "scope-changed" })
    if (storyScopeKey) void loadPrivateStory()
    return () => {
      actionVersionRef.current += 1
      privateLoadVersionRef.current += 1
    }
  }, [loadPrivateStory, storyScopeKey])

  /** Runs one non-message write and returns its completion promise while failed writes remain frozen. */
  const runAction = useCallback(async (
    kind: Exclude<StoryActionKind, "message">,
    action: () => Promise<StoryRun | null>,
    optimisticContent = "",
  ) => {
    if (
      actionInFlightRef.current
      || failedAction !== null
      || !storyId
    ) return
    const actionVersion = actionVersionRef.current + 1
    actionVersionRef.current = actionVersion
    actionInFlightRef.current = true
    dispatch({ type: "action-started", kind, optimisticContent })
    try {
      const nextRun = storyRunInScope(await action(), storyId)
      if (actionVersion !== actionVersionRef.current) return
      dispatch({ type: "action-succeeded", run: nextRun })
    } catch (reason) {
      if (actionVersion !== actionVersionRef.current) return
      dispatch({
        type: "action-failed",
        kind,
        message: reason instanceof Error
          ? reason.message
          : "这一步暂时没有完成。",
      })
    } finally {
      if (actionVersion === actionVersionRef.current) {
        actionInFlightRef.current = false
      }
    }
  }, [failedAction, storyId])

  /** Starts the routed Character with the validated PlayerRole and returns the guarded write promise. */
  const startCurrentRole = useCallback(() => {
    if (!route || !storyId || !effectivePlayerRoleId || !autoEntryKey) return
    autoEntryAttemptedRef.current = autoEntryKey
    return runAction(
      "start",
      () => startStoryRun(
        route.storyWorldId,
        storyId,
        route.characterId,
        effectivePlayerRoleId,
      ),
    )
  }, [autoEntryKey, effectivePlayerRoleId, route, runAction, storyId])

  /** Explicitly replace a stale active run after the player sees the content-change gate. */
  const restartStaleRun = useCallback(() => {
    if (!route || !storyId || !effectivePlayerRoleId) return
    return runAction(
      "restart",
      () => restartStoryRun(
        route.storyWorldId,
        storyId,
        route.characterId,
        effectivePlayerRoleId,
      ),
    )
  }, [effectivePlayerRoleId, route, runAction, storyId])

  const hasStaleActiveRun = continuity?.status === "active"
    && !continuity.can_resume

  useEffect(() => {
    if (
      accessState !== "authenticated"
      || run
      || runLoading
      || hasStaleActiveRun
      || pendingAction !== null
      || failedAction !== null
      || !autoEntryKey
      || autoEntryAttemptedRef.current === autoEntryKey
    ) {
      return
    }
    void startCurrentRole()
  }, [
    accessState,
    autoEntryKey,
    failedAction,
    hasStaleActiveRun,
    pendingAction,
    run,
    runLoading,
    startCurrentRole,
  ])

  useEffect(() => {
    const handleSessionExpired = () => {
      actionInFlightRef.current = false
      actionVersionRef.current += 1
      privateLoadVersionRef.current += 1
      invalidateAccessStatusCache()
      dispatch({ type: "session-expired" })
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  }, [])

  if (!detail || !route) {
    return (
      <main className="annieStoryShell annieStoryCentered">
        <p className="annieStoryEyebrow">FableSpace</p>
        <h1>没有找到这段故事</h1>
        <p>{error || "这个角色尚未公开。"}</p>
        <Link className="annieStoryPrimaryButton" to="/">返回角色</Link>
      </main>
    )
  }

  const loginHref = storyLoginUrl(
    selectedStory
      ? characterStoryPath(
          route.slug,
          selectedStory.id,
          effectivePlayerRoleId,
        )
      : characterPath(route.slug),
  )

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = message.trim()
    if (
      !run
      || !storyId
      || !content
      || actionInFlightRef.current
      || failedAction !== null
    ) return
    const actionVersion = actionVersionRef.current + 1
    actionVersionRef.current = actionVersion
    actionInFlightRef.current = true
    dispatch({
      type: "action-started",
      kind: "message",
      optimisticContent: content,
    })
    void sendStoryMessage(
      storyWorldId,
      storyId,
      run.id,
      route.characterId,
      content,
    )
      .then((nextRun) => {
        if (actionVersion !== actionVersionRef.current) return
        dispatch({
          type: "message-sent",
          run: storyRunInScope(nextRun, storyId),
        })
      })
      .catch((reason) => {
        if (actionVersion !== actionVersionRef.current) return
        dispatch({
          type: "action-failed",
          kind: "message",
          message: reason instanceof Error
            ? reason.message
            : `${detail.character.name}暂时没有回应。`,
        })
      })
      .finally(() => {
        if (actionVersion === actionVersionRef.current) {
          actionInFlightRef.current = false
        }
      })
  }

  return (
    <main
      className="annieStoryShell annieStoryShell--chat"
      data-story-theme={route.theme}
    >
      <CharacterStoryHeader
        characterName={detail.character.name}
        characterSlug={route.slug}
      />

      {!run ? (
        <StoryConversationGate
          detail={detail}
          accessState={accessState}
          runLoading={runLoading}
          pendingAction={pendingAction}
          failedAction={failedAction}
          actionError={actionError}
          hasStory={Boolean(selectedStory)}
          hasPlayerRole={Boolean(effectivePlayerRoleId)}
          hasStaleActiveRun={hasStaleActiveRun}
          entryAttempted={autoEntryAttemptedRef.current === autoEntryKey}
          loginHref={loginHref}
          characterHref={characterPath(route.slug)}
          onRetry={() => void loadPrivateStory(true)}
          onStart={() => void startCurrentRole()}
          onRestartStale={() => void restartStaleRun()}
        />
      ) : null}

      {run ? (
        <StoryRunWorkspace
          detail={detail}
          run={run}
          pendingAction={pendingAction}
          pendingExchange={pendingExchange}
          failedAction={failedAction}
          actionError={actionError}
          message={message}
          onChoose={(choiceId, choiceLabel) => void runAction(
            "choice",
            () => chooseStoryPath(
              storyWorldId,
              storyId,
              run.id,
              route.characterId,
              choiceId,
            ),
            choiceLabel,
          )}
          onMessageChange={(nextMessage) => dispatch({
            type: "message-changed",
            message: nextMessage,
          })}
          onSubmitMessage={submitMessage}
          onRestart={() => void runAction(
            "restart",
            () => restartStoryRun(
              storyWorldId,
              storyId,
              route.characterId,
              run.player_role.id,
            ),
          )}
          onReload={() => void loadPrivateStory(true)}
        />
      ) : null}

    </main>
  )
}

/** Renders the canonical story header back to the current Character detail page. */
function CharacterStoryHeader({
  characterName,
  characterSlug,
}: {
  characterName: string
  characterSlug: string
}) {
  return (
    <header className="annieStoryHeader">
      <Link to={characterPath(characterSlug)} aria-label={`返回${characterName}的人物页`}>
        <ArrowLeft aria-hidden="true" />
      </Link>
      <span>FableSpace</span>
      <small>{characterName}</small>
    </header>
  )
}

/** Returns access and recovery UI for the supplied Character; retry remains a read-only reconciliation. */
function StoryConversationGate({
  detail,
  accessState,
  runLoading,
  pendingAction,
  failedAction,
  actionError,
  hasStory,
  hasPlayerRole,
  hasStaleActiveRun,
  entryAttempted,
  loginHref,
  characterHref,
  onRetry,
  onStart,
  onRestartStale,
}: {
  detail: StoryWorldCharacterDetail
  accessState: StoryAccessState
  runLoading: boolean
  pendingAction: StoryActionKind | null
  failedAction: StoryActionKind | null
  actionError: string
  hasStory: boolean
  hasPlayerRole: boolean
  hasStaleActiveRun: boolean
  entryAttempted: boolean
  loginHref: string
  characterHref: string
  onRetry: () => void
  onStart: () => void
  onRestartStale: () => void
}) {
  return (
    <section
      className="annieStoryConversationGate"
      aria-label={`${detail.character.name}的对话`}
    >
      <CharacterConversationHeader detail={detail} />
      <div className="annieStoryConversationState" aria-live="polite">
        {!hasStory ? (
          <>
            <CircleAlert aria-hidden="true" />
            <p>先在角色页选择故事。</p>
            <Link className="annieStoryPrimaryButton" to={characterHref}>
              选择故事
            </Link>
          </>
        ) : null}
        {hasStory && accessState === "checking" ? (
          <>
            <LoaderCircle aria-hidden="true" />
            <p>正在连接{detail.character.name}…</p>
          </>
        ) : null}
        {hasStory && runLoading ? (
          <>
            <LoaderCircle aria-hidden="true" />
            <p>正在恢复对话…</p>
          </>
        ) : null}
        {hasStory && pendingAction === "start" ? (
          <>
            <LoaderCircle aria-hidden="true" />
            <p>正在打开对话…</p>
          </>
        ) : null}
        {hasStory && pendingAction === "restart" && !runLoading ? (
          <>
            <LoaderCircle aria-hidden="true" />
            <p>正在按新版内容重新开始…</p>
          </>
        ) : null}
        {hasStory && accessState === "anonymous" ? (
          <>
            <LockKeyhole aria-hidden="true" />
            <p>登录后继续与{detail.character.name}对话。</p>
            <a className="annieStoryPrimaryButton" href={loginHref}>
              <LogIn aria-hidden="true" />
              前往平行线登录
            </a>
          </>
        ) : null}
        {hasStory && accessState === "expired" ? (
          <>
            <CircleAlert aria-hidden="true" />
            <p>登录已过期。</p>
            <a className="annieStoryPrimaryButton" href={loginHref}>
              <LogIn aria-hidden="true" />
              重新前往平行线登录
            </a>
          </>
        ) : null}
        {hasStory && accessState === "error" ? (
          <>
            <CircleAlert aria-hidden="true" />
            <p>{actionError || "暂时连不上对话。"}</p>
            <button
              className="annieStoryPrimaryButton"
              type="button"
              onClick={onRetry}
            >
              重新连接
            </button>
          </>
        ) : null}
        {hasStory && accessState === "authenticated"
          && !runLoading
          && pendingAction === null
          && !hasPlayerRole ? (
            <>
              <CircleAlert aria-hidden="true" />
              <p>先在角色页选择本轮身份。</p>
              <Link className="annieStoryPrimaryButton" to={characterHref}>
                选择身份
              </Link>
            </>
          ) : null}
        {hasStory && accessState === "authenticated"
          && failedAction === "start" ? (
            <>
              <CircleAlert aria-hidden="true" />
              <p>{actionError || "对话暂时没有打开。"}</p>
              <button
                className="annieStoryPrimaryButton"
                type="button"
                onClick={onRetry}
              >
                重新载入
              </button>
            </>
        ) : null}
        {hasStory && accessState === "authenticated"
          && hasStaleActiveRun
          && failedAction === "restart" ? (
            <>
              <CircleAlert aria-hidden="true" />
              <p>{actionError || "新版故事暂时没有打开。"}</p>
              <button
                className="annieStoryPrimaryButton"
                type="button"
                onClick={onRetry}
              >
                重新载入
              </button>
            </>
          ) : null}
        {hasStory && accessState === "authenticated"
          && hasStaleActiveRun
          && !runLoading
          && pendingAction === null
          && failedAction === null
          && hasPlayerRole ? (
            <>
              <CircleAlert aria-hidden="true" />
              <p>故事内容已更新，旧轮次不能直接续接。确认后会按当前身份从新版起点重新开始。</p>
              <button
                className="annieStoryPrimaryButton"
                type="button"
                onClick={onRestartStale}
              >
                <RotateCcw aria-hidden="true" />
                按新版重新开始
              </button>
            </>
          ) : null}
        {hasStory && accessState === "authenticated"
          && !runLoading
          && pendingAction === null
          && failedAction === null
          && hasPlayerRole
          && !hasStaleActiveRun
          && entryAttempted ? (
            <>
              <p>可以重新尝试打开对话。</p>
              <button
                className="annieStoryPrimaryButton"
                type="button"
                onClick={onStart}
              >
                开始对话
              </button>
            </>
          ) : null}
        {hasStory && accessState === "authenticated"
          && !runLoading
          && pendingAction === null
          && failedAction === null
          && hasPlayerRole
          && !hasStaleActiveRun
          && !entryAttempted ? (
            <>
              <LoaderCircle aria-hidden="true" />
              <p>正在打开对话…</p>
            </>
          ) : null}
      </div>
    </section>
  )
}

/** Returns a compact identity-only header for the supplied Character. */
function CharacterConversationHeader({
  detail,
}: {
  detail: StoryWorldCharacterDetail
}) {
  const portrait = detail.character.portrait_url
    || resolveCharacterRouteById(detail.character.id)?.portrait

  return (
    <div className="annieStoryConversationHeader">
      {portrait ? (
        <img src={portrait} alt="" />
      ) : (
        <span className="annieStoryConversationMonogram" aria-hidden="true">
          {detail.character.name.slice(0, 1)}
        </span>
      )}
      <strong>{detail.character.name}</strong>
    </div>
  )
}

function StoryRunWorkspace({
  detail,
  run,
  pendingAction,
  pendingExchange,
  failedAction,
  actionError,
  message,
  onChoose,
  onMessageChange,
  onSubmitMessage,
  onRestart,
  onReload,
}: {
  detail: StoryWorldCharacterDetail
  run: StoryRun
  pendingAction: StoryActionKind | null
  pendingExchange: PendingStoryExchange | null
  failedAction: StoryActionKind | null
  actionError: string
  message: string
  onChoose: (choiceId: string, choiceLabel: string) => void
  onMessageChange: (message: string) => void
  onSubmitMessage: (event: FormEvent<HTMLFormElement>) => void
  onRestart: () => void
  onReload: () => void
}) {
  const pending = pendingAction !== null
  return (
    <div className="annieStoryWorkspace">
      <section
        className="annieStoryRun"
        data-status={run.status}
        aria-label={`${detail.character.name}的故事`}
      >
        {run.status === "active" ? (
          <CharacterConversationHeader detail={detail} />
        ) : null}

        <StoryTimeline
          detail={detail}
          run={run}
          pending={pending}
          pendingExchange={pendingExchange}
        />

        {run.status === "active" && run.next_character ? (
          <NextCharacterAction detail={detail} run={run} />
        ) : null}

        {run.status === "active" ? (
          <StoryActions
            characterName={detail.character.name}
            run={run}
            pendingAction={pendingAction}
            failedAction={failedAction}
            actionError={actionError}
            message={message}
            onChoose={onChoose}
            onMessageChange={onMessageChange}
            onSubmitMessage={onSubmitMessage}
            onReload={onReload}
          />
        ) : run.ending ? (
          <div className="annieStoryEnding">
            <p className="annieStoryEyebrow">本轮结局</p>
            <h2>{run.ending.title}</h2>
            <p>{run.ending.summary}</p>
            {actionError ? (
              <p className="annieStoryEndingError" role="alert">
                {actionError} 本轮仍然保留，可以再次尝试。
              </p>
            ) : null}
            <button
              className="annieStoryPrimaryButton"
              type="button"
              disabled={pending}
              onClick={onRestart}
            >
              <RotateCcw aria-hidden="true" />
              <span>{pending ? "正在回到故事起点……" : "重新开始"}</span>
            </button>
          </div>
        ) : null}
      </section>

      <StoryReferenceRail reference={run.historical_reference} />
    </div>
  )
}

/** Render a reviewed cross-Character transition as an explicit player action. */
function NextCharacterAction({
  detail,
  run,
}: {
  detail: StoryWorldCharacterDetail
  run: StoryRun
}) {
  const target = run.next_character
  const targetRoute = target ? resolveCharacterRouteById(target.id) : null
  if (
    !target
    || !targetRoute
    || targetRoute.storyWorldId !== detail.story_world.id
  ) return null

  return (
    <div className="annieStoryNextCharacter">
      <Link
        to={characterStoryPath(
          targetRoute.slug,
          run.story.id,
          run.player_role.id,
        )}
      >
        前往{target.name}
        <ArrowRight aria-hidden="true" />
      </Link>
    </div>
  )
}

function StoryTimeline({
  detail,
  run,
  pending,
  pendingExchange,
}: {
  detail: StoryWorldCharacterDetail
  run: StoryRun
  pending: boolean
  pendingExchange: PendingStoryExchange | null
}) {
  const timelineRef = useRef<HTMLDivElement>(null)
  const latestEventId = run.events[run.events.length - 1]?.id
  const pendingExchangeKey = pendingExchange
    ? `${pendingExchange.kind}:${pendingExchange.content}`
    : ""
  const storyEvents = run.events.filter(
    (event) => event.type !== "relationship_changed",
  )
  const currentNodeNarrationId = storyEvents.some(
    (event) => event.type === "choice",
  )
    ? [...storyEvents].reverse().find((event) => (
        event.type === "narration"
        && event.content === run.current_node.narration
      ))?.id
    : undefined
  const timelineEvents = storyEvents.filter(
    (event, eventIndex) => (
      event.type !== "narration"
      || event.character_id !== null
      || storyEvents[eventIndex - 1]?.type === "choice"
      || event.id === currentNodeNarrationId
    ),
  )

  useEffect(() => {
    const timeline = timelineRef.current
    if (!timeline) return
    timeline.scrollTo({ top: timeline.scrollHeight, behavior: "auto" })
  }, [latestEventId, pendingExchangeKey, run.current_node.id])

  return (
    <div
      ref={timelineRef}
      className="annieStoryTimeline"
      aria-busy={pending}
      aria-live="polite"
    >
      {timelineEvents.map((event) => {
        const messageEvent = event.type === "message"
        const choiceEvent = event.type === "choice"
        const narrationEvent = event.type === "narration"
        const currentNodePresentation = narrationEvent
          && event.id === currentNodeNarrationId
          ? run.current_node.presentation_kind
          : null
        const characterPresentation = currentNodePresentation === "character"
        const actionPresentation = currentNodePresentation === "action"
        const characterEvent = event.role === "character" || characterPresentation
        const playerMessageEvent = event.role === "player" && !choiceEvent
        const eventCharacterId = characterPresentation
          ? run.current_node.character_id
          : event.character_id
        const eventCharacter = eventCharacterId
          ? detail.characters.find(
              (character) => character.id === eventCharacterId,
            )
          : detail.character
        const eventCharacterRoute = resolveCharacterRouteById(
          eventCharacter?.id || detail.character.id,
        )
        const eventPortrait = eventCharacter?.portrait_url
          || eventCharacterRoute?.portrait
          || ""
        const eventCharacterName = event.character_name
          || eventCharacter?.name
          || detail.character.name
        let eventTone: string = event.role || event.type
        let eventLabel = messageEvent ? "故事" : "此刻"
        if (choiceEvent) {
          eventTone = "choice"
          eventLabel = "你的选择"
        } else if (actionPresentation) {
          eventTone = "action"
          eventLabel = "行动结果"
        } else if (narrationEvent) {
          eventTone = characterPresentation ? "character" : "narration"
          eventLabel = characterPresentation ? eventCharacterName : "此刻"
        } else if (characterEvent) {
          eventTone = "character"
          eventLabel = eventCharacterName
        } else if (playerMessageEvent) {
          eventTone = "player"
          eventLabel = "你"
        }
        return (
          <article
            key={event.id}
            className={[
              "annieStoryEvent",
              `annieStoryEvent--${eventTone}`,
            ].filter(Boolean).join(" ")}
          >
            {characterEvent && eventPortrait ? (
              <img
                className="annieStoryEventAvatar"
                src={eventPortrait}
                alt=""
                loading="lazy"
              />
            ) : null}
            <div className="annieStoryEventBody">
              <span>{eventLabel}</span>
              <p>{event.content}</p>
            </div>
          </article>
        )
      })}
      {pendingExchange ? (
        <>
          <article
            className={[
              "annieStoryEvent",
              pendingExchange.kind === "choice"
                ? "annieStoryEvent--choice"
                : "annieStoryEvent--player",
              "annieStoryEvent--pending",
            ].join(" ")}
          >
            <div className="annieStoryEventBody">
              <span>{pendingExchange.kind === "choice" ? "你的选择" : "你"}</span>
              <p>{pendingExchange.content}</p>
            </div>
          </article>
          <article className="annieStoryEvent annieStoryEvent--character annieStoryEvent--typing">
            {detail.character.portrait_url
              || resolveCharacterRouteById(detail.character.id)?.portrait ? (
                <img
                  className="annieStoryEventAvatar"
                  src={
                    detail.character.portrait_url
                    || resolveCharacterRouteById(detail.character.id)?.portrait
                  }
                  alt=""
                />
              ) : null}
            <div className="annieStoryEventBody">
              <span>{detail.character.name}</span>
              <p>
                <LoaderCircle aria-hidden="true" />
                正在回应…
              </p>
            </div>
          </article>
        </>
      ) : null}
    </div>
  )
}

function StoryActions({
  characterName,
  run,
  pendingAction,
  failedAction,
  actionError,
  message,
  onChoose,
  onMessageChange,
  onSubmitMessage,
  onReload,
}: {
  characterName: string
  run: StoryRun
  pendingAction: StoryActionKind | null
  failedAction: StoryActionKind | null
  actionError: string
  message: string
  onChoose: (choiceId: string, choiceLabel: string) => void
  onMessageChange: (message: string) => void
  onSubmitMessage: (event: FormEvent<HTMLFormElement>) => void
  onReload: () => void
}) {
  const pending = pendingAction !== null
  const writeDisabled = pending || failedAction !== null

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter"
      && !event.shiftKey
      && !event.nativeEvent.isComposing
      && !writeDisabled
      && message.trim()
    ) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  return (
    <div
      className="annieStoryActionsPanel"
      aria-busy={pending}
      data-recovery-required={failedAction !== null ? "true" : undefined}
    >
      {actionError ? (
        <div className="annieStoryActionError" id="annie-story-action-error" role="alert">
          <CircleAlert aria-hidden="true" />
          <div className="annieStoryActionErrorBody">
            <strong>{actionError}</strong>
            <button
              className="annieStoryRecoveryButton"
              type="button"
              onClick={onReload}
            >
              重新载入
            </button>
          </div>
        </div>
      ) : null}
      <div className="annieStoryChoices" aria-label="快捷选择">
        {run.current_node.choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            disabled={writeDisabled}
            onClick={() => onChoose(choice.id, choice.label)}
          >
            {choice.label}
          </button>
        ))}
      </div>
      <form className="annieStoryMessageForm" onSubmit={onSubmitMessage}>
        <label className="annieStoryVisuallyHidden" htmlFor="annie-story-message">
          对{characterName}说
        </label>
        <div>
          <textarea
            id="annie-story-message"
            value={message}
            maxLength={1000}
            rows={1}
            enterKeyHint="send"
            disabled={writeDisabled}
            aria-describedby={actionError ? "annie-story-action-error" : undefined}
            onChange={(event) => onMessageChange(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder={`对${characterName}说…`}
          />
          <button
            type="submit"
            disabled={writeDisabled || !message.trim()}
            aria-label="发送回应"
          >
            <Send aria-hidden="true" />
            <span className="annieStoryVisuallyHidden">发送</span>
          </button>
        </div>
      </form>
    </div>
  )
}

function StoryReferenceRail({
  reference,
}: {
  reference: StoryRun["historical_reference"]
}) {
  return (
    <aside className="annieStoryReferenceRail" aria-label="相关资料">
      <HistoricalReferencePanel reference={reference} />
    </aside>
  )
}

function HistoricalReferencePanel({
  reference,
}: {
  reference: StoryRun["historical_reference"]
}) {
  const containsHistoricalFact = reference.entries.some(
    (entry) => entry.category === "fixed_fact",
  )
  const categoryCounts = new Map<HistoricalReferenceCategory, number>(
    REFERENCE_CATEGORIES.map((category) => [category, 0]),
  )
  for (const entry of reference.entries) {
    categoryCounts.set(entry.category, (categoryCounts.get(entry.category) || 0) + 1)
  }

  return (
    <details className="annieStoryReferences">
      <summary>
        <span className="annieStoryReferenceSummaryIcon">
          <BookOpenText aria-hidden="true" />
        </span>
        <span>
          <strong>{containsHistoricalFact ? "史料参考" : "设定参考"}</strong>
          <small>
            已解锁 {reference.unlocked_count} / {reference.total_count}
          </small>
        </span>
        <ChevronDown className="annieStoryReferenceChevron" aria-hidden="true" />
      </summary>
      <div className="annieStoryReferenceBody">
        <p className="annieStoryReferenceNote">
          内容与分类来自审核注册表。
        </p>
        <ul className="annieStoryReferenceLegend" aria-label="参考内容分类">
          {REFERENCE_CATEGORIES.map((category) => (
            <li key={category} data-category={category}>
              <span>{REFERENCE_CATEGORY_LABELS[category]}</span>
              <strong>{categoryCounts.get(category) || 0}</strong>
            </li>
          ))}
        </ul>
        <div className="annieStoryReferenceEntries">
          {reference.entries.map((entry) => (
            <section key={entry.id}>
              <span
                className="annieStoryReferenceKind"
                data-category={entry.category}
              >
                {REFERENCE_CATEGORY_LABELS[entry.category]}
              </span>
              <p>{entry.statement}</p>
              {entry.sources.length > 0 ? (
                <div className="annieStoryReferenceSources">
                  {entry.sources.map((source, index) => (
                    <a
                      key={source}
                      href={source}
                      target="_blank"
                      rel="noreferrer"
                    >
                      来源 {index + 1}
                      <ExternalLink aria-hidden="true" />
                    </a>
                  ))}
                </div>
              ) : (
                <small>原创剧情设定，无史料来源</small>
              )}
            </section>
          ))}
        </div>
      </div>
    </details>
  )
}
