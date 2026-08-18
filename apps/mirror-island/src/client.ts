import { startGame, provideMmorpg } from "@rpgjs/client";
import { mergeConfig } from "@signe/di";
import { initializeKeycloakSession, renderAuthenticationFailure } from "./auth/client.ts";
import configClient from "./config/config.client.ts";

try {
  const keycloak = await initializeKeycloakSession();
  startGame(
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
