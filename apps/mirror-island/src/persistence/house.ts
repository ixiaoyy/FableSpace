import type { House, PrismaClient, WorldOccupancy } from "../generated/prisma/client.ts";
import {
  HOUSE_EXTERIOR_VARIANT,
  HOUSE_HEIGHT_TILES,
  HOUSE_WIDTH_TILES,
  type HousePlacement,
} from "../world/house-contract.ts";
import { tileKey, type TilePoint } from "../world/terrain-contract.ts";
import { requireAccountId } from "./contracts.ts";
import { ensurePlayerProfile } from "./player-profile.ts";
import { ensureMirrorIslandWorld } from "./world.ts";

export type HouseBuildRejection =
  | "already-owned"
  | "dynamic-cell-blocked"
  | "occupied"
  | "concurrent-change";

export class HouseBuildRejectedError extends Error {
  public readonly reason: HouseBuildRejection;

  /** Captures one safe gameplay rejection without exposing Prisma or database details. */
  constructor(reason: HouseBuildRejection) {
    super(`House build rejected: ${reason}`);
    this.reason = reason;
  }
}

export interface LoadedTileBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface HousePlacementBlockers {
  readonly dynamicCellKeys: ReadonlySet<string>;
  readonly occupiedTileKeys: ReadonlySet<string>;
}

export interface WorldTileBlockers {
  readonly dynamicCellKeys: ReadonlySet<string>;
  readonly occupiedTileKeys: ReadonlySet<string>;
  readonly blockedTileKeys: ReadonlySet<string>;
}

export type HouseWithOccupancy = House & { occupancy: WorldOccupancy[] };

/** Returns one player's unique house or null after validating the external account identifier. */
export async function findHouseByOwner(
  client: PrismaClient,
  rawAccountId: unknown,
): Promise<House | null> {
  const ownerAccountId = requireAccountId(rawAccountId);
  return client.house.findUnique({ where: { ownerAccountId } });
}

/** Returns one house by UUID for private-room authorization, without accepting non-UUID identifiers. */
export async function findHouseById(client: PrismaClient, houseId: string): Promise<House | null> {
  requireHouseId(houseId);
  return client.house.findUnique({ where: { id: houseId } });
}

