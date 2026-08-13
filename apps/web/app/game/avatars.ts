import { gameAssetUrl } from "./constants"

export const AVATAR_IDS = {
  male: "male",
  female: "female",
} as const

export type AvatarId = typeof AVATAR_IDS[keyof typeof AVATAR_IDS]

export type AvatarDefinition = {
  readonly id: AvatarId
  readonly label: string
  readonly url: string
  readonly texture: {
    readonly sheetWidth: number
    readonly sheetHeight: number
    readonly frameWidth: number
    readonly frameHeight: number
    readonly previewFrame: number
  }
}

const PLAYER_TEXTURE_METADATA = {
  sheetWidth: 64,
  sheetHeight: 112,
  frameWidth: 16,
  frameHeight: 16,
  previewFrame: 0,
} as const

export const AVATAR_OPTIONS = [
  {
    id: AVATAR_IDS.male,
    label: "男角色",
    url: gameAssetUrl("assets/vendor/ninja-adventure/2024-04-19/player.png"),
    texture: PLAYER_TEXTURE_METADATA,
  },
  {
    id: AVATAR_IDS.female,
    label: "女角色",
    url: gameAssetUrl("assets/vendor/ninja-adventure/2024-04-19/player-female.png"),
    texture: PLAYER_TEXTURE_METADATA,
  },
] as const satisfies readonly AvatarDefinition[]

export const AVATARS: Readonly<Record<AvatarId, AvatarDefinition>> = {
  [AVATAR_IDS.male]: AVATAR_OPTIONS[0],
  [AVATAR_IDS.female]: AVATAR_OPTIONS[1],
}

/** Validate one unknown value against the closed set of playable avatar identifiers. */
export function isAvatarId(value: unknown): value is AvatarId {
  return value === AVATAR_IDS.male || value === AVATAR_IDS.female
}

/** Return the reviewed asset and frame metadata for one validated avatar identifier. */
export function getAvatar(avatarId: AvatarId): AvatarDefinition {
  return AVATARS[avatarId]
}
