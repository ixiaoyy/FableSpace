import { mediaAssetUrl } from "./media-assets"

export type CharacterRoute = {
  slug: string
  storyWorldId: string
  characterId: string
  sceneLabel: string
  portrait: string
  theme: "broad-street" | "palace"
}

export const CHARACTER_ROUTES = [
  {
    slug: "annie",
    storyWorldId: "history_broad_street_water_1854",
    characterId: "char_history_broad_street_annie",
    sceneLabel: "伦敦宽街 · 1854",
    portrait: mediaAssetUrl(
      "app/assets/home-story-bookshelf/v1/characters/char_history_broad_street_annie.webp",
    ),
    theme: "broad-street",
  },
  {
    slug: "wei",
    storyWorldId: "story_palace_snow_edict",
    characterId: "char_story_palace_eunuch_wei",
    sceneLabel: "长明宫 · 五更前",
    portrait: mediaAssetUrl(
      "app/assets/home-story-bookshelf/v1/characters/char_story_palace_eunuch_wei.webp",
    ),
    theme: "palace",
  },
  {
    slug: "mingzhu",
    storyWorldId: "story_palace_snow_edict",
    characterId: "char_story_palace_princess_xiao",
    sceneLabel: "长明宫 · 五更前",
    portrait: mediaAssetUrl(
      "app/assets/home-story-bookshelf/v1/characters/char_story_palace_princess_xiao.webp",
    ),
    theme: "palace",
  },
] as const satisfies readonly CharacterRoute[]

export const ANNIE_CHARACTER_ROUTE = CHARACTER_ROUTES[0]

export function resolveCharacterRoute(slug: string) {
  return CHARACTER_ROUTES.find((route) => route.slug === slug) || null
}

export function resolveCharacterRouteById(characterId: string) {
  return CHARACTER_ROUTES.find((route) => route.characterId === characterId) || null
}

export function characterPath(slug: string) {
  return `/characters/${encodeURIComponent(slug)}`
}

export function characterStoryPath(slug: string) {
  return `${characterPath(slug)}/story`
}