/** Lists houses overlapping the currently loaded tile rectangle in stable creation order. */
export async function listHousesForLoadedRegion(
  client: PrismaClient,
  bounds: LoadedTileBounds,
): Promise<House[]> {
  validateBounds(bounds);
  const world = await ensureMirrorIslandWorld(client);
  const candidates = await client.house.findMany({
    where: {
      worldId: world.id,
      originX: { gte: bounds.minX - (HOUSE_WIDTH_TILES - 1), lte: bounds.maxX },
      originY: { gte: bounds.minY - (HOUSE_HEIGHT_TILES - 1), lte: bounds.maxY },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return candidates.filter((house) => (
    house.originX + house.width - 1 >= bounds.minX
    && house.originY + house.height - 1 >= bounds.minY
  ));
}

/** Loads sparse crop and existing-house blockers for one exact footprint plus its door-front return tile. */
export async function loadHousePlacementBlockers(
  client: PrismaClient,
  placement: HousePlacement,
): Promise<HousePlacementBlockers> {
  validatePlacementShape(placement);
  const blockers = await loadWorldTileBlockers(client, [
    ...placement.footprint,
    placement.playerReturn,
  ]);
  return {
    dynamicCellKeys: blockers.dynamicCellKeys,
    occupiedTileKeys: blockers.occupiedTileKeys,
  };
}

/** Loads sparse world-cell and house-occupancy blockers for bounded spawn or placement candidates. */
export async function loadWorldTileBlockers(
  client: PrismaClient,
  tiles: readonly TilePoint[],
): Promise<WorldTileBlockers> {
  validateTileQuery(tiles);
  const world = await ensureMirrorIslandWorld(client);
  const coordinates = tiles.map((tile) => ({ tileX: tile.x, tileY: tile.y }));
  const [cells, occupancy] = await Promise.all([
    client.worldCell.findMany({
      where: { worldId: world.id, OR: coordinates },
      select: { tileX: true, tileY: true },
    }),
    client.worldOccupancy.findMany({
      where: { worldId: world.id, OR: coordinates },
      select: { tileX: true, tileY: true },
    }),
  ]);
  const dynamicCellKeys = new Set(cells.map(({ tileX, tileY }) => tileKey({ x: tileX, y: tileY })));
  const occupiedTileKeys = new Set(occupancy.map(({ tileX, tileY }) => tileKey({ x: tileX, y: tileY })));
  return {
    dynamicCellKeys,
    occupiedTileKeys,
    blockedTileKeys: new Set([...dynamicCellKeys, ...occupiedTileKeys]),
  };
}

/** Creates the unique house and every occupied tile atomically after rechecking durable blockers. */
export async function createHouseWithOccupancy(
  client: PrismaClient,
  rawOwnerAccountId: unknown,
  placement: HousePlacement,
): Promise<HouseWithOccupancy> {
  const ownerAccountId = requireAccountId(rawOwnerAccountId);
  validatePlacementShape(placement);
  const world = await ensureMirrorIslandWorld(client);
  await ensurePlayerProfile(client, ownerAccountId);
  const coordinates = [...placement.footprint, placement.playerReturn]
    .map((tile) => ({ tileX: tile.x, tileY: tile.y }));

  try {
    return await client.$transaction(async (transaction) => {
      const existing = await transaction.house.findUnique({ where: { ownerAccountId } });
      if (existing) throw new HouseBuildRejectedError("already-owned");

      const dynamicCells = await transaction.worldCell.count({
        where: { worldId: world.id, OR: coordinates },
      });
      if (dynamicCells > 0) throw new HouseBuildRejectedError("dynamic-cell-blocked");

      const occupied = await transaction.worldOccupancy.count({
        where: { worldId: world.id, OR: coordinates },
      });
      if (occupied > 0) throw new HouseBuildRejectedError("occupied");

      return transaction.house.create({
        data: {
          worldId: world.id,
          ownerAccountId,
          originX: placement.origin.x,
          originY: placement.origin.y,
          width: placement.width,
          height: placement.height,
          exteriorVariant: HOUSE_EXTERIOR_VARIANT,
          occupancy: {
            create: placement.footprint.map((tile) => ({
              worldId: world.id,
              tileX: tile.x,
              tileY: tile.y,
              entityKind: "house",
            })),
          },
        },
        include: { occupancy: true },
      });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (error instanceof HouseBuildRejectedError) throw error;
    if (isPrismaConflict(error)) throw new HouseBuildRejectedError("concurrent-change");
    throw error;
  }
}

/** Validates one loaded-region query before it reaches Prisma. */
function validateBounds(bounds: LoadedTileBounds): void {
  if (
    ![bounds.minX, bounds.minY, bounds.maxX, bounds.maxY].every(Number.isInteger)
    || bounds.minX < 0
    || bounds.minY < 0
    || bounds.maxX < bounds.minX
    || bounds.maxY < bounds.minY
    || bounds.maxX >= 512
    || bounds.maxY >= 512
  ) {
    throw new Error("Loaded house bounds are invalid.");
  }
}

/** Validates the fixed footprint coordinates, uniqueness, and world range. */
function validateFootprint(footprint: readonly TilePoint[]): void {
  if (footprint.length !== HOUSE_WIDTH_TILES * HOUSE_HEIGHT_TILES) {
    throw new Error("House footprint has the wrong size.");
  }
  validateTileQuery(footprint);
}

/** Validates a bounded unique tile query before building Prisma OR filters. */
function validateTileQuery(tiles: readonly TilePoint[]): void {
  if (tiles.length < 1 || tiles.length > 128) {
    throw new Error("World tile query has the wrong size.");
  }
  const keys = new Set<string>();
  for (const tile of tiles) {
    if (
      !Number.isInteger(tile.x)
      || !Number.isInteger(tile.y)
      || tile.x < 0
      || tile.x >= 512
      || tile.y < 0
      || tile.y >= 512
    ) {
      throw new Error("House footprint coordinates are invalid.");
    }
    keys.add(tileKey(tile));
  }
  if (keys.size !== tiles.length) throw new Error("World tile query contains duplicate tiles.");
}

/** Ensures the supplied placement matches the single reviewed exterior geometry. */
function validatePlacementShape(placement: HousePlacement): void {
  validateFootprint(placement.footprint);
  if (
    placement.width !== HOUSE_WIDTH_TILES
    || placement.height !== HOUSE_HEIGHT_TILES
    || placement.door.x !== placement.origin.x + 2
    || placement.door.y !== placement.origin.y + HOUSE_HEIGHT_TILES - 1
    || placement.playerReturn.x !== placement.door.x
    || placement.playerReturn.y !== placement.door.y + 1
  ) {
    throw new Error("House placement does not match the reviewed exterior geometry.");
  }
}

/** Requires a lowercase-or-uppercase RFC 4122 UUID before using it in a Prisma lookup. */
function requireHouseId(value: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)) {
    throw new Error("House ID is not a UUID.");
  }
}

/** Recognizes Prisma unique/serializable conflicts without leaking connector messages or query text. */
function isPrismaConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = String((error as { code?: unknown }).code || "");
  return code === "P2002" || code === "P2034";
}
