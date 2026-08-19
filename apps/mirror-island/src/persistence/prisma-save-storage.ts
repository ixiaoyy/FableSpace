import type { SaveSlot, SaveSlotList, SaveSlotMeta } from "@rpgjs/common";
import type { RpgPlayer, SaveStorageStrategy } from "@rpgjs/server";
import type { Prisma, PrismaClient } from "../generated/prisma/client.ts";
import {
  normalizeSaveMeta,
  parsePlayerSnapshot,
  requireAccountId,
  requirePlayerSaveSlot,
} from "./contracts.ts";
import { ensurePlayerProfile } from "./player-profile.ts";

/** Persists RPGJS v5 save slots in the dedicated Mirror Island PostgreSQL database. */
export class PrismaSaveStorageStrategy implements SaveStorageStrategy {
  private readonly resolveClient: () => PrismaClient;

  /** Captures a lazy client resolver so browser builds and module loading never open a database pool. */
  constructor(resolveClient: () => PrismaClient) {
    this.resolveClient = resolveClient;
  }

  /** Lists metadata for the single supported slot without returning its snapshot payload. */
  async list(player: RpgPlayer): Promise<SaveSlotList> {
    const client = this.resolveClient();
    const accountId = requireAccountId(player.id);
    const row = await client.playerSave.findUnique({
      where: { accountId_slot: { accountId, slot: 0 } },
      select: { meta: true },
    });
    return [row ? decodeStoredMeta(row.meta) : null];
  }

  /** Returns one stored RPGJS snapshot and its normalized metadata, or null for a new player. */
  async get(player: RpgPlayer, index: number): Promise<SaveSlot | null> {
    const client = this.resolveClient();
    const accountId = requireAccountId(player.id);
    const slot = requirePlayerSaveSlot(index);
    const row = await client.playerSave.findUnique({
      where: { accountId_slot: { accountId, slot } },
      select: { snapshot: true, meta: true },
    });
    if (!row) return null;
    return {
      ...decodeStoredMeta(row.meta),
      snapshot: JSON.stringify(row.snapshot),
    };
  }

  /** Writes one bounded snapshot with an optimistic version check so stale concurrent writes fail closed. */
  async save(
    player: RpgPlayer,
    index: number,
    snapshot: string,
    meta: SaveSlotMeta,
  ): Promise<void> {
    const client = this.resolveClient();
    const accountId = requireAccountId(player.id);
    const slot = requirePlayerSaveSlot(index);
    const parsedSnapshot = parsePlayerSnapshot(snapshot);
    const normalizedMeta = normalizeSaveMeta(meta);
    await ensurePlayerProfile(client, accountId);

    await client.$transaction(async (transaction) => {
      const current = await transaction.playerSave.findUnique({
        where: { accountId_slot: { accountId, slot } },
        select: { version: true },
      });
      if (!current) {
        await transaction.playerSave.create({
          data: {
            accountId,
            slot,
            snapshot: parsedSnapshot,
            meta: normalizedMeta,
          },
        });
        return;
      }
      const updated = await transaction.playerSave.updateMany({
        where: { accountId, slot, version: current.version },
        data: {
          snapshot: parsedSnapshot,
          meta: normalizedMeta,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        throw new Error("Player save changed concurrently; retry from the latest state.");
      }
    });
  }

  /** Deletes the only supported save slot while preserving the authenticated player profile. */
  async delete(player: RpgPlayer, index: number): Promise<void> {
    const client = this.resolveClient();
    const accountId = requireAccountId(player.id);
    const slot = requirePlayerSaveSlot(index);
    await client.playerSave.deleteMany({ where: { accountId, slot } });
  }
}

/** Decodes the JSONB metadata object once so RPGJS consumers never cast raw database JSON. */
function decodeStoredMeta(value: Prisma.JsonValue): SaveSlotMeta {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Stored player save metadata is invalid.");
  }
  return value as SaveSlotMeta;
}
