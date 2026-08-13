import { isAvatarId, type AvatarId } from "./avatars"

export const GAME_SAVE_STORAGE_KEY = "farm-game.save.v2"
export const LEGACY_GAME_SAVE_STORAGE_KEY = "farm-game.save.v1"
export const GAME_SAVE_REGISTRY_KEY = "save"

const GAME_SAVE_SCHEMA_VERSION = 2 as const
const LEGACY_GAME_SAVE_SCHEMA_VERSION = 1 as const
const MAX_PLAYER_NAME_LENGTH = 12
const PLAYER_NAME_CONTROL_CHARACTER = /\p{Cc}/u

/** Stable authored spawn identifiers; arbitrary world coordinates are never persisted. */
export const GAME_SPAWN_IDS = {
  farm: {
    start: "start",
    houseDoor: "house-door",
  },
  home: {
    entryDoor: "entry-door",
    nextDay: "next-day",
  },
} as const

export type FarmSpawnId = typeof GAME_SPAWN_IDS.farm[keyof typeof GAME_SPAWN_IDS.farm]
export type HomeSpawnId = typeof GAME_SPAWN_IDS.home[keyof typeof GAME_SPAWN_IDS.home]
export type GameScene = "farm" | "home"
export type GameSpawnId = FarmSpawnId | HomeSpawnId

type PlayerIdentity = {
  readonly player_name: string
  readonly avatar_id: AvatarId
}

export type FarmGameSave = PlayerIdentity & {
  readonly schema_version: typeof GAME_SAVE_SCHEMA_VERSION
  readonly day: number
  readonly scene: "farm"
  readonly spawn_id: FarmSpawnId
}

export type HomeGameSave = PlayerIdentity & {
  readonly schema_version: typeof GAME_SAVE_SCHEMA_VERSION
  readonly day: number
  readonly scene: "home"
  readonly spawn_id: HomeSpawnId
}

export type GameSave = FarmGameSave | HomeGameSave

export type LegacyGameProgress = {
  readonly day: number
  readonly scene: GameScene
  readonly spawn_id: GameSpawnId
}

export type PlayerNameValidation =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly message: string }

export type SaveInspection =
  | { readonly status: "empty" }
  | { readonly status: "current"; readonly save: GameSave }
  | { readonly status: "legacy"; readonly progress: LegacyGameProgress }
  | { readonly status: "invalid"; readonly reason: string }
  | { readonly status: "unavailable"; readonly reason: string }

export type SaveWriteResult =
  | { readonly persisted: true }
  | { readonly persisted: false; readonly error: string }

export type NewGameSaveResult =
  | { readonly save: GameSave; readonly persisted: true }
  | { readonly save: GameSave; readonly persisted: false; readonly error: string }

/** Narrow an unknown JSON value to a non-array object before reading save fields. */
function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** Validate one unknown value against the authored farm spawn identifiers. */
function isFarmSpawnId(value: unknown): value is FarmSpawnId {
  return value === GAME_SPAWN_IDS.farm.start
    || value === GAME_SPAWN_IDS.farm.houseDoor
}

/** Validate one unknown value against the authored home spawn identifiers. */
function isHomeSpawnId(value: unknown): value is HomeSpawnId {
  return value === GAME_SPAWN_IDS.home.entryDoor
    || value === GAME_SPAWN_IDS.home.nextDay
}

/** Validate the shared positive-integer day field at every persistence boundary. */
function isValidDay(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
}

/** Record save recovery or storage failures only in development without interrupting play. */
function reportSaveIssue(message: string, reason?: unknown): void {
  if (!import.meta.env.DEV) return

  if (reason === undefined) {
    console.warn(`[farm-game] ${message}`)
    return
  }

  console.warn(`[farm-game] ${message}`, reason)
}

/** Convert one caught storage failure into a stable, non-sensitive UI message. */
function storageFailureMessage(action: "读取" | "保存"): string {
  return `浏览器不允许${action}本地存档，本次仍可继续游玩。`
}

/**
 * Normalize and validate a player name at both form and persisted-data boundaries.
 * Returns an NFC, trimmed value containing 1–12 Unicode code points and no controls.
 */
export function validatePlayerName(rawName: string): PlayerNameValidation {
  const normalizedInput = rawName.normalize("NFC")

  if (PLAYER_NAME_CONTROL_CHARACTER.test(normalizedInput)) {
    return { ok: false, message: "名字不能包含换行或控制字符。" }
  }

  const normalizedName = normalizedInput.trim()

  if (normalizedName.length === 0) {
    return { ok: false, message: "请输入角色名字。" }
  }

  if (Array.from(normalizedName).length > MAX_PLAYER_NAME_LENGTH) {
    return { ok: false, message: "名字最多 12 个字符。" }
  }

  return { ok: true, value: normalizedName }
}

