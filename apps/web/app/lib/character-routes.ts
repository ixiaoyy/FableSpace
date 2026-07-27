type CharacterRoute = {
  slug: string
  storyWorldId: string
  characterId: string
}

const CHARACTER_ROUTES = [
  {
    slug: "annie",
    storyWorldId: "history_broad_street_water_1854",
    characterId: "char_history_broad_street_annie",
  },
] as const satisfies readonly CharacterRoute[]

export const ANNIE_CHARACTER_ROUTE = CHARACTER_ROUTES[0]

export function resolveCharacterRoute(slug: string) {
  return CHARACTER_ROUTES.find((route) => route.slug === slug) || null
}

export function characterPath(slug: string) {
  return `/characters/${encodeURIComponent(slug)}`
}

export function characterStoryPath(slug: string) {
  return `${characterPath(slug)}/story`
}
