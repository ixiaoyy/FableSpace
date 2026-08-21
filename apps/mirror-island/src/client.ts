import { startGame, provideMmorpg } from "@rpgjs/client";
import { mergeConfig } from "@signe/di";
import { initializeKeycloakSession, renderAuthenticationFailure } from "./auth/client.ts";
import configClient from "./config/config.client.ts";

const RETIRED_SAVE_KEYS = [
  "farm-game.save.v1",
  "farm-game.save.v2",
  "farm-game.save.v3",
  "farm-game.save.v4",
] as const;

/** Removes only the reviewed retired farm saves without enumerating unrelated origin storage. */
function discardRetiredFarmSaves(storage: Storage = window.localStorage): void {
  try {
    for (const key of RETIRED_SAVE_KEYS) storage.removeItem(key);
  } catch {
    // Storage denial must not block authenticated server-owned play.
  }
}

try {
  discardRetiredFarmSaves();
  const keycloak = await initializeKeycloakSession();
  await startGame(
    mergeConfig(configClient, {
      providers: [
        provideMmorpg({
          connectionId: keycloak.subject,
          socketOptions: {
            protocols: () => ["mirror-island", `bearer.${keycloak.token}`],
          },
        }),
      ],
    }),
  );
} catch {
  renderAuthenticationFailure();
}
