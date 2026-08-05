import { CHARACTER_ROUTES } from "./character-routes"
import {
  getAccessStatus,
  type AccessStatus,
  type CurrentSessionIdentity,
} from "./session"
import {
  getStoryRunContinuity,
  getStoryWorldCharacter,
  type StoryRunContinuity,
  type StoryWorldCharacterDetail,
} from "./story-worlds"

export type HomeStoryCharacter = {
  storyWorld: StoryWorldCharacterDetail["story_world"]
  character: StoryWorldCharacterDetail["character"]
}

export type HomeStoryContinuity = {
  status: "anonymous" | "ready" | "unavailable"
  identity: CurrentSessionIdentity | null
  runsByStoryWorld: Record<string, StoryRunContinuity | null>
}

export const EMPTY_HOME_STORY_CONTINUITY: HomeStoryContinuity = {
  status: "anonymous",
  identity: null,
  runsByStoryWorld: {},
}

/**
 * Load the reviewed homepage characters through the canonical StoryWorld detail contract.
 * Every response must match its stable frontend route identity; mismatches fail the whole real-data collection.
 */
export async function loadHomeStoryCollection(): Promise<HomeStoryCharacter[]> {
  return Promise.all(
    CHARACTER_ROUTES.map(async (route) => {
      const detail = await getStoryWorldCharacter(
        route.storyWorldId,
        route.characterId,
      )
      if (
        detail.story_world.id !== route.storyWorldId
        || detail.character.id !== route.characterId
      ) {
        throw new Error("角色入口暂不可用")
      }

      return {
        storyWorld: detail.story_world,
        character: detail.character,
      }
    }),
  )
}

/**
 * Load private homepage continuity only after the trusted session confirms a player.
 * One read-only continuity request is issued per StoryWorld; failures stay separate from public Character discovery.
 */
export async function loadHomeStoryContinuity(
  characters: HomeStoryCharacter[],
): Promise<HomeStoryContinuity> {
  let access: AccessStatus
  try {
    access = await getAccessStatus()
  } catch {
    return { ...EMPTY_HOME_STORY_CONTINUITY, status: "unavailable" }
  }

  if (!access.access_allowed || !access.user) {
    return EMPTY_HOME_STORY_CONTINUITY
  }

  const storyWorldIds = [...new Set(
    characters.map((entry) => entry.storyWorld.id),
  )]

  try {
    const runEntries = await Promise.all(
      storyWorldIds.map(async (storyWorldId) => ([
        storyWorldId,
        await getStoryRunContinuity(storyWorldId),
      ] as const)),
    )
    return {
      status: "ready",
      identity: access.user,
      runsByStoryWorld: Object.fromEntries(runEntries),
    }
  } catch {
    return {
      status: "unavailable",
      identity: access.user,
      runsByStoryWorld: {},
    }
  }
}
