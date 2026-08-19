import type { RpgPlayer, RpgPlayerHooks } from "@rpgjs/server";
import type { MapClass } from "@canvasengine/tiled";
import type { RpgMap } from "@rpgjs/server";

type PersistentTiledMap = RpgMap & { tiled: MapClass };

/** Loads the server-only persistence owners without making Prisma reachable from the browser graph. */
async function loadPersistence() {
  if (import.meta.env?.SSR !== true) {
    throw new Error("Mirror Island persistence is available only on the game server.");
  }
  const [client, profile, world] = await Promise.all([
    import("../../persistence/client.ts"),
    import("../../persistence/player-profile.ts"),
    import("../../persistence/world.ts"),
  ]);
  return { ...client, ...profile, ...world };
}

/** Returns one of two nearby deterministic spawns so new simultaneous players remain distinguishable. */
function newPlayerSpawn(accountId: string): { x: number; y: number } {
  const parity = [...accountId].reduce((value, character) => value + character.codePointAt(0)!, 0) % 2;
  return { x: parity === 0 ? 280 : 320, y: 300 };
}

export const player: RpgPlayerHooks = {
  async onConnected(player: RpgPlayer) {
    const persistence = await loadPersistence();
    const prisma = persistence.getMirrorIslandPrismaClient();
    await persistence.ensureMirrorIslandWorld(prisma);
    const profile = await persistence.ensurePlayerProfile(prisma, player.id);
    const loaded = await player.load(0, { reason: "load", source: "connect" });
    if (loaded.ok) return;

    player.name = profile.playerName;
    player.setGraphic("hero");
    await player.changeMap("simplemap", newPlayerSpawn(profile.accountId));
    await player.save(0, { label: "镜像岛自动存档" }, { reason: "auto", source: "first-connect" });
  },
  async onJoinMap(player: RpgPlayer) {
    if (import.meta.env?.SSR !== true) return;
    const persistence = await loadPersistence();
    const { loadWorldChunkCells } = await import("../../persistence/world-state.ts");
    const cells = await loadWorldChunkCells(persistence.getMirrorIslandPrismaClient(), 0, 0);
    const map = player.getCurrentMap<PersistentTiledMap>();
    for (const cell of cells) {
      if (cell.state === "tilled" && cell.tileX === 10 && cell.tileY === 10) {
        map?.tiled.setTile(cell.tileX, cell.tileY, "Dynamic", { gid: 178 });
      }
    }
    await player.save(0, { label: "镜像岛自动存档" }, { reason: "auto", source: "join-map" });
  },
  async onDisconnected(player: RpgPlayer) {
    await player.save(0, { label: "镜像岛自动存档" }, { reason: "auto", source: "disconnect" });
  },
  onInput(player: RpgPlayer, { action }) {
    if (action === "escape") {
      player.callMainMenu();
    }
  },
};
