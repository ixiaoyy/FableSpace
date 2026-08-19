import {
  createServer,
  InMemorySaveStorageStrategy,
  provideSaveStorage,
  provideServerModules,
} from "@rpgjs/server";
import { provideTiledMap } from "@rpgjs/tiledmap/server";
import { createKeycloakAuthModule } from "./auth/server.ts";
import { provideMain } from "./modules/main/index.ts";

/** Loads PostgreSQL persistence only in the Node server build so database code never enters the browser bundle. */
async function resolveSaveStorage() {
  if (import.meta.env?.SSR !== true) return new InMemorySaveStorageStrategy();
  const [{ getMirrorIslandPrismaClient }, { PrismaSaveStorageStrategy }] = await Promise.all([
    import("./persistence/client.ts"),
    import("./persistence/prisma-save-storage.ts"),
  ]);
  return new PrismaSaveStorageStrategy(getMirrorIslandPrismaClient);
}

const saveStorage = await resolveSaveStorage();

export default createServer({
  providers: [
    provideMain(),
    provideSaveStorage(saveStorage),
    provideServerModules([createKeycloakAuthModule()]),
    provideTiledMap(),
  ],
});
