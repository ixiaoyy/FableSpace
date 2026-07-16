import type { ClientLoaderFunctionArgs } from "react-router"
import {
  ArrowRight,
  Compass,
  LayoutGrid,
  MapPinned,
  RadioTower,
  Radar,
  Search,
  UsersRound,
  Waves,
  X,
} from "lucide-react"
import { Link, useSearchParams } from "react-router"
import { useEffect, useMemo, useState } from "react"

import { DiscoveryLivelinessStrip } from "../components/DiscoveryLivelinessStrip"
import { FableSpaceDiscoverReference } from "../components/fable-space-reference-artboards"
import { SpacePreviewModal } from "../components/space-preview-modal"
import { buildDiscoveryLiveliness, getDiscoveryLivelinessSearchText } from "../lib/discovery-liveliness.js"
import { resolveHomepageSpaceCover, resolveUniqueHomepageSpaceCovers } from "../lib/homepage-spaces"
import { mediaAssetUrl } from "../lib/media-assets"
import { DISCOVERABLE_PLACE_TYPES, derivePlaceTypeDisplay, placeTypeMatchesSpace } from "../lib/place-types.js"
import { buildShortDramaTeaser, getShortDramaTeaserSearchText } from "../lib/short-drama-teasers.js"
import {
  deriveSpecialSpaceTypeDisplay,
  SPECIAL_SPACE_TYPES,
  specialSpaceTypeMatchesSpace,
} from "../lib/special-space-types.js"
import { buildSpaceFirstMinuteGuide, getSpaceFirstMinuteSearchText } from "../lib/space-first-minute"
import { buildSpaceIntentTags, getSpaceIntentTagsSearchText } from "../lib/space-intent-tags.js"
import { errorMessage, listSpaces, type Space, type SpaceCharacter, type SpaceListResponse } from "../lib/spaces"
import { spacePath } from "../lib/web-routes"
import { buildMapAnchorCardCopy, formatSpaceAnchorLocation } from "../product/mapAnchorCopy.js"
import { useTheme } from "../hooks/useTheme"
import { ProductShell } from "../shell/product-shell"
import { Button } from "../ui/button"

const discoverRadarSurfaceImage = mediaAssetUrl("app/assets/fable-space-05-10/discover/cards/card-compass-square.png")
const discoverAtmosphereLoreImage = mediaAssetUrl("app/assets/place-atmosphere-hd/atmosphere-lore.webp")

type DiscoverViewMode = "radar" | "cards"

type Category = {
  label: string
  tags: string[]
  color: string
}

type DiscoverLoaderData = {
  result: SpaceListResponse
  error: string
}

type SpaceWithTimeStatus = Space & {
  is_open?: boolean
  local_time_display?: string
}

type FilterState = {
  search: string
  activePlaceTypes: Set<string>
  activeSpecialTypes: Set<string>
  activeCategories: Set<string>
  publicOnly: boolean
  openOnly: boolean
}

type EntryEcho = {
  label: string
  value: string
  helper: string
  className: string
}

type EntryStatusDisplay = {
  label: string
  helper: string
  className: string
}

const CATEGORIES: Category[] = [
  { label: "异星街角", tags: ["外星人", "便利店"], color: "text-violet-200 border-violet-300/30 bg-violet-300/10" },
  { label: "委托故事", tags: ["文游", "委托板"], color: "text-amber-300 border-amber-300/30 bg-amber-300/10" },
  { label: "社区据点", tags: ["社区"], color: "text-cyan-300 border-cyan-300/30 bg-theme-accent-bg" },
  { label: "陪伴树洞", tags: ["陪伴", "树洞"], color: "text-rose-300 border-rose-300/30 bg-rose-300/10" },
]

const previewCards = [
  { image: discoverRadarSurfaceImage, title: "雷达地表", text: "真实坐标上的区域会在开放时段亮起。" },
  { image: discoverAtmosphereLoreImage, title: "隐藏入口", text: "进入后遇见主人配置的 AI 角色与记忆线索。" },
]

const DISCOVER_DESKTOP_BOARD_FRAME =
  "lg:sticky lg:top-28 lg:h-[min(960px,calc(100dvh-8rem))] lg:overflow-hidden"

const DISCOVER_DESKTOP_BOARD_SCROLL =
  "lg:min-h-0 lg:overflow-y-auto lg:pr-2 lg:[scrollbar-gutter:stable]"

const DISCOVER_SPACE_LIST_LIMIT = 100

function cleanSearchParam(value: string | null) {
  return typeof value === "string" ? value.trim() : ""
}

function discoverListFiltersFromRequest(request: Request): Record<string, string | number> {
  const url = new URL(request.url)
  const filters: Record<string, string | number> = {
    limit: DISCOVER_SPACE_LIST_LIMIT,
    offset: 0,
  }
  const query = cleanSearchParam(url.searchParams.get("search")) || cleanSearchParam(url.searchParams.get("q"))
  const access = cleanSearchParam(url.searchParams.get("access"))
  const status = cleanSearchParam(url.searchParams.get("status"))
  const placeType = cleanSearchParam(url.searchParams.get("place_type"))
  const specialType = cleanSearchParam(url.searchParams.get("special_type"))

  if (query) filters.q = query
  if (access) filters.access = access
  if (status) filters.status = status
  if (placeType) filters.place_type = placeType
  if (specialType) filters.special_type = specialType
  return filters
}

function characterAvatar(character: SpaceCharacter) {
  if (!character) return ""
  return (
    character.sprites?.neutral
    || character.avatar
    || character.image_url
    || Object.values(character.sprites || {}).find(Boolean)
    || ""
  )
}

function initialFor(value = "?") {
  return value.trim().slice(0, 1).toUpperCase() || "?"
}

function locationLabel(space: Space) {
  const anchor = formatSpaceAnchorLocation(space)
  return anchor.line
}

function coordinateLabel(space: Space) {
  return buildMapAnchorCardCopy(space).locationLabel
}

function coverForSpace(space: Space, index: number) {
  return resolveHomepageSpaceCover(space, index)
}

