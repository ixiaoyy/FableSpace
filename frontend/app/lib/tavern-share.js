const DEFAULT_SUMMARY = "店主还没有写下公开简介。"

function toText(value) {
  return typeof value === "string" ? value.trim() : ""
}

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeOrigin(origin) {
  const value = toText(origin).replace(/\/+$/, "")
  return value || ""
}

function tavernName(tavern = {}) {
  return toText(tavern.name) || "未命名酒馆"
}

function tavernPath(tavern = {}) {
  const id = toText(tavern.id)
  return id ? `/tavern/${encodeURIComponent(id)}` : "/discover"
}

function formatCoordinate(lat, lon) {
  const safeLat = toNumber(lat)
  const safeLon = toNumber(lon)
  if (safeLat === null || safeLon === null) return "未设置"
  return `${safeLat.toFixed(5)}, ${safeLon.toFixed(5)}`
}

function payloadCoordinate(payload = {}) {
  const location = payload.location && typeof payload.location === "object" ? payload.location : {}
  return formatCoordinate(location.lat, location.lon)
}

export function truncateShareText(value, maxLength = 96) {
  const text = toText(value).replace(/\s+/g, " ")
  const limit = Math.max(1, Number(maxLength) || 96)
  if (text.length <= limit) return text
  return `${text.slice(0, limit).trimEnd()}…`
}

export function buildTavernSharePayload(tavern = {}, options = {}) {
  const name = tavernName(tavern)
  const origin = normalizeOrigin(options.origin)
  const path = tavernPath(tavern)
  const url = `${origin}${path}`
  const title = `邀请你进入「${name}」`
  const summary = truncateShareText(tavern.description) || DEFAULT_SUMMARY
  const coordinates = formatCoordinate(tavern.lat, tavern.lon)

  return {
    title,
    summary,
    url,
    coordinates,
    copyText: `${title}\n${summary}\n坐标：${coordinates}\n${url}`,
  }
}

export function buildTavernShareDisplay(payload = {}) {
  const tavernTitle = toText(payload.title) || "未命名酒馆"
  const title = toText(payload.share_title) || `邀请你进入「${tavernTitle}」`
  const summary = truncateShareText(payload.short_description || payload.description) || DEFAULT_SUMMARY
  const url = toText(payload.share_url) || (toText(payload.tavern_id) ? `/tavern/${encodeURIComponent(payload.tavern_id)}` : "/discover")
  const coordinates = payloadCoordinate(payload)

  return {
    title,
    summary,
    url,
    coordinates,
    copyText: `${title}\n${summary}\n坐标：${coordinates}\n${url}`,
  }
}
