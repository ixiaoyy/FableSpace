import { GAME_SPAWN_IDS, type HomeSpawnId } from "../save"

export type HomePoint = { readonly x: number; readonly y: number }

export const HOME_ROOM = { x: 64, y: 40, width: 352, height: 240 } as const

export const HOME_SPAWN_POINTS: Record<HomeSpawnId, HomePoint> = {
  [GAME_SPAWN_IDS.home.entryDoor]: { x: 240, y: 248 },
  [GAME_SPAWN_IDS.home.nextDay]: { x: 172, y: 132 },
}

export const HOME_EXIT_INTERACTION = { x: 220, y: 242, width: 40, height: 38 } as const
export const HOME_BED = { x: 104, y: 82, width: 54, height: 72 } as const
export const HOME_BED_INTERACTION = { x: 94, y: 74, width: 82, height: 96 } as const

export const HOME_SOLID_FURNITURE = [
  { x: 334, y: 76, width: 48, height: 30, kind: "table" },
  { x: 342, y: 166, width: 42, height: 34, kind: "cabinet" },
  { x: 88, y: 194, width: 46, height: 30, kind: "chest" },
] as const
