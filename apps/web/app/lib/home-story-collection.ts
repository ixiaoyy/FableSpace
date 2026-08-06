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
  stories: StoryWorldCharacterDetail["stories"]
}

export type HomeStoryContinuity = {
  status: "anonymous" | "ready" | "unavailable"
  identity: CurrentSessionIdentity | null
  runsByStory: Record<string, StoryRunContinuity | null>
}

export const EMPTY_HOME_STORY_CONTINUITY: HomeStoryContinuity = {
  status: "anonymous",
  identity: null,
  runsByStory: {},
}

/** Return the stable in-memory key for one world-scoped reviewed Story. */
export function homeStoryContinuityKey(storyWorldId: string, storyId: string) {
  return `${storyWorldId}:${storyId}`
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
        stories: detail.stories,
      }
    }),
  )
}

/**
 * Load private homepage continuity only after the trusted session confirms a player.
 * Reads are deduplicated by explicit world and Story IDs; ambiguous Character entries are left for their detail page.
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

  const storyScopes = new Map<string, { storyWorldId: string; storyId: string }>()
  for (const entry of characters) {
    if (entry.stories.length !== 1) continue
    const storyId = entry.stories[0].id
    const key = homeStoryContinuityKey(entry.storyWorld.id, storyId)
    storyScopes.set(key, { storyWorldId: entry.storyWorld.id, storyId })
  }

  const runEntries = await Promise.all(
    [...storyScopes.entries()].map(async ([key, scope]) => {
      try {
        const continuity = await getStoryRunContinuity(
          scope.storyWorldId,
          scope.storyId,
        )
        return [
          key,
          continuity?.story_id === scope.storyId ? continuity : null,
        ] as const
      } catch {
        return [key, null] as const
      }
    }),
  )
  return {
    status: "ready",
    identity: access.user,
    runsByStory: Object.fromEntries(runEntries),
  }
}
