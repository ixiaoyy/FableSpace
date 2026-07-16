export const VISITOR_PLAY_IDENTITY_STORAGE_KEY = "fablespace.visitorPlayIdentity.v1"

export type VisitorPlayIdentityId = "beggar"
export type VisitorPlayGender = "male" | "female"

export type VisitorPlayIdentity = {
  version: 1
  playIdentityId: VisitorPlayIdentityId
  gender: VisitorPlayGender
}

export const VISITOR_PLAY_IDENTITIES = [
  {
    id: "beggar" as const,
    label: "乞丐",
    eraLabel: "古代",
    shortDescription: "来自古代，身无长物；靠观察、开口和交换一点善意继续前行。",
  },
]

export const VISITOR_PLAY_GENDERS = [
  { id: "male" as const, label: "男" },
  { id: "female" as const, label: "女" },
]

/**
 * Resolve browser localStorage without throwing in SSR or privacy-restricted environments.
 * @returns The active Storage object, or null when browser persistence is unavailable. This function has no side effects.
 */
function browserStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null
  } catch {
    return null
  }
}

/**
 * Validate a persisted visitor play identity against the current server-owned option set.
 * @param value Unknown JSON value read from browser storage.
 * @returns A normalized v1 identity, or null when the value is stale or invalid. This function has no side effects.
 */
function normalizeVisitorPlayIdentity(value: unknown): VisitorPlayIdentity | null {
  if (!value || typeof value !== "object") return null
  const candidate = value as Partial<VisitorPlayIdentity>
  if (candidate.version !== 1 || candidate.playIdentityId !== "beggar") return null
  if (candidate.gender !== "male" && candidate.gender !== "female") return null
  return {
    version: 1,
    playIdentityId: candidate.playIdentityId,
    gender: candidate.gender,
  }
}

/**
 * Read the visitor's selected play identity from this browser.
 * @param storage Optional storage adapter used by browser code and focused verification.
 * @returns The validated identity, or null when onboarding has not been completed. This function has no side effects.
 */
export function readVisitorPlayIdentity(storage: Storage | null = browserStorage()): VisitorPlayIdentity | null {
  if (!storage) return null
  try {
    const raw = storage.getItem(VISITOR_PLAY_IDENTITY_STORAGE_KEY)
    return raw ? normalizeVisitorPlayIdentity(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

/**
 * Persist one validated visitor play identity in this browser.
 * @param identity Identity selected explicitly by the visitor.
 * @param storage Optional storage adapter used by browser code and focused verification.
 * @returns The normalized persisted identity. This function writes only to the supplied browser storage.
 */
export function saveVisitorPlayIdentity(
  identity: VisitorPlayIdentity,
  storage: Storage | null = browserStorage(),
): VisitorPlayIdentity {
  const normalized = normalizeVisitorPlayIdentity(identity)
  if (!normalized) throw new Error("游玩身份无效")
  storage?.setItem(VISITOR_PLAY_IDENTITY_STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}

/**
 * Clear the visitor's play identity so the explicit selection screen can be shown again.
 * @param storage Optional storage adapter used by browser code and focused verification.
 * @returns Nothing. This function removes one versioned localStorage key.
 */
export function clearVisitorPlayIdentity(storage: Storage | null = browserStorage()): void {
  storage?.removeItem(VISITOR_PLAY_IDENTITY_STORAGE_KEY)
}

/**
 * Format a concise visible label for the selected role and self-declared gender.
 * @param identity Valid visitor play identity.
 * @returns A Chinese UI label such as “男 · 古代乞丐”. This function has no side effects.
 */
export function visitorPlayIdentityLabel(identity: VisitorPlayIdentity): string {
  const gender = identity.gender === "female" ? "女" : "男"
  return `${gender} · 古代乞丐`
}
