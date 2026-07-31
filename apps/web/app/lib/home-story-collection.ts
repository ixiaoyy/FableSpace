import { CHARACTER_ROUTES } from "./character-routes"
import {
  getStoryWorldCharacter,
  type StoryWorldCharacterDetail,
} from "./story-worlds"

export type HomeStoryCharacter = {
  storyWorld: StoryWorldCharacterDetail["story_world"]
  character: StoryWorldCharacterDetail["character"]
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