/**
 * Decode an untrusted parsed value into the closed v2 save union.
 * Returns null unless identity, day, scene, and authored spawn pairing are all valid.
 */
export function decodeGameSave(value: unknown): GameSave | null {
  if (
    !isUnknownRecord(value)
    || value.schema_version !== GAME_SAVE_SCHEMA_VERSION
    || !isValidDay(value.day)
    || typeof value.player_name !== "string"
    || !isAvatarId(value.avatar_id)
  ) {
    return null
  }

  const playerName = validatePlayerName(value.player_name)
  if (!playerName.ok) return null

  const identity: PlayerIdentity = {
    player_name: playerName.value,
    avatar_id: value.avatar_id,
  }

  if (value.scene === "farm" && isFarmSpawnId(value.spawn_id)) {
    return {
      schema_version: GAME_SAVE_SCHEMA_VERSION,
      ...identity,
      day: value.day,
      scene: "farm",
      spawn_id: value.spawn_id,
    }
  }

  if (value.scene === "home" && isHomeSpawnId(value.spawn_id)) {
    return {
      schema_version: GAME_SAVE_SCHEMA_VERSION,
      ...identity,
      day: value.day,
      scene: "home",
      spawn_id: value.spawn_id,
    }
  }

  return null
}

/** Decode only the former farm-game v1 shape into identity-free migration progress. */
export function decodeLegacyGameProgress(value: unknown): LegacyGameProgress | null {
  if (
    !isUnknownRecord(value)
    || value.schema_version !== LEGACY_GAME_SAVE_SCHEMA_VERSION
    || !isValidDay(value.day)
  ) {
    return null
  }

  if (value.scene === "farm" && isFarmSpawnId(value.spawn_id)) {
    return { day: value.day, scene: "farm", spawn_id: value.spawn_id }
  }

  if (value.scene === "home" && isHomeSpawnId(value.spawn_id)) {
    return { day: value.day, scene: "home", spawn_id: value.spawn_id }
  }

  return null
}

/** Parse one serialized JSON value without allowing malformed input to escape the boundary. */
function parseStoredJson(serializedValue: string): unknown | null {
  try {
    return JSON.parse(serializedValue)
  } catch {
    return null
  }
}

/**
 * Inspect v2 first, then the exact former v1 key only when v2 is absent.
 * Returns explicit entry states and never mutates, migrates, or deletes browser storage.
 */
export function inspectGameSave(): SaveInspection {
  if (typeof window === "undefined") {
    return {
      status: "unavailable",
      reason: "本地存档只能在浏览器中读取，本次仍可创建角色。",
    }
  }

  let currentSerialized: string | null
  try {
    currentSerialized = window.localStorage.getItem(GAME_SAVE_STORAGE_KEY)
  } catch (error) {
    reportSaveIssue("Local save could not be read.", error)
    return { status: "unavailable", reason: storageFailureMessage("读取") }
  }

  if (currentSerialized !== null) {
    const currentSave = decodeGameSave(parseStoredJson(currentSerialized))
    if (currentSave === null) {
      return {
        status: "invalid",
        reason: "这份本地存档已损坏或来自未知版本，请创建新的生活。",
      }
    }
    return { status: "current", save: currentSave }
  }

  let legacySerialized: string | null
  try {
    legacySerialized = window.localStorage.getItem(LEGACY_GAME_SAVE_STORAGE_KEY)
  } catch (error) {
    reportSaveIssue("Legacy local save could not be read.", error)
    return { status: "unavailable", reason: storageFailureMessage("读取") }
  }

  if (legacySerialized === null) return { status: "empty" }

  const legacyProgress = decodeLegacyGameProgress(parseStoredJson(legacySerialized))
  if (legacyProgress === null) {
    return {
      status: "invalid",
      reason: "旧版本地存档无法读取，请创建新的生活。",
    }
  }

  return { status: "legacy", progress: legacyProgress }
}

/**
 * Persist one validated v2 save under the only current game key.
 * Returns a warning result instead of stopping the in-memory session when storage fails.
 */
