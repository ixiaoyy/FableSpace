import type { ClientLoaderFunctionArgs } from "react-router"
import { ArrowLeft, Feather, RotateCcw, Send, ShieldCheck } from "lucide-react"
import { FormEvent, useEffect, useState } from "react"
import { Link, useLoaderData } from "react-router"

import { HistoricalBroadStreetVisual } from "../components/historical-broad-street-visual"
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
import { WEB_PATHS } from "../lib/web-routes"

import "./story-world-character.css"

type LoaderData = {
  detail: StoryWorldCharacterDetail | null
  error: string
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
  const [run, setRun] = useState<StoryRun | null>(null)
  const [runLoading, setRunLoading] = useState(Boolean(detail))
  const [pending, setPending] = useState(false)
  const [actionError, setActionError] = useState("")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!detail) return
    let active = true
    void getCurrentStoryRun(detail.story_world.id)
      .then((current) => {
        if (active) setRun(current)
      })
      .catch((reason) => {
        if (active) {
          setActionError(reason instanceof Error ? reason.message : "故事进度暂时无法读取。")
        }
      })
      .finally(() => {
        if (active) setRunLoading(false)
      })
    return () => {
      active = false
    }
  }, [detail])

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

  async function runAction(action: () => Promise<StoryRun | null>) {
    setPending(true)
    setActionError("")
    try {
      const nextRun = await action()
      if (nextRun) setRun(nextRun)
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "这一步暂时没有完成。")
    } finally {
      setPending(false)
    }
  }

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = message.trim()
    if (!run || !content) return
    setPending(true)
    setActionError("")
    void sendStoryMessage(storyWorldId, run.id, content)
      .then((nextRun) => {
        if (nextRun) setRun(nextRun)
        setMessage("")
      })
      .catch((reason) => {
        setActionError(reason instanceof Error ? reason.message : "安妮暂时没有回应。")
      })
      .finally(() => setPending(false))
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
          {!run && !runLoading ? (
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

      {runLoading ? <p className="annieStoryStatus">正在找回你们上次停下的地方……</p> : null}
      {actionError ? <p className="annieStoryError" role="alert">{actionError}</p> : null}

      {run ? (
        <section className="annieStoryRun" aria-label="安妮的故事">
          <div className="annieStoryRunHeading">
            <div>
              <p className="annieStoryEyebrow">关系</p>
              <h2>{run.relationship.label}</h2>
            </div>
            <p>{run.relationship.last_change_reason || run.relationship.attitude}</p>
          </div>

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
                          : "宽街"}
                  </span>
                  <p>{event.content}</p>
                </article>
              )
            })}
          </div>

          {run.status === "active" ? (
            <div className="annieStoryActionsPanel">
              <div className="annieStoryChoices">
                {run.current_node.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    disabled={pending}
                    onClick={() => void runAction(
                      () => chooseStoryPath(storyWorldId, run.id, choice.id),
                    )}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
              <form className="annieStoryMessageForm" onSubmit={submitMessage}>
                <label htmlFor="annie-story-message">也可以先对安妮说一句话</label>
                <div>
                  <textarea
                    id="annie-story-message"
                    value={message}
                    maxLength={1000}
                    rows={2}
                    disabled={pending}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="写下你的回应"
                  />
                  <button type="submit" disabled={pending || !message.trim()} aria-label="发送回应">
                    <Send aria-hidden="true" />
                  </button>
                </div>
              </form>
            </div>
          ) : run.ending ? (
            <div className="annieStoryEnding">
              <p className="annieStoryEyebrow">本轮结局</p>
              <h2>{run.ending.title}</h2>
              <p>{run.ending.summary}</p>
              <button
                className="annieStoryPrimaryButton"
                type="button"
                disabled={pending}
                onClick={() => void runAction(() => restartStoryRun(storyWorldId))}
              >
                <RotateCcw aria-hidden="true" />
                <span>{pending ? "正在回到雨夜……" : "重新开始"}</span>
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

    </main>
  )
}
