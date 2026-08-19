import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  normalizeSaveMeta,
  parsePlayerSnapshot,
  requireAccountId,
  requirePlayerSaveSlot,
} from "../src/persistence/contracts.ts";
import { resolveMirrorIslandDatabaseUrl } from "../src/persistence/client.ts";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test("persistence boundaries accept reviewed identifiers and bounded JSON", () => {
  assert.equal(requireAccountId("account-123"), "account-123");
  assert.equal(requirePlayerSaveSlot(0), 0);
  assert.deepEqual(parsePlayerSnapshot('{"name":"张三"}'), { name: "张三" });
  assert.deepEqual(normalizeSaveMeta({ map: "simplemap", ignored: undefined }), {
    map: "simplemap",
  });

  assert.throws(() => requireAccountId("<script>"), /invalid/);
  assert.throws(() => requirePlayerSaveSlot(1), /only save slot 0/);
  assert.throws(() => parsePlayerSnapshot("[]"), /JSON object/);
  assert.throws(() => parsePlayerSnapshot("not-json"), /valid JSON/);
});

test("database URL accepts only a named PostgreSQL target", () => {
  const url = "postgresql://mirror:secret@mirror-game-db:5432/mirror_island_game";
  assert.equal(resolveMirrorIslandDatabaseUrl({ MIRROR_ISLAND_DATABASE_URL: url }), url);
  assert.throws(() => resolveMirrorIslandDatabaseUrl({}), /is required/);
  assert.throws(
    () => resolveMirrorIslandDatabaseUrl({ MIRROR_ISLAND_DATABASE_URL: "mysql://db/game" }),
    /PostgreSQL/,
  );
});

test("the reviewed Mirror Island baseline contains exactly one nine-table migration", async () => {
  const migrationsRoot = join(projectRoot, "prisma", "migrations");
  const migrationDirectories = (await readdir(migrationsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  assert.deepEqual(migrationDirectories, ["20260819000000_mirror_island_baseline"]);

  const sql = await readFile(
    join(migrationsRoot, migrationDirectories[0], "migration.sql"),
    "utf8",
  );
  const tables = [...sql.matchAll(/CREATE TABLE "([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(tables, [
    "worlds",
    "player_profiles",
    "world_cells",
    "chunk_state",
    "houses",
    "world_occupancy",
    "player_inventory",
    "player_saves",
    "world_day_settlements",
  ]);
  assert.doesNotMatch(sql, /local_imported/i);
  assert.match(sql, /player_save_slot_check/);
  assert.match(sql, /world_dimensions_check/);
});
