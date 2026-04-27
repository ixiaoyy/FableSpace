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

export function buildCreatorConversionLink(tavern = {}) {
  const params = new URLSearchParams()
  const lat = coordinateParam(tavern.lat)
  const lon = coordinateParam(tavern.lon)
  const address = toText(tavern.address)
  const sourceTavernId = toText(tavern.id)

  if (lat) params.set("lat", lat)
  if (lon) params.set("lon", lon)
  if (address) params.set("address", address)
  if (sourceTavernId) params.set("source_tavern", sourceTavernId)

  const query = params.toString()
  return query ? `/create?${query}` : "/create"
}

export function readCreatePrefill(searchParams = new URLSearchParams()) {
  const get = (key) => (typeof searchParams.get === "function" ? searchParams.get(key) : "")
  const sourceTavernId = toText(get("source_tavern"))

  return {
    lat: safeQueryCoordinate(get("lat"), DEFAULT_CREATE_LAT),
    lon: safeQueryCoordinate(get("lon"), DEFAULT_CREATE_LON),
    address: toText(get("address")),
    sourceTavernId,
    hasSource: Boolean(sourceTavernId),
  }
}
