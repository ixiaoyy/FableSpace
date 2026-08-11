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
  MapPin,
  RotateCcw,
  Send,
  Users,
  X,
} from "lucide-react"
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
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
  visitStoryCharacter,
  type HistoricalReferenceCategory,
  type PublishedStory,
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

type StoryActionKind = "start" | "choice" | "message" | "restart" | "visit"

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
  pendingVisitCharacterId: string | null
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
  | { type: "run-reconciled"; run: StoryRun | null }
  | { type: "recovery-failed"; message: string }
  | { type: "access-error"; message: string }
  | { type: "session-expired" }
  | {
      type: "action-started"
      kind: StoryActionKind
      optimisticContent?: string
      visitCharacterId?: string
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
  pendingVisitCharacterId: null,
  failedAction: null,
  actionError: "",
  message: "",
}

const REFERENCE_CATEGORY_LABELS: Record<
  HistoricalReferenceCategory,
  "史实" | "待核验"
> = {
  fixed_fact: "史实",
  needs_verification: "待核验",
}

/** Reduce coupled private-run, optimistic-write, and recovery state as one auditable transition table. */
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
        pendingVisitCharacterId: null,
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
        pendingVisitCharacterId: null,
        failedAction: null,
        actionError: "",
        message: "",
      }
    case "run-reconciled":
      if (state.accessState === "expired") return state
      return {
        ...state,
        run: action.run,
        runLoading: false,
        accessState: "authenticated",
        pendingAction: null,
        pendingExchange: null,
        pendingVisitCharacterId: null,
        failedAction: null,
        actionError: "",
        message: "",
      }
    case "recovery-failed":
      if (state.accessState === "expired") return state
      return {
        ...state,
        runLoading: false,
        accessState: "authenticated",
        pendingAction: null,
        pendingExchange: null,
        pendingVisitCharacterId: null,
        actionError: action.message,
      }
    case "access-error":
      if (state.accessState === "expired") return state
      return {
        ...state,
        run: null,
        continuity: null,
        runLoading: false,
        accessState: "error",
        pendingAction: null,
        pendingExchange: null,
        pendingVisitCharacterId: null,
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
        pendingVisitCharacterId: null,
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
        pendingVisitCharacterId: action.kind === "visit"
          ? action.visitCharacterId || null
          : null,
        failedAction: null,
        actionError: "",
        message: action.kind === "message" && pendingExchange
          ? ""
          : state.message,
      }
    }
    case "action-succeeded": {
      if (state.accessState === "expired") return state
      const activeCharacterChanged = state.pendingAction === "visit"
        && Boolean(action.run)
        && state.run?.active_character?.id !== action.run?.active_character?.id
      return {
        ...state,
        run: action.run || state.run,
        continuity: action.run ? null : state.continuity,
        pendingAction: null,
        pendingExchange: null,
        pendingVisitCharacterId: null,
        failedAction: null,
        actionError: "",
        message: activeCharacterChanged ? "" : state.message,
      }
    }
    case "action-failed":
      if (state.accessState === "expired") return state
      return {
        ...state,
        pendingAction: null,
        pendingExchange: null,
        pendingVisitCharacterId: null,
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
        pendingVisitCharacterId: null,
        failedAction: null,
        actionError: "",
        message: "",
      }
  }
}

