import {
  isLoadedTile,
  isTerrainBuildable,
  tileKey,
  type CardinalFacing,
  type TilePoint,
} from "./terrain-contract.ts";

export const HOUSE_WIDTH_TILES = 4;
export const HOUSE_HEIGHT_TILES = 6;
export const HOUSE_DOOR_OFFSET_X = 2;
export const HOUSE_DOOR_OFFSET_Y = HOUSE_HEIGHT_TILES - 1;
export const HOUSE_EXTERIOR_VARIANT = "ninja-village-house-south-v1";
export const HOUSE_VILLAGE_TILE_FRAMES = Array.from(
  { length: HOUSE_WIDTH_TILES * HOUSE_HEIGHT_TILES },
  (_, index) => ({
    frameX: 12 + (index % HOUSE_WIDTH_TILES),
    frameY: 6 + Math.floor(index / HOUSE_WIDTH_TILES),
  }),
);

export interface HousePlacement {
  readonly origin: TilePoint;
  readonly door: TilePoint;
  readonly playerReturn: TilePoint;
  readonly footprint: readonly TilePoint[];
  readonly width: typeof HOUSE_WIDTH_TILES;
  readonly height: typeof HOUSE_HEIGHT_TILES;
}

export type HousePlacementError =
  | "face-north"
  | "outside-loaded-map"
  | "terrain-blocked"
  | "dynamic-cell-blocked"
  | "occupied";

/** Converts player and facing tiles into the fixed south-facing door anchor, accepting only north-facing use. */
export function doorAnchorFromPlayer(
  playerTile: TilePoint,
  facing: CardinalFacing,
): TilePoint | HousePlacementError {
  if (facing !== "up") return "face-north";
  return { x: playerTile.x, y: playerTile.y - 1 };
}

/** Builds the complete fixed 4×6 house geometry from its south door tile without performing occupancy reads. */
export function housePlacementFromDoor(door: TilePoint): HousePlacement {
  const origin = {
    x: door.x - HOUSE_DOOR_OFFSET_X,
    y: door.y - HOUSE_DOOR_OFFSET_Y,
  };
  const footprint: TilePoint[] = [];
  for (let y = 0; y < HOUSE_HEIGHT_TILES; y += 1) {
    for (let x = 0; x < HOUSE_WIDTH_TILES; x += 1) {
      footprint.push({ x: origin.x + x, y: origin.y + y });
    }
  }
  return {
    origin,
    door,
    playerReturn: { x: door.x, y: door.y + 1 },
    footprint,
    width: HOUSE_WIDTH_TILES,
    height: HOUSE_HEIGHT_TILES,
  };
}

/** Validates loaded terrain plus sparse dynamic-cell and house-occupancy blockers for one placement preview. */
export function validateHousePlacement(
  placement: HousePlacement,
  dynamicCellKeys: ReadonlySet<string>,
  occupiedTileKeys: ReadonlySet<string>,
): HousePlacementError | null {
  if (!placement.footprint.every(isLoadedTile) || !isLoadedTile(placement.playerReturn)) {
    return "outside-loaded-map";
  }
  if (!placement.footprint.every(isTerrainBuildable) || !isTerrainBuildable(placement.playerReturn)) {
    return "terrain-blocked";
  }
  if (
    placement.footprint.some((tile) => dynamicCellKeys.has(tileKey(tile)))
    || dynamicCellKeys.has(tileKey(placement.playerReturn))
  ) {
    return "dynamic-cell-blocked";
  }
  if (
    placement.footprint.some((tile) => occupiedTileKeys.has(tileKey(tile)))
    || occupiedTileKeys.has(tileKey(placement.playerReturn))
  ) {
    return "occupied";
  }
  return null;
}

/** Returns the stable interior room ID derived from a validated database house UUID rather than an account ID. */
export function privateInteriorMapId(houseId: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(houseId)) {
    throw new Error("House ID is not a UUID.");
  }
  return `house-interior-${houseId.toLowerCase()}`;
}

/** Extracts and validates the house UUID from one private interior map ID, or returns null for public maps. */
export function houseIdFromPrivateInteriorMapId(rawMapId: string): string | null {
  const mapId = rawMapId.replace(/^map-/, "");
  if (!mapId.startsWith("house-interior-")) return null;
  const houseId = mapId.slice("house-interior-".length);
  try {
    return privateInteriorMapId(houseId).slice("house-interior-".length);
  } catch {
    return null;
  }
}

/** Returns the registered client spritesheet ID for one reviewed exterior tile index. */
export function houseTileGraphicId(index: number): string {
  if (!Number.isInteger(index) || index < 0 || index >= HOUSE_VILLAGE_TILE_FRAMES.length) {
    throw new Error("House tile graphic index is invalid.");
  }
  return `house-tile-${index}`;
}
