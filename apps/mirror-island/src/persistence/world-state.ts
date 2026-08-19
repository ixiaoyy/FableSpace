import type { PrismaClient, WorldCell } from "../generated/prisma/client.ts";
import { ensureMirrorIslandWorld } from "./world.ts";

export interface WorldCellMutation {
  tileX: number;
  tileY: number;
  state: "tilled" | "growing" | "mature" | "withered";
  cropKind?: "potato" | null;
  growthStage?: number | null;
  wateredDay?: number | null;
  actorAccountId?: string | null;
}

/** Persists one sparse shared cell with an optimistic version update and returns the committed row. */
export async function persistWorldCell(
  client: PrismaClient,
  mutation: WorldCellMutation,
): Promise<WorldCell> {
  validateWorldCellMutation(mutation);
  const world = await ensureMirrorIslandWorld(client);
  const chunkX = Math.floor(mutation.tileX / world.chunkSize);
  const chunkY = Math.floor(mutation.tileY / world.chunkSize);
  return client.$transaction(async (transaction) => {
    const key = {
      worldId_tileX_tileY: {
        worldId: world.id,
        tileX: mutation.tileX,
        tileY: mutation.tileY,
      },
    };
    const existing = await transaction.worldCell.findUnique({
      where: key,
      select: { version: true },
    });
    if (!existing) {
      return transaction.worldCell.create({
        data: {
          worldId: world.id,
          tileX: mutation.tileX,
          tileY: mutation.tileY,
          chunkX,
          chunkY,
          state: mutation.state,
          cropKind: mutation.cropKind ?? null,
          growthStage: mutation.growthStage ?? null,
          wateredDay: mutation.wateredDay ?? null,
          lastActorAccountId: mutation.actorAccountId ?? null,
        },
      });
    }
    const updated = await transaction.worldCell.updateMany({
      where: {
        worldId: world.id,
        tileX: mutation.tileX,
        tileY: mutation.tileY,
        version: existing.version,
      },
      data: {
        chunkX,
        chunkY,
        state: mutation.state,
        cropKind: mutation.cropKind ?? null,
        growthStage: mutation.growthStage ?? null,
        wateredDay: mutation.wateredDay ?? null,
        lastActorAccountId: mutation.actorAccountId ?? null,
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      throw new Error("Shared world cell changed concurrently.");
    }
    const committed = await transaction.worldCell.findUnique({ where: key });
    if (!committed) throw new Error("Committed shared world cell is unavailable.");
    return committed;
  });
}

/** Loads sparse shared cells for one reviewed 32x32 chunk without reading the whole world. */
export async function loadWorldChunkCells(
  client: PrismaClient,
  chunkX: number,
  chunkY: number,
): Promise<WorldCell[]> {
  if (!Number.isInteger(chunkX) || !Number.isInteger(chunkY) || chunkX < 0 || chunkY < 0) {
    throw new Error("World chunk coordinates are invalid.");
  }
  const world = await ensureMirrorIslandWorld(client);
  return client.worldCell.findMany({
    where: { worldId: world.id, chunkX, chunkY },
    orderBy: [{ tileY: "asc" }, { tileX: "asc" }],
  });
}

/** Validates one sparse cell mutation before it crosses into Prisma or PostgreSQL. */
function validateWorldCellMutation(mutation: WorldCellMutation): void {
  if (
    !Number.isInteger(mutation.tileX) ||
    !Number.isInteger(mutation.tileY) ||
    mutation.tileX < 0 ||
    mutation.tileX >= 512 ||
    mutation.tileY < 0 ||
    mutation.tileY >= 512
  ) {
    throw new Error("World cell coordinates are invalid.");
  }
  if (
    mutation.growthStage !== undefined &&
    mutation.growthStage !== null &&
    (!Number.isInteger(mutation.growthStage) || mutation.growthStage < 0 || mutation.growthStage > 2)
  ) {
    throw new Error("World cell growth stage is invalid.");
  }
}
