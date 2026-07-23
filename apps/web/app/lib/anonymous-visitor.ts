const VISITOR_ID_STORAGE_KEY = "fablespace.anonymousVisitorIdentity"

function normalizeIdentity(value: unknown) {
  return String(value || "").trim()
}

function browserStorage() {
  try {
    return typeof globalThis !== "undefined" && globalThis.localStorage
      ? globalThis.localStorage
      : null
  } catch {
    return null
  }
}

function randomIdentityToken() {
  const bytes = new Uint32Array(2)
  try {
    if (globalThis.crypto?.getRandomValues) {
      globalThis.crypto.getRandomValues(bytes)
      return `${bytes[0].toString(36)}_${bytes[1].toString(36)}`
    }
  } catch {
    // Non-browser validation may not expose Web Crypto.
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function getOrCreateVisitorIdentity(storage = browserStorage()) {
  const existing = storage?.getItem
    ? normalizeIdentity(storage.getItem(VISITOR_ID_STORAGE_KEY))
    : ""
  if (existing) return existing

  const identity = `visitor_${randomIdentityToken()}`
  storage?.setItem?.(VISITOR_ID_STORAGE_KEY, identity)
  return identity
}
