import type { ClientLoaderFunctionArgs } from "react-router"
import {
  ArrowLeft,
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
  getStoryWorldCharacter,
  restartStoryRun,
  sendStoryMessage,
  startStoryRun,
  type HistoricalReferenceCategory,
  type StoryRun,
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
  runLoading: boolean
  accessState: StoryAccessState
  pendingAction: StoryActionKind | null
  pendingExchange: PendingStoryExchange | null
  failedAction: StoryActionKind | null
  actionError: string
  message: string
}

type StoryPageAction =
  | { type: "access-checking" }
  | { type: "access-anonymous" }
  | { type: "run-loading" }
  | { type: "run-loaded"; run: StoryRun | null }
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
    case "access-checking":
      return { ...state, accessState: "checking", actionError: "" }
    case "access-anonymous":
      if (state.accessState === "expired") return state
      return {
        ...state,
        run: null,
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
        runLoading: false,
        accessState: "error",
        pendingExchange: null,
        actionError: action.message,
      }
    case "session-expired":
      return {
        ...state,
        run: null,
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
        pendingAction: null,
        pendingExchange: null,
        failedAction: null,
        actionError: "",
        message: "",
      }
  }
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
    runLoading,
    accessState,
    pendingAction,
    pendingExchange,
    failedAction,
    actionError,
    message,
  } = pageState
  const actionInFlightRef = useRef(false)
  const autoEntryAttemptedRef = useRef("")
  const privateLoadVersionRef = useRef(0)
  const requestedPlayerRoleId = searchParams.get("playerRoleId")?.trim() || ""
  const validatedPlayerRoleId = detail?.player_roles.some(
    (playerRole) => playerRole.id === requestedPlayerRoleId,
  )
    ? requestedPlayerRoleId
    : ""
  const effectivePlayerRoleId = validatedPlayerRoleId
    || (detail?.player_roles.length === 1 ? detail.player_roles[0].id : "")
  const storyWorldId = route?.storyWorldId || ""
  const autoEntryKey = route && effectivePlayerRoleId
    ? `${route.storyWorldId}:${route.characterId}:${effectivePlayerRoleId}`
    : ""

  const loadPrivateStory = useCallback(async (forceRefresh = false) => {
    if (!detail || !route) return
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
      const currentRun = await getCurrentStoryRun(
        route.storyWorldId,
        route.characterId,
      )
      if (requestVersion !== privateLoadVersionRef.current) return
      dispatch({
        type: "run-loaded",
        run: currentRun,
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
  }, [detail, route])

  useEffect(() => {
    void loadPrivateStory()
    return () => {
      privateLoadVersionRef.current += 1
    }
  }, [loadPrivateStory])

  /** Runs one non-message write and returns its completion promise while failed writes remain frozen. */
  const runAction = useCallback(async (
    kind: Exclude<StoryActionKind, "message">,
    action: () => Promise<StoryRun | null>,
    optimisticContent = "",
  ) => {
    if (actionInFlightRef.current || failedAction !== null) return
    actionInFlightRef.current = true
    dispatch({ type: "action-started", kind, optimisticContent })
    try {
      const nextRun = await action()
      dispatch({ type: "action-succeeded", run: nextRun })
    } catch (reason) {
      dispatch({
        type: "action-failed",
        kind,
        message: reason instanceof Error
          ? reason.message
          : "这一步暂时没有完成。",
      })
    } finally {
      actionInFlightRef.current = false
    }
  }, [failedAction])

  /** Starts the routed Character with the validated PlayerRole and returns the guarded write promise. */
  const startCurrentRole = useCallback(() => {
    if (!route || !effectivePlayerRoleId || !autoEntryKey) return
    autoEntryAttemptedRef.current = autoEntryKey
    return runAction(
      "start",
      () => startStoryRun(
        route.storyWorldId,
        route.characterId,
        effectivePlayerRoleId,
      ),
    )
  }, [autoEntryKey, effectivePlayerRoleId, route, runAction])

  useEffect(() => {
    if (
      accessState !== "authenticated"
      || run
      || runLoading
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
    pendingAction,
    run,
    runLoading,
    startCurrentRole,
  ])

  useEffect(() => {
    const handleSessionExpired = () => {
      actionInFlightRef.current = false
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
    characterStoryPath(route.slug, effectivePlayerRoleId),
  )

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = message.trim()
    if (
      !run
      || !content
      || actionInFlightRef.current
      || failedAction !== null
    ) return
    actionInFlightRef.current = true
    dispatch({
      type: "action-started",
      kind: "message",
      optimisticContent: content,
    })
    void sendStoryMessage(
      storyWorldId,
      run.id,
      route.characterId,
      content,
    )
      .then((nextRun) => {
        dispatch({ type: "message-sent", run: nextRun })
      })
      .catch((reason) => {
        dispatch({
          type: "action-failed",
          kind: "message",
          message: reason instanceof Error
            ? reason.message
            : `${detail.character.name}暂时没有回应。`,
        })
      })
      .finally(() => {
        actionInFlightRef.current = false
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
          hasPlayerRole={Boolean(effectivePlayerRoleId)}
          entryAttempted={autoEntryAttemptedRef.current === autoEntryKey}
          loginHref={loginHref}
          characterHref={characterPath(route.slug)}
          onRetry={() => void loadPrivateStory(true)}
          onStart={() => void startCurrentRole()}
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
  hasPlayerRole,
  entryAttempted,
  loginHref,
  characterHref,
  onRetry,
  onStart,
}: {
  detail: StoryWorldCharacterDetail
  accessState: StoryAccessState
  runLoading: boolean
  pendingAction: StoryActionKind | null
  failedAction: StoryActionKind | null
  actionError: string
  hasPlayerRole: boolean
  entryAttempted: boolean
  loginHref: string
  characterHref: string
  onRetry: () => void
  onStart: () => void
}) {
  return (
    <section
      className="annieStoryConversationGate"
      aria-label={`${detail.character.name}的对话`}
    >
      <CharacterConversationHeader
        detail={detail}
        relationship={detail.character.relationship_stage}
      />
      <div className="annieStoryConversationState" aria-live="polite">
        {accessState === "checking" ? (
          <>
            <LoaderCircle aria-hidden="true" />
            <p>正在连接{detail.character.name}…</p>
          </>
        ) : null}
        {runLoading ? (
          <>
            <LoaderCircle aria-hidden="true" />
            <p>正在恢复对话…</p>
          </>
        ) : null}
        {pendingAction === "start" ? (
          <>
            <LoaderCircle aria-hidden="true" />
            <p>正在打开对话…</p>
          </>
        ) : null}
        {accessState === "anonymous" ? (
          <>
            <LockKeyhole aria-hidden="true" />
            <p>登录后继续与{detail.character.name}对话。</p>
            <a className="annieStoryPrimaryButton" href={loginHref}>
              <LogIn aria-hidden="true" />
              登录
            </a>
          </>
        ) : null}
        {accessState === "expired" ? (
          <>
            <CircleAlert aria-hidden="true" />
            <p>登录已过期。</p>
            <a className="annieStoryPrimaryButton" href={loginHref}>
              <LogIn aria-hidden="true" />
              重新登录
            </a>
          </>
        ) : null}
        {accessState === "error" ? (
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
        {accessState === "authenticated"
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
        {accessState === "authenticated"
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
        {accessState === "authenticated"
          && !runLoading
          && pendingAction === null
          && failedAction === null
          && hasPlayerRole
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
        {accessState === "authenticated"
          && !runLoading
          && pendingAction === null
          && failedAction === null
          && hasPlayerRole
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

/** Returns a compact header for the supplied Character and public or run relationship state. */
function CharacterConversationHeader({
  detail,
  relationship,
}: {
  detail: StoryWorldCharacterDetail
  relationship: StoryRun["relationship"]
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
      <div>
        <span>
          <strong>{detail.character.name}</strong>
          <small>{relationship.label}</small>
        </span>
        <p>{relationship.attitude}</p>
        {relationship.last_change_reason ? (
          <small>{relationship.last_change_reason}</small>
        ) : null}
      </div>
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
          <CharacterConversationHeader
            detail={detail}
            relationship={run.relationship}
          />
        ) : null}

        <StoryTimeline
          detail={detail}
          run={run}
          pending={pending}
          pendingExchange={pendingExchange}
        />

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
  const timelineEvents = storyEvents.filter(
    (event, eventIndex) => (
      event.type !== "narration"
      || storyEvents[eventIndex - 1]?.type === "choice"
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
      {timelineEvents.map((event, eventIndex) => {
        const messageEvent = event.type === "message"
        const choiceResponse = event.type === "narration"
          && timelineEvents[eventIndex - 1]?.type === "choice"
        const characterEvent = event.role === "character" || choiceResponse
        const playerEvent = event.type === "choice" || event.role === "player"
        const eventTone = characterEvent
          ? "character"
          : playerEvent
            ? "player"
            : event.role || event.type
        const eventLabel = characterEvent
          ? event.character_name || detail.character.name
          : playerEvent
            ? "你"
            : messageEvent
              ? "故事"
              : "此刻"
        const eventCharacter = event.character_id
          ? detail.characters.find(
              (character) => character.id === event.character_id,
            )
          : detail.character
        const eventCharacterRoute = resolveCharacterRouteById(
          eventCharacter?.id || detail.character.id,
        )
        const eventPortrait = eventCharacter?.portrait_url
          || eventCharacterRoute?.portrait
          || ""
        return (
          <article
            key={event.id}
            className={[
              "annieStoryEvent",
              `annieStoryEvent--${eventTone}`,
              choiceResponse ? "annieStoryEvent--choiceResponse" : "",
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
          <article className="annieStoryEvent annieStoryEvent--player annieStoryEvent--pending">
            <div className="annieStoryEventBody">
              <span>你</span>
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
            <span>重新载入后继续。</span>
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
