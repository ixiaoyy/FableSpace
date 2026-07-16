const DEFAULT_MEDIA_BASE_URL = "https://img.pingxingxian.space/fablespace/media/v1"

export const MEDIA_BASE_URL = (import.meta.env.VITE_MEDIA_BASE_URL?.trim() || DEFAULT_MEDIA_BASE_URL).replace(/\/+$/, "")
export const MEDIA_ORIGIN = new URL(MEDIA_BASE_URL).origin

const ABSOLUTE_URL_PATTERN = /^(?:https?:|data:|blob:)/i
const PROJECT_MEDIA_PATH_PATTERN = /^\/?(?:assets\/|place-atmosphere(?:-hd)?\/|faction-emblems\/|apps\/web\/(?:app\/(?:product\/)?assets|public)\/)/i

/** Resolve project-owned media and legacy public paths through the immutable CDN namespace. */
export function mediaAssetUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || ABSOLUTE_URL_PATTERN.test(trimmed) || trimmed.startsWith("/generated/")) {
    return trimmed
  }

  const normalized = trimmed.replace(/\\/g, "/").replace(/^\/+/, "")
  return `${MEDIA_BASE_URL}/${normalizeObjectKey(normalized)}`
}

/** Normalize project media paths returned by legacy API records without touching ordinary strings. */
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
  if (path.startsWith("apps/web/app/product/assets/")) {
    return `app/product/assets/${path.slice("apps/web/app/product/assets/".length)}`
  }
  if (path.startsWith("apps/web/app/assets/")) {
    return `app/assets/${path.slice("apps/web/app/assets/".length)}`
  }
  if (path.startsWith("apps/web/public/")) {
    return `public/${path.slice("apps/web/public/".length)}`
  }
  if (path.startsWith("assets/") || path.startsWith("place-atmosphere") || path.startsWith("faction-emblems/")) {
    return `public/${path}`
  }
  return path
}