function echoStrength(space: Space, index: number) {
  const characterBoost = Math.min(space.characters?.length ?? 0, 5) * 4
  const openBoost = space.status === "open" || space.is_open ? 10 : 0
  const visitBoost = Math.min(Math.floor((space.visit_count ?? 0) / 10), 10)
  return Math.min(99, 58 + (index % 4) * 5 + characterBoost + openBoost + visitBoost)
}

function compactDisplayText(value: unknown, fallback: string, maxLength = 34) {
  const text = typeof value === "string" ? value.trim() : ""
  const display = text || fallback
  return display.length > maxLength ? `${display.slice(0, maxLength)}…` : display
}

function previewBackgroundImage(image: string) {
  return [
    "linear-gradient(180deg, rgba(3, 7, 18, 0.08), rgba(3, 7, 18, 0.26))",
    "radial-gradient(circle at 28% 34%, rgba(244,114,182, 0.24), transparent 38%)",
    "radial-gradient(circle at 72% 62%, rgba(217, 70, 239, 0.22), transparent 42%)",
    `url("${image}")`,
  ].join(", ")
}

function entryStatusDisplay(space: SpaceWithTimeStatus | Space): EntryStatusDisplay {
  const access = typeof space.access === "string" ? space.access : "public"
  const status = typeof space.status === "string" ? space.status : "open"
  const isClosed = (space as SpaceWithTimeStatus).is_open === false || status === "closed"

  if (isClosed) {
    return {
      label: "今日熄灯",
      helper: "可预览，稍后再入店",
      className: "border-theme-border bg-theme-card text-theme-primary/52",
    }
  }

  if (access === "password") {
    return {
      label: "口令门扉",
      helper: "带口令进入，不公开扩散",
      className: "border-amber-300/24 bg-amber-300/10 text-amber-50",
    }
  }

  if (access === "private") {
    return {
      label: "主人私域",
      helper: "仅主人或授权访客可见",
      className: "border-violet-300/24 bg-violet-300/10 text-violet-50",
    }
  }

  return {
    label: "公开入店",
    helper: "可直接进入和 NPC 对话",
    className: "border-theme-accent-border bg-theme-accent-bg text-theme-accent-text",
  }
}

function buildEntryEchoes(space: SpaceWithTimeStatus | Space, placeType: ReturnType<typeof derivePlaceTypeDisplay>): EntryEcho[] {
  const entry = entryStatusDisplay(space)
  const characterCount = Array.isArray(space.characters) ? space.characters.length : 0
  const visitCount = Number.isFinite(space.visit_count) ? Number(space.visit_count) : 0

  return [
    {
      label: "入口",
      value: entry.label,
      helper: entry.helper,
      className: entry.className,
    },
    {
      label: "氛围",
      value: placeType.shortLabel || placeType.label || "空间",
      helper: compactDisplayText(placeType.tone, placeType.description || "真实坐标上的空间入口"),
      className: placeType.cardClass || "border-theme-accent-border bg-theme-accent-bg text-theme-accent-text",
    },
    {
      label: "角色",
      value: characterCount ? `${characterCount} 位 NPC` : "待配置 NPC",
      helper: characterCount ? "已有角色驻场" : "先看坐标氛围",
      className: "border-theme-border bg-theme-bg text-theme-primary",
    },
    {
      label: "回访",
      value: visitCount ? `${visitCount} 次到访` : "新入口",
      helper: visitCount ? "聚合到访热度" : "等待第一位旅客",
      className: "border-theme-accent-border bg-theme-accent-bg text-theme-accent-text",
    },
  ]
}

function spaceMatchesCategory(
  space: SpaceListResponse["spaces"][number],
  category: Category,
): boolean {
  const allTags = space.characters?.flatMap((character) => character.tags ?? []) ?? []
  return category.tags.some((tag) => allTags.some((candidate) => candidate.includes(tag)))
}

