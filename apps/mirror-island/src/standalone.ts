import { mergeConfig } from "@signe/di";
import { provideRpg, startGame } from "@rpgjs/client";
import configClient from "./config/config.client.ts";
import startServer from "./server.ts";

startGame(
  mergeConfig(configClient, {
    providers: [provideRpg(startServer)],
  })
);
