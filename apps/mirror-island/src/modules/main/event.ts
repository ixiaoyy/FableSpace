import type { MapClass } from "@canvasengine/tiled";
import type { EventDefinition, RpgMap, RpgPlayer } from "@rpgjs/server";

const DEMO_TILE = { x: 10, y: 10, layer: "Dynamic", gid: 178 } as const;
type MirrorIslandTiledMap = RpgMap & { tiled: MapClass };

/** Persists the demo shared cell through the server-only Prisma boundary before broadcasting it. */
async function persistDemoTile(player: RpgPlayer): Promise<void> {
  if (import.meta.env?.SSR !== true) {
    throw new Error("Shared world persistence is available only on the game server.");
  }
  const [{ getMirrorIslandPrismaClient }, { persistWorldCell }] = await Promise.all([
    import("../../persistence/client.ts"),
    import("../../persistence/world-state.ts"),
  ]);
  await persistWorldCell(getMirrorIslandPrismaClient(), {
    tileX: DEMO_TILE.x,
    tileY: DEMO_TILE.y,
    state: "tilled",
    actorAccountId: player.id,
  });
}

/**
 * Creates the welcome NPC used to prove dialogue, inventory, authoritative tile mutation, and save hooks.
 * Each interaction persists one shared tile and grants a potato saved in the player's durable slot.
 */
export function GuideNpc(
  persistTile: (player: RpgPlayer) => Promise<void> = persistDemoTile,
): EventDefinition {
  return {
    onInit() {
      this.setGraphic("female");
    },
    async onAction(player: RpgPlayer) {
      await persistTile(player);
      player.addItem("Potato", 1);

      const map = player.getCurrentMap<MirrorIslandTiledMap>();
      map?.tiled.setTile(DEMO_TILE.x, DEMO_TILE.y, DEMO_TILE.layer, { gid: DEMO_TILE.gid });
      await player.save(0, { label: "镜像岛自动存档" }, { reason: "manual", source: "guide-npc" });

      await player.showText(
        "欢迎来到镜像岛！我给了你一颗演示土豆，也在地图上改动了一块地。按 Esc 可以打开 RPGJS 自带菜单查看物品。",
      );
    },
  };
}
