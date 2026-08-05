import type { ClientLoaderFunctionArgs, MetaFunction } from "react-router"
import { ArrowLeft, CircleAlert, Feather, LoaderCircle } from "lucide-react"
import { useState } from "react"
import { Link, useLoaderData, useRevalidator } from "react-router"

import { PlayerRoleOption } from "../components/player-role-option"
import {
  characterStoryPath,
  resolveCharacterRoute,
} from "../lib/character-routes"
import { getAccessStatus } from "../lib/session"
import {
  getCurrentStoryRun,
  getStoryWorldCharacter,
  type StoryRun,
  type StoryWorldCharacterDetail,
} from "../lib/story-worlds"
import { WEB_PATHS } from "../lib/web-routes"

import "./story-world-character.css"

type CharacterContinuity = {
  status: "anonymous" | "ready" | "unavailable"
  run: StoryRun | null
}

type LoaderData = {
  detail: StoryWorldCharacterDetail | null
  continuity: CharacterContinuity
  slug: string
  error: string
}

export async function clientLoader({ params }: ClientLoaderFunctionArgs): Promise<LoaderData> {
  const route = resolveCharacterRoute(params.characterSlug || "")
  if (!route) {
    return {
      detail: null,
      continuity: { status: "anonymous", run: null },
      slug: "",
      error: "这个角色尚未公开。",
    }
  }

  try {
    const detail = await getStoryWorldCharacter(
      route.storyWorldId,
      route.characterId,
    )
    let continuity: CharacterContinuity = {
      status: "anonymous",
      run: null,
    }

    try {
      const access = await getAccessStatus()
      if (access.access_allowed && access.user) {
        continuity = {
          status: "ready",
          run: await getCurrentStoryRun(
            route.storyWorldId,
            route.characterId,
          ),
        }
      }
    } catch {
      continuity = {
        status: "unavailable",
        run: null,
      }
    }

    return {
      detail,
      continuity,
      slug: route.slug,
      error: "",
    }
  } catch (error) {
    return {
      detail: null,
      continuity: { status: "anonymous", run: null },
      slug: route.slug,
      error: error instanceof Error ? error.message : "故事暂时无法打开。",
    }
  }
}

/** Use the loaded public Character name in the detail page browser title. */
export const meta: MetaFunction<typeof clientLoader> = ({ data }) => [{
  title: data?.detail
    ? `${data.detail.character.name}｜FableSpace`
    : "角色｜FableSpace",
}]

export default function StoryWorldCharacterRoute() {
  const { detail, continuity, slug, error } = useLoaderData<typeof clientLoader>()
  const route = resolveCharacterRoute(slug)
  const revalidator = useRevalidator()
  const [selectedPlayerRoleId, setSelectedPlayerRoleId] = useState("")

  if (!detail || !route) {
    return (
      <main className="annieStoryShell annieStoryCentered">
        <p className="annieStoryEyebrow">FableSpace</p>
        <h1>没有找到这段故事</h1>
        <p>{error || "这个角色尚未公开。"}</p>
        <Link className="annieStoryPrimaryButton" to={WEB_PATHS.home}>返回角色</Link>
      </main>
    )
  }

  const run = continuity.run
  const latestCharacterMessage = run
    ? [...run.events].reverse().find((event) => (
        event.type === "message"
        && event.role === "character"
        && event.character_id === detail.character.id
      ))
    : null
  const currentSituation = run
    ? run.status === "completed"
      ? run.ending?.summary || run.current_node.narration
      : run.current_node.narration
    : detail.character.current_situation
  const characterPresence = latestCharacterMessage?.content
    || run?.current_node.narration
    || detail.character.opening_preview

  return (
    <main
      className="annieStoryShell annieCharacterShell"
      data-story-theme={route.theme}
    >
      <header className="annieStoryHeader">
        <Link to={WEB_PATHS.home} aria-label="返回角色首页">
          <ArrowLeft aria-hidden="true" />
        </Link>
        <span>FableSpace</span>
        <small>{detail.story_world.genre}</small>
      </header>

      <section className="annieCharacterEntry" aria-labelledby="story-character-name">
        <div className="annieCharacterIntro">
          <div className="annieCharacterStoryCopy">
            <p className="annieStoryEyebrow">{route.sceneLabel}</p>
            <span>{detail.story_world.title}</span>
            <h1 id="story-character-name">{detail.character.name}</h1>
            <p className="annieCharacterScene">{currentSituation}</p>
          </div>

          <article className="annieCharacterPresence">
            <img
              src={detail.character.portrait_url || route.portrait}
              alt={`${detail.character.name}头像`}
            />
            <div>
              <span>{detail.character.name}</span>
              <p>{characterPresence}</p>
            </div>
          </article>
        </div>

        {continuity.status === "unavailable" ? (
          <div className="annieCharacterContinuityError" role="alert">
            <CircleAlert aria-hidden="true" />
            <strong>当前进度暂时无法载入</strong>
            <button
              className="annieStoryRecoveryButton"
              type="button"
              disabled={revalidator.state !== "idle"}
              onClick={() => revalidator.revalidate()}
            >
              {revalidator.state !== "idle" ? (
                <LoaderCircle aria-hidden="true" />
              ) : null}
              <span>
                {revalidator.state !== "idle" ? "正在载入" : "重新载入"}
              </span>
            </button>
          </div>
        ) : run ? (
          <>
            <div className="annieCharacterRoleStep annieCharacterRoleStep--continuation">
              <div className="annieCharacterRoleHeading">
                <div>
                  <p className="annieStoryEyebrow">
                    {run.status === "active" ? "当前轮次" : "本轮结局"}
                  </p>
                  <h2>
                    {run.status === "active"
                      ? run.player_role.name
                      : run.ending?.title || "故事已经结束"}
                  </h2>
                </div>
                <span
                  className="annieCharacterRunStatus"
                  data-status={run.status}
                >
                  {run.status === "active"
                    ? "进行中"
                    : `${run.player_role.name} · 已完成`}
                </span>
              </div>
            </div>

            <div className="annieCharacterActions">
              <Link
                className="annieStoryPrimaryButton"
                to={characterStoryPath(route.slug)}
              >
                <Feather aria-hidden="true" />
                <span>{run.status === "active" ? "继续对话" : "查看结局"}</span>
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="annieCharacterRoleStep">
              <div className="annieCharacterRoleHeading">
                <p className="annieStoryEyebrow">你的身份</p>
                <h2>这一次，你是谁？</h2>
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
                    disabled={false}
                    onSelect={() => setSelectedPlayerRoleId(playerRole.id)}
                  />
                ))}
              </div>
            </div>

            <div className="annieCharacterActions">
              {selectedPlayerRoleId ? (
                <Link
                  className="annieStoryPrimaryButton"
                  to={characterStoryPath(route.slug, selectedPlayerRoleId)}
                >
                  <Feather aria-hidden="true" />
                  <span>去见{detail.character.name}</span>
                </Link>
              ) : (
                <button className="annieStoryPrimaryButton" type="button" disabled>
                  <Feather aria-hidden="true" />
                  <span>先选一个身份</span>
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  )
}
