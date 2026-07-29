import type { ClientLoaderFunctionArgs } from "react-router"
import { ArrowLeft, Feather } from "lucide-react"
import { useState } from "react"
import { Link, useLoaderData } from "react-router"

import { PlayerRoleOption } from "../components/player-role-option"
import {
  characterStoryPath,
  resolveCharacterRoute,
} from "../lib/character-routes"
import { getStoryWorldCharacter, type StoryWorldCharacterDetail } from "../lib/story-worlds"
import { WEB_PATHS } from "../lib/web-routes"

import "./story-world-character.css"

type LoaderData = {
  detail: StoryWorldCharacterDetail | null
  slug: string
  error: string
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

export default function StoryWorldCharacterRoute() {
  const { detail, slug, error } = useLoaderData<typeof clientLoader>()
  const route = resolveCharacterRoute(slug)
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
            <p className="annieCharacterScene">{detail.character.current_situation}</p>
          </div>

          <article className="annieCharacterPresence">
            <img
              src={detail.character.portrait_url || route.portrait}
              alt={`${detail.character.name}头像`}
            />
            <div>
              <span>{detail.character.name}</span>
              <p>{detail.character.opening_preview}</p>
            </div>
          </article>
        </div>

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
      </section>
    </main>
  )
}
