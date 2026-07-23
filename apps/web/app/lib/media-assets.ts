const DEFAULT_MEDIA_BASE_URL = "https://img.pingxingxian.space/fablespace/media/v1"

export const MEDIA_BASE_URL = (import.meta.env.VITE_MEDIA_BASE_URL?.trim() || DEFAULT_MEDIA_BASE_URL).replace(/\/+$/, "")
export const MEDIA_ORIGIN = new URL(MEDIA_BASE_URL).origin

const ABSOLUTE_URL_PATTERN = /^(?:https?:|data:|blob:)/i
const PROJECT_MEDIA_PATH_PATTERN = /^\/?(?:app\/assets\/|public\/assets\/|apps\/web\/app\/assets\/)/i

/** Resolve project-owned story media through the immutable CDN namespace. */
export function mediaAssetUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || ABSOLUTE_URL_PATTERN.test(trimmed) || trimmed.startsWith("/generated/")) {
    return trimmed
  }

  const normalized = trimmed.replace(/\\/g, "/").replace(/^\/+/, "")
  return `${MEDIA_BASE_URL}/${normalizeObjectKey(normalized)}`
}

/** Normalize project media paths returned by the API without touching ordinary strings. */
export function normalizeMediaPayload<T>(value: T): T {
  if (typeof value === "string") {
    return (PROJECT_MEDIA_PATH_PATTERN.test(value.trim()) ? mediaAssetUrl(value) : value) as T
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeMediaPayload(item)) as T
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeMediaPayload(item)]),
    ) as T
  }
  return value
}

function normalizeObjectKey(path: string): string {
  if (path.startsWith("apps/web/app/assets/")) {
    return `app/assets/${path.slice("apps/web/app/assets/".length)}`
  }
  return path
}
