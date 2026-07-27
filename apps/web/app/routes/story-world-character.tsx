import type { ClientLoaderFunctionArgs } from "react-router"
import { ArrowLeft, Feather, ShieldCheck } from "lucide-react"
import { Link, useLoaderData } from "react-router"

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

      <section className="annieStoryHero" aria-labelledby="story-character-name">
        <div className="annieStoryHeroArt">
          <img
            className="annieStoryHeroPortrait"
            src={route.portrait}
            alt={`${detail.character.name}角色立绘`}
          />
          <span>{detail.story_world.title}</span>
        </div>
        <div className="annieStoryHeroCopy">
          <p className="annieStoryEyebrow">{route.sceneLabel}</p>
          <h1 id="story-character-name">{detail.character.name}</h1>
          <p className="annieStorySituation">{detail.character.current_situation}</p>
          <div className="annieStoryRole">
            <ShieldCheck aria-hidden="true" />
            <div>
              <span>你在这个故事里是</span>
              <strong>{detail.player_role.name}</strong>
              <p>{detail.player_role.background}</p>
            </div>
          </div>
          <Link
            className="annieStoryPrimaryButton"
            to={characterStoryPath(route.slug)}
          >
            <Feather aria-hidden="true" />
            <span>去见{detail.character.name}</span>
          </Link>
        </div>
      </section>
    </main>
  )
}
