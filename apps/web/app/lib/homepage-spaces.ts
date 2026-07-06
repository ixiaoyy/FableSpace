import { resolveSpaceAtmosphereImage } from "../product/services/atmosphereAssets.js"
import { FALLBACK_ATMOSPHERE_IMAGES, GENERIC_ATMOSPHERE_KEYS } from "./space-runtime-config.js"

import type { PlatformStats, Space, SpaceListResponse } from "./spaces"

export type HomepageMetricId = "coordinates" | "characters" | "encounters" | "open"

export type HomepageMetric = {
  id: HomepageMetricId
  label: string
  value: string
}

export type HomepageCitySlice = {
  image: string
  name: string
  location: string
  entryMeta: string
  tags: string[]
  id: string
}

export type HomepageView = {
  metrics: HomepageMetric[]
  featuredCitySlices: HomepageCitySlice[]
  error: string
}

export type HomepageViewOptions = {
  stats?: PlatformStats | null
}


function safeSpaces(result?: Partial<SpaceListResponse> | null): Space[] {
  return Array.isArray(result?.spaces) ? result.spaces.filter((space) => space && space.id) : []
}

function safeCharacters(space: Space) {
  return Array.isArray(space.characters) ? space.characters : []
}

function toPositiveNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function toNonNegativeNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function hasCoordinates(space: Space) {
  return Number.isFinite(Number(space.lat)) && Number.isFinite(Number(space.lon))
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("zh-CN").format(Math.max(0, Math.round(value)))
}

function compactText(value: unknown, fallback: string, maxLength = 28) {
  const text = typeof value === "string" ? value.trim() : ""
  const display = text || fallback
  return display.length > maxLength ? `${display.slice(0, maxLength)}…` : display
}

function normalizeKey(value: unknown) {
  return String(value || "").trim().toLowerCase().replace(/-/g, "_")
}

function hasSpecificAtmosphereMetadata(space: Space) {
  const candidates = [
    (space as Record<string, unknown>).fantasy_type,
    ((space as Record<string, unknown>).place as Record<string, unknown> | undefined)?.fantasy_type,
    ((space as Record<string, unknown>).poi as Record<string, unknown> | undefined)?.fantasy_type,
    space.place_type,
    (space as Record<string, unknown>).type,
    (space as Record<string, unknown>).faction_alignment,
    space.layout_style,
  ]

  return candidates.some((candidate) => !GENERIC_ATMOSPHERE_KEYS.has(normalizeKey(candidate)))
}

