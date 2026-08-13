import { GAME_SPAWN_IDS, type FarmSpawnId } from "../save"

export type FarmPoint = { readonly x: number; readonly y: number }

export const FARM_SPAWN_POINTS: Record<FarmSpawnId, FarmPoint> = {
  [GAME_SPAWN_IDS.farm.start]: { x: 268, y: 200 },
  [GAME_SPAWN_IDS.farm.houseDoor]: { x: 320, y: 154 },
}

export const FARM_HOUSE = { x: 320, y: 92, width: 96, height: 96 } as const
export const FARM_DOOR_INTERACTION = { x: 304, y: 132, width: 32, height: 34 } as const

export const FARM_TREES = [
  { x: 68, y: 78, scale: 1 },
  { x: 122, y: 70, scale: 0.8 },
  { x: 532, y: 72, scale: 1 },
  { x: 584, y: 112, scale: 0.8 },
  { x: 76, y: 220, scale: 1 },
  { x: 562, y: 246, scale: 1 },
  { x: 92, y: 390, scale: 0.8 },
  { x: 520, y: 402, scale: 0.8 },
] as const

export const FARM_ROCKS = [
  { x: 172, y: 104, scale: 0.85 },
  { x: 470, y: 188, scale: 1 },
  { x: 166, y: 356, scale: 1 },
  { x: 432, y: 372, scale: 0.75 },
  { x: 590, y: 350, scale: 0.7 },
] as const

export const FARM_FLOWER_PATCHES = [
  { x: 212, y: 202 },
  { x: 398, y: 238 },
  { x: 256, y: 408 },
  { x: 474, y: 316 },
] as const
