const DEFAULT_CREATE_LAT = "31.2304"
const DEFAULT_CREATE_LON = "121.4737"

function toText(value) {
  return typeof value === "string" ? value.trim() : ""
}

function toNumber(value) {
  if (value === null || value === undefined) return null
  if (typeof value === "string" && !value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function coordinateParam(value) {
  const parsed = toNumber(value)
  return parsed === null ? "" : parsed.toFixed(6)
}

function safeQueryCoordinate(value, fallback) {
  const parsed = toNumber(value)
  return parsed === null ? fallback : parsed.toFixed(6)
}

// Build a link to the creator's public profile page
export function buildCreatorProfileLink(ownerId = "") {
  const safeId = toText(ownerId)
  if (!safeId) return "/discover"
  return `/creator/${encodeURIComponent(safeId)}`
}

// Build a link to create a new space (with optional prefilled data)
export function buildCreatorConversionLink(space = {}) {
  const params = new URLSearchParams()
  const lat = coordinateParam(space.lat)
  const lon = coordinateParam(space.lon)
  const address = toText(space.address)
  const sourceSpaceId = toText(space.id)
  const sourceOwnerId = toText(space.owner_id)

  if (lat) params.set("lat", lat)
  if (lon) params.set("lon", lon)
  if (address) params.set("address", address)
  if (sourceSpaceId) params.set("source_space", sourceSpaceId)
  if (sourceOwnerId) params.set("source_creator", sourceOwnerId)

  const query = params.toString()
  return query ? `/create?${query}` : "/create"
}

export function readCreatePrefill(searchParams = new URLSearchParams()) {
  const get = (key) => (typeof searchParams.get === "function" ? searchParams.get(key) : "")
  const sourceSpaceId = toText(get("source_space"))
  const sourceOwnerId = toText(get("source_creator"))

  return {
    lat: safeQueryCoordinate(get("lat"), DEFAULT_CREATE_LAT),
    lon: safeQueryCoordinate(get("lon"), DEFAULT_CREATE_LON),
    address: toText(get("address")),
    sourceSpaceId,
    sourceOwnerId,
    hasSource: Boolean(sourceSpaceId || sourceOwnerId),
  }
}