/** Accept a private run only when its Story ID and explicit experience match the public entry. */
function storyRunInScope(run: StoryRun | null, story: PublishedStory) {
  if (
    run
    && (
      run.story.id !== story.id
      || run.story.experience_mode !== story.experience_mode
    )
  ) {
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

type PrivateStoryRunOptions = {
  detail: StoryWorldCharacterDetail | null
  route: ReturnType<typeof resolveCharacterRoute>
  selectedStory: PublishedStory | null
  effectivePlayerRoleId: string
  storyScopeKey: string
  autoEntryKey: string
}

/** Own private-run loading, writes, reconciliation, and automatic entry for one routed Story. */
function usePrivateStoryRun({
  detail,
  route,
  selectedStory,
  effectivePlayerRoleId,
  storyScopeKey,
  autoEntryKey,
}: PrivateStoryRunOptions) {
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
    pendingVisitCharacterId,
    failedAction,
    actionError,
    message,
  } = pageState
  const actionInFlightRef = useRef(false)
  const actionVersionRef = useRef(0)
  const autoEntryAttemptedRef = useRef("")
  const privateLoadVersionRef = useRef(0)

  /** Load authentication, current run, and initial continuity for the routed Story. */
  const loadPrivateStory = useCallback(async (forceRefresh = false) => {
    if (!detail || !route || !selectedStory) return
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
      const [currentRunResult, continuityResult] = await Promise.allSettled([
        getCurrentStoryRun(
          route.storyWorldId,
          selectedStory.id,
          route.characterId,
        ),
        getStoryRunContinuity(route.storyWorldId, selectedStory.id),
      ])
      if (requestVersion !== privateLoadVersionRef.current) return
      if (currentRunResult.status === "rejected") {
        throw currentRunResult.reason
      }
      const currentRun = storyRunInScope(currentRunResult.value, selectedStory)
      if (currentRun === null && continuityResult.status === "rejected") {
        throw continuityResult.reason
      }
      let latestContinuity: StoryRunContinuity | null = null
      if (continuityResult.status === "fulfilled") {
        try {
          latestContinuity = storyContinuityInScope(
            continuityResult.value,
            selectedStory.id,
          )
        } catch {
          if (currentRun === null) throw new Error("故事连续性与当前入口不一致。")
        }
      }
      dispatch({
        type: "run-loaded",
        run: currentRun,
        continuity: latestContinuity,
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
  }, [detail, route, selectedStory])

  /** Reconcile an uncertain write from the authoritative current-run endpoint only. */
  const recoverCurrentStory = useCallback(async () => {
    if (!route || !selectedStory) return
    const requestVersion = privateLoadVersionRef.current + 1
    privateLoadVersionRef.current = requestVersion
    dispatch({ type: "run-loading" })
    try {
      const currentRun = storyRunInScope(
        await getCurrentStoryRun(
          route.storyWorldId,
          selectedStory.id,
          route.characterId,
        ),
        selectedStory,
      )
      if (requestVersion !== privateLoadVersionRef.current) return
      dispatch({ type: "run-reconciled", run: currentRun })
    } catch (reason) {
      if (requestVersion !== privateLoadVersionRef.current) return
      dispatch({
        type: "recovery-failed",
        message: reason instanceof Error
          ? reason.message
          : "当前进度暂时无法载入。",
      })
    }
  }, [route, selectedStory])

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

  /** Run one guarded non-message write; uncertain failures stay frozen until a current-run GET. */
  const runAction = useCallback(async (
    kind: Exclude<StoryActionKind, "message">,
    action: () => Promise<StoryRun | null>,
    options: {
      optimisticContent?: string
      visitCharacterId?: string
    } = {},
  ) => {
    if (
      actionInFlightRef.current
      || failedAction !== null
      || !selectedStory
    ) return
    const actionVersion = actionVersionRef.current + 1
    actionVersionRef.current = actionVersion
    actionInFlightRef.current = true
    dispatch({
      type: "action-started",
      kind,
      optimisticContent: options.optimisticContent,
      visitCharacterId: options.visitCharacterId,
    })
    try {
      const nextRun = storyRunInScope(await action(), selectedStory)
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
  }, [failedAction, selectedStory])

  /** Start the routed Character with the validated PlayerRole at most once per entry key. */
  const startCurrentRole = useCallback(() => {
    if (!route || !selectedStory || !effectivePlayerRoleId || !autoEntryKey) return
    autoEntryAttemptedRef.current = autoEntryKey
    return runAction(
      "start",
      () => startStoryRun(
        route.storyWorldId,
        selectedStory.id,
        route.characterId,
        effectivePlayerRoleId,
      ),
    )
  }, [autoEntryKey, effectivePlayerRoleId, route, runAction, selectedStory])

  /** Explicitly replace only a stale unfinished run after the content-change gate. */
  const restartStaleRun = useCallback(() => {
    if (!route || !selectedStory || !effectivePlayerRoleId) return
    return runAction(
      "restart",
      () => restartStoryRun(
        route.storyWorldId,
        selectedStory.id,
        route.characterId,
        effectivePlayerRoleId,
      ),
    )
  }, [effectivePlayerRoleId, route, runAction, selectedStory])

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

  /** Submit one message while retaining its draft until the write becomes authoritative. */
  const submitMessage = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const content = message.trim()
    const activeCharacterId = run?.active_character?.id || route?.characterId || ""
    if (
      !detail
      || !route
      || !run
      || !selectedStory
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
      route.storyWorldId,
      selectedStory.id,
      run.id,
      activeCharacterId,
      content,
    )
      .then((nextRun) => {
        if (actionVersion !== actionVersionRef.current) return
        dispatch({
          type: "message-sent",
          run: storyRunInScope(nextRun, selectedStory),
        })
      })
      .catch((reason) => {
        if (actionVersion !== actionVersionRef.current) return
        dispatch({
          type: "action-failed",
          kind: "message",
          message: reason instanceof Error
            ? reason.message
            : `${run.active_character?.name || detail.character.name}暂时没有回应。`,
        })
      })
      .finally(() => {
        if (actionVersion === actionVersionRef.current) {
          actionInFlightRef.current = false
        }
      })
  }, [detail, failedAction, message, route, run, selectedStory])

  /** Choose one authored path through the shared guarded-write boundary. */
  const choosePath = useCallback((choiceId: string, choiceLabel: string) => {
    if (!route || !selectedStory || !run) return
    const activeCharacterId = run.active_character?.id || route.characterId
    void runAction(
      "choice",
      () => chooseStoryPath(
        route.storyWorldId,
        selectedStory.id,
        run.id,
        activeCharacterId,
        choiceId,
      ),
      { optimisticContent: choiceLabel },
    )
  }, [route, run, runAction, selectedStory])

  /** Visit one server-authored participant through the shared guarded-write boundary. */
  const visitCharacter = useCallback((characterId: string) => {
    if (!route || !selectedStory || !run) return
    void runAction(
      "visit",
      () => visitStoryCharacter(
        route.storyWorldId,
        selectedStory.id,
        run.id,
        characterId,
      ),
      { visitCharacterId: characterId },
    )
  }, [route, run, runAction, selectedStory])

  /** Restart only a replayable completed run with its already locked PlayerRole. */
  const restartCurrentRun = useCallback(() => {
    if (!route || !selectedStory || !run) return
    void runAction(
      "restart",
      () => restartStoryRun(
        route.storyWorldId,
        selectedStory.id,
        route.characterId,
        run.player_role.id,
      ),
    )
  }, [route, run, runAction, selectedStory])

  /** Route a retry to initial loading or GET-only write reconciliation as appropriate. */
  const retryPrivateStory = useCallback(() => {
    if (failedAction !== null) {
      void recoverCurrentStory()
      return
    }
    void loadPrivateStory(true)
  }, [failedAction, loadPrivateStory, recoverCurrentStory])

  /** Update the controlled draft only while no uncertain write is frozen. */
  const changeMessage = useCallback((nextMessage: string) => {
    dispatch({ type: "message-changed", message: nextMessage })
  }, [])

  return {
    pageState,
    hasStaleActiveRun,
    entryAttempted: autoEntryAttemptedRef.current === autoEntryKey,
    retryPrivateStory,
    startCurrentRole,
    restartStaleRun,
    reconcilePrivateStory: recoverCurrentStory,
    choosePath,
    visitCharacter,
    restartCurrentRun,
    changeMessage,
    submitMessage,
  }
}

export default function CharacterStoryRoute() {
  const { detail, slug, error } = useLoaderData<typeof clientLoader>()
  const route = resolveCharacterRoute(slug)
  const [searchParams] = useSearchParams()
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
  const storyId = selectedStory?.id || ""
  const storyScopeKey = route && storyId
    ? `${route.storyWorldId}:${storyId}:${route.characterId}`
    : ""
  const autoEntryKey = storyScopeKey && effectivePlayerRoleId
    ? `${storyScopeKey}:${effectivePlayerRoleId}`
    : ""
  const {
    pageState,
    hasStaleActiveRun,
    entryAttempted,
    retryPrivateStory,
    startCurrentRole,
    restartStaleRun,
    reconcilePrivateStory,
    choosePath,
    visitCharacter,
    restartCurrentRun,
    changeMessage,
    submitMessage,
  } = usePrivateStoryRun({
    detail,
    route,
    selectedStory,
    effectivePlayerRoleId,
    storyScopeKey,
    autoEntryKey,
  })
  const {
    run,
    runLoading,
    accessState,
    pendingAction,
    pendingExchange,
    pendingVisitCharacterId,
    failedAction,
    actionError,
    message,
  } = pageState

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

  const experienceMode = selectedStory?.experience_mode || "narrative_story"

  return (
    <main
      className={[
        "annieStoryShell",
        "annieStoryShell--chat",
        experienceMode === "character_growth"
          ? "annieStoryShell--growth"
          : "annieStoryShell--narrative",
      ].join(" ")}
      data-story-theme={route.theme}
      data-experience-mode={experienceMode}
    >
      <StoryExperienceHeader
        detail={detail}
        story={selectedStory}
        run={run}
        characterSlug={route.slug}
      />

      {!run ? (
        <StoryConversationGate
          storyTitle={selectedStory?.title || detail.character.name}
          accessState={accessState}
          runLoading={runLoading}
          pendingAction={pendingAction}
          failedAction={failedAction}
          actionError={actionError}
          hasStory={Boolean(selectedStory)}
          hasPlayerRole={Boolean(effectivePlayerRoleId)}
          hasStaleActiveRun={hasStaleActiveRun}
          entryAttempted={entryAttempted}
          loginHref={loginHref}
          characterHref={characterPath(route.slug)}
          onRetry={retryPrivateStory}
          onStart={startCurrentRole}
          onRestartStale={restartStaleRun}
        />
      ) : null}

      {run?.story.experience_mode === "character_growth" ? (
        <CharacterGrowthWorkspace
          detail={detail}
          run={run}
          pendingAction={pendingAction}
          pendingExchange={pendingExchange}
          failedAction={failedAction}
          actionError={actionError}
          message={message}
          onMessageChange={changeMessage}
          onSubmitMessage={submitMessage}
          onReload={reconcilePrivateStory}
        />
      ) : null}

      {run?.story.experience_mode === "narrative_story" ? (
        <NarrativeStoryWorkspace
          detail={detail}
          run={run}
          pendingAction={pendingAction}
          pendingExchange={pendingExchange}
          pendingVisitCharacterId={pendingVisitCharacterId}
          failedAction={failedAction}
          actionError={actionError}
          message={message}
          onChoose={choosePath}
          onVisit={visitCharacter}
          onMessageChange={changeMessage}
          onSubmitMessage={submitMessage}
          onRestart={restartCurrentRun}
          onReload={reconcilePrivateStory}
        />
      ) : null}
    </main>
  )
}

/** Render the mode-specific top bar: identity-only for growth, story-led for narrative. */
function StoryExperienceHeader({
  detail,
  story,
  run,
  characterSlug,
}: {
  detail: StoryWorldCharacterDetail
  story: PublishedStory | null
  run: StoryRun | null
  characterSlug: string
}) {
  const growth = story?.experience_mode === "character_growth"
  const portrait = detail.character.portrait_url
    || resolveCharacterRouteById(detail.character.id)?.portrait

  if (growth) {
    return (
      <header className="annieGrowthHeader">
        <Link to={characterPath(characterSlug)} aria-label={`返回${detail.character.name}的人物页`}>
          <ArrowLeft aria-hidden="true" />
        </Link>
        {portrait ? <img src={portrait} alt="" /> : null}
        <strong>{detail.character.name}</strong>
        {run ? <small>{run.status === "active" ? "对话中" : "已结束"}</small> : null}
      </header>
    )
  }

  return (
    <header className="annieNarrativeHeader">
      <Link to={characterPath(characterSlug)} aria-label={`返回${detail.character.name}的人物页`}>
        <ArrowLeft aria-hidden="true" />
      </Link>
      <span className="annieNarrativeHeaderMark">
        <BookOpenText aria-hidden="true" />
        <small>剧情故事</small>
      </span>
      <strong>{story?.title || detail.story_world.title}</strong>
      <small>{run?.active_character?.name || detail.character.name}</small>
    </header>
  )
}

/** Render login, loading, missing-selection, stale-run, and read-only recovery states. */
function StoryConversationGate({
  storyTitle,
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
  storyTitle: string
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
    <section className="annieStoryConversationGate" aria-label={storyTitle}>
      <div className="annieStoryConversationState" aria-live="polite">
        {!hasStory ? (
          <>
            <CircleAlert aria-hidden="true" />
            <strong>故事不可用</strong>
            <Link className="annieStoryPrimaryButton" to={characterHref}>返回</Link>
          </>
        ) : null}
        {hasStory && accessState === "checking" ? (
          <><LoaderCircle aria-hidden="true" /><strong>正在连接</strong></>
        ) : null}
        {hasStory && runLoading ? (
          <><LoaderCircle aria-hidden="true" /><strong>正在载入</strong></>
        ) : null}
        {hasStory && pendingAction === "start" ? (
          <><LoaderCircle aria-hidden="true" /><strong>正在进入</strong></>
        ) : null}
        {hasStory && pendingAction === "restart" && !runLoading ? (
          <><LoaderCircle aria-hidden="true" /><strong>正在重新开始</strong></>
        ) : null}
        {hasStory && accessState === "anonymous" ? (
          <>
            <LockKeyhole aria-hidden="true" />
            <strong>尚未登录</strong>
            <a className="annieStoryPrimaryButton" href={loginHref}>
              <LogIn aria-hidden="true" />
              登录
            </a>
          </>
        ) : null}
        {hasStory && accessState === "expired" ? (
          <>
            <CircleAlert aria-hidden="true" />
            <strong>登录已过期</strong>
            <a className="annieStoryPrimaryButton" href={loginHref}>
              <LogIn aria-hidden="true" />
              重新登录
            </a>
          </>
        ) : null}
        {hasStory && accessState === "error" ? (
          <>
            <CircleAlert aria-hidden="true" />
            <strong>{actionError || "暂时无法载入"}</strong>
            <button className="annieStoryPrimaryButton" type="button" onClick={onRetry}>
              重新载入
            </button>
          </>
        ) : null}
        {hasStory && accessState === "authenticated"
          && !runLoading
          && pendingAction === null
          && !hasPlayerRole ? (
            <>
              <CircleAlert aria-hidden="true" />
              <strong>身份未选择</strong>
              <Link className="annieStoryPrimaryButton" to={characterHref}>返回选择</Link>
            </>
          ) : null}
        {hasStory && accessState === "authenticated"
          && failedAction === "start" ? (
            <>
              <CircleAlert aria-hidden="true" />
              <strong>{actionError || "暂时无法进入"}</strong>
              <button className="annieStoryPrimaryButton" type="button" onClick={onRetry}>
                重新载入
              </button>
            </>
          ) : null}
        {hasStory && accessState === "authenticated"
          && hasStaleActiveRun
          && failedAction === "restart" ? (
            <>
              <CircleAlert aria-hidden="true" />
              <strong>{actionError || "暂时无法重新开始"}</strong>
              <button className="annieStoryPrimaryButton" type="button" onClick={onRetry}>
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
              <strong>内容已更新</strong>
              <button className="annieStoryPrimaryButton" type="button" onClick={onRestartStale}>
                <RotateCcw aria-hidden="true" />
                重新开始
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
              <CircleAlert aria-hidden="true" />
              <strong>暂时无法进入</strong>
              <button className="annieStoryPrimaryButton" type="button" onClick={onStart}>
                再次进入
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
            <><LoaderCircle aria-hidden="true" /><strong>正在进入</strong></>
          ) : null}
      </div>
    </section>
  )
}

/** Render character_growth as one uninterrupted message stream and composer. */
function CharacterGrowthWorkspace({
  detail,
  run,
  pendingAction,
  pendingExchange,
  failedAction,
  actionError,
  message,
  onMessageChange,
  onSubmitMessage,
  onReload,
}: {
  detail: StoryWorldCharacterDetail
  run: StoryRun
  pendingAction: StoryActionKind | null
  pendingExchange: PendingStoryExchange | null
  failedAction: StoryActionKind | null
  actionError: string
  message: string
  onMessageChange: (message: string) => void
  onSubmitMessage: (event: FormEvent<HTMLFormElement>) => void
  onReload: () => void
}) {
  const composerVisible = run.status === "active"
    || run.post_ending_message_mode !== "disabled"
  const characterName = run.active_character?.name || detail.character.name

  return (
    <section className="annieGrowthChat" aria-label={`${detail.character.name}的对话`}>
      <StoryTimeline
        detail={detail}
        run={run}
        pending={pendingAction !== null}
        pendingExchange={pendingExchange}
        messagesOnly
      />
      {composerVisible ? (
        <StoryComposer
          characterName={characterName}
          pendingAction={pendingAction}
          failedAction={failedAction}
          actionError={actionError}
          message={message}
          onMessageChange={onMessageChange}
          onSubmitMessage={onSubmitMessage}
          onReload={onReload}
        />
      ) : null}
    </section>
  )
}

/** Render narrative_story as a participant desk, central event ledger, and reference rail. */
function NarrativeStoryWorkspace({
  detail,
  run,
  pendingAction,
  pendingExchange,
  pendingVisitCharacterId,
  failedAction,
  actionError,
  message,
  onChoose,
  onVisit,
  onMessageChange,
  onSubmitMessage,
  onRestart,
  onReload,
}: {
  detail: StoryWorldCharacterDetail
  run: StoryRun
  pendingAction: StoryActionKind | null
  pendingExchange: PendingStoryExchange | null
  pendingVisitCharacterId: string | null
  failedAction: StoryActionKind | null
  actionError: string
  message: string
  onChoose: (choiceId: string, choiceLabel: string) => void
  onVisit: (characterId: string) => void
  onMessageChange: (message: string) => void
  onSubmitMessage: (event: FormEvent<HTMLFormElement>) => void
  onRestart: () => void
  onReload: () => void
}) {
  const [mobilePanel, setMobilePanel] = useState<"participants" | "reference" | null>(null)
  const endingFocusRef = useRef<HTMLElement>(null)
  const previousRunStatusRef = useRef(run.status)
  const pending = pendingAction !== null
  const hasParticipants = run.participants.length > 0
  const composerVisible = run.status === "active"
    || run.post_ending_message_mode !== "disabled"
  const activeCharacterName = run.active_character?.name || detail.character.name

  useEffect(() => {
    const previousStatus = previousRunStatusRef.current
    previousRunStatusRef.current = run.status
    if (previousStatus === "active" && run.status === "completed") {
      endingFocusRef.current?.focus()
    }
  }, [run.status])

  return (
    <div
      className="annieNarrativeWorkspace"
      data-has-participants={hasParticipants ? "true" : "false"}
    >
      {hasParticipants ? (
        <NarrativeParticipantList
          className="annieNarrativeParticipantRail"
          detail={detail}
          run={run}
          pendingAction={pendingAction}
          pendingVisitCharacterId={pendingVisitCharacterId}
          failedAction={failedAction}
          onVisit={onVisit}
        />
      ) : null}

      {hasParticipants ? (
        <NarrativeParticipantStrip
          detail={detail}
          run={run}
          pendingAction={pendingAction}
          pendingVisitCharacterId={pendingVisitCharacterId}
          failedAction={failedAction}
          onVisit={onVisit}
        />
      ) : null}

      <section
        className="annieNarrativeRun"
        data-decision-active={run.decision ? "true" : undefined}
        aria-label={run.story.title}
      >
        <NarrativeActiveCharacterHeader detail={detail} run={run} />
        <StoryTimeline
          detail={detail}
          run={run}
          pending={pending}
          pendingExchange={pendingExchange}
        />

        {run.status === "active" && run.next_character ? (
          <NextCharacterAction detail={detail} run={run} />
        ) : null}

        {run.status === "completed" && run.ending ? (
          <StoryEndingSummary
            run={run}
            focusRef={endingFocusRef}
            pendingAction={pendingAction}
            failedAction={failedAction}
            actionError={actionError}
            onRestart={onRestart}
            onReload={onReload}
          />
        ) : null}

        {run.status === "active" && run.decision ? (
          <StoryDecisionPanel
            key={run.current_node.id}
            decision={run.decision}
            pending={pending}
            failed={failedAction !== null}
            onChoose={onChoose}
          />
        ) : null}

        {run.status === "active" && run.current_node.choices.length > 0 ? (
          <InlineStoryChoices
            choices={run.current_node.choices}
            disabled={pending || failedAction !== null}
            onChoose={onChoose}
          />
        ) : null}

        {composerVisible ? (
          <StoryComposer
            characterName={activeCharacterName}
            pendingAction={pendingAction}
            failedAction={failedAction}
            actionError={actionError}
            message={message}
            onMessageChange={onMessageChange}
            onSubmitMessage={onSubmitMessage}
            onReload={onReload}
          />
        ) : null}
      </section>

      <aside className="annieNarrativeReferenceRail" aria-label="资料">
        <HistoricalReferencePanel reference={run.historical_reference} />
      </aside>

      <div className="annieNarrativeMobileTools">
        <div
          className="annieNarrativeMobileToolBar"
          data-has-participants={hasParticipants ? "true" : "false"}
          aria-label="故事工具"
        >
          {hasParticipants ? (
            <button
              type="button"
              aria-expanded={mobilePanel === "participants"}
              aria-controls="annie-mobile-story-panel"
              onClick={() => setMobilePanel(
                mobilePanel === "participants" ? null : "participants",
              )}
            >
              <Users aria-hidden="true" />
              人物
            </button>
          ) : null}
          <button
            type="button"
            aria-expanded={mobilePanel === "reference"}
            aria-controls="annie-mobile-story-panel"
            onClick={() => setMobilePanel(
              mobilePanel === "reference" ? null : "reference",
            )}
          >
            <BookOpenText aria-hidden="true" />
            资料 · {run.historical_reference.unlocked_count}
          </button>
        </div>
        {mobilePanel ? (
          <section
            className="annieNarrativeMobilePanel"
            id="annie-mobile-story-panel"
            aria-label={mobilePanel === "participants" ? "人物" : "资料"}
          >
            <button
              className="annieNarrativeMobileClose"
              type="button"
              aria-label="收起"
              onClick={() => setMobilePanel(null)}
            >
              <X aria-hidden="true" />
            </button>
            {mobilePanel === "participants" ? (
              <NarrativeParticipantList
                className="annieNarrativeParticipantDrawer"
                detail={detail}
                run={run}
                pendingAction={pendingAction}
                pendingVisitCharacterId={pendingVisitCharacterId}
                failedAction={failedAction}
                onVisit={(characterId) => {
                  onVisit(characterId)
                  setMobilePanel(null)
                }}
              />
            ) : (
              <HistoricalReferenceContent reference={run.historical_reference} />
            )}
          </section>
        ) : null}
      </div>
    </div>
  )
}

/** Preserve reviewed public Character handoffs for narrative stories without internal visits. */
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

/** Render a desktop or mobile participant list from the private StoryRun projection only. */
function NarrativeParticipantList({
  className,
  detail,
  run,
  pendingAction,
  pendingVisitCharacterId,
  failedAction,
  onVisit,
}: {
  className: string
  detail: StoryWorldCharacterDetail
  run: StoryRun
  pendingAction: StoryActionKind | null
  pendingVisitCharacterId: string | null
  failedAction: StoryActionKind | null
  onVisit: (characterId: string) => void
}) {
  return (
    <aside className={className} aria-label="故事人物">
      <header>
        <Users aria-hidden="true" />
        <strong>人物</strong>
      </header>
      <div className="annieNarrativeParticipantList">
        {run.participants.map((participant) => (
          <NarrativeParticipantButton
            key={participant.id}
            detail={detail}
            participant={participant}
            storyCompleted={run.status === "completed"}
            pendingAction={pendingAction}
            pendingVisitCharacterId={pendingVisitCharacterId}
            failedAction={failedAction}
            compact={false}
            onVisit={onVisit}
          />
        ))}
      </div>
    </aside>
  )
}

/** Render the narrow-screen horizontal participant entrances above the timeline. */
function NarrativeParticipantStrip({
  detail,
  run,
  pendingAction,
  pendingVisitCharacterId,
  failedAction,
  onVisit,
}: {
  detail: StoryWorldCharacterDetail
  run: StoryRun
  pendingAction: StoryActionKind | null
  pendingVisitCharacterId: string | null
  failedAction: StoryActionKind | null
  onVisit: (characterId: string) => void
}) {
  return (
    <nav className="annieNarrativeParticipantStrip" aria-label="故事人物">
      {run.participants.map((participant) => (
        <NarrativeParticipantButton
          key={participant.id}
          detail={detail}
          participant={participant}
          storyCompleted={run.status === "completed"}
          pendingAction={pendingAction}
          pendingVisitCharacterId={pendingVisitCharacterId}
          failedAction={failedAction}
          compact
          onVisit={onVisit}
        />
      ))}
    </nav>
  )
}

/** Render one visit action while keeping availability and pending state server-authored. */
function NarrativeParticipantButton({
  detail,
  participant,
  storyCompleted,
  pendingAction,
  pendingVisitCharacterId,
  failedAction,
  compact,
  onVisit,
}: {
  detail: StoryWorldCharacterDetail
  participant: StoryRun["participants"][number]
  storyCompleted: boolean
  pendingAction: StoryActionKind | null
  pendingVisitCharacterId: string | null
  failedAction: StoryActionKind | null
  compact: boolean
  onVisit: (characterId: string) => void
}) {
  const focusPortrait = participant.id === detail.character.id
    ? resolveCharacterRouteById(participant.id)?.portrait
    : null
  const portrait = participant.portrait_url || focusPortrait
  const targetPending = pendingVisitCharacterId === participant.id
  const blockedByWrite = pendingAction !== null
  const disabled = storyCompleted
    || !participant.is_available
    || participant.is_active
    || targetPending
    || blockedByWrite
    || failedAction !== null

  return (
    <button
      className="annieNarrativeParticipant"
      data-compact={compact ? "true" : undefined}
      data-visited={participant.is_visited ? "true" : undefined}
      type="button"
      disabled={disabled}
      aria-current={participant.is_active ? "true" : undefined}
      aria-busy={targetPending}
      onClick={() => onVisit(participant.id)}
    >
      {portrait ? (
        <img src={portrait} alt="" />
      ) : (
        <span className="annieNarrativeParticipantMonogram" aria-hidden="true">
          {participant.name.slice(0, 1)}
        </span>
      )}
      <span>
        <strong>{participant.name}</strong>
        {!compact ? (
          <small><MapPin aria-hidden="true" />{participant.location_label}</small>
        ) : null}
      </span>
      {targetPending ? <LoaderCircle aria-hidden="true" /> : null}
      {participant.is_visited ? (
        <span className="annieStoryVisuallyHidden">已到访</span>
      ) : null}
    </button>
  )
}

/** Render the current story-internal Character identity above the narrative ledger. */
function NarrativeActiveCharacterHeader({
  detail,
  run,
}: {
  detail: StoryWorldCharacterDetail
  run: StoryRun
}) {
  const activeCharacter = run.active_character || detail.character
  const participant = run.participants.find(
    (candidate) => candidate.id === activeCharacter.id,
  )
  const portrait = activeCharacter.portrait_url
    || (activeCharacter.id === detail.character.id
      ? resolveCharacterRouteById(activeCharacter.id)?.portrait
      : null)

  return (
    <header className="annieNarrativeActiveCharacter">
      {portrait ? (
        <img src={portrait} alt="" />
      ) : (
        <span className="annieStoryConversationMonogram" aria-hidden="true">
          {activeCharacter.name.slice(0, 1)}
        </span>
      )}
      <div>
        <strong>{activeCharacter.name}</strong>
        {participant?.location_label ? (
          <small><MapPin aria-hidden="true" />{participant.location_label}</small>
        ) : null}
      </div>
    </header>
  )
}

/** Render ordered visible events without turning narration into Character speech. */
function StoryTimeline({
  detail,
  run,
  pending,
  pendingExchange,
  messagesOnly = false,
}: {
  detail: StoryWorldCharacterDetail
  run: StoryRun
  pending: boolean
  pendingExchange: PendingStoryExchange | null
  messagesOnly?: boolean
}) {
  const timelineRef = useRef<HTMLDivElement>(null)
  const latestEventId = run.events[run.events.length - 1]?.id
  const pendingExchangeKey = pendingExchange
    ? `${pendingExchange.kind}:${pendingExchange.content}`
    : ""
  const storyEvents = run.events.filter((event) => (
    messagesOnly
      ? event.type === "message"
      : event.type !== "relationship_changed"
  ))
  const timelineEvents = storyEvents.filter(
    (event, eventIndex) => (
      event.type !== "narration"
      || event.character_id !== null
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
      {timelineEvents.map((event) => {
        const choiceEvent = event.type === "choice"
        const narrationEvent = event.type === "narration"
        const characterEvent = event.type === "message" && event.role === "character"
        const playerMessageEvent = event.type === "message" && event.role === "player"
        const eventCharacter = event.character_id
          ? run.participants.find(
              (participant) => participant.id === event.character_id,
            ) || detail.characters.find(
              (character) => character.id === event.character_id,
            )
          : null
        const eventCharacterRoute = event.character_id
          ? resolveCharacterRouteById(event.character_id)
          : null
        const eventPortrait = eventCharacter?.portrait_url
          || eventCharacterRoute?.portrait
          || ""
        const eventCharacterName = event.character_name
          || eventCharacter?.name
          || detail.character.name
        let eventTone: string = "system"
        let eventLabel = "此刻"
        if (choiceEvent) {
          eventTone = "choice"
          eventLabel = "你的选择"
        } else if (narrationEvent) {
          eventTone = "narration"
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
            className={`annieStoryEvent annieStoryEvent--${eventTone}`}
          >
            {characterEvent && eventPortrait ? (
              <img className="annieStoryEventAvatar" src={eventPortrait} alt="" loading="lazy" />
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
          {pendingExchange.kind === "choice" ? (
            <article className="annieStoryEvent annieStoryEvent--system annieStoryEvent--typing">
              <div className="annieStoryEventBody">
                <span>此刻</span>
                <p><LoaderCircle aria-hidden="true" />正在继续…</p>
              </div>
            </article>
          ) : run.post_ending_message_mode !== "unanswered" ? (
            <PendingCharacterReply detail={detail} run={run} />
          ) : null}
        </>
      ) : null}
    </div>
  )
}

/** Render the active Character typing state only for message paths that may answer. */
function PendingCharacterReply({
  detail,
  run,
}: {
  detail: StoryWorldCharacterDetail
  run: StoryRun
}) {
  const activeCharacter = run.active_character || detail.character
  const portrait = activeCharacter.portrait_url
    || (activeCharacter.id === detail.character.id
      ? resolveCharacterRouteById(activeCharacter.id)?.portrait
      : null)

  return (
    <article className="annieStoryEvent annieStoryEvent--character annieStoryEvent--typing">
      {portrait ? <img className="annieStoryEventAvatar" src={portrait} alt="" /> : null}
      <div className="annieStoryEventBody">
        <span>{activeCharacter.name}</span>
        <p><LoaderCircle aria-hidden="true" />正在回应…</p>
      </div>
    </article>
  )
}

/** Render reviewed inline StoryChoices separately from the permanent decision surface. */
function InlineStoryChoices({
  choices,
  disabled,
  onChoose,
}: {
  choices: StoryRun["current_node"]["choices"]
  disabled: boolean
  onChoose: (choiceId: string, choiceLabel: string) => void
}) {
  return (
    <div className="annieStoryChoices" aria-label="可选行动">
      {choices.map((choice) => (
        <button
          key={choice.id}
          type="button"
          disabled={disabled}
          onClick={() => onChoose(choice.id, choice.label)}
        >
          {choice.label}
        </button>
      ))}
    </div>
  )
}

/** Render a source selection followed by exactly one neutral permanent confirmation. */
function StoryDecisionPanel({
  decision,
  pending,
  failed,
  onChoose,
}: {
  decision: NonNullable<StoryRun["decision"]>
  pending: boolean
  failed: boolean
  onChoose: (choiceId: string, choiceLabel: string) => void
}) {
  const [selectedChoiceId, setSelectedChoiceId] = useState("")
  const [confirmationChoiceId, setConfirmationChoiceId] = useState("")
  const continueButtonRef = useRef<HTMLButtonElement>(null)
  const confirmationRef = useRef<HTMLDivElement>(null)
  const restoreContinueFocusRef = useRef(false)
  const selectedChoice = decision.choices.find(
    (choice) => choice.id === selectedChoiceId,
  ) || null
  const confirmationChoice = decision.choices.find(
    (choice) => choice.id === confirmationChoiceId,
  ) || null
  const disabled = pending || failed

  useEffect(() => {
    if (confirmationChoiceId) {
      confirmationRef.current?.focus()
      return
    }
    if (restoreContinueFocusRef.current) {
      restoreContinueFocusRef.current = false
      continueButtonRef.current?.focus()
    }
  }, [confirmationChoiceId])

  return (
    <section className="annieStoryDecision" aria-labelledby="annie-story-decision-heading">
      <fieldset disabled={disabled}>
        <legend id="annie-story-decision-heading">交水决定</legend>
        <div className="annieStoryDecisionChoices">
          {decision.choices.map((choice) => (
            <label key={choice.id} data-selected={selectedChoiceId === choice.id ? "true" : undefined}>
              <input
                type="radio"
                name="annie-water-source"
                value={choice.id}
                checked={selectedChoiceId === choice.id}
                onChange={() => {
                  setSelectedChoiceId(choice.id)
                  setConfirmationChoiceId("")
                }}
              />
              <span>{choice.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {!confirmationChoice ? (
        <button
          ref={continueButtonRef}
          className="annieStoryDecisionContinue"
          type="button"
          disabled={disabled || !selectedChoice}
          onClick={() => setConfirmationChoiceId(selectedChoice?.id || "")}
        >
          交给安妮
        </button>
      ) : (
        <div
          ref={confirmationRef}
          className="annieStoryDecisionConfirmation"
          role="group"
          tabIndex={-1}
          aria-labelledby="annie-story-confirmation-source"
          aria-describedby="annie-story-confirmation-consequence"
        >
          <strong id="annie-story-confirmation-source">
            {confirmationChoice.label}
          </strong>
          <p id="annie-story-confirmation-consequence">
            {decision.confirmation_prompt}
          </p>
          <div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                restoreContinueFocusRef.current = true
                setConfirmationChoiceId("")
              }}
            >
              返回
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChoose(confirmationChoice.id, confirmationChoice.label)}
            >
              {pending ? "正在确认" : "确认交水"}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

/** Render authored ending content and replay only when the Story policy explicitly permits it. */
function StoryEndingSummary({
  run,
  focusRef,
  pendingAction,
  failedAction,
  actionError,
  onRestart,
  onReload,
}: {
  run: StoryRun
  focusRef: { current: HTMLElement | null }
  pendingAction: StoryActionKind | null
  failedAction: StoryActionKind | null
  actionError: string
  onRestart: () => void
  onReload: () => void
}) {
  if (!run.ending) return null
  const replayable = run.story.replay_policy === "replayable"

  return (
    <section ref={focusRef} className="annieStoryEnding" tabIndex={-1}>
      <p className="annieStoryEyebrow">本轮结局</p>
      <h2>{run.ending.title}</h2>
      <p>{run.ending.summary}</p>
      {failedAction && run.post_ending_message_mode === "disabled" ? (
        <StoryActionError message={actionError} onReload={onReload} />
      ) : null}
      {replayable ? (
        <button
          className="annieStoryPrimaryButton"
          type="button"
          disabled={pendingAction !== null || failedAction !== null}
          onClick={onRestart}
        >
          <RotateCcw aria-hidden="true" />
          {pendingAction === "restart" ? "正在重新开始" : "重新开始"}
        </button>
      ) : null}
    </section>
  )
}

/** Render the only free-input control and its read-only reconciliation failure state. */
function StoryComposer({
  characterName,
  pendingAction,
  failedAction,
  actionError,
  message,
  onMessageChange,
  onSubmitMessage,
  onReload,
}: {
  characterName: string
  pendingAction: StoryActionKind | null
  failedAction: StoryActionKind | null
  actionError: string
  message: string
  onMessageChange: (message: string) => void
  onSubmitMessage: (event: FormEvent<HTMLFormElement>) => void
  onReload: () => void
}) {
  const writeDisabled = pendingAction !== null || failedAction !== null

  /** Submit on plain Enter while preserving Shift+Enter and IME composition. */
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
      aria-busy={pendingAction !== null}
      data-recovery-required={failedAction !== null ? "true" : undefined}
    >
      {actionError ? <StoryActionError message={actionError} onReload={onReload} /> : null}
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

/** Render one write failure with a GET-only reconciliation action. */
function StoryActionError({
  message,
  onReload,
}: {
  message: string
  onReload: () => void
}) {
  return (
    <div className="annieStoryActionError" id="annie-story-action-error" role="alert">
      <CircleAlert aria-hidden="true" />
      <div className="annieStoryActionErrorBody">
        <strong>{message || "这一步暂时没有完成。"}</strong>
        <button className="annieStoryRecoveryButton" type="button" onClick={onReload}>
          重新载入
        </button>
      </div>
    </div>
  )
}

/** Render a default-collapsed historical reference surface with only count and authored entries. */
function HistoricalReferencePanel({
  reference,
}: {
  reference: StoryRun["historical_reference"]
}) {
  return (
    <details className="annieStoryReferences">
      <summary>
        <span className="annieStoryReferenceSummaryIcon">
          <BookOpenText aria-hidden="true" />
        </span>
        <span>
          <strong>资料</strong>
          <small>已解锁 {reference.unlocked_count} / {reference.total_count}</small>
        </span>
        <ChevronDown className="annieStoryReferenceChevron" aria-hidden="true" />
      </summary>
      <div className="annieStoryReferenceBody">
        <HistoricalReferenceContent reference={reference} />
      </div>
    </details>
  )
}

/** Render reviewed reference labels, statements, and source links without summaries or legends. */
function HistoricalReferenceContent({
  reference,
}: {
  reference: StoryRun["historical_reference"]
}) {
  return (
    <div className="annieStoryReferenceEntries">
      {reference.entries.map((entry) => (
        <section key={entry.id}>
          <span className="annieStoryReferenceKind" data-category={entry.category}>
            {REFERENCE_CATEGORY_LABELS[entry.category]}
          </span>
          <p>{entry.statement}</p>
          {entry.sources.length > 0 ? (
            <div className="annieStoryReferenceSources">
              {entry.sources.map((source, index) => (
                <a key={source} href={source} target="_blank" rel="noreferrer">
                  来源 {index + 1}
                  <ExternalLink aria-hidden="true" />
                </a>
              ))}
            </div>
          ) : null}
        </section>
      ))}
    </div>
  )
}
