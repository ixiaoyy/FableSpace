import type { ClientLoaderFunctionArgs, MetaFunction } from "react-router"
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  CircleAlert,
  LoaderCircle,
  MessageCircle,
} from "lucide-react"
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
  type PublishedStory,
  type StoryExperienceMode,
  type StoryRun,
  type StoryWorldCharacterDetail,
} from "../lib/story-worlds"
import { WEB_PATHS } from "../lib/web-routes"

import "./story-world-character.css"

type CharacterContinuity = {
  status: "anonymous" | "ready" | "unavailable"
  stories: Record<string, {
    status: "ready" | "unavailable"
    run: StoryRun | null
  }>
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
      continuity: { status: "anonymous", stories: {} },
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
      stories: {},
    }

    try {
      const access = await getAccessStatus()
      if (access.access_allowed && access.user) {
        const storyEntries = await Promise.all(
          detail.stories.map(async (story) => {
            try {
              const run = await getCurrentStoryRun(
                route.storyWorldId,
                story.id,
                route.characterId,
              )
              return [
                story.id,
                run && run.story.id !== story.id
                  ? { status: "unavailable", run: null }
                  : { status: "ready", run },
              ] as const
            } catch {
              return [
                story.id,
                { status: "unavailable", run: null },
              ] as const
            }
          }),
        )
        continuity = {
          status: "ready",
          stories: Object.fromEntries(storyEntries),
        }
      }
    } catch {
      continuity = {
        status: "unavailable",
        stories: {},
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
      continuity: { status: "anonymous", stories: {} },
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

/** Return the single product action allowed for one explicit story experience and run state. */
function storyActionLabel(story: PublishedStory, run: StoryRun | null) {
  if (story.experience_mode === "character_growth") {
    return run ? "继续聊天" : "聊天"
  }
  if (!run) return "进入故事"
  return run.status === "active" ? "继续调查" : "查看结局"
}

/** Project a concise, server-backed status for a Character detail experience card. */
function storyStatusLabel(
  run: StoryRun | null,
  unavailable: boolean,
  anonymous: boolean,
) {
  if (unavailable) return "进度不可用"
  if (anonymous) return "尚未登录"
  if (!run) return "未开始"
  if (run.status === "active") return `${run.player_role.name} · 进行中`
  return run.ending?.title || "已完成"
}

/** Render one explicit experience group without inventing empty content or tutorial copy. */
function CharacterExperienceGroup({
  mode,
  stories,
  detail,
  continuity,
  newRunsUnavailable,
  slug,
  playerRoleId,
}: {
  mode: StoryExperienceMode
  stories: PublishedStory[]
  detail: StoryWorldCharacterDetail
  continuity: CharacterContinuity
  newRunsUnavailable: boolean
  slug: string
  playerRoleId: string
}) {
  if (stories.length === 0) return null
  const growth = mode === "character_growth"
  const Icon = growth ? MessageCircle : BookOpenText
  const title = growth ? "角色成长" : "剧情故事"

  return (
    <section
      className="annieCharacterExperienceGroup"
      data-experience-mode={mode}
      aria-labelledby={`annie-experience-${mode}`}
    >
      <header className="annieCharacterExperienceHeading">
        <span aria-hidden="true"><Icon /></span>
        <h2 id={`annie-experience-${mode}`}>{title}</h2>
      </header>
      <div className="annieCharacterExperienceList">
        {stories.map((story) => {
          const continuityEntry = continuity.stories[story.id]
          const unavailable = continuity.status === "unavailable"
            || continuityEntry?.status === "unavailable"
          const run = continuityEntry?.status === "ready"
            ? continuityEntry.run
            : null
          const blockedNewRun = newRunsUnavailable && run === null
          const needsRole = !run && detail.player_roles.length > 1
          const disabled = unavailable || (needsRole && !playerRoleId)
          const href = run
            ? characterStoryPath(slug, story.id)
            : characterStoryPath(slug, story.id, playerRoleId)
          const actionLabel = storyActionLabel(story, run)

          return (
            <article className="annieCharacterExperienceCard" key={story.id}>
              <span className="annieCharacterExperienceType">
                <Icon aria-hidden="true" />
                {title}
              </span>
              <h3>{story.title}</h3>
              <small id={`annie-story-status-${story.id}`}>
                {storyStatusLabel(
                  run,
                  unavailable,
                  continuity.status === "anonymous",
                )}
              </small>
              {blockedNewRun ? null : disabled ? (
                <button
                  type="button"
                  disabled
                  aria-describedby={`annie-story-status-${story.id}`}
                >
                  <span>{actionLabel}</span>
                  <ArrowRight aria-hidden="true" />
                </button>
              ) : (
                <Link
                  to={href}
                  aria-describedby={`annie-story-status-${story.id}`}
                >
                  <span>{actionLabel}</span>
                  <ArrowRight aria-hidden="true" />
                </Link>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default function StoryWorldCharacterRoute() {
  const { detail, continuity, slug, error } = useLoaderData<typeof clientLoader>()
  const route = resolveCharacterRoute(slug)
  const revalidator = useRevalidator()
  const solePlayerRoleId = detail?.player_roles.length === 1
    ? detail.player_roles[0].id
    : ""
  const [playerRoleSelection, setPlayerRoleSelection] = useState(() => ({
    slug,
    playerRoleId: solePlayerRoleId,
  }))

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

  const selectedPlayerRoleId = playerRoleSelection.slug === slug
    && detail.player_roles.some(
      (playerRole) => playerRole.id === playerRoleSelection.playerRoleId,
    )
    ? playerRoleSelection.playerRoleId
    : solePlayerRoleId
  const growthStories = detail.stories.filter(
    (story) => story.experience_mode === "character_growth",
  )
  const narrativeStories = detail.stories.filter(
    (story) => story.experience_mode === "narrative_story",
  )
  const primaryStory = detail.stories.find((story) => (
    continuity.stories[story.id]?.status === "ready"
    && continuity.stories[story.id].run?.status === "active"
  )) || detail.stories.find((story) => (
    continuity.stories[story.id]?.status === "ready"
    && continuity.stories[story.id].run
  )) || detail.stories[0] || null
  const primaryContinuity = primaryStory
    ? continuity.stories[primaryStory.id]
    : null
  const primaryRun = primaryContinuity?.status === "ready"
    ? primaryContinuity.run
    : null
  const latestCharacterMessage = primaryRun
    ? [...primaryRun.events].reverse().find((event) => (
        event.type === "message"
        && event.role === "character"
        && event.character_id === detail.character.id
      ))
    : null
  const currentSituation = primaryRun
    ? primaryRun.status === "completed"
      ? primaryRun.ending?.summary || primaryRun.current_node.narration
      : primaryRun.current_node.narration
    : primaryStory?.current_situation || detail.story_world.summary
  const characterPresence = latestCharacterMessage?.content
    || primaryRun?.current_node.narration
    || primaryStory?.opening_preview
    || detail.story_world.summary
  const continuityUnavailable = continuity.status === "unavailable"
    || Object.values(continuity.stories).some(
      (storyContinuity) => storyContinuity.status === "unavailable",
    )
  const hasConfirmedNewStory = continuity.status === "anonymous"
    ? detail.stories.length > 0
    : continuity.status === "ready" && detail.stories.some((story) => (
      continuity.stories[story.id]?.status === "ready"
      && continuity.stories[story.id].run === null
    ))
  const showIdentitySelection = !continuityUnavailable
    && hasConfirmedNewStory
    && detail.player_roles.length > 1

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

        {continuityUnavailable ? (
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
        ) : null}

        {showIdentitySelection ? (
          <section className="annieCharacterRoleStep" aria-labelledby="annie-role-heading">
            <div className="annieCharacterRoleHeading">
              <div>
                <p className="annieStoryEyebrow">你的身份</p>
                <h2 id="annie-role-heading">这一次，你是谁？</h2>
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
                  disabled={false}
                  onSelect={() => setPlayerRoleSelection({
                    slug,
                    playerRoleId: playerRole.id,
                  })}
                />
              ))}
            </div>
          </section>
        ) : null}

        {detail.stories.length > 0 ? (
          <div className="annieCharacterExperiences">
            <CharacterExperienceGroup
              mode="character_growth"
              stories={growthStories}
              detail={detail}
              continuity={continuity}
              newRunsUnavailable={continuityUnavailable}
              slug={slug}
              playerRoleId={selectedPlayerRoleId}
            />
            <CharacterExperienceGroup
              mode="narrative_story"
              stories={narrativeStories}
              detail={detail}
              continuity={continuity}
              newRunsUnavailable={continuityUnavailable}
              slug={slug}
              playerRoleId={selectedPlayerRoleId}
            />
          </div>
        ) : (
          <div className="annieCharacterContinuityError" role="status">
            <CircleAlert aria-hidden="true" />
            <strong>暂无可进入故事</strong>
          </div>
        )}
      </section>
    </main>
  )
}
