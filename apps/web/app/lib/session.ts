import { readApiJson } from "./api-client"

export const DEFAULT_PARALLELLINES_URL = "https://pingxingxian.space"
export const PARALLELLINES_AUTH_MODE = "parallellines"
export const ACCESS_STATUS_REFRESH_INTERVAL_MS = 30_000

export type CurrentSessionIdentity = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  role: string
  locale: string
  capabilities: string[]
  authorization_version: number
  access_expires_at: string | null
}

export type AccessStatus = {
  access_allowed: boolean
  auth_mode: string
  parallellines_url: string
  user: CurrentSessionIdentity | null
}

type AccessStatusListener = (status: AccessStatus) => void

let accessStatusRequest: Promise<AccessStatus> | null = null
let cachedAccessStatus: AccessStatus | null = null
let accessStatusExpiresAt = 0
const accessStatusListeners = new Set<AccessStatusListener>()

/**
 * Reads the public access-gate status through one shared request and bounded linked-mode cache.
 * @param forceRefresh Discards a cached result after logout, polling, or a 401 response.
 * @returns Current access decision, identity and safe ParallelLines return URL.
 */
export function getAccessStatus(forceRefresh = false): Promise<AccessStatus> {
  if (forceRefresh) {
    cachedAccessStatus = null
    accessStatusExpiresAt = 0
  }
  if (!forceRefresh && cachedAccessStatus && Date.now() < accessStatusExpiresAt) {
    return Promise.resolve(cachedAccessStatus)
  }
  if (accessStatusRequest) return accessStatusRequest

  accessStatusRequest = readApiJson<AccessStatus>("/api/v1/auth/status")
    .then((status) => {
      cachedAccessStatus = status
      accessStatusExpiresAt = status.auth_mode === PARALLELLINES_AUTH_MODE
        ? Date.now() + ACCESS_STATUS_REFRESH_INTERVAL_MS
        : Number.POSITIVE_INFINITY
      accessStatusListeners.forEach((listener) => listener(status))
      return status
    })
    .finally(() => {
      accessStatusRequest = null
    })
  return accessStatusRequest
}

/**
 * Subscribes a mounted access consumer to fresh status responses fetched anywhere in the app.
 * @param listener State updater that receives the latest successful access response.
 * @returns Cleanup callback that removes only this listener and performs no network request.
 */
export function subscribeAccessStatus(listener: AccessStatusListener): () => void {
  accessStatusListeners.add(listener)
  if (cachedAccessStatus && Date.now() < accessStatusExpiresAt) {
    listener(cachedAccessStatus)
  }
  return () => accessStatusListeners.delete(listener)
}

/**
 * Reads the trusted FableSpace session identity through the shared access-status cache.
 * @returns ParallelLines identity when signed in, otherwise null; reuses linked-mode TTL refreshes.
 */
export function getCurrentSessionIdentity(): Promise<CurrentSessionIdentity | null> {
  return getAccessStatus()
    .then((status) => status.user)
    .catch(() => null)
}

/**
 * Chooses the signed session user ID before a legacy URL/default identity.
 * @param fallback Legacy identity used only by standalone deployments without SSO.
 * @returns Effective actor ID; performs the cached session lookup.
 */
export async function resolveCurrentSessionUserId(fallback = ""): Promise<string> {
  const identity = await getCurrentSessionIdentity()
  return identity?.id || fallback
}

/**
 * Clears the local FableSpace cookie and invalidates the cached access decision.
 * @returns Promise resolved after the backend removes the cookie; changes only FableSpace session state.
 */
export async function logoutCurrentSession(): Promise<void> {
  await readApiJson<{ ok: boolean }>("/api/v1/auth/logout", { method: "POST" })
  accessStatusRequest = null
  cachedAccessStatus = null
  accessStatusExpiresAt = 0
}
