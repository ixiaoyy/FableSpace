export type PrivateInteriorPublisher = (houseId: string) => Promise<void>;

let publishPrivateInterior: PrivateInteriorPublisher | null = null;

/** Registers the Node transport-owned publisher used by gameplay door events. */
export function registerPrivateInteriorPublisher(publisher: PrivateInteriorPublisher): void {
  publishPrivateInterior = publisher;
}

/** Ensures one owner-specific interior room is published before RPGJS transfers the player. */
export async function ensurePrivateInteriorPublished(houseId: string): Promise<void> {
  if (!publishPrivateInterior) {
    throw new Error("Private interior publisher is unavailable.");
  }
  await publishPrivateInterior(houseId);
}
