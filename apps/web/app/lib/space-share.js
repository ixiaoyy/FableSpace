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

function spaceName(space = {}) {
  return toText(space.name) || "未命名空间"
}

function spacePath(space = {}) {
  const id = toText(space.id)
  return id ? `/space/${encodeURIComponent(id)}` : "/discover"
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

function extractCharacterNames(space = {}) {
  const characters = Array.isArray(space.characters) ? space.characters : []
  if (characters.length === 0) return null
  const names = characters.map((c) => c.name || "未命名").slice(0, 3)
  if (characters.length > 3) {
    return `${names.join("、")} · +${characters.length - 3}人`
  }
  return names.join("、")
}

export function truncateShareText(value, maxLength = 96) {
  const text = toText(value).replace(/\s+/g, " ")
  const limit = Math.max(1, Number(maxLength) || 96)
  if (text.length <= limit) return text
  return `${text.slice(0, limit).trimEnd()}…`
}

export function buildSpaceSharePayload(space = {}, options = {}) {
  const name = spaceName(space)
  const origin = normalizeOrigin(options.origin)
  const path = spacePath(space)
  const url = `${origin}${path}`
  const title = `邀请你进入「${name}」`
  const summary = truncateShareText(space.description) || DEFAULT_SUMMARY
  const coordinates = formatCoordinate(space.lat, space.lon)
  const characterNames = extractCharacterNames(space)

  // Build copy text with character preview
  let copyText = `${title}\n${summary}`
  if (characterNames) {
    copyText += `\nNPC：${characterNames}`
  }
  copyText += `\n坐标：${coordinates}\n${url}`

  return {
    title,
    summary,
    url,
    coordinates,
    characters: characterNames,
    copyText,
  }
}

export function buildSpaceShareDisplay(payload = {}) {
  const spaceTitle = toText(payload.title) || "未命名空间"
  const title = toText(payload.share_title) || `邀请你进入「${spaceTitle}」`
  const summary = truncateShareText(payload.short_description || payload.description) || DEFAULT_SUMMARY
  const url = toText(payload.share_url) || (toText(payload.space_id) ? `/space/${encodeURIComponent(payload.space_id)}` : "/discover")
  const coordinates = payloadCoordinate(payload)

  // Extract character names from payload if available
  let characters = null
  if (payload.characters && Array.isArray(payload.characters) && payload.characters.length > 0) {
    const names = payload.characters.slice(0, 3).map((c) => c.name || "未命名")
    if (payload.characters.length > 3) {
      characters = `${names.join("、")} · +${payload.characters.length - 3}人`
    } else {
      characters = names.join("、")
    }
  } else if (payload.character_count && payload.character_count > 0) {
    characters = `${payload.character_count} 位 NPC`
  }

  // Build copy text with character preview
  let copyText = `${title}\n${summary}`
  if (characters) {
    copyText += `\nNPC：${characters}`
  }
  copyText += `\n坐标：${coordinates}\n${url}`

  return {
    title,
    summary,
    url,
    coordinates,
    characters,
    copyText,
  }
}
