import { resolveTavernAtmosphereImage } from "../product/services/atmosphereAssets.js"
import { FALLBACK_ATMOSPHERE_IMAGES, GENERIC_ATMOSPHERE_KEYS } from "./tavern-runtime-config.js"

import type { PlatformStats, Tavern, TavernListResponse } from "./taverns"

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


function safeTaverns(result?: Partial<TavernListResponse> | null): Tavern[] {
  return Array.isArray(result?.taverns) ? result.taverns.filter((tavern) => tavern && tavern.id) : []
}

function safeCharacters(tavern: Tavern) {
  return Array.isArray(tavern.characters) ? tavern.characters : []
}

function toPositiveNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function toNonNegativeNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function hasCoordinates(tavern: Tavern) {
  return Number.isFinite(Number(tavern.lat)) && Number.isFinite(Number(tavern.lon))
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

function hasSpecificAtmosphereMetadata(tavern: Tavern) {
  const candidates = [
    (tavern as Record<string, unknown>).fantasy_type,
    ((tavern as Record<string, unknown>).place as Record<string, unknown> | undefined)?.fantasy_type,
    ((tavern as Record<string, unknown>).poi as Record<string, unknown> | undefined)?.fantasy_type,
    tavern.place_type,
    (tavern as Record<string, unknown>).type,
    (tavern as Record<string, unknown>).faction_alignment,
    tavern.layout_style,
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

export function resolveHomepageTavernCover(tavern: Tavern, index = 0) {
  const metadataCover = resolveTavernAtmosphereImage(tavern)
  if (hasSpecificAtmosphereMetadata(tavern) && metadataCover) return metadataCover

  const seed = String(tavern.id || tavern.name || index)
  return FALLBACK_ATMOSPHERE_IMAGES[hashSeed(seed) % FALLBACK_ATMOSPHERE_IMAGES.length]
}

function findUnusedHomepageCover(tavern: Tavern, index: number, usedCovers: Set<string>) {
  const preferredCover = resolveHomepageTavernCover(tavern, index)
  if (!usedCovers.has(preferredCover)) return preferredCover

  const seed = String(tavern.id || tavern.name || index)
  const start = hashSeed(`${seed}:${index}`) % FALLBACK_ATMOSPHERE_IMAGES.length
  for (let offset = 0; offset < FALLBACK_ATMOSPHERE_IMAGES.length; offset += 1) {
    const candidate = FALLBACK_ATMOSPHERE_IMAGES[(start + offset) % FALLBACK_ATMOSPHERE_IMAGES.length]
    if (!usedCovers.has(candidate)) return candidate
  }

  return preferredCover
}

export function resolveUniqueHomepageTavernCovers(taverns: Tavern[]) {
  const usedCovers = new Set<string>()
  const coversByTavernId: Record<string, string> = {}

  taverns.forEach((tavern, index) => {
    if (!tavern?.id) return
    const image = findUnusedHomepageCover(tavern, index, usedCovers)
    usedCovers.add(image)
    coversByTavernId[tavern.id] = image
  })

  return coversByTavernId
}

export function buildHomepageMetrics(taverns: Tavern[], stats?: PlatformStats | null): HomepageMetric[] {
  const coordinateCount = taverns.filter(hasCoordinates).length
  const characterCount = taverns.reduce((total, tavern) => total + safeCharacters(tavern).length, 0)
  const visitCount = taverns.reduce((total, tavern) => total + toPositiveNumber(tavern.visit_count), 0)
  const openCount = taverns.filter((tavern) => tavern.status === "open" || tavern.is_open === true).length
  const platformCoordinateCount = toNonNegativeNumber(stats?.coordinates)
  const platformCharacterCount = toNonNegativeNumber(stats?.characters)
  const platformVisitCount = toNonNegativeNumber(stats?.visits ?? stats?.encounters)
  const platformOpenCount = toNonNegativeNumber(stats?.open)
  const resolvedCoordinateCount = platformCoordinateCount ?? (coordinateCount || taverns.length)

  return [
    { id: "coordinates", value: formatInteger(resolvedCoordinateCount), label: "真实坐标" },
    { id: "characters", value: formatInteger(platformCharacterCount ?? characterCount), label: "AI 角色" },
    { id: "encounters", value: formatInteger(platformVisitCount ?? visitCount), label: "相遇记录" },
    { id: "open", value: formatInteger(platformOpenCount ?? openCount), label: "亮起入口" },
  ]
}

function formatHomepageLocation(tavern: Tavern) {
  if (typeof tavern.address === "string" && tavern.address.trim()) return compactText(tavern.address, "街角门牌", 34)
  if (hasCoordinates(tavern)) {
    return `坐标门牌 · ${Number(tavern.lat).toFixed(4)}, ${Number(tavern.lon).toFixed(4)}`
  }
  return "坐标待确认"
}

function buildEntryTags(tavern: Tavern) {
  const characterCount = safeCharacters(tavern).length
  const visitCount = toPositiveNumber(tavern.visit_count)
  const isClosed = tavern.status === "closed" || tavern.is_open === false

  return [
    isClosed ? "今日熄灯" : "可进入",
    characterCount ? `${characterCount} 位 NPC` : "待配置 NPC",
    visitCount ? `${formatInteger(visitCount)} 次到访` : "新入口",
  ]
}

export function buildFeaturedCitySlices(taverns: Tavern[], limit = 3): HomepageCitySlice[] {
  const featuredTaverns = [...taverns]
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
  const coversByTavernId = resolveUniqueHomepageTavernCovers(featuredTaverns)

  return featuredTaverns.map((tavern) => ({
    image: coversByTavernId[tavern.id] || resolveHomepageTavernCover(tavern),
    name: compactText(tavern.name, "未命名入口", 18),
    location: formatHomepageLocation(tavern),
    entryMeta: tavern.status === "open" || tavern.is_open === true ? "灯牌亮着" : "可预览",
    tags: buildEntryTags(tavern),
    id: tavern.id,
  }))
}

export function buildHomepageView(
  result?: Partial<TavernListResponse> | null,
  error = "",
  options: HomepageViewOptions = {},
): HomepageView {
  const taverns = safeTaverns(result)

  return {
    metrics: buildHomepageMetrics(taverns, options.stats),
    featuredCitySlices: buildFeaturedCitySlices(taverns, 4),
    error,
  }
}
