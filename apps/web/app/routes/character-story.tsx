import type { ClientLoaderFunctionArgs } from "react-router"
import {
  ArrowLeft,
  BookOpenText,
  ChevronDown,
  ChevronRight,
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
import { Link, useLoaderData, useNavigate, useSearchParams } from "react-router"

import { PlayerRoleOption } from "../components/player-role-option"
import { SESSION_EXPIRED_EVENT } from "../lib/api-client"
import {
  characterPath,
  characterRoutesForWorld,
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
  entryMode: "start" | "restart"
  selectedPlayerRoleId: string
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
  | { type: "player-role-selected"; playerRoleId: string }
  | { type: "restart-ready"; playerRoleId: string }
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
  entryMode: "start",
  selectedPlayerRoleId: "",
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
        entryMode: "start",
        selectedPlayerRoleId: action.run?.player_role.id || state.selectedPlayerRoleId,
        runLoading: false,
        accessState: "authenticated",
        pendingAction: null,
        pendingExchange: null,
        failedAction: null,
        actionError: "",
        message: "",
      }
    case "player-role-selected":
      if (state.accessState === "expired" || state.failedAction !== null) {
        return state
      }
      return {
        ...state,
        selectedPlayerRoleId: action.playerRoleId,
      }
    case "restart-ready":
      return {
        ...state,
        run: null,
        entryMode: "restart",
        selectedPlayerRoleId: action.playerRoleId,
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
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [pageState, dispatch] = useReducer(
    storyPageReducer,
    INITIAL_STORY_PAGE_STATE,
  )
  const {
    run,
    entryMode,
    selectedPlayerRoleId,
    runLoading,
    accessState,
    pendingAction,
    pendingExchange,
    failedAction,
    actionError,
    message,
  } = pageState
  const actionInFlightRef = useRef(false)
  const privateLoadVersionRef = useRef(0)
  const requestedPlayerRoleId = searchParams.get("playerRoleId")?.trim() || ""
  const validatedPlayerRoleId = detail?.player_roles.some(
    (playerRole) => playerRole.id === requestedPlayerRoleId,
  )
    ? requestedPlayerRoleId
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

  useEffect(() => {
    if (
      !run
      && validatedPlayerRoleId
      && validatedPlayerRoleId !== selectedPlayerRoleId
    ) {
      dispatch({
        type: "player-role-selected",
        playerRoleId: validatedPlayerRoleId,
      })
    }
  }, [run, selectedPlayerRoleId, validatedPlayerRoleId])

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

  const storyWorldId = route.storyWorldId
  const effectivePlayerRoleId = selectedPlayerRoleId
    || (detail.player_roles.length === 1 ? detail.player_roles[0].id : "")
  const writeBlocked = pendingAction !== null || failedAction !== null
  const loginHref = storyLoginUrl(
    characterStoryPath(route.slug, effectivePlayerRoleId),
  )

  async function runAction(
    kind: Exclude<StoryActionKind, "message">,
    action: () => Promise<StoryRun | null>,
    optimisticContent = "",
  ) {
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
  }

  async function enterStory(characterId: string) {
    if (
      !effectivePlayerRoleId
      || actionInFlightRef.current
      || failedAction !== null
    ) return
    const characterRoute = resolveCharacterRouteById(characterId)
    if (!characterRoute) return

    actionInFlightRef.current = true
    const actionKind = entryMode === "restart" ? "restart" : "start"
    dispatch({ type: "action-started", kind: actionKind })
    try {
      const nextRun = entryMode === "restart"
        ? await restartStoryRun(
          storyWorldId,
          characterId,
          effectivePlayerRoleId,
        )
        : await startStoryRun(
          storyWorldId,
          characterId,
          effectivePlayerRoleId,
        )
      dispatch({ type: "action-succeeded", run: nextRun })
      if (characterRoute.slug !== route.slug) {
        navigate(characterStoryPath(characterRoute.slug))
      }
    } catch (reason) {
      dispatch({
        type: "action-failed",
        kind: actionKind,
        message: reason instanceof Error
          ? reason.message
          : "故事入口暂时没有打开。",
      })
    } finally {
      actionInFlightRef.current = false
    }
  }

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
    <main className="annieStoryShell" data-story-theme={route.theme}>
      <CharacterStoryHeader
        characterName={detail.character.name}
        characterSlug={route.slug}
      />

      {!run && accessState !== "authenticated" ? (
        <section className="annieStoryOpening" aria-labelledby="annie-story-title">
          <p className="annieStoryEyebrow">{route.sceneLabel}</p>
          <h1 id="annie-story-title">{detail.story_world.title}</h1>
          <p>{detail.character.current_situation}</p>
        </section>
      ) : null}

      <StoryAccessPanels
        accessState={accessState}
        runLoading={runLoading}
        actionError={run ? "" : actionError}
        loginHref={loginHref}
        onRetry={() => void loadPrivateStory(true)}
      />

      {accessState === "authenticated" && !run && !runLoading ? (
        <StoryEntry
          detail={detail}
          sceneLabel={route.sceneLabel}
          selectedPlayerRoleId={effectivePlayerRoleId}
          writeDisabled={writeBlocked}
          actionError={actionError}
          onPlayerRoleSelect={(playerRoleId) => {
            dispatch({
              type: "player-role-selected",
              playerRoleId,
            })
            navigate(
              characterStoryPath(route.slug, playerRoleId),
              { replace: true },
            )
          }}
          onCharacterSelect={(characterId) => void enterStory(characterId)}
          onReload={() => void loadPrivateStory(true)}
        />
      ) : null}

      {accessState === "authenticated" && run ? (
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
          onRestart={() => {
            navigate(characterStoryPath(route.slug), { replace: true })
            dispatch({
              type: "restart-ready",
              playerRoleId: "",
            })
          }}
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

function StoryEntry({
  detail,
  sceneLabel,
  selectedPlayerRoleId,
  writeDisabled,
  actionError,
  onPlayerRoleSelect,
  onCharacterSelect,
  onReload,
}: {
  detail: StoryWorldCharacterDetail
  sceneLabel: string
  selectedPlayerRoleId: string
  writeDisabled: boolean
  actionError: string
  onPlayerRoleSelect: (playerRoleId: string) => void
  onCharacterSelect: (characterId: string) => void
  onReload: () => void
}) {
  const routes = characterRoutesForWorld(detail.story_world.id)
  const routeByCharacterId = new Map<string, (typeof routes)[number]>(
    routes.map((characterRoute) => [characterRoute.characterId, characterRoute]),
  )

  return (
    <section className="annieStoryEntry" aria-labelledby="annie-story-entry-title">
      <div className="annieStoryEntryContext">
        <p className="annieStoryEyebrow">{sceneLabel}</p>
        <h1 id="annie-story-entry-title">{detail.story_world.title}</h1>
        <p>{detail.story_world.summary}</p>
      </div>

      <div className="annieStoryEntryStep">
        <div className="annieStoryEntryStepHeading">
          <span aria-hidden="true">壹</span>
          <div>
            <p className="annieStoryEyebrow">你是谁</p>
            <h2>选择此行的身份</h2>
          </div>
        </div>
        <div
          className="annieStoryIdentityGrid"
          role="group"
          aria-label="选择故事身份"
        >
          {detail.player_roles.map((playerRole) => (
            <PlayerRoleOption
              key={playerRole.id}
              playerRole={playerRole}
              selected={selectedPlayerRoleId === playerRole.id}
              disabled={writeDisabled}
              onSelect={() => onPlayerRoleSelect(playerRole.id)}
            />
          ))}
        </div>
      </div>

      <div className="annieStoryEntryStep">
        <div className="annieStoryEntryStepHeading">
          <span aria-hidden="true">贰</span>
          <div>
            <p className="annieStoryEyebrow">去见谁</p>
            <h2>选择第一个对话的人</h2>
          </div>
        </div>
        <div className="annieStoryCharacterList">
          {detail.characters.map((character) => {
            const characterRoute = routeByCharacterId.get(character.id)
            return (
              <button
                key={character.id}
                className="annieStoryCharacterOption"
                type="button"
                disabled={!selectedPlayerRoleId || writeDisabled || !characterRoute}
                onClick={() => onCharacterSelect(character.id)}
              >
                {characterRoute ? (
                  <img
                    src={character.portrait_url || characterRoute.portrait}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <span className="annieStoryCharacterMonogram" aria-hidden="true">
                    {character.name.slice(0, 1)}
                  </span>
                )}
                <span className="annieStoryCharacterCopy">
                  <span>
                    <strong>{character.name}</strong>
                    <small>{character.relationship_stage.label}</small>
                  </span>
                  <span>{character.current_situation}</span>
                </span>
                <ChevronRight aria-hidden="true" />
              </button>
            )
          })}
        </div>
        {!selectedPlayerRoleId ? (
          <p className="annieStoryEntryHint">先选定你的身份。</p>
        ) : null}
        {actionError ? (
          <div className="annieStoryEntryRecovery" role="alert">
            <p className="annieStoryError">{actionError}</p>
            <button
              className="annieStoryRecoveryButton"
              type="button"
              onClick={onReload}
            >
              重新载入
            </button>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function StoryAccessPanels({
  accessState,
  runLoading,
  actionError,
  loginHref,
  onRetry,
}: {
  accessState: StoryAccessState
  runLoading: boolean
  actionError: string
  loginHref: string
  onRetry: () => void
}) {
  return (
    <>
      {accessState === "checking" ? (
        <StoryLoadingPanel eyebrow="片刻" title="正在确认登录状态" />
      ) : null}
      {runLoading ? (
        <StoryLoadingPanel eyebrow="回访" title="正在找回上次停下的地方" />
      ) : null}
      {accessState === "anonymous" ? (
        <section className="annieStoryAccess" aria-labelledby="annie-story-access-title">
          <LockKeyhole aria-hidden="true" />
          <h2 id="annie-story-access-title">登录后进入故事</h2>
          <a className="annieStoryPrimaryButton" href={loginHref}>
            <LogIn aria-hidden="true" />
            登录
          </a>
        </section>
      ) : null}
      {accessState === "expired" ? (
        <section className="annieStoryAccess annieStoryAccess--expired" role="alert">
          <CircleAlert aria-hidden="true" />
          <p className="annieStoryEyebrow">会话已结束</p>
          <h2>重新登录后继续</h2>
          <a className="annieStoryPrimaryButton" href={loginHref}>
            <LogIn aria-hidden="true" />
            重新登录
          </a>
        </section>
      ) : null}
      {accessState === "error" ? (
        <section className="annieStoryAccess">
          <CircleAlert aria-hidden="true" />
          <h2>故事暂时无法打开</h2>
          {actionError ? <p className="annieStoryError" role="alert">{actionError}</p> : null}
          <button
            className="annieStoryPrimaryButton"
            type="button"
            onClick={onRetry}
          >
            重试
          </button>
        </section>
      ) : null}
    </>
  )
}

function StoryLoadingPanel({
  eyebrow,
  title,
}: {
  eyebrow: string
  title: string
}) {
  return (
    <section className="annieStoryStatusPanel" aria-live="polite">
      <span className="annieStoryStatusMark" aria-hidden="true" />
      <div>
        <p className="annieStoryEyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
    </section>
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
          <div className="annieStoryRunHeading">
            <div>
              <p className="annieStoryEyebrow">此刻</p>
              <h2>{detail.story_world.title}</h2>
            </div>
            <div className="annieStoryRelationshipPresence" aria-live="polite">
              <span>
                {detail.character.name} · {run.relationship.label}
              </span>
              <p>{run.relationship.attitude}</p>
              {run.relationship.last_change_reason ? (
                <small>{run.relationship.last_change_reason}</small>
              ) : null}
            </div>
          </div>
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
  const timelineEvents = run.events.filter(
    (event) => event.type !== "relationship_changed",
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