function spaceSearchText(space: SpaceListResponse["spaces"][number]) {
  return [
    space.name,
    space.description,
    space.address,
    space.scene_prompt,
    getSpaceFirstMinuteSearchText(space),
    getDiscoveryLivelinessSearchText(space),
    getShortDramaTeaserSearchText(space),
    getSpaceIntentTagsSearchText(buildSpaceIntentTags(space)),
    ...(space.characters?.flatMap((character) => [character.name, ...(character.tags ?? [])]) ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

function spaceMatchesFilter(space: SpaceListResponse["spaces"][number], filters: FilterState): boolean {
  const search = filters.search.trim().toLowerCase()
  if (search && !spaceSearchText(space).includes(search)) return false

  if (filters.activePlaceTypes.size > 0) {
    const matches = Array.from(filters.activePlaceTypes).some((placeTypeId) => placeTypeMatchesSpace(space, placeTypeId))
    if (!matches) return false
  }

  if (filters.activeCategories.size > 0) {
    const matches = Array.from(filters.activeCategories).some((label) => {
      const category = CATEGORIES.find((candidate) => candidate.label === label)
      return category && spaceMatchesCategory(space, category)
    })
    if (!matches) return false
  }

  if (filters.activeSpecialTypes.size > 0) {
    const matches = Array.from(filters.activeSpecialTypes).some((specialTypeId) => specialSpaceTypeMatchesSpace(space, specialTypeId))
    if (!matches) return false
  }

  if (filters.publicOnly && space.access !== "public") return false
  if (filters.openOnly && space.status !== "open") return false
  return true
}

function CharacterStack({ characters = [], muted = false }: { characters?: SpaceCharacter[]; muted?: boolean }) {
  if (!characters.length) {
    return <span className="text-xs text-theme-muted">暂无活跃角色</span>
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex -space-x-2">
        {characters.slice(0, 4).map((character, index) => {
          return <CharacterAvatarBadge key={character.id || index} character={character} muted={muted} />
        })}
        {characters.length > 4 ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-slate-950 bg-slate-800 text-xs font-bold text-violet-100">
            +{characters.length - 4}
          </span>
        ) : null}
      </div>
      <span className={`truncate text-xs ${muted ? "text-theme-primary/28" : "text-theme-muted"}`}>
        {characters.slice(0, 2).map((character) => character.name || "未命名").join(" · ")}
        {characters.length > 2 ? " · ..." : ""}
      </span>
    </div>
  )
}

function CharacterInitialBadge({ name, muted = false }: { name?: string; muted?: boolean }) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-slate-950 bg-gradient-to-br text-xs font-bold ${
        muted
          ? "from-white/8 to-white/4 text-theme-primary/42"
          : "from-cyan-300/20 to-fuchsia-300/20 text-theme-primary"
      }`}
      aria-label={`${name || "角色"} 头像占位`}
      title={name || "角色"}
    >
      {initialFor(name)}
    </span>
  )
}

function CharacterAvatarBadge({ character, muted = false }: { character: SpaceCharacter; muted?: boolean }) {
  const [broken, setBroken] = useState(false)
  const avatar = characterAvatar(character)

  if (!avatar || broken) {
    return <CharacterInitialBadge name={character.name} muted={muted} />
  }

  return (
    <img
      src={avatar}
      alt={character.name || "角色"}
      className={`h-8 w-8 rounded-full border-2 border-slate-950 object-cover ${muted ? "opacity-45 grayscale" : ""}`}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
    />
  )
}

function compactCharacterNames(characters: SpaceCharacter[]) {
  if (!characters.length) return "待配置 NPC"
  const names = characters.slice(0, 3).map((character) => character.name || "未命名").join(" · ")
  return characters.length > 3 ? `${names} · +${characters.length - 3}` : names
}

function visitEchoLabel(space: Space) {
  const visitCount = Number(space.visit_count)
  return Number.isFinite(visitCount) && visitCount > 0 ? `${Math.round(visitCount)} 次回访` : "新坐标"
}

function RadarEchoSummary({
  space,
  strength,
  muted = false,
}: {
  space: SpaceWithTimeStatus | Space
  placeType: ReturnType<typeof derivePlaceTypeDisplay>
  strength: number
  muted?: boolean
}) {
  const characters = Array.isArray(space.characters) ? space.characters : []
  const liveliness = buildDiscoveryLiveliness(space)
  const summaryItems = [
    {
      label: characters.length ? `${characters.length} 位 NPC` : "NPC",
      value: compactCharacterNames(characters),
      icon: UsersRound,
    },
    {
      label: "活跃",
      value: liveliness.headline,
      icon: RadioTower,
    },
    {
      label: "空间热度",
      value: `${visitEchoLabel(space)} · ${strength}%`,
      icon: Waves,
    },
  ]

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-3" aria-label="入口摘要">
      {summaryItems.map((item) => {
        const Icon = item.icon
        return (
          <div
            key={item.label}
            className={`min-w-0 rounded-2xl border px-3 py-2 ${
              muted
                ? "border-theme-border bg-theme-card text-theme-primary/34"
                : "border-theme-accent-border bg-theme-accent-bg text-theme-accent-text"
            }`}
          >
            <p className={`flex items-center gap-1.5 text-[0.62rem] font-black uppercase tracking-[0.16em] ${muted ? "text-theme-primary/24" : "text-theme-accent-text"}`}>
              <Icon className="h-3 w-3" />
              {item.label}
            </p>
            <p className={`mt-1 truncate text-xs font-bold ${muted ? "text-theme-primary/38" : "text-violet-50/72"}`}>
              {item.value}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function EntryEchoGrid({
  space,
  placeType,
  compact = false,
  muted = false,
}: {
  space: SpaceWithTimeStatus | Space
  placeType: ReturnType<typeof derivePlaceTypeDisplay>
  compact?: boolean
  muted?: boolean
}) {
  const echoes = buildEntryEchoes(space, placeType)

  return (
    <div className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`} aria-label="入店探索线索">
      {echoes.map((echo) => (
        <div
          key={echo.label}
          className={`min-w-0 rounded-2xl border px-3 py-2 ${
            muted ? "border-theme-border bg-theme-card text-theme-primary/42" : echo.className
          }`}
        >
          <p className={`text-[0.62rem] font-black uppercase tracking-[0.18em] ${muted ? "text-theme-primary/24" : "text-theme-primary/45"}`}>
            {echo.label}
          </p>
          <p className={`mt-1 truncate text-xs font-black ${muted ? "text-theme-primary/42" : "text-theme-primary"}`}>{echo.value}</p>
          <p className={`mt-0.5 truncate text-[0.68rem] ${muted ? "text-theme-primary/26" : "text-theme-primary/55"}`}>{echo.helper}</p>
        </div>
      ))}
    </div>
  )
}

type ShortDramaTeaser = NonNullable<ReturnType<typeof buildShortDramaTeaser>>

