import { readApiJson } from "./api-client"

export const DEFAULT_PARALLELLINES_URL = "https://pingxingxian.space"

export type CurrentSessionIdentity = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  role: string
  locale: string
}

export type AccessStatus = {
  access_allowed: boolean
  auth_mode: string
  parallellines_url: string
  user: CurrentSessionIdentity | null
}

let accessStatusRequest: Promise<AccessStatus> | null = null

/**
 * Reads the public access-gate status and caches it for this page load.
 * @param forceRefresh Discards a stale result after logout or a 401 response.
 * @returns Current access decision, identity and safe ParallelLines return URL.
 */
export function getAccessStatus(forceRefresh = false): Promise<AccessStatus> {
  if (forceRefresh) accessStatusRequest = null
  if (!accessStatusRequest) {
    accessStatusRequest = readApiJson<AccessStatus>("/api/v1/auth/status")
  }
  return accessStatusRequest
}

/**
 * Reads the trusted FableSpace session identity and caches it for this page load.
 * @returns ParallelLines identity when signed in, otherwise null; performs one API read.
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
}
