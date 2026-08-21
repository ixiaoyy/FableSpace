import type { Direction } from "@rpgjs/common";
import type { EventDefinition, RpgPlayer } from "@rpgjs/server";
import { HOUSE_STAKE_ID } from "./onboarding-contract.ts";

/** Creates the player-specific welcome NPC that grants one resumable house-selection stake. */
export function WelcomeNpc(npcFacing: Direction): EventDefinition {
  return {
    onInit() {
      this.setGraphic("female");
      this.changeDirection(npcFacing);
      this.setMass(Number.POSITIVE_INFINITY);
    },
    async onAction(player: RpgPlayer) {
      if (import.meta.env?.SSR !== true) return;
      const [{ getMirrorIslandPrismaClient }, { findHouseByOwner }] = await Promise.all([
        import("../../persistence/client.ts"),
        import("../../persistence/house.ts"),
      ]);
      const house = await findHouseByOwner(getMirrorIslandPrismaClient(), player.id);
      if (house) {
        await player.showText("你的房子已经盖好了！回到房门前点击一下，就能进入私人小屋。");
        player.getCurrentMap()?.removeEvent(this.id);
        return;
      }
      if (!player.hasItem(HOUSE_STAKE_ID)) {
        player.addItem(HOUSE_STAKE_ID, 1);
        await player.save(0, { label: "镜像岛自动存档" }, { reason: "manual", source: "welcome-npc" });
      }
      await player.showText(
        "欢迎来到镜像岛！去找一块喜欢的空地，站在未来房门的南边并面向北方，使用“选址木桩”标记位置，我会免费帮你把房子盖好。",
      );
    },
  };
}

/** Creates one invisible immovable terrain blocker for the fixed river water bands. */
export function TerrainBlocker(): EventDefinition {
  return {
    onInit() {
      this.setMass(Number.POSITIVE_INFINITY);
    },
  };
}