export function saveGameSave(save: GameSave): SaveWriteResult {
  const normalizedSave = decodeGameSave(save)
  if (normalizedSave === null) {
    const error = "拒绝保存无效的游戏进度。"
    reportSaveIssue(error)
    return { persisted: false, error }
  }

  if (typeof window === "undefined") {
    return { persisted: false, error: storageFailureMessage("保存") }
  }

  try {
    window.localStorage.setItem(
      GAME_SAVE_STORAGE_KEY,
      JSON.stringify(normalizedSave),
    )
    return { persisted: true }
  } catch (error) {
    reportSaveIssue("Local save could not be written; play will continue in memory.", error)
    return { persisted: false, error: storageFailureMessage("保存") }
  }
}

/** Delete the former v1 key only after its upgraded v2 replacement was written successfully. */
function removeLegacySaveAfterUpgrade(): void {
  if (typeof window === "undefined") return

  try {
    window.localStorage.removeItem(LEGACY_GAME_SAVE_STORAGE_KEY)
  } catch (error) {
    reportSaveIssue("Legacy save could not be removed after a successful v2 write.", error)
  }
}

/**
 * Create and persist a first v2 save, optionally retaining validated v1 progress.
 * Invalid names or avatar identifiers are programmer errors because the form validates first.
 */
export function createNewGameSave(
  rawPlayerName: string,
  avatarId: AvatarId,
  legacyProgress?: LegacyGameProgress,
): NewGameSaveResult {
  const playerName = validatePlayerName(rawPlayerName)
  if (playerName.ok === false) throw new Error(playerName.message)
  if (!isAvatarId(avatarId)) throw new Error("请选择一个角色外观。")

  const progress = legacyProgress ?? {
    day: 1,
    scene: "farm" as const,
    spawn_id: GAME_SPAWN_IDS.farm.start,
  }

  const save = decodeGameSave({
    schema_version: GAME_SAVE_SCHEMA_VERSION,
    player_name: playerName.value,
    avatar_id: avatarId,
    day: progress.day,
    scene: progress.scene,
    spawn_id: progress.spawn_id,
  })
  if (save === null) throw new Error("无法创建有效的游戏存档。")

  const writeResult = saveGameSave(save)
  if (writeResult.persisted) removeLegacySaveAfterUpgrade()
  return { save, ...writeResult }
}

/**
 * Build and persist a stable farm transition while preserving identity and the current day.
 * The spawn parameter is restricted to authored farm identifiers.
 */
export function createSceneSave(
  currentSave: GameSave,
  scene: "farm",
  spawnId: FarmSpawnId,
): FarmGameSave

/**
 * Build and persist a stable home transition while preserving identity and the current day.
 * The spawn parameter is restricted to authored home identifiers.
 */
export function createSceneSave(
  currentSave: GameSave,
  scene: "home",
  spawnId: HomeSpawnId,
): HomeGameSave

/** Create, validate, and persist one scene transition without storing world coordinates. */
export function createSceneSave(
  currentSave: GameSave,
  scene: GameScene,
  spawnId: GameSpawnId,
): GameSave {
  const identity: PlayerIdentity = {
    player_name: currentSave.player_name,
    avatar_id: currentSave.avatar_id,
  }
  let nextSave: GameSave

  if (scene === "farm") {
    if (!isFarmSpawnId(spawnId)) {
      throw new Error(`Unknown farm spawn id: ${spawnId}`)
    }

    nextSave = {
      schema_version: GAME_SAVE_SCHEMA_VERSION,
      ...identity,
      day: currentSave.day,
      scene,
      spawn_id: spawnId,
    }
  } else {
    if (!isHomeSpawnId(spawnId)) {
      throw new Error(`Unknown home spawn id: ${spawnId}`)
    }

    nextSave = {
      schema_version: GAME_SAVE_SCHEMA_VERSION,
      ...identity,
      day: currentSave.day,
      scene,
      spawn_id: spawnId,
    }
  }

  saveGameSave(nextSave)
  return nextSave
}

/**
 * Advance exactly one day while retaining identity and selecting the authored wake spawn.
 * Callers must keep this operation inside their sleep transition lock to prevent duplicates.
 */
export function advanceDay(currentSave: GameSave): HomeGameSave {
  if (currentSave.day >= Number.MAX_SAFE_INTEGER) {
    throw new Error("The saved day cannot be advanced safely.")
  }

  const nextDaySave: HomeGameSave = {
    schema_version: GAME_SAVE_SCHEMA_VERSION,
    player_name: currentSave.player_name,
    avatar_id: currentSave.avatar_id,
    day: currentSave.day + 1,
    scene: "home",
    spawn_id: GAME_SPAWN_IDS.home.nextDay,
  }

  saveGameSave(nextDaySave)
  return nextDaySave
}
