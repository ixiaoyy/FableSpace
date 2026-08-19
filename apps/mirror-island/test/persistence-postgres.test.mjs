import assert from "node:assert/strict";
import { test } from "node:test";
import { createMirrorIslandPrismaClient } from "../src/persistence/client.ts";
import { PrismaSaveStorageStrategy } from "../src/persistence/prisma-save-storage.ts";
import { ensureMirrorIslandWorld } from "../src/persistence/world.ts";
import { loadWorldChunkCells, persistWorldCell } from "../src/persistence/world-state.ts";

const databaseUrl = process.env.MIRROR_ISLAND_TEST_DATABASE_URL;

test("PostgreSQL persists RPGJS slots across Prisma client restarts", {
  skip: !databaseUrl,
}, async () => {
  const env = { MIRROR_ISLAND_DATABASE_URL: databaseUrl };
  const player = { id: "integration-player-1" };
  const firstClient = createMirrorIslandPrismaClient(env);
  try {
    const world = await ensureMirrorIslandWorld(firstClient);
    assert.equal(world.slug, "mirror-island");
    const storage = new PrismaSaveStorageStrategy(() => firstClient);
    await persistWorldCell(firstClient, {
      tileX: 10,
      tileY: 10,
      state: "tilled",
      actorAccountId: player.id,
    });
    await storage.save(player, 0, '{"name":"张三","map":"simplemap"}', {
      map: "simplemap",
      label: "integration",
    });
    assert.equal((await storage.list(player))[0].map, "simplemap");
  } finally {
    await firstClient.$disconnect();
  }

  const secondClient = createMirrorIslandPrismaClient(env);
  try {
    const storage = new PrismaSaveStorageStrategy(() => secondClient);
    const restored = await storage.get(player, 0);
    assert.deepEqual(JSON.parse(restored.snapshot), { name: "张三", map: "simplemap" });
    const cells = await loadWorldChunkCells(secondClient, 0, 0);
    assert.equal(cells.some((cell) => cell.tileX === 10 && cell.tileY === 10 && cell.state === "tilled"), true);
    await storage.delete(player, 0);
    assert.equal(await storage.get(player, 0), null);
  } finally {
    await secondClient.playerProfile.deleteMany({ where: { accountId: player.id } });
    await secondClient.worldCell.deleteMany({});
    await secondClient.world.deleteMany({ where: { slug: "mirror-island" } });
    await secondClient.$disconnect();
  }
});
