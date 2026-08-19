import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

const DATABASE_ENV_NAME = "MIRROR_ISLAND_DATABASE_URL";
let cachedClient: PrismaClient | null = null;

/** Resolves the required PostgreSQL URL without logging credentials or accepting non-PostgreSQL schemes. */
export function resolveMirrorIslandDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  const raw = String(env[DATABASE_ENV_NAME] || "").trim();
  if (!raw) {
    throw new Error(`${DATABASE_ENV_NAME} is required.`);
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${DATABASE_ENV_NAME} must be a valid PostgreSQL URL.`);
  }
  if (!/^postgres(?:ql)?:$/.test(parsed.protocol) || !parsed.hostname || !parsed.pathname.slice(1)) {
    throw new Error(`${DATABASE_ENV_NAME} must target a named PostgreSQL database.`);
  }
  return raw;
}

/** Creates one Prisma 7 client backed by the official node-postgres driver adapter. */
export function createMirrorIslandPrismaClient(
  env: Record<string, string | undefined> = process.env,
): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: resolveMirrorIslandDatabaseUrl(env),
    connectionTimeoutMillis: 5_000,
    max: 10,
  });
  return new PrismaClient({ adapter });
}

/** Returns the process-wide Prisma client so the long-running game server owns only one connection pool. */
export function getMirrorIslandPrismaClient(): PrismaClient {
  cachedClient ??= createMirrorIslandPrismaClient();
  return cachedClient;
}

/** Disconnects the process-wide Prisma client during controlled server shutdown. */
export async function disconnectMirrorIslandPrismaClient(): Promise<void> {
  const client = cachedClient;
  cachedClient = null;
  await client?.$disconnect();
}
