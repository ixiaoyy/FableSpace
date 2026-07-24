import type { ClientLoaderFunctionArgs } from "react-router"
import {
  ArrowLeft,
  BookMarked,
  CircleAlert,
  Feather,
  HeartHandshake,
  LockKeyhole,
  LogIn,
  RotateCcw,
  Send,
  ShieldCheck,
} from "lucide-react"
import { FormEvent, useCallback, useEffect, useReducer } from "react"
import { Link, useLoaderData } from "react-router"

import { HistoricalBroadStreetVisual } from "../components/historical-broad-street-visual"
import { SESSION_EXPIRED_EVENT } from "../lib/api-client"
import { getAccessStatus, storyLoginUrl } from "../lib/session"
import {
  chooseStoryPath,
  getCurrentStoryRun,
  getStoryWorldCharacter,
  restartStoryRun,
  sendStoryMessage,
  startStoryRun,
  type StoryRun,
  type StoryWorldCharacterDetail,
} from "../lib/story-worlds"
import { storyWorldCharacterPath, WEB_PATHS } from "../lib/web-routes"

import "./story-world-character.css"

type LoaderData = {
  detail: StoryWorldCharacterDetail | null
  error: string
}

type StoryAccessState =
  | "checking"
  | "authenticated"
  | "anonymous"
  | "expired"
  | "error"

