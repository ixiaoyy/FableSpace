export const TILE_SIZE = 16
export const GAME_WIDTH = 480
export const GAME_HEIGHT = 320
export const FARM_WORLD_WIDTH = 640
export const FARM_WORLD_HEIGHT = 480
export const HOME_WORLD_WIDTH = GAME_WIDTH
export const HOME_WORLD_HEIGHT = GAME_HEIGHT
export const PLAYER_SPEED = 92

const DEFAULT_GAME_MEDIA_BASE_URL = "/game-media/v1"

/** Return the configured game media base URL without a trailing slash. */
function resolveGameMediaBaseUrl(): string {
  const configured = String(import.meta.env.VITE_MEDIA_BASE_URL || "").trim()
  return (configured || DEFAULT_GAME_MEDIA_BASE_URL).replace(/\/+$/, "")
}

const GAME_MEDIA_BASE_URL = resolveGameMediaBaseUrl()

/** Build one immutable CDN URL for a registered game asset object key. */
export function gameAssetUrl(objectKey: string): string {
  return `${GAME_MEDIA_BASE_URL}/${objectKey}`
}

export const GAME_ASSET_URLS = {
  floor: gameAssetUrl("assets/vendor/ninja-adventure/2024-04-19/floor.png"),
  village: gameAssetUrl("assets/vendor/ninja-adventure/2024-04-19/village.png"),
  interiorFloor: gameAssetUrl("assets/vendor/ninja-adventure/2024-04-19/interior-floor.png"),
  wall: gameAssetUrl("assets/vendor/ninja-adventure/2024-04-19/wall.png"),
} as const

export const GAME_TEXTURE_KEYS = {
  player: "player",
  floor: "floor",
  village: "village",
  interiorFloor: "interior-floor",
  wall: "wall",
  farmGrass: "farm-grass",
  farmGrassDetail: "farm-grass-detail",
  farmPath: "farm-path",
  farmPathDetail: "farm-path-detail",
  homeFloor: "home-floor",
  house: "farm-house",
  tree: "farm-tree",
  treeSmall: "farm-tree-small",
  rock: "farm-rock",
  rockSmall: "farm-rock-small",
} as const

export const GAME_ANIMATION_KEYS = {
  walkDown: "player-walk-down",
  walkUp: "player-walk-up",
  walkLeft: "player-walk-left",
  walkRight: "player-walk-right",
} as const
