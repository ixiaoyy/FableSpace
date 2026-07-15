import { readApiJson } from "./api-client"

export const DEFAULT_PARALLELLINES_URL = "https://pingxingxian.space"
export const PARALLELLINES_AUTH_MODE = "parallellines"
export const FABLESPACE_CREATOR_CAPABILITY = "fablespace.creator"
export const FABLESPACE_ADMIN_CAPABILITY = "fablespace.admin"
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
 * Checks one FableSpace product capability from the trusted linked identity.
 * @param identity Current session identity returned by the status endpoint.
 * @param capability Exact product capability to test.
 * @returns True when the capability is explicit or `fablespace.admin` grants it implicitly.
 */
export function hasFableSpaceCapability(
  identity: CurrentSessionIdentity | null,
  capability: string,
): boolean {
  const granted = Array.isArray(identity?.capabilities) ? identity.capabilities : []
  return granted.includes(FABLESPACE_ADMIN_CAPABILITY) || granted.includes(capability)
}

/**
 * Applies creator authorization only to linked deployments and preserves standalone behavior.
 * @param status Access-gate status returned by FableSpace.
 * @returns True for legacy mode or for a linked user with creator/admin capability.
 */
export function canAccessCreatorTools(status: AccessStatus | null): boolean {
  if (!status) return false
  if (status.auth_mode !== PARALLELLINES_AUTH_MODE) return true
  return status.access_allowed && hasFableSpaceCapability(status.user, FABLESPACE_CREATOR_CAPABILITY)
}

/**
 * Guards a creator-only client route before it reads or mutates owner resources.
 * @returns The resolved access status when creator tools are available.
 * @throws A 403 Response in linked mode when the current user lacks creator capability.
 */
export async function requireCreatorTools(): Promise<AccessStatus> {
  const status = await getAccessStatus()
  if (!canAccessCreatorTools(status)) {
    throw new Response("当前账号暂未开放空间创作与管理功能", { status: 403 })
  }
  return status
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