type StoryPageState = {
  run: StoryRun | null
  runLoading: boolean
  accessState: StoryAccessState
  pending: boolean
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
  | { type: "action-started" }
  | { type: "action-succeeded"; run: StoryRun | null }
  | { type: "action-failed"; message: string }
  | { type: "message-changed"; message: string }
  | { type: "message-sent"; run: StoryRun | null }

const INITIAL_STORY_PAGE_STATE: StoryPageState = {
  run: null,
  runLoading: false,
  accessState: "checking",
  pending: false,
  actionError: "",
  message: "",
}

function storyPageReducer(
  state: StoryPageState,
  action: StoryPageAction,
): StoryPageState {
  switch (action.type) {
    case "access-checking":
      return { ...state, accessState: "checking", actionError: "" }
    case "access-anonymous":
      return {
        ...state,
        run: null,
        runLoading: false,
        accessState: "anonymous",
      }
    case "run-loading":
      return {
        ...state,
        runLoading: true,
        accessState: "authenticated",
      }
    case "run-loaded":
      return {
        ...state,
        run: action.run,
        runLoading: false,
        accessState: "authenticated",
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
        actionError: action.message,
      }
    case "session-expired":
      return {
        ...state,
        run: null,
        runLoading: false,
        accessState: "expired",
        pending: false,
        actionError: "",
        message: "",
      }
    case "action-started":
      return { ...state, pending: true, actionError: "" }
    case "action-succeeded":
      return {
        ...state,
        run: action.run || state.run,
        pending: false,
      }
    case "action-failed":
      return { ...state, pending: false, actionError: action.message }
    case "message-changed":
      return { ...state, message: action.message }
    case "message-sent":
      return {
        ...state,
        run: action.run || state.run,
        pending: false,
        message: "",
      }
  }
}

export async function clientLoader({ params }: ClientLoaderFunctionArgs): Promise<LoaderData> {
  const storyWorldId = params.storyWorldId || ""
  const characterId = params.characterId || ""
  try {
    return {
      detail: await getStoryWorldCharacter(storyWorldId, characterId),
      error: "",
    }
  } catch (error) {
    return {
      detail: null,
      error: error instanceof Error ? error.message : "故事暂时无法打开。",
    }
  }
}

export default function StoryWorldCharacterRoute() {
  const { detail, error } = useLoaderData<typeof clientLoader>()
  const [pageState, dispatch] = useReducer(
    storyPageReducer,
    INITIAL_STORY_PAGE_STATE,
  )
  const {
    run,
    runLoading,
    accessState,
    pending,
    actionError,
    message,
  } = pageState

  const loadPrivateStory = useCallback(async (forceRefresh = false) => {
    if (!detail) return
    dispatch({ type: "access-checking" })
    try {
      const access = await getAccessStatus(forceRefresh)
      if (!access.access_allowed || !access.user) {
        dispatch({ type: "access-anonymous" })
        return
      }
      dispatch({ type: "run-loading" })
      dispatch({
        type: "run-loaded",
        run: await getCurrentStoryRun(detail.story_world.id),
      })
    } catch (reason) {
      dispatch({
        type: "access-error",
        message: reason instanceof Error
          ? reason.message
          : "登录状态暂时无法确认。",
      })
    }
  }, [detail])

  useEffect(() => {
    void loadPrivateStory()
  }, [loadPrivateStory])

  useEffect(() => {
    const handleSessionExpired = () => {
      dispatch({ type: "session-expired" })
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  }, [])

  if (!detail) {
    return (
      <main className="annieStoryShell annieStoryCentered">
        <p className="annieStoryEyebrow">FableSpace</p>
        <h1>没有找到这段故事</h1>
        <p>{error || "这个角色尚未公开。"}</p>
        <Link className="annieStoryPrimaryButton" to={WEB_PATHS.home}>返回角色</Link>
      </main>
    )
  }

  const storyWorldId = detail.story_world.id
  const loginHref = storyLoginUrl(
    storyWorldCharacterPath(storyWorldId, detail.character.id),
  )
  const completedRunSummaries = run?.completed_run_summaries || []

  async function runAction(action: () => Promise<StoryRun | null>) {
    dispatch({ type: "action-started" })
    try {
      const nextRun = await action()
      dispatch({ type: "action-succeeded", run: nextRun })
    } catch (reason) {
      dispatch({
        type: "action-failed",
        message: reason instanceof Error
          ? reason.message
          : "这一步暂时没有完成。",
      })
    }
  }

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = message.trim()
    if (!run || !content) return
    dispatch({ type: "action-started" })
    void sendStoryMessage(storyWorldId, run.id, content)
      .then((nextRun) => {
        dispatch({ type: "message-sent", run: nextRun })
      })
      .catch((reason) => {
        dispatch({
          type: "action-failed",
          message: reason instanceof Error
            ? reason.message
            : `${detail.character.name}暂时没有回应。`,
        })
      })
  }

  return (
    <main className="annieStoryShell">
      <header className="annieStoryHeader">
        <Link to={WEB_PATHS.home} aria-label="返回角色首页">
          <ArrowLeft aria-hidden="true" />
        </Link>
        <span>FableSpace</span>
        <small>{detail.story_world.genre}</small>
      </header>

      <section className="annieStoryHero">
        <div className="annieStoryHeroArt">
          <HistoricalBroadStreetVisual />
          <span>{detail.story_world.title}</span>
        </div>
        <div className="annieStoryHeroCopy">
          <p className="annieStoryEyebrow">想见的人</p>
          <h1>{detail.character.name}</h1>
          <p className="annieStorySituation">{detail.character.current_situation}</p>
          <div className="annieStoryRole">
            <ShieldCheck aria-hidden="true" />
            <div>
              <span>你在这个故事里是</span>
              <strong>{detail.player_role.name}</strong>
              <p>{detail.player_role.background}</p>
            </div>
          </div>
          {accessState === "authenticated" && !run && !runLoading ? (
            <button
              className="annieStoryPrimaryButton"
              type="button"
              disabled={pending}
              onClick={() => void runAction(() => startStoryRun(storyWorldId))}
            >
              <Feather aria-hidden="true" />
              <span>{pending ? "正在走近……" : `去见${detail.character.name}`}</span>
            </button>
          ) : null}
        </div>
      </section>

      <StoryAccessPanels
        accessState={accessState}
        runLoading={runLoading}
        actionError={actionError}
        loginHref={loginHref}
        onRetry={() => void loadPrivateStory(true)}
      />

      {accessState === "authenticated" && run ? (
        <StoryRunWorkspace
          detail={detail}
          run={run}
          pending={pending}
          message={message}
          completedRunSummaries={completedRunSummaries}
          onChoose={(choiceId) => void runAction(
            () => chooseStoryPath(storyWorldId, run.id, choiceId),
          )}
          onMessageChange={(nextMessage) => dispatch({
            type: "message-changed",
            message: nextMessage,
          })}
          onSubmitMessage={submitMessage}
          onRestart={() => void runAction(() => restartStoryRun(storyWorldId))}
        />
      ) : null}

    </main>
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
      {actionError && accessState !== "expired" ? (
        <p className="annieStoryError" role="alert">{actionError}</p>
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
          <h2>登录状态暂不可用</h2>
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
  pending,
  message,
  completedRunSummaries,
  onChoose,
  onMessageChange,
  onSubmitMessage,
  onRestart,
}: {
  detail: StoryWorldCharacterDetail
  run: StoryRun
  pending: boolean
  message: string
  completedRunSummaries: StoryRun["completed_run_summaries"]
  onChoose: (choiceId: string) => void
  onMessageChange: (message: string) => void
  onSubmitMessage: (event: FormEvent<HTMLFormElement>) => void
  onRestart: () => void
}) {
  return (
    <div className="annieStoryWorkspace">
      <section
        className="annieStoryRun"
        aria-label={`${detail.character.name}的故事`}
      >
        {run.status === "active" ? (
          <div className="annieStoryRunHeading">
            <div>
              <p className="annieStoryEyebrow">此刻</p>
              <h2>{detail.story_world.title}</h2>
            </div>
            <p>{run.current_node.narration}</p>
          </div>
        ) : null}

        <StoryTimeline detail={detail} run={run} />

        {run.status === "active" ? (
          <StoryActions
            characterName={detail.character.name}
            run={run}
            pending={pending}
            message={message}
            onChoose={onChoose}
            onMessageChange={onMessageChange}
            onSubmitMessage={onSubmitMessage}
          />
        ) : run.ending ? (
          <div className="annieStoryEnding">
            <p className="annieStoryEyebrow">本轮结局</p>
            <h2>{run.ending.title}</h2>
            <p>{run.ending.summary}</p>
            <button
              className="annieStoryPrimaryButton"
              type="button"
              disabled={pending}
              onClick={onRestart}
            >
              <RotateCcw aria-hidden="true" />
              <span>{pending ? "正在回到雨夜……" : "重新开始"}</span>
            </button>
          </div>
        ) : null}
      </section>

      <StoryContinuity
        run={run}
        completedRunSummaries={completedRunSummaries}
      />
    </div>
  )
}

function StoryTimeline({
  detail,
  run,
}: {
  detail: StoryWorldCharacterDetail
  run: StoryRun
}) {
  return (
    <div className="annieStoryTimeline" aria-live="polite">
      {run.events.map((event) => {
        const messageEvent = event.type === "message"
        return (
          <article
            key={event.id}
            className={`annieStoryEvent annieStoryEvent--${event.role || event.type}`}
          >
            <span>
              {event.role === "character"
                ? detail.character.name
                : event.role === "player"
                  ? "你"
                  : messageEvent
                    ? "故事"
                    : detail.story_world.title}
            </span>
            <p>{event.content}</p>
          </article>
        )
      })}
    </div>
  )
}

function StoryActions({
  characterName,
  run,
  pending,
  message,
  onChoose,
  onMessageChange,
  onSubmitMessage,
}: {
  characterName: string
  run: StoryRun
  pending: boolean
  message: string
  onChoose: (choiceId: string) => void
  onMessageChange: (message: string) => void
  onSubmitMessage: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div className="annieStoryActionsPanel">
      <div className="annieStoryChoices">
        {run.current_node.choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            disabled={pending}
            onClick={() => onChoose(choice.id)}
          >
            {choice.label}
          </button>
        ))}
      </div>
      <form className="annieStoryMessageForm" onSubmit={onSubmitMessage}>
        <label htmlFor="annie-story-message">对{characterName}说</label>
        <div>
          <textarea
            id="annie-story-message"
            value={message}
            maxLength={1000}
            rows={2}
            disabled={pending}
            onChange={(event) => onMessageChange(event.target.value)}
            placeholder="写下你的回应"
          />
          <button
            type="submit"
            disabled={pending || !message.trim()}
            aria-label="发送回应"
          >
            <Send aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  )
}

function StoryContinuity({
  run,
  completedRunSummaries,
}: {
  run: StoryRun
  completedRunSummaries: StoryRun["completed_run_summaries"]
}) {
  return (
    <aside className="annieStoryContinuity" aria-label="关系与回访">
      <section className="annieStoryContinuitySection">
        <div className="annieStoryContinuityHeading">
          <HeartHandshake aria-hidden="true" />
          <p className="annieStoryEyebrow">关系</p>
        </div>
        <h2>{run.relationship.label}</h2>
        <p>{run.relationship.last_change_reason || run.relationship.attitude}</p>
      </section>

      <section className="annieStoryContinuitySection">
        <div className="annieStoryContinuityHeading">
          <BookMarked aria-hidden="true" />
          <p className="annieStoryEyebrow">留下的结局</p>
        </div>
        {completedRunSummaries.length > 0 ? (
          <ol className="annieStoryEndingList">
            {completedRunSummaries.map((summary) => (
              <li key={summary.story_run_id}>
                <span aria-hidden="true" />
                <div>
                  <strong>{summary.title}</strong>
                  <p>{summary.summary}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="annieStoryContinuityEmpty">还没有留下结局</p>
        )}
      </section>
    </aside>
  )
}
