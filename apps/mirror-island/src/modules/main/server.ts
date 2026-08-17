import { defineModule } from "@rpgjs/common";
import { RpgServer } from "@rpgjs/server";
import { GuideNpc } from "./event.ts";
import { Potato } from "./items.ts";
import { player } from "./player.ts";

export default defineModule<RpgServer>({
  player,
  database: {
    Potato,
  },
  maps: [
    {
      id: "simplemap",
      events: [
        {
          id: "guide-npc",
          x: 280,
          y: 330,
          event: GuideNpc(),
        },
      ],
    },
  ],
});