function hashSeed(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

export function resolveHomepageSpaceCover(space: Space, index = 0) {
  const metadataCover = resolveSpaceAtmosphereImage(space)
  if (hasSpecificAtmosphereMetadata(space) && metadataCover) return metadataCover

  const seed = String(space.id || space.name || index)
  return FALLBACK_ATMOSPHERE_IMAGES[hashSeed(seed) % FALLBACK_ATMOSPHERE_IMAGES.length]
}

function findUnusedHomepageCover(space: Space, index: number, usedCovers: Set<string>) {
  const preferredCover = resolveHomepageSpaceCover(space, index)
  if (!usedCovers.has(preferredCover)) return preferredCover

  const seed = String(space.id || space.name || index)
  const start = hashSeed(`${seed}:${index}`) % FALLBACK_ATMOSPHERE_IMAGES.length
  for (let offset = 0; offset < FALLBACK_ATMOSPHERE_IMAGES.length; offset += 1) {
    const candidate = FALLBACK_ATMOSPHERE_IMAGES[(start + offset) % FALLBACK_ATMOSPHERE_IMAGES.length]
    if (!usedCovers.has(candidate)) return candidate
  }

  return preferredCover
}

export function resolveUniqueHomepageSpaceCovers(spaces: Space[]) {
  const usedCovers = new Set<string>()
  const coversBySpaceId: Record<string, string> = {}

  spaces.forEach((space, index) => {
    if (!space?.id) return
    const image = findUnusedHomepageCover(space, index, usedCovers)
    usedCovers.add(image)
    coversBySpaceId[space.id] = image
  })

  return coversBySpaceId
}

export function buildHomepageMetrics(spaces: Space[], stats?: PlatformStats | null): HomepageMetric[] {
  const coordinateCount = spaces.filter(hasCoordinates).length
  const characterCount = spaces.reduce((total, space) => total + safeCharacters(space).length, 0)
  const visitCount = spaces.reduce((total, space) => total + toPositiveNumber(space.visit_count), 0)
  const openCount = spaces.filter((space) => space.status === "open" || space.is_open === true).length
  const platformCoordinateCount = toNonNegativeNumber(stats?.coordinates)
  const platformCharacterCount = toNonNegativeNumber(stats?.characters)
  const platformVisitCount = toNonNegativeNumber(stats?.visits ?? stats?.encounters)
  const platformOpenCount = toNonNegativeNumber(stats?.open)
  const resolvedCoordinateCount = platformCoordinateCount ?? (coordinateCount || spaces.length)

  return [
    { id: "coordinates", value: formatInteger(resolvedCoordinateCount), label: "真实坐标" },
    { id: "characters", value: formatInteger(platformCharacterCount ?? characterCount), label: "AI 角色" },
    { id: "encounters", value: formatInteger(platformVisitCount ?? visitCount), label: "相遇记录" },
    { id: "open", value: formatInteger(platformOpenCount ?? openCount), label: "亮起入口" },
  ]
}

function formatHomepageLocation(space: Space) {
  if (typeof space.address === "string" && space.address.trim()) return compactText(space.address, "街角门牌", 34)
  if (hasCoordinates(space)) {
    return `坐标门牌 · ${Number(space.lat).toFixed(4)}, ${Number(space.lon).toFixed(4)}`
  }
  return "坐标待确认"
}

function buildEntryTags(space: Space) {
  const characterCount = safeCharacters(space).length
  const visitCount = toPositiveNumber(space.visit_count)
  const isClosed = space.status === "closed" || space.is_open === false

  return [
    isClosed ? "今日熄灯" : "可进入",
    characterCount ? `${characterCount} 位 NPC` : "待配置 NPC",
    visitCount ? `${formatInteger(visitCount)} 次到访` : "新入口",
  ]
}

export function buildFeaturedCitySlices(spaces: Space[], limit = 3): HomepageCitySlice[] {
  const featuredSpaces = [...spaces]
    .sort((left, right) => {
      const leftOpen = left.status === "open" || left.is_open === true ? 1 : 0
      const rightOpen = right.status === "open" || right.is_open === true ? 1 : 0
      if (leftOpen !== rightOpen) return rightOpen - leftOpen

      const rightCharacters = safeCharacters(right).length
      const leftCharacters = safeCharacters(left).length
      if (leftCharacters !== rightCharacters) return rightCharacters - leftCharacters

      return toPositiveNumber(right.visit_count) - toPositiveNumber(left.visit_count)
    })
    .slice(0, limit)
  const coversBySpaceId = resolveUniqueHomepageSpaceCovers(featuredSpaces)

  return featuredSpaces.map((space) => ({
    image: coversBySpaceId[space.id] || resolveHomepageSpaceCover(space),
    name: compactText(space.name, "未命名入口", 18),
    location: formatHomepageLocation(space),
    entryMeta: space.status === "open" || space.is_open === true ? "灯牌亮着" : "可预览",
    tags: buildEntryTags(space),
    id: space.id,
  }))
}

export function buildHomepageView(
  result?: Partial<SpaceListResponse> | null,
  error = "",
  options: HomepageViewOptions = {},
): HomepageView {
  const spaces = safeSpaces(result)

  return {
    metrics: buildHomepageMetrics(spaces, options.stats),
    featuredCitySlices: buildFeaturedCitySlices(spaces, 4),
    error,
  }
}