function ShortDramaTeaserCard({
  teaser,
  space,
  muted = false,
  compact = false,
}: {
  teaser: ShortDramaTeaser
  space: Pick<Space, "id" | "name">
  muted?: boolean
  compact?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        muted
          ? "border-theme-border bg-theme-card text-theme-primary/42"
          : "border-theme-border bg-theme-bg text-theme-primary"
      }`}
      aria-label="短剧入口"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <span className={`text-[0.62rem] font-black uppercase tracking-[0.18em] ${muted ? "text-theme-primary/28" : "text-theme-primary"}`}>
            {teaser.kicker}
          </span>
          <p className={`mt-1 font-black ${compact ? "text-sm" : "text-base"} ${muted ? "text-theme-primary/48" : "text-theme-primary"}`}>
            {teaser.conflictTitle}
          </p>
          <p className={`mt-1 line-clamp-2 text-xs leading-5 ${muted ? "text-theme-primary/30" : "text-theme-primary/70"}`}>
            {teaser.summary}
          </p>
        </div>
        {teaser.spaceId ? (
          <Link
            to={spacePath(space)}
            className={`inline-flex min-h-11 shrink-0 touch-manipulation items-center justify-center gap-1 rounded-full border px-3 py-2 text-xs font-black transition ${
              muted
                ? "border-theme-border text-theme-primary/38"
                : "border-fuchsia-200/30 bg-fuchsia-200/10 text-theme-primary hover:bg-fuchsia-200/18"
            }`}
          >
            {teaser.ctaLabel}
            <ArrowRight className="h-3 w-3" />
          </Link>
        ) : null}
      </div>
      {!compact && teaser.sceneHook ? (
        <p className={`mt-2 rounded-xl border px-3 py-2 text-xs leading-5 ${muted ? "border-theme-border text-theme-primary/28" : "border-theme-border text-theme-primary/62"}`}>
          {teaser.sceneHook}
        </p>
      ) : null}
      <p className={`mt-2 text-[0.68rem] leading-4 ${muted ? "text-theme-primary/24" : "text-theme-primary/45"}`}>
        {teaser.guardrail}
      </p>
    </div>
  )
}

function ViewModeToggle({ activeViewMode, onChange }: { activeViewMode: DiscoverViewMode; onChange: (mode: DiscoverViewMode) => void }) {
  return (
    <div className="grid grid-cols-2 rounded-2xl border border-theme-border bg-theme-card p-1" aria-label="探索视图切换">
      {([
        { mode: "radar" as const, label: "雷达视图", icon: Radar },
        { mode: "cards" as const, label: "卡片视图", icon: LayoutGrid },
      ]).map((item) => {
        const Icon = item.icon
        const active = activeViewMode === item.mode
        return (
          <button
            key={item.mode}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.mode)}
            className={`inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition ${
              active
                ? "bg-cyan-300/16 text-theme-accent-text shadow-[0_0_22px_rgba(244,114,182,0.16)]"
                : "text-theme-muted hover:bg-theme-card hover:text-theme-primary"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

function FilterPanel({
  search,
  activePlaceTypes,
  activeSpecialTypes,
  activeCategories,
  publicOnly,
  openOnly,
  hasFilters,
  onSearchChange,
  onTogglePlaceType,
  onToggleSpecialType,
  onToggleCategory,
  onPublicOnlyChange,
  onOpenOnlyChange,
  onClear,
}: FilterState & {
  hasFilters: boolean
  onSearchChange: (value: string) => void
  onTogglePlaceType: (placeTypeId: string) => void
  onToggleSpecialType: (specialTypeId: string) => void
  onToggleCategory: (label: string) => void
  onPublicOnlyChange: (value: boolean) => void
  onOpenOnlyChange: (value: boolean) => void
  onClear: () => void
}) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const activeFilterCount =
    activePlaceTypes.size +
    activeSpecialTypes.size +
    activeCategories.size +
    (publicOnly ? 1 : 0) +
    (openOnly ? 1 : 0)
  const advancedFiltersId = "discover-echo-tuning"

  return (
    <div
      data-discover-filter-shell="mobile-lifted"
      className="space-y-4 rounded-[2rem] border border-theme-accent-border bg-[radial-gradient(circle_at_top_right,rgba(244,114,182,0.14),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.075),rgba(139,92,246,0.05))] p-5 shadow-[0_0_36px_rgba(244,114,182,0.08)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-theme-accent-text">
          <Search className="h-3.5 w-3.5" />
          发现空间
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls={advancedFiltersId}
            className="inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-full border border-theme-accent-border bg-theme-accent-bg px-3 py-2 text-xs font-bold text-theme-accent-text transition hover:border-cyan-300/45 hover:bg-cyan-300/16 md:hidden"
          >
            <Radar className="h-3.5 w-3.5" />
            {filtersOpen ? "收起筛选" : "展开筛选"}
          </button>
          {hasFilters ? (
            <button
              type="button"
              onClick={onClear}
              className="flex min-h-11 touch-manipulation items-center gap-1 rounded-full border border-theme-border px-3 py-2 text-xs text-theme-muted transition hover:border-rose-300/40 hover:text-rose-300"
            >
              <X className="h-3 w-3" />
              清空
            </button>
          ) : null}
        </div>
      </div>

      <label className="relative block">
        <span className="sr-only">搜索坐标、区域、角色或记忆线索</span>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-muted" />
        <input
          type="text"
          placeholder="搜索坐标、区域、角色或记忆线索"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="flex h-11 w-full rounded-2xl border border-theme-border bg-theme-card px-9 py-2 text-sm text-theme-primary placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
        />
      </label>

      <div className="rounded-2xl border border-theme-accent-border bg-cyan-300/[0.085] px-3 py-2 text-xs leading-5 text-theme-accent-text/78 md:hidden">
        {activeFilterCount ? `已锁定 ${activeFilterCount} 个高级筛选条件；展开后可继续调整。` : "移动端默认保留搜索入口；地点类型、标签与开灯状态可展开筛选。"}
      </div>

      <div id={advancedFiltersId} className={`${filtersOpen ? "space-y-4" : "hidden"} md:block md:space-y-4`}>
        <div className="space-y-2">
          <p className="text-xs font-bold text-theme-muted">场所类型</p>
          <div className="flex flex-wrap gap-2">
            {DISCOVERABLE_PLACE_TYPES.map((type) => {
              const active = activePlaceTypes.has(type.id)
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => onTogglePlaceType(type.id)}
                  className={`inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition ${
                    active
                      ? "border-cyan-300/40 bg-theme-accent-bg text-theme-accent-text"
                      : "border-theme-border text-theme-muted hover:border-cyan-300/30 hover:text-theme-accent-text"
                  }`}
                  title={type.description}
                >
                  <span aria-hidden="true">{type.icon}</span>
                  {type.shortLabel || type.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-theme-muted">专题体验</p>
          <div className="flex flex-wrap gap-2">
            {SPECIAL_SPACE_TYPES.map((specialType) => {
              const active = activeSpecialTypes.has(specialType.id)
              return (
                <button
                  key={specialType.id}
                  type="button"
                  onClick={() => onToggleSpecialType(specialType.id)}
                  className={`inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition ${
                    active
                      ? specialType.filterClass
                      : "border-theme-border text-theme-muted hover:border-amber-300/30 hover:text-amber-100"
                  }`}
                  title={specialType.summary}
                >
                  <span aria-hidden="true">{specialType.icon}</span>
                  {specialType.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-theme-muted">内容标签</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => {
              const active = activeCategories.has(category.label)
              return (
                <button
                  key={category.label}
                  type="button"
                  onClick={() => onToggleCategory(category.label)}
                  className={`inline-flex min-h-11 touch-manipulation items-center rounded-full border px-3 py-2 text-xs font-bold transition ${
                    active
                      ? category.color
                      : "border-theme-border text-theme-muted hover:border-theme-border hover:text-theme-primary/80"
                  }`}
                >
                  {category.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <label className="flex min-h-11 cursor-pointer touch-manipulation items-center gap-2 text-xs text-theme-muted">
            <input
              type="checkbox"
              checked={publicOnly}
              onChange={(event) => onPublicOnlyChange(event.target.checked)}
              className="accent-cyan-400"
            />
            仅公开
          </label>
          <label className="flex min-h-11 cursor-pointer touch-manipulation items-center gap-2 text-xs text-theme-muted">
            <input
              type="checkbox"
              checked={openOnly}
              onChange={(event) => onOpenOnlyChange(event.target.checked)}
              className="accent-cyan-400"
            />
            仅亮灯
          </label>
        </div>
      </div>
    </div>
  )
}

function PreviewTile({ image, title, text }: { image: string; title: string; text: string }) {
  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-theme-border bg-theme-card">
      <div
        className="h-36 w-full bg-theme-bg bg-cover bg-center"
        style={{ backgroundImage: previewBackgroundImage(image) }}
        role="img"
        aria-label={`${title} 视觉预览`}
      />
      <div className="p-4">
        <h2 className="font-black text-theme-primary">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-theme-muted">{text}</p>
      </div>
    </article>
  )
}

function RadarEchoCard({ space, index, onPreview }: { space: Space; index: number; onPreview: (space: Space) => void }) {
  const spaceWithTimeStatus = space as SpaceWithTimeStatus
  const isClosed = spaceWithTimeStatus.is_open === false
  const placeType = derivePlaceTypeDisplay(space)
  const specialType = deriveSpecialSpaceTypeDisplay(space)
  const entry = entryStatusDisplay(spaceWithTimeStatus)
  const strength = echoStrength(space, index)
  const firstMinute = buildSpaceFirstMinuteGuide(space)

  return (
    <article
      className={`group relative overflow-hidden rounded-[1.75rem] border bg-theme-card p-5 transition hover:-translate-y-0.5 ${
        isClosed
          ? "border-theme-border hover:border-theme-border hover:bg-theme-card"
          : "border-theme-border hover:border-cyan-300/55 hover:bg-theme-accent-bg"
      }`}
    >
      {isClosed ? <div className="pointer-events-none absolute inset-0 z-10 bg-black/45" /> : null}
      <div className="absolute right-5 top-5 text-5xl font-black text-theme-primary/[0.025]">{String(index + 1).padStart(2, "0")}</div>
      <div className="relative flex items-start gap-4">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${isClosed ? "border-theme-border bg-theme-card text-theme-primary/30" : "border-theme-accent-border bg-theme-accent-bg text-theme-accent-text"}`}>
          <MapPinned className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <button
              type="button"
              onClick={() => onPreview(space)}
              className={`min-h-11 min-w-0 touch-manipulation text-left font-black transition group-hover:text-theme-accent-text ${isClosed ? "text-theme-primary/50" : "text-theme-primary"}`}
            >
              {space.name}
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${
                  isClosed
                    ? "border-theme-border bg-theme-card text-theme-primary/40"
                    : "border-theme-accent-border bg-theme-accent-bg text-theme-accent-text"
                }`}
                title={placeType.description}
              >
                <span aria-hidden="true">{placeType.icon}</span>
                {placeType.shortLabel || placeType.label}
              </span>
              {specialType ? (
                <span className={`inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${isClosed ? "border-theme-border bg-theme-card text-theme-primary/40" : specialType.badgeClass}`}>
                  <span aria-hidden="true">{specialType.icon}</span>
                  {specialType.label}
                </span>
              ) : null}
              <span
                className={`w-fit rounded-full border px-2.5 py-1 text-xs font-bold ${
                  isClosed ? "border-theme-border bg-theme-card text-theme-primary/40" : entry.className
                }`}
              >
                {entry.label}
              </span>
              <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-bold ${isClosed ? "border-theme-border bg-theme-card text-theme-primary/40" : "border-theme-border bg-theme-bg text-theme-primary"}`}>
                强度 {strength}%
              </span>
            </div>
          </div>
          <p className={`mt-2 line-clamp-2 text-sm leading-6 ${isClosed ? "text-theme-primary/25" : "text-theme-muted"}`}>
            {space.description || "这个区域还没有公开简介，但坐标已经亮起。"}
          </p>
          <div
            data-first-minute-guide="radar-compact"
            className={`mt-3 rounded-2xl border px-3 py-2 text-xs leading-5 ${
              isClosed
                ? "border-theme-border bg-theme-card text-theme-primary/30"
                : "border-cyan-300/18 bg-cyan-300/8 text-cyan-50/76"
            }`}
          >
            <p className="font-black text-theme-accent-text">这里有什么</p>
            <p className="mt-1 line-clamp-2">{firstMinute.sceneHint}</p>
          </div>
          {specialType ? (
            <p className={`mt-2 text-xs leading-5 ${isClosed ? "text-theme-primary/28" : "text-amber-100/72"}`}>
              专题体验：{specialType.summary}
            </p>
          ) : null}
          <RadarEchoSummary space={spaceWithTimeStatus} placeType={placeType} strength={strength} muted={isClosed} />
          <div className={`mt-4 flex flex-wrap items-center gap-2 text-xs ${isClosed ? "text-theme-primary/24" : "text-theme-muted"}`}>
            <span>{locationLabel(space)}</span>
            {spaceWithTimeStatus.local_time_display ? (
              <span>{isClosed ? "已熄灯" : "亮灯中"} · {spaceWithTimeStatus.local_time_display}</span>
            ) : null}
            <Link to={spacePath(space)} className="ml-auto inline-flex min-h-11 touch-manipulation items-center gap-1 rounded-full border border-theme-accent-border px-4 py-2 font-bold text-theme-accent-text transition hover:bg-theme-accent-bg">
              进入
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

function ResultCard({
  space,
  index,
  coverImage,
  onPreview,
}: {
  space: Space
  index: number
  coverImage: string
  onPreview: (space: Space) => void
}) {
  const spaceWithTimeStatus = space as SpaceWithTimeStatus
  const placeType = derivePlaceTypeDisplay(space)
  const specialType = deriveSpecialSpaceTypeDisplay(space)
  const entry = entryStatusDisplay(spaceWithTimeStatus)
  const isClosed = spaceWithTimeStatus.is_open === false
  const shortDramaTeaser = buildShortDramaTeaser(space)
  const intentTags = buildSpaceIntentTags(space)
  const firstMinute = buildSpaceFirstMinuteGuide(space)

  return (
    <article className="group overflow-hidden rounded-[1.75rem] border border-theme-border bg-theme-card transition hover:-translate-y-0.5 hover:border-cyan-300/45">
      <button type="button" onClick={() => onPreview(space)} className="relative block h-52 w-full touch-manipulation overflow-hidden text-left sm:h-60">
        <img
          src={coverImage}
          alt=""
          className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.04] ${isClosed ? "opacity-45" : "opacity-90"}`}
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full border border-theme-border bg-theme-card px-3 py-1 text-xs font-bold text-theme-accent-text backdrop-blur-md">
          {locationLabel(space)}
        </span>
        <span className="absolute right-4 top-4 rounded-full border border-theme-border bg-theme-bg px-3 py-1 text-xs font-bold text-theme-primary backdrop-blur-md">
          {placeType.shortLabel || placeType.label}
        </span>
        {specialType ? (
          <span className={`absolute right-4 top-14 rounded-full border px-3 py-1 text-xs font-bold backdrop-blur-md ${specialType.badgeClass}`}>
            {specialType.icon} {specialType.label}
          </span>
        ) : null}
        <span
          className={`absolute left-4 ${specialType ? "top-24" : "top-14"} rounded-full border px-3 py-1 text-xs font-bold backdrop-blur-md ${
            isClosed ? "border-theme-border bg-theme-card text-theme-primary/45" : entry.className
          }`}
        >
          {entry.label}
        </span>
        <div className="absolute bottom-4 left-4 right-4">
          <CharacterStack characters={space.characters} muted={isClosed} />
        </div>
      </button>
      <div className="space-y-4 p-5">
        <div>
          <h3 className="text-xl font-black text-theme-primary">{space.name}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-theme-muted">
            {space.description || "这个区域还没有公开简介，但坐标已经亮起。"}
          </p>
          <p className="mt-2 line-clamp-1 text-xs font-bold text-theme-accent-text">
            氛围线索：{compactDisplayText(placeType.tone, space.scene_prompt || "真实坐标上的入口", 42)}
          </p>
          {specialType ? (
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-amber-100/72">
              专题体验：{specialType.summary}
            </p>
          ) : null}
        </div>
        <section
          data-first-minute-guide="discover-card"
          aria-label="这里有什么"
          className="rounded-3xl border border-cyan-300/18 bg-cyan-300/8 p-3"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-violet-50/76">{firstMinute.sceneHint}</p>
            </div>
            <span className="w-fit shrink-0 rounded-full border border-cyan-300/24 bg-cyan-300/10 px-2.5 py-1 text-xs font-black text-cyan-50">
              {firstMinute.experienceType}
            </span>
          </div>
          <div className="mt-3 grid gap-2">
            {firstMinute.tryThisFirst.slice(0, 2).map((prompt) => (
              <p key={prompt} className="rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs leading-5 text-violet-50/70">
                {prompt}
              </p>
            ))}
          </div>
        </section>
        <EntryEchoGrid space={spaceWithTimeStatus} placeType={placeType} muted={isClosed} />
        <DiscoveryLivelinessStrip space={spaceWithTimeStatus} muted={isClosed} />
        {intentTags.length ? (
          <div className="flex flex-wrap gap-2" aria-label="经营意图">
            {intentTags.map((tag) => (
              <span key={tag.id} className="rounded-full border border-theme-border bg-theme-bg px-2.5 py-1 text-[0.7rem] font-bold text-theme-primary" title={tag.helper}>
                {tag.label}
              </span>
            ))}
          </div>
        ) : null}
        {shortDramaTeaser ? (
          <ShortDramaTeaserCard teaser={shortDramaTeaser} space={space} muted={isClosed} />
        ) : null}
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="rounded-full border border-theme-accent-border bg-theme-accent-bg px-2.5 py-1 text-theme-accent-text">热度 {echoStrength(space, index)}%</span>
          <span className={`rounded-full border px-2.5 py-1 ${isClosed ? "border-theme-border bg-theme-card text-theme-muted" : entry.className}`}>{entry.label}</span>
          {spaceWithTimeStatus.local_time_display ? (
            <span className="rounded-full border border-emerald-300/18 bg-emerald-300/10 px-2.5 py-1 text-emerald-100">
              {isClosed ? "已熄灯" : "亮灯中"} · {spaceWithTimeStatus.local_time_display}
            </span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => onPreview(space)}>
            预览
          </Button>
          <Button asChild size="sm">
            <Link to={spacePath(space)}>
              进入
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  )
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="grid min-h-80 place-items-center rounded-[1.75rem] border border-theme-border bg-theme-card text-center">
      <div className="max-w-sm space-y-3 px-6">
        <RadioTower className="mx-auto h-10 w-10 text-theme-muted" />
        <p className="font-bold text-theme-primary">暂时没有亮起的区域</p>
        <p className="text-sm leading-6 text-theme-muted">
          {hasFilters ? "换一个关键词或清空筛选，看看别的坐标。" : "先创建一个真实坐标锚点，发现层就会亮起第一盏灯。"}
        </p>
      </div>
    </div>
  )
}

function DesktopRadarTelemetry({ spaces }: { spaces: Space[] }) {
  const openEchoes = spaces.filter((space) => space.status === "open" || (space as SpaceWithTimeStatus).is_open).length
  const activeOperationCount = spaces.filter((space) => buildDiscoveryLiveliness(space).headline === "附近有人经营").length
  const averageEcho = spaces.length
    ? Math.round(spaces.reduce((total, space, index) => total + echoStrength(space, index), 0) / spaces.length)
    : 0

  return (
    <div className="hidden gap-3 xl:grid xl:grid-cols-4" aria-label="实时概览">
      {[
        { label: "实时概览", value: `${spaces.length}`, helper: "坐标入口" },
        { label: "开放空间", value: `${openEchoes}`, helper: "正在亮起" },
        { label: "附近经营", value: `${activeOperationCount}`, helper: "有人经营" },
        { label: "平均热度", value: `${averageEcho}%`, helper: "平均热度" },
      ].map((item) => (
        <div key={item.label} className="rounded-3xl border border-theme-border bg-theme-card p-4 backdrop-blur-xl">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-theme-accent-text">{item.label}</p>
          <p className="mt-2 text-2xl font-black text-theme-primary">{item.value}</p>
          <p className="mt-1 text-xs text-theme-muted">{item.helper}</p>
        </div>
      ))}
    </div>
  )
}

function RadarBoard({ spaces, hasFilters, onPreview }: { spaces: Space[]; hasFilters: boolean; onPreview: (space: Space) => void }) {
  return (
    <section
      data-discover-board="radar"
      className={`relative min-h-[620px] overflow-hidden rounded-[2.2rem] border border-theme-border bg-theme-card p-5 shadow-2xl shadow-black/30 backdrop-blur-xl ${DISCOVER_DESKTOP_BOARD_FRAME}`}
    >
      <img
        src={discoverRadarSurfaceImage}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-42"
        loading="eager"
        decoding="async"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,5,20,0.88),rgba(12,5,20,0.50)_45%,rgba(12,5,20,0.82)),radial-gradient(circle_at_52%_42%,rgba(244,114,182,0.18),transparent_20rem)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_28%,rgba(244,114,182,0.24),transparent_17rem),radial-gradient(circle_at_74%_68%,rgba(217,70,239,0.20),transparent_20rem)]" />
      <div className="absolute inset-5 rounded-[1.8rem] border border-theme-accent-border bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="absolute left-1/2 top-44 hidden h-80 w-80 -translate-x-1/2 rounded-full border border-cyan-300/16 shadow-[0_0_120px_rgba(244,114,182,0.14)] lg:block" />
      <div className="absolute left-1/2 top-52 hidden h-48 w-48 -translate-x-1/2 rounded-full border border-fuchsia-300/14 lg:block" />

      <div className="relative flex flex-col gap-5 lg:h-full lg:min-h-0">
        <div className="flex flex-col gap-4 rounded-[1.75rem] border border-theme-border bg-theme-card p-5 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-theme-accent-text">实时坐标雷达</p>
            <h2 className="mt-2 text-3xl font-black text-theme-primary">发现视角</h2>
            <p className="mt-1 text-sm text-theme-muted">感受附近的区域氛围；查找时可切成卡片结果。</p>
          </div>
          <span className="grid h-14 w-14 place-items-center rounded-full border border-cyan-300/28 bg-theme-accent-bg text-theme-accent-text">
            <Waves className="h-7 w-7" />
          </span>
        </div>

        <DesktopRadarTelemetry spaces={spaces} />

        {spaces.length ? (
          <div data-discover-board-scroll="radar-results" className={`grid flex-1 content-start gap-4 ${DISCOVER_DESKTOP_BOARD_SCROLL}`}>
            {spaces.map((space, index) => (
              <RadarEchoCard key={space.id} space={space} index={index} onPreview={onPreview} />
            ))}
          </div>
        ) : (
          <div className={`flex-1 ${DISCOVER_DESKTOP_BOARD_SCROLL}`}>
            <EmptyState hasFilters={hasFilters} />
          </div>
        )}
      </div>
    </section>
  )
}

function CardsBoard({ spaces, hasFilters, onPreview }: { spaces: Space[]; hasFilters: boolean; onPreview: (space: Space) => void }) {
  const coversBySpaceId = resolveUniqueHomepageSpaceCovers(spaces)

  return (
    <section
      data-discover-board="cards"
      className={`rounded-[2.2rem] border border-theme-border bg-theme-card p-5 shadow-2xl shadow-black/30 backdrop-blur-xl ${DISCOVER_DESKTOP_BOARD_FRAME}`}
    >
      <div className="flex flex-col gap-5 lg:h-full lg:min-h-0">
        <div className="flex flex-col gap-3 rounded-[1.75rem] border border-theme-border bg-theme-card p-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-theme-primary">空间卡片</p>
            <h2 className="mt-2 text-3xl font-black text-theme-primary">按卡片浏览区域</h2>
            <p className="mt-1 text-sm text-theme-muted">搜索和筛选时优先展示更高效的图片卡片。</p>
          </div>
          <span className="rounded-full border border-theme-accent-border bg-theme-accent-bg px-4 py-2 text-xs font-black text-theme-accent-text">
            {spaces.length} 个结果
          </span>
        </div>

        {spaces.length ? (
          <div data-discover-board-scroll="card-results" className={`grid flex-1 content-start gap-5 md:grid-cols-2 xl:grid-cols-3 ${DISCOVER_DESKTOP_BOARD_SCROLL}`}>
            {spaces.map((space, index) => (
              <ResultCard
                key={space.id}
                space={space}
                index={index}
                coverImage={coversBySpaceId[space.id] || coverForSpace(space, index)}
                onPreview={onPreview}
              />
            ))}
          </div>
        ) : (
          <div className={`flex-1 ${DISCOVER_DESKTOP_BOARD_SCROLL}`}>
            <EmptyState hasFilters={hasFilters} />
          </div>
        )}
      </div>
    </section>
  )
}

export default function DiscoverRoute() {
  const [result, setResult] = useState<SpaceListResponse>({ spaces: [], count: 0 })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listSpaces(discoverListFiltersFromRequest(new Request(window.location.href)))
      .then((data) => { if (!cancelled) { setResult(data); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError(errorMessage(err)); setLoading(false); } })
    return () => { cancelled = true }
  }, [searchParams])

  const { toggleTheme } = useTheme()

  const initialSearch = searchParams.get("search") ?? searchParams.get("q") ?? ""
  const [search, setSearch] = useState(initialSearch)
  const [activePlaceTypes, setActivePlaceTypes] = useState<Set<string>>(new Set())
  const [activeSpecialTypes, setActiveSpecialTypes] = useState<Set<string>>(new Set())
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set())
  const [publicOnly, setPublicOnly] = useState(false)
  const [openOnly, setOpenOnly] = useState(false)
  const [manualViewMode, setManualViewMode] = useState<DiscoverViewMode | null>(null)
  const [previewSpace, setPreviewSpace] = useState<Space | null>(null)

  useEffect(() => {
    const nextSearch = searchParams.get("search") ?? searchParams.get("q") ?? ""
    setSearch(nextSearch)
    if (nextSearch.trim()) setManualViewMode("cards")
  }, [searchParams])

  function syncSearchParam(value: string) {
    const next = new URLSearchParams(searchParams)
    const query = value.trim()
    if (query) {
      next.set("search", query)
    } else {
      next.delete("search")
    }
    next.delete("q")
    setSearchParams(next, { replace: true })
  }

  const hasFilters = Boolean(search.trim()) || activePlaceTypes.size > 0 || activeSpecialTypes.size > 0 || activeCategories.size > 0 || publicOnly || openOnly
  const activeViewMode: DiscoverViewMode = manualViewMode ?? (hasFilters ? "cards" : "radar")
  const expandedDiscovery = searchParams.get("view") === "expanded" || Boolean(searchParams.get("owner_id"))
  const visitorReduced = !expandedDiscovery

  const filteredSpaces = useMemo(() => {
    return result.spaces.filter((space) =>
      spaceMatchesFilter(space, { search, activePlaceTypes, activeSpecialTypes, activeCategories, publicOnly, openOnly }),
    )
  }, [result.spaces, search, activePlaceTypes, activeSpecialTypes, activeCategories, publicOnly, openOnly])
  const sideFeedItems = useMemo(() => {
    const previewSpaces = filteredSpaces.slice(0, 3)
    const coversBySpaceId = resolveUniqueHomepageSpaceCovers(previewSpaces)
    return previewSpaces.map((space, index) => ({
      id: space.id,
      title: space.name || `坐标 ${index + 1}`,
      subtitle: space.description || `${Array.isArray(space.characters) ? space.characters.length : 0} 位角色正在回应`,
      meta: `${index * 5 + 3} 分钟前`,
      image: coversBySpaceId[space.id] || resolveHomepageSpaceCover(space, index),
      to: spacePath(space),
    }))
  }, [filteredSpaces])
  const onlineEntities = useMemo(() => {
    const coversBySpaceId = resolveUniqueHomepageSpaceCovers(filteredSpaces.slice(0, 3))
    return filteredSpaces
      .flatMap((space, spaceIndex) =>
        (Array.isArray(space.characters) ? space.characters : []).slice(0, 1).map((character, characterIndex) => ({
          id: `${space.id}-${character.id || characterIndex}`,
          name: character.name || `角色 ${spaceIndex + 1}`,
          location: `在 ${space.name || "某个坐标"}`,
          status: spaceIndex < 2 ? "在线" : `${spaceIndex * 5 + 5} 分钟前`,
          avatar: character.avatar || coversBySpaceId[space.id] || resolveHomepageSpaceCover(space, spaceIndex),
          to: spacePath(space),
        })),
      )
      .slice(0, 3)
  }, [filteredSpaces])

  function switchToCardsForSearch(value: string) {
    setSearch(value)
    syncSearchParam(value)
    if (value.trim()) setManualViewMode("cards")
    if (!value.trim() && activePlaceTypes.size === 0 && activeSpecialTypes.size === 0 && activeCategories.size === 0 && !publicOnly && !openOnly) {
      setManualViewMode(null)
    }
  }

  function togglePlaceType(placeTypeId: string) {
    setManualViewMode("cards")
    setActivePlaceTypes((prev) => {
      const next = new Set(prev)
      next.has(placeTypeId) ? next.delete(placeTypeId) : next.add(placeTypeId)
      return next
    })
  }

  function toggleSpecialType(specialTypeId: string) {
    setManualViewMode("cards")
    setActiveSpecialTypes((prev) => {
      const next = new Set(prev)
      next.has(specialTypeId) ? next.delete(specialTypeId) : next.add(specialTypeId)
      return next
    })
  }

  function toggleCategory(label: string) {
    setManualViewMode("cards")
    setActiveCategories((prev) => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  function clearFilters() {
    setSearch("")
    syncSearchParam("")
    setActivePlaceTypes(new Set())
    setActiveSpecialTypes(new Set())
    setActiveCategories(new Set())
    setPublicOnly(false)
    setOpenOnly(false)
    setManualViewMode(null)
  }

  function setBooleanFilter(setter: (value: boolean) => void, value: boolean) {
    setter(value)
    if (value) setManualViewMode("cards")
  }

  return (
    <FableSpaceDiscoverReference
      variant="black"
      search={search}
      spaces={filteredSpaces}
      isLoading={loading}
      visitorReduced={visitorReduced}
      sideFeedItems={sideFeedItems}
      onlineEntities={onlineEntities}
      onSearchChange={switchToCardsForSearch}
      onClear={clearFilters}
      onTogglePlaceType={togglePlaceType}
      onToggleSpecialType={toggleSpecialType}
      onToggleCategory={toggleCategory}
      onPublicOnlyChange={(value) => setBooleanFilter(setPublicOnly, value)}
      onOpenOnlyChange={(value) => setBooleanFilter(setOpenOnly, value)}
      onToggleTheme={toggleTheme}
    />
  )
}
