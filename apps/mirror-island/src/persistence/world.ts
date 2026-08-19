import type { PrismaClient, World } from "../generated/prisma/client.ts";
import {
  MIRROR_ISLAND_CHUNK_SIZE,
  MIRROR_ISLAND_EPOCH_UTC,
  MIRROR_ISLAND_WORLD_HEIGHT,
  MIRROR_ISLAND_WORLD_REVISION,
  MIRROR_ISLAND_WORLD_SEED,
  MIRROR_ISLAND_WORLD_SLUG,
  MIRROR_ISLAND_WORLD_WIDTH,
} from "./contracts.ts";

/** Idempotently creates the single reviewed Mirror Island world contract and returns its durable row. */
export async function ensureMirrorIslandWorld(client: PrismaClient): Promise<World> {
  return client.world.upsert({
    where: { slug: MIRROR_ISLAND_WORLD_SLUG },
    create: {
      slug: MIRROR_ISLAND_WORLD_SLUG,
      seed: MIRROR_ISLAND_WORLD_SEED,
      widthTiles: MIRROR_ISLAND_WORLD_WIDTH,
      heightTiles: MIRROR_ISLAND_WORLD_HEIGHT,
      chunkSize: MIRROR_ISLAND_CHUNK_SIZE,
      revision: MIRROR_ISLAND_WORLD_REVISION,
      epochUtc: MIRROR_ISLAND_EPOCH_UTC,
    },
    update: {},
  });
}
