import type { PlayerProfile, PrismaClient } from "../generated/prisma/client.ts";
import { requireAccountId } from "./contracts.ts";

export const DEFAULT_AVATAR_ID = "ninja_blue";

/** Builds the temporary public name used until the new account completes Mirror Island onboarding. */
export function defaultPlayerName(accountId: string): string {
  const suffix = accountId.replace(/[^A-Za-z0-9]/g, "").slice(-4) || "0000";
  return `岛民-${suffix}`;
}

/** Idempotently creates the durable profile for one authenticated Keycloak subject. */
export async function ensurePlayerProfile(
  client: PrismaClient,
  rawAccountId: unknown,
): Promise<PlayerProfile> {
  const accountId = requireAccountId(rawAccountId);
  return client.playerProfile.upsert({
    where: { accountId },
    create: {
      accountId,
      playerName: defaultPlayerName(accountId),
      avatarId: DEFAULT_AVATAR_ID,
    },
    update: {},
  });
}
