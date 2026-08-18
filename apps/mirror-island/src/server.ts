import {
  createServer,
  InMemorySaveStorageStrategy,
  provideSaveStorage,
  provideServerModules,
} from "@rpgjs/server";
import { provideTiledMap } from "@rpgjs/tiledmap/server";
import { createKeycloakAuthModule } from "./auth/server.ts";
import { provideMain } from "./modules/main/index.ts";

export default createServer({
  providers: [
    provideMain(),
    provideSaveStorage(new InMemorySaveStorageStrategy()),
    provideServerModules([createKeycloakAuthModule()]),
    provideTiledMap(),
  ],
});
