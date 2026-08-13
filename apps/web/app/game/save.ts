export const GAME_SAVE_STORAGE_KEY = "farm-game.save.v1"

const GAME_SAVE_SCHEMA_VERSION = 1 as const

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

export type FarmGameSave = {
  readonly schema_version: typeof GAME_SAVE_SCHEMA_VERSION
  readonly day: number
  readonly scene: "farm"
  readonly spawn_id: FarmSpawnId
}

export type HomeGameSave = {
  readonly schema_version: typeof GAME_SAVE_SCHEMA_VERSION
  readonly day: number
  readonly scene: "home"
  readonly spawn_id: HomeSpawnId
}

export type GameSave = FarmGameSave | HomeGameSave

/** Canonical recovery state used for first visits and every invalid persisted payload. */
export const DEFAULT_GAME_SAVE: FarmGameSave = {
  schema_version: GAME_SAVE_SCHEMA_VERSION,
  day: 1,
  scene: "farm",
  spawn_id: GAME_SPAWN_IDS.farm.start,
}

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

/** Record save recovery or storage failures only in development without interrupting play. */
function reportSaveIssue(message: string, reason?: unknown): void {
  if (!import.meta.env.DEV) return

  if (reason === undefined) {
    console.warn(`[farm-game] ${message}`)
    return
  }

  console.warn(`[farm-game] ${message}`, reason)
}

/**
 * Decode an untrusted parsed value into the closed save union.
 * Returns null unless every persisted field, including the scene/spawn pairing, is valid.
 */
export function decodeGameSave(value: unknown): GameSave | null {
  if (
    !isUnknownRecord(value)
    || value.schema_version !== GAME_SAVE_SCHEMA_VERSION
    || typeof value.day !== "number"
    || !Number.isSafeInteger(value.day)
    || value.day <= 0
  ) {
    return null
  }

  if (value.scene === "farm" && isFarmSpawnId(value.spawn_id)) {
    return {
      schema_version: GAME_SAVE_SCHEMA_VERSION,
      day: value.day,
      scene: "farm",
      spawn_id: value.spawn_id,
    }
  }

  if (value.scene === "home" && isHomeSpawnId(value.spawn_id)) {
    return {
      schema_version: GAME_SAVE_SCHEMA_VERSION,
      day: value.day,
      scene: "home",
      spawn_id: value.spawn_id,
    }
  }

  return null
}

/**
 * Load and validate the versioned browser save.
 * Returns the day-one farm state when storage is absent, inaccessible, malformed, or unknown.
 */
export function loadGameSave(): GameSave {
  if (typeof window === "undefined") return DEFAULT_GAME_SAVE

  let serializedSave: string | null
  try {
    serializedSave = window.localStorage.getItem(GAME_SAVE_STORAGE_KEY)
  } catch (error) {
    reportSaveIssue("Local save could not be read; starting a new game.", error)
    return DEFAULT_GAME_SAVE
  }

  if (serializedSave === null) return DEFAULT_GAME_SAVE

  let parsedSave: unknown
  try {
    parsedSave = JSON.parse(serializedSave)
  } catch (error) {
    reportSaveIssue("Local save contains invalid JSON; starting a new game.", error)
    return DEFAULT_GAME_SAVE
  }

  const decodedSave = decodeGameSave(parsedSave)
  if (decodedSave === null) {
    reportSaveIssue("Local save has an unknown or invalid schema; starting a new game.")
    return DEFAULT_GAME_SAVE
  }

  return decodedSave
}

/**
 * Persist one validated save under the only game save key.
 * Storage failures are non-fatal so private-mode restrictions do not stop the current session.
 */
export function saveGameSave(save: GameSave): void {
  if (typeof window === "undefined") return

  const normalizedSave = decodeGameSave(save)
  if (normalizedSave === null) {
    reportSaveIssue("Refused to write an invalid local save.")
    return
  }

  try {
    window.localStorage.setItem(
      GAME_SAVE_STORAGE_KEY,
      JSON.stringify(normalizedSave),
    )
  } catch (error) {
    reportSaveIssue("Local save could not be written; play will continue in memory.", error)
  }
}

/**
 * Build and persist a stable farm transition while preserving the current day.
 * The spawn parameter is restricted to authored farm identifiers.
 */
export function createSceneSave(
  currentSave: GameSave,
  scene: "farm",
  spawnId: FarmSpawnId,
): FarmGameSave

/**
 * Build and persist a stable home transition while preserving the current day.
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
  let nextSave: GameSave

  if (scene === "farm") {
    if (!isFarmSpawnId(spawnId)) {
      throw new Error(`Unknown farm spawn id: ${spawnId}`)
    }

    nextSave = {
      schema_version: GAME_SAVE_SCHEMA_VERSION,
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
      day: currentSave.day,
      scene,
      spawn_id: spawnId,
    }
  }

  saveGameSave(nextSave)
  return nextSave
}

/**
 * Advance exactly one day and persist the authored next-morning home spawn.
 * Callers must keep this operation inside their sleep transition lock to prevent duplicate days.
 */
export function advanceDay(currentSave: GameSave): HomeGameSave {
  const nextDaySave: HomeGameSave = {
    schema_version: GAME_SAVE_SCHEMA_VERSION,
    day: currentSave.day + 1,
    scene: "home",
    spawn_id: GAME_SPAWN_IDS.home.nextDay,
  }

  saveGameSave(nextDaySave)
  return nextDaySave
}
