import type { Prisma } from "../generated/prisma/client.ts";

export const MIRROR_ISLAND_WORLD_SLUG = "mirror-island";
export const MIRROR_ISLAND_WORLD_SEED = 20_260_819n;
export const MIRROR_ISLAND_WORLD_REVISION = 1;
export const MIRROR_ISLAND_WORLD_WIDTH = 512;
export const MIRROR_ISLAND_WORLD_HEIGHT = 512;
export const MIRROR_ISLAND_CHUNK_SIZE = 32;
export const MIRROR_ISLAND_EPOCH_UTC = new Date("2026-08-19T22:00:00.000Z");
export const PLAYER_SAVE_SLOT = 0;
export const PLAYER_SNAPSHOT_MAX_BYTES = 512 * 1024;
export const PLAYER_SAVE_META_MAX_BYTES = 16 * 1024;

const ACCOUNT_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

/** Validates one Keycloak subject before it is used as a durable player key. */
export function requireAccountId(value: unknown): string {
  const accountId = typeof value === "string" ? value.trim() : "";
  if (!ACCOUNT_ID_PATTERN.test(accountId)) {
    throw new Error("Authenticated player ID is invalid.");
  }
  return accountId;
}

/** Accepts only the single reviewed RPGJS save slot used by Mirror Island. */
export function requirePlayerSaveSlot(value: number): number {
  if (value !== PLAYER_SAVE_SLOT) {
    throw new Error(`Mirror Island supports only save slot ${PLAYER_SAVE_SLOT}.`);
  }
  return value;
}

/** Parses a bounded RPGJS snapshot into a JSON object suitable for PostgreSQL JSONB. */
export function parsePlayerSnapshot(snapshot: string): Prisma.InputJsonObject {
  if (Buffer.byteLength(snapshot, "utf8") > PLAYER_SNAPSHOT_MAX_BYTES) {
    throw new Error("Player snapshot exceeds the storage limit.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshot);
  } catch {
    throw new Error("Player snapshot must be valid JSON.");
  }
  if (!isJsonObject(parsed)) {
    throw new Error("Player snapshot must be a JSON object.");
  }
  return parsed as Prisma.InputJsonObject;
}

/** Normalizes bounded save metadata through JSON so functions and undefined values never cross the DB boundary. */
export function normalizeSaveMeta(meta: unknown): Prisma.InputJsonObject {
  let encoded: string;
  try {
    encoded = JSON.stringify(meta ?? {});
  } catch {
    throw new Error("Player save metadata must be JSON serializable.");
  }
  if (Buffer.byteLength(encoded, "utf8") > PLAYER_SAVE_META_MAX_BYTES) {
    throw new Error("Player save metadata exceeds the storage limit.");
  }
  const parsed: unknown = JSON.parse(encoded);
  if (!isJsonObject(parsed)) {
    throw new Error("Player save metadata must be a JSON object.");
  }
  return parsed as Prisma.InputJsonObject;
}

/** Narrows untrusted JSON to a non-array object at the persistence boundary. */
function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
