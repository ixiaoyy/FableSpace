import type { MapClass } from "@canvasengine/tiled";
import type { EventDefinition, RpgMap, RpgPlayer } from "@rpgjs/server";

const DEMO_TILE = { x: 10, y: 10, layer: "Dynamic", gid: 178 } as const;
type SpikeTiledMap = RpgMap & { tiled: MapClass };

/**
 * Creates the welcome NPC used to prove dialogue, inventory, authoritative tile mutation, and save hooks.
 * Each interaction grants one demo potato; the in-memory save intentionally disappears after server restart.
 */
export function GuideNpc(): EventDefinition {
  return {
    onInit() {
      this.setGraphic("female");
    },
    async onAction(player: RpgPlayer) {
      player.addItem("Potato", 1);

      const map = player.getCurrentMap<SpikeTiledMap>();
      map?.tiled.setTile(DEMO_TILE.x, DEMO_TILE.y, DEMO_TILE.layer, { gid: DEMO_TILE.gid });
      await player.save(0, { label: "镜像岛尖峰存档" }, { reason: "manual", source: "guide-npc" });

      await player.showText(
        "欢迎来到镜像岛！我给了你一颗演示土豆，也在地图上改动了一块地。按 Esc 可以打开 RPGJS 自带菜单查看物品。",
      );
    },
  };
}
