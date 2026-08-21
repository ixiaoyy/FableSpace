export const MIRROR_LOADED_WIDTH_TILES = 32;
export const MIRROR_LOADED_HEIGHT_TILES = 32;
export const MIRROR_TILE_SIZE = 16;

export interface TilePoint {
  readonly x: number;
  readonly y: number;
}

export type CardinalFacing = "up" | "down" | "left" | "right";

export interface NpcPlacement {
  readonly npc: TilePoint;
  readonly playerFacing: CardinalFacing;
  readonly npcFacing: CardinalFacing;
}

export interface CollisionRectangle {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const RIVER_MIN_X = 14;
const RIVER_MAX_X = 16;
const CROSSING_MIN_Y = 15;
const CROSSING_MAX_Y = 16;
const BUILD_MARGIN = 1;
const FALLBACK_SPAWN = { x: 12, y: 15 } as const;

export const SAFE_SPAWN_CANDIDATES = [
  { x: 6, y: 6 },
  { x: 10, y: 15 },
  { x: 7, y: 24 },
  { x: 12, y: 15 },
  { x: 19, y: 7 },
  { x: 23, y: 15 },
  { x: 20, y: 24 },
  { x: 18, y: 16 },
] as const satisfies readonly TilePoint[];

/** Returns the stable string key used by pure terrain and occupancy checks for one tile. */
export function tileKey(tile: TilePoint): string {
  return `${tile.x}:${tile.y}`;
}

/** Reports whether integer tile coordinates are inside the currently loaded 32×32 map. */
export function isLoadedTile(tile: TilePoint): boolean {
  return Number.isInteger(tile.x)
    && Number.isInteger(tile.y)
    && tile.x >= 0
    && tile.x < MIRROR_LOADED_WIDTH_TILES
    && tile.y >= 0
    && tile.y < MIRROR_LOADED_HEIGHT_TILES;
}

/** Reports whether one loaded tile belongs to the fixed river outside its two-row crossing. */
export function isRiverWater(tile: TilePoint): boolean {
  return isLoadedTile(tile)
    && tile.x >= RIVER_MIN_X
    && tile.x <= RIVER_MAX_X
    && (tile.y < CROSSING_MIN_Y || tile.y > CROSSING_MAX_Y);
}

/** Reports whether one tile is available for player/NPC movement in the fixed terrain contract. */
export function isTerrainWalkable(tile: TilePoint): boolean {
  return isLoadedTile(tile) && !isRiverWater(tile);
}

/** Reports whether one tile may participate in a house footprint, excluding borders and the crossing. */
export function isTerrainBuildable(tile: TilePoint): boolean {
  return isTerrainWalkable(tile)
    && tile.x >= BUILD_MARGIN
    && tile.x < MIRROR_LOADED_WIDTH_TILES - BUILD_MARGIN
    && tile.y >= BUILD_MARGIN
    && tile.y < MIRROR_LOADED_HEIGHT_TILES - BUILD_MARGIN
    && !(tile.x >= RIVER_MIN_X && tile.x <= RIVER_MAX_X);
}

/** Returns the four cardinal neighbors in stable down, left, right, up order. */
export function cardinalNeighbors(tile: TilePoint): readonly TilePoint[] {
  return [
    { x: tile.x, y: tile.y + 1 },
    { x: tile.x - 1, y: tile.y },
    { x: tile.x + 1, y: tile.y },
    { x: tile.x, y: tile.y - 1 },
  ];
}

/** Returns the two immutable pixel collision bands that leave the reviewed two-row river crossing open. */
export function riverCollisionRectangles(): readonly CollisionRectangle[] {
  const x = RIVER_MIN_X * MIRROR_TILE_SIZE;
  const width = (RIVER_MAX_X - RIVER_MIN_X + 1) * MIRROR_TILE_SIZE;
  return [
    {
      id: "river-water-north",
      x,
      y: 0,
      width,
      height: CROSSING_MIN_Y * MIRROR_TILE_SIZE,
    },
    {
      id: "river-water-south",
      x,
      y: (CROSSING_MAX_Y + 1) * MIRROR_TILE_SIZE,
      width,
      height: (MIRROR_LOADED_HEIGHT_TILES - CROSSING_MAX_Y - 1) * MIRROR_TILE_SIZE,
    },
  ];
}

/** Selects one unblocked safe first spawn; the injected picker must return an index in range. */
export function chooseSafeSpawn(
  blockedTileKeys: ReadonlySet<string>,
  pickIndex: (length: number) => number,
): TilePoint {
  const candidates = SAFE_SPAWN_CANDIDATES.filter(
    (candidate) => isTerrainWalkable(candidate) && !blockedTileKeys.has(tileKey(candidate)),
  );
  if (candidates.length === 0) {
    if (!blockedTileKeys.has(tileKey(FALLBACK_SPAWN))) return FALLBACK_SPAWN;
    throw new Error("No safe Mirror Island spawn is available.");
  }
  const index = pickIndex(candidates.length);
  if (!Number.isInteger(index) || index < 0 || index >= candidates.length) {
    throw new Error("Safe spawn picker returned an invalid index.");
  }
  return candidates[index];
}

/** Selects an adjacent safe NPC tile and returns the two opposing facings for an immediate greeting. */
export function chooseFacingNpcPlacement(
  playerTile: TilePoint,
  isAvailable: (tile: TilePoint) => boolean,
  pickIndex: (length: number) => number,
): NpcPlacement {
  const options: readonly NpcPlacement[] = [
    { npc: { x: playerTile.x, y: playerTile.y + 1 }, playerFacing: "down", npcFacing: "up" },
    { npc: { x: playerTile.x - 1, y: playerTile.y }, playerFacing: "left", npcFacing: "right" },
    { npc: { x: playerTile.x + 1, y: playerTile.y }, playerFacing: "right", npcFacing: "left" },
    { npc: { x: playerTile.x, y: playerTile.y - 1 }, playerFacing: "up", npcFacing: "down" },
  ];
  const available = options.filter((option) => isTerrainWalkable(option.npc) && isAvailable(option.npc));
  if (available.length === 0) throw new Error("No safe welcome NPC position is available.");
  const index = pickIndex(available.length);
  if (!Number.isInteger(index) || index < 0 || index >= available.length) {
    throw new Error("Welcome NPC picker returned an invalid index.");
  }
  return available[index];
}
