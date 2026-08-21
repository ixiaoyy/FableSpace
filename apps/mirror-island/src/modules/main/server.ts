import { defineModule } from "@rpgjs/common";
import type { RpgServer } from "@rpgjs/server";
import { riverCollisionRectangles } from "../../world/terrain-contract.ts";
import { TerrainBlocker } from "./event.ts";
import { HouseStake } from "./items.ts";
import { player } from "./player.ts";

export default defineModule<RpgServer>({
  player,
  database: {
    HouseStake,
  },
  maps: [
    {
      id: "simplemap",
      events: riverCollisionRectangles().map((rectangle) => ({
        id: rectangle.id,
        x: rectangle.x,
        y: rectangle.y,
        hitbox: { width: rectangle.width, height: rectangle.height },
        event: TerrainBlocker(),
      })),
    },
  ],
});
