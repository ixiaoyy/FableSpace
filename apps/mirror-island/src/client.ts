import { startGame, provideMmorpg } from "@rpgjs/client";
import { mergeConfig } from "@signe/di";
import configClient from "./config/config.client.ts";

startGame(
  mergeConfig(configClient, {
    providers: [
      provideMmorpg({
        connectionIdScope: "session",
      }),
    ],
  }),
);
