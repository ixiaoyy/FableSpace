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
import { Link, useLoaderData } from "react-router"
import { useMemo, useState } from "react"

import discoverCozyShopImage from "../assets/discover-reference/discover-cover-cozy-shop.png"
import discoverNeonAlleyImage from "../assets/discover-reference/discover-cover-neon-alley.png"
import discoverQuietSanctuaryImage from "../assets/discover-reference/discover-cover-quiet-sanctuary.png"
import discoverRadarSurfaceImage from "../assets/discover-reference/discover-radar-surface.png"
import { TavernPreviewModal } from "../components/tavern-preview-modal"
import { DISCOVERABLE_PLACE_TYPES, derivePlaceTypeDisplay, placeTypeMatchesTavern } from "../lib/place-types.js"
import { errorMessage, listTaverns, type Tavern, type TavernCharacter, type TavernListResponse } from "../lib/taverns"
import { ProductShell } from "../shell/product-shell"
import { Button } from "../ui/button"

type DiscoverViewMode = "radar" | "cards"

type Category = {
  label: string
  tags: string[]
  color: string
}

type DiscoverLoaderData = {
  result: TavernListResponse
  error: string
}

type TavernWithTimeStatus = Tavern & {
  is_open?: boolean
  local_time_display?: string
}

type FilterState = {
  search: string
  activePlaceTypes: Set<string>
  activeCategories: Set<string>
  publicOnly: boolean
  openOnly: boolean
}

const CATEGORIES: Category[] = [
  { label: "异星街角", tags: ["外星人", "便利店"], color: "text-green-300 border-green-300/30 bg-green-300/10" },
  { label: "委托故事", tags: ["文游", "委托板"], color: "text-amber-300 border-amber-300/30 bg-amber-300/10" },
  { label: "公益空间", tags: ["公益"], color: "text-cyan-300 border-cyan-300/30 bg-cyan-300/10" },
  { label: "社区陪伴", tags: ["陪伴", "树洞"], color: "text-rose-300 border-rose-300/30 bg-rose-300/10" },
]

const previewCards = [
  { image: discoverRadarSurfaceImage, title: "雷达地表", text: "真实坐标上的区域会在开放时段亮起。" },
  { image: discoverNeonAlleyImage, title: "隐藏入口", text: "进入后遇见主人配置的 AI 角色与记忆线索。" },
]

const coverImages = [discoverNeonAlleyImage, discoverCozyShopImage, discoverQuietSanctuaryImage]

function characterAvatar(character: TavernCharacter) {
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

function coordinateLabel(tavern: Pick<Tavern, "lat" | "lon">) {
  return `${Number(tavern.lat).toFixed(4)}, ${Number(tavern.lon).toFixed(4)}`
}

function coverForIndex(index: number) {
  return coverImages[index % coverImages.length]
}

function signalStrength(tavern: Tavern, index: number) {
  const characterBoost = Math.min(tavern.characters?.length ?? 0, 5) * 4
  const openBoost = tavern.status === "open" || tavern.is_open ? 10 : 0
  const visitBoost = Math.min(Math.floor((tavern.visit_count ?? 0) / 10), 10)
  return Math.min(99, 58 + (index % 4) * 5 + characterBoost + openBoost + visitBoost)
}

function tavernMatchesCategory(
  tavern: TavernListResponse["taverns"][number],
  category: Category,
): boolean {
  const allTags = tavern.characters?.flatMap((character) => character.tags ?? []) ?? []
  return category.tags.some((tag) => allTags.some((candidate) => candidate.includes(tag)))
}

function tavernSearchText(tavern: TavernListResponse["taverns"][number]) {
  return [
    tavern.name,
    tavern.description,
    tavern.address,
    tavern.scene_prompt,
    ...(tavern.characters?.flatMap((character) => [character.name, ...(character.tags ?? [])]) ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

function tavernMatchesFilter(tavern: TavernListResponse["taverns"][number], filters: FilterState): boolean {
  const search = filters.search.trim().toLowerCase()
  if (search && !tavernSearchText(tavern).includes(search)) return false

  if (filters.activePlaceTypes.size > 0) {
    const matches = Array.from(filters.activePlaceTypes).some((placeTypeId) => placeTypeMatchesTavern(tavern, placeTypeId))
    if (!matches) return false
  }

  if (filters.activeCategories.size > 0) {
    const matches = Array.from(filters.activeCategories).some((label) => {
      const category = CATEGORIES.find((candidate) => candidate.label === label)
      return category && tavernMatchesCategory(tavern, category)
    })
    if (!matches) return false
  }

  if (filters.publicOnly && tavern.access !== "public") return false
  if (filters.openOnly && tavern.status !== "open") return false
  return true
}

function CharacterStack({ characters = [], muted = false }: { characters?: TavernCharacter[]; muted?: boolean }) {
  if (!characters.length) {
    return <span className="text-xs text-violet-100/42">暂无角色信号</span>
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex -space-x-2">
        {characters.slice(0, 4).map((character, index) => {
          const avatar = characterAvatar(character)
          return avatar ? (
            <img
              key={character.id || index}
              src={avatar}
              alt={character.name || "角色"}
              className="h-8 w-8 rounded-full border-2 border-slate-950 object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span
              key={character.id || index}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-slate-950 bg-gradient-to-br from-cyan-300/20 to-fuchsia-300/20 text-xs font-bold text-white"
            >
              {initialFor(character.name)}
            </span>
          )
        })}
        {characters.length > 4 ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-slate-950 bg-slate-800 text-xs font-bold text-violet-100">
            +{characters.length - 4}
          </span>
        ) : null}
      </div>
      <span className={`truncate text-xs ${muted ? "text-white/28" : "text-violet-100/55"}`}>
        {characters.slice(0, 2).map((character) => character.name || "未命名").join(" · ")}
        {characters.length > 2 ? " · ..." : ""}
      </span>
    </div>
  )
}

function ViewModeToggle({ activeViewMode, onChange }: { activeViewMode: DiscoverViewMode; onChange: (mode: DiscoverViewMode) => void }) {
  return (
    <div className="grid grid-cols-2 rounded-2xl border border-white/10 bg-white/[0.045] p-1" aria-label="探索视图切换">
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
                ? "bg-cyan-300/16 text-cyan-100 shadow-[0_0_22px_rgba(0,214,201,0.16)]"
                : "text-violet-100/54 hover:bg-white/8 hover:text-white"
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
  activeCategories,
  publicOnly,
  openOnly,
  hasFilters,
  onSearchChange,
  onTogglePlaceType,
  onToggleCategory,
  onPublicOnlyChange,
  onOpenOnlyChange,
  onClear,
}: FilterState & {
  hasFilters: boolean
  onSearchChange: (value: string) => void
  onTogglePlaceType: (placeTypeId: string) => void
  onToggleCategory: (label: string) => void
  onPublicOnlyChange: (value: boolean) => void
  onOpenOnlyChange: (value: boolean) => void
  onClear: () => void
}) {
  return (
    <div className="space-y-4 rounded-[2rem] border border-white/10 bg-white/[0.035] p-5">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-cyan-100/60">
          <Search className="h-3.5 w-3.5" />
          查找信号
        </span>
        {hasFilters ? (
          <button
            type="button"
            onClick={onClear}
            className="flex min-h-11 touch-manipulation items-center gap-1 rounded-full border border-white/10 px-3 py-2 text-xs text-violet-100/70 transition hover:border-rose-300/40 hover:text-rose-300"
          >
            <X className="h-3 w-3" />
            清空
          </button>
        ) : null}
      </div>

      <label className="relative block">
        <span className="sr-only">搜索坐标、区域、角色或记忆线索</span>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-100/40" />
        <input
          type="text"
          placeholder="搜索坐标、区域、角色或记忆线索…"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="flex h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-9 py-2 text-sm text-white placeholder:text-violet-100/40 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
        />
      </label>

      <div className="space-y-2">
        <p className="text-xs font-bold text-violet-100/48">入口语义</p>
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
                    ? "border-cyan-300/40 bg-cyan-300/12 text-cyan-100"
                    : "border-white/10 text-violet-100/60 hover:border-cyan-300/30 hover:text-cyan-100"
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
        <p className="text-xs font-bold text-violet-100/48">内容信号</p>
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
                    : "border-white/10 text-violet-100/60 hover:border-white/25 hover:text-white/80"
                }`}
              >
                {category.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex min-h-11 cursor-pointer touch-manipulation items-center gap-2 text-xs text-violet-100/70">
          <input
            type="checkbox"
            checked={publicOnly}
            onChange={(event) => onPublicOnlyChange(event.target.checked)}
            className="accent-cyan-400"
          />
          仅公开
        </label>
        <label className="flex min-h-11 cursor-pointer touch-manipulation items-center gap-2 text-xs text-violet-100/70">
          <input
            type="checkbox"
            checked={openOnly}
            onChange={(event) => onOpenOnlyChange(event.target.checked)}
            className="accent-cyan-400"
          />
          仅亮起
        </label>
      </div>
    </div>
  )
}

function PreviewTile({ image, title, text }: { image: string; title: string; text: string }) {
  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.035]">
      <img src={image} alt="" className="h-36 w-full object-cover" loading="lazy" decoding="async" />
      <div className="p-4">
        <h2 className="font-black text-white">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-violet-100/58">{text}</p>
      </div>
    </article>
  )
}

function RadarSignalCard({ tavern, index, onPreview }: { tavern: Tavern; index: number; onPreview: (tavern: Tavern) => void }) {
  const tavernWithTimeStatus = tavern as TavernWithTimeStatus
  const isClosed = tavernWithTimeStatus.is_open === false
  const placeType = derivePlaceTypeDisplay(tavern)
  const strength = signalStrength(tavern, index)

  return (
    <article
      className={`group relative overflow-hidden rounded-[1.75rem] border bg-slate-950/78 p-4 transition hover:-translate-y-0.5 ${
        isClosed
          ? "border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
          : "border-white/10 hover:border-cyan-300/55 hover:bg-cyan-300/10"
      }`}
    >
      {isClosed ? <div className="pointer-events-none absolute inset-0 z-10 bg-black/45" /> : null}
      <div className="absolute right-5 top-5 text-5xl font-black text-white/[0.025]">{String(index + 1).padStart(2, "0")}</div>
      <div className="relative flex items-start gap-4">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${isClosed ? "border-white/10 bg-white/5 text-white/30" : "border-cyan-300/20 bg-cyan-300/12 text-cyan-100"}`}>
          <MapPinned className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <button
              type="button"
              onClick={() => onPreview(tavern)}
              className={`min-h-11 min-w-0 touch-manipulation text-left font-black transition group-hover:text-cyan-100 ${isClosed ? "text-white/50" : "text-white"}`}
            >
              {tavern.name}
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${
                  isClosed
                    ? "border-white/10 bg-white/5 text-white/40"
                    : "border-cyan-300/18 bg-cyan-300/10 text-cyan-100"
                }`}
                title={placeType.description}
              >
                <span aria-hidden="true">{placeType.icon}</span>
                {placeType.shortLabel || placeType.label}
              </span>
              <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-bold ${isClosed ? "border-white/10 bg-white/5 text-white/40" : "border-fuchsia-300/18 bg-fuchsia-300/10 text-fuchsia-100"}`}>
                Signal {strength}%
              </span>
            </div>
          </div>
          <p className={`mt-2 line-clamp-2 text-sm leading-6 ${isClosed ? "text-white/25" : "text-violet-100/65"}`}>
            {tavern.description || "这个区域还没有公开简介，但坐标已经亮起。"}
          </p>
          <div className="mt-3">
            <CharacterStack characters={tavern.characters} muted={isClosed} />
          </div>
          <div className={`mt-3 flex flex-wrap items-center gap-2 text-xs ${isClosed ? "text-white/24" : "text-violet-100/48"}`}>
            <span>{coordinateLabel(tavern)}</span>
            {tavernWithTimeStatus.local_time_display ? (
              <span>{isClosed ? "已熄灯" : "亮起中"} · {tavernWithTimeStatus.local_time_display}</span>
            ) : null}
            <Link to={`/tavern/${tavern.id}`} className="ml-auto inline-flex min-h-11 touch-manipulation items-center gap-1 rounded-full border border-cyan-300/22 px-4 py-2 font-bold text-cyan-100 transition hover:bg-cyan-300/12">
              进入
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

function ResultCard({ tavern, index, onPreview }: { tavern: Tavern; index: number; onPreview: (tavern: Tavern) => void }) {
  const tavernWithTimeStatus = tavern as TavernWithTimeStatus
  const placeType = derivePlaceTypeDisplay(tavern)
  const isClosed = tavernWithTimeStatus.is_open === false

  return (
    <article className="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/78 transition hover:-translate-y-0.5 hover:border-cyan-300/45">
      <button type="button" onClick={() => onPreview(tavern)} className="relative block h-52 w-full touch-manipulation overflow-hidden text-left sm:h-60">
        <img
          src={coverForIndex(index)}
          alt=""
          className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.04] ${isClosed ? "opacity-45" : "opacity-90"}`}
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full border border-white/16 bg-slate-950/68 px-3 py-1 text-xs font-bold text-cyan-100 backdrop-blur-md">
          {coordinateLabel(tavern)}
        </span>
        <span className="absolute right-4 top-4 rounded-full border border-fuchsia-300/22 bg-fuchsia-300/12 px-3 py-1 text-xs font-bold text-fuchsia-100 backdrop-blur-md">
          {placeType.shortLabel || placeType.label}
        </span>
        <div className="absolute bottom-4 left-4 right-4">
          <CharacterStack characters={tavern.characters} muted={isClosed} />
        </div>
      </button>
      <div className="space-y-4 p-5">
        <div>
          <h3 className="text-xl font-black text-white">{tavern.name}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-violet-100/62">
            {tavern.description || "这个区域还没有公开简介，但坐标已经亮起。"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-2.5 py-1 text-cyan-100">Signal {signalStrength(tavern, index)}%</span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-violet-100/62">{tavern.access || "public"}</span>
          {tavernWithTimeStatus.local_time_display ? (
            <span className="rounded-full border border-emerald-300/18 bg-emerald-300/10 px-2.5 py-1 text-emerald-100">
              {isClosed ? "已熄灯" : "亮起中"} · {tavernWithTimeStatus.local_time_display}
            </span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => onPreview(tavern)}>
            预览
          </Button>
          <Button asChild size="sm">
            <Link to={`/tavern/${tavern.id}`}>
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
    <div className="grid min-h-80 place-items-center rounded-[1.75rem] border border-white/10 bg-white/[0.04] text-center">
      <div className="max-w-sm space-y-3 px-6">
        <RadioTower className="mx-auto h-10 w-10 text-violet-100/60" />
        <p className="font-bold text-white">暂时没有亮起的区域</p>
        <p className="text-sm leading-6 text-violet-100/60">
          {hasFilters ? "换一个关键词或清空筛选，看看别的坐标。" : "先创建一个真实坐标锚点，发现层就会亮起第一盏灯。"}
        </p>
      </div>
    </div>
  )
}

function RadarBoard({ taverns, hasFilters, onPreview }: { taverns: Tavern[]; hasFilters: boolean; onPreview: (tavern: Tavern) => void }) {
  return (
    <section className="relative min-h-[620px] overflow-hidden rounded-[2.2rem] border border-white/12 bg-slate-950/72 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <img
        src={discoverRadarSurfaceImage}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-42"
        loading="eager"
        decoding="async"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,5,18,0.88),rgba(3,5,18,0.50)_45%,rgba(3,5,18,0.82)),radial-gradient(circle_at_52%_42%,rgba(0,214,201,0.18),transparent_20rem)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_28%,rgba(0,214,201,0.24),transparent_17rem),radial-gradient(circle_at_74%_68%,rgba(217,70,239,0.20),transparent_20rem)]" />
      <div className="absolute inset-5 rounded-[1.8rem] border border-cyan-300/10 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="absolute left-1/2 top-44 hidden h-80 w-80 -translate-x-1/2 rounded-full border border-cyan-300/16 shadow-[0_0_120px_rgba(0,214,201,0.14)] lg:block" />
      <div className="absolute left-1/2 top-52 hidden h-48 w-48 -translate-x-1/2 rounded-full border border-fuchsia-300/14 lg:block" />

      <div className="relative flex flex-col gap-5">
        <div className="flex flex-col gap-4 rounded-[1.75rem] border border-white/10 bg-[#050615]/76 p-5 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-100/70">Live coordinate radar</p>
            <h2 className="mt-2 text-3xl font-black text-white">发光坐标流</h2>
            <p className="mt-1 text-sm text-violet-100/56">默认用雷达感建立探索氛围；查找时可切成卡片结果。</p>
          </div>
          <span className="grid h-14 w-14 place-items-center rounded-full border border-cyan-300/28 bg-cyan-300/10 text-cyan-100">
            <Waves className="h-7 w-7" />
          </span>
        </div>

        <div className="grid gap-3">
          {taverns.length ? (
            taverns.map((tavern, index) => (
              <RadarSignalCard key={tavern.id} tavern={tavern} index={index} onPreview={onPreview} />
            ))
          ) : (
            <EmptyState hasFilters={hasFilters} />
          )}
        </div>
      </div>
    </section>
  )
}

function CardsBoard({ taverns, hasFilters, onPreview }: { taverns: Tavern[]; hasFilters: boolean; onPreview: (tavern: Tavern) => void }) {
  return (
    <section className="rounded-[2.2rem] border border-white/12 bg-slate-950/72 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <div className="mb-5 flex flex-col gap-3 rounded-[1.75rem] border border-white/10 bg-white/[0.035] p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-fuchsia-100/70">Card results</p>
          <h2 className="mt-2 text-3xl font-black text-white">按卡片浏览区域</h2>
          <p className="mt-1 text-sm text-violet-100/56">搜索和筛选时优先展示更高效的图片卡片。</p>
        </div>
        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-100">
          {taverns.length} 个结果
        </span>
      </div>

      {taverns.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {taverns.map((tavern, index) => (
            <ResultCard key={tavern.id} tavern={tavern} index={index} onPreview={onPreview} />
          ))}
        </div>
      ) : (
        <EmptyState hasFilters={hasFilters} />
      )}
    </section>
  )
}

export async function clientLoader(): Promise<DiscoverLoaderData> {
  try {
    return { result: await listTaverns(), error: "" }
  } catch (error) {
    return { result: { taverns: [], count: 0 }, error: errorMessage(error) }
  }
}

export default function DiscoverRoute() {
  const { result, error } = useLoaderData<typeof clientLoader>()

  const [search, setSearch] = useState("")
  const [activePlaceTypes, setActivePlaceTypes] = useState<Set<string>>(new Set())
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set())
  const [publicOnly, setPublicOnly] = useState(false)
  const [openOnly, setOpenOnly] = useState(false)
  const [manualViewMode, setManualViewMode] = useState<DiscoverViewMode | null>(null)
  const [previewTavern, setPreviewTavern] = useState<Tavern | null>(null)

  const hasFilters = Boolean(search.trim()) || activePlaceTypes.size > 0 || activeCategories.size > 0 || publicOnly || openOnly
  const activeViewMode: DiscoverViewMode = manualViewMode ?? (hasFilters ? "cards" : "radar")

  const filteredTaverns = useMemo(() => {
    return result.taverns.filter((tavern) =>
      tavernMatchesFilter(tavern, { search, activePlaceTypes, activeCategories, publicOnly, openOnly }),
    )
  }, [result.taverns, search, activePlaceTypes, activeCategories, publicOnly, openOnly])

  function switchToCardsForSearch(value: string) {
    setSearch(value)
    if (value.trim()) setManualViewMode("cards")
    if (!value.trim() && activePlaceTypes.size === 0 && activeCategories.size === 0 && !publicOnly && !openOnly) {
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
    setActivePlaceTypes(new Set())
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
    <ProductShell eyebrow="Discover">
      <section className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
        <aside className="space-y-5">
          <div className="rounded-[2rem] border border-cyan-300/18 bg-slate-950/72 p-6 shadow-2xl shadow-black/25 backdrop-blur-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-3 py-1.5 text-xs font-black text-fuchsia-100">
              <Compass className="h-3.5 w-3.5" />
              Real coordinates. Live signals.
            </div>
            <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl">附近坐标正在发光</h1>
            <p className="mt-4 text-sm leading-7 text-violet-100/66">
              默认用雷达扫过城市，感受哪里有区域正在亮起；开始搜索或筛选时，自动切到更方便浏览的卡片结果。
            </p>
            <div className="mt-6 grid gap-3 text-sm text-violet-100/70">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <MapPinned className="h-5 w-5 text-cyan-200" />
                <span>{filteredTaverns.length} 个坐标{hasFilters ? "符合查找" : "接入发现流"}</span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <UsersRound className="h-5 w-5 text-fuchsia-100" />
                <span>角色、记忆和入口状态都汇入同一条信号流</span>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <ViewModeToggle activeViewMode={activeViewMode} onChange={setManualViewMode} />
              <Button asChild className="w-full">
                <Link to="/create">
                  创建我的空间
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            {error ? (
              <p className="mt-5 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">
                API 暂不可用：{error}
              </p>
            ) : null}
          </div>

          <FilterPanel
            search={search}
            activePlaceTypes={activePlaceTypes}
            activeCategories={activeCategories}
            publicOnly={publicOnly}
            openOnly={openOnly}
            hasFilters={hasFilters}
            onSearchChange={switchToCardsForSearch}
            onTogglePlaceType={togglePlaceType}
            onToggleCategory={toggleCategory}
            onPublicOnlyChange={(value) => setBooleanFilter(setPublicOnly, value)}
            onOpenOnlyChange={(value) => setBooleanFilter(setOpenOnly, value)}
            onClear={clearFilters}
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {previewCards.map((card) => (
              <PreviewTile key={card.title} {...card} />
            ))}
          </div>
        </aside>

        {activeViewMode === "radar" ? (
          <RadarBoard taverns={filteredTaverns} hasFilters={hasFilters} onPreview={setPreviewTavern} />
        ) : (
          <CardsBoard taverns={filteredTaverns} hasFilters={hasFilters} onPreview={setPreviewTavern} />
        )}
      </section>

      {previewTavern ? (
        <TavernPreviewModal
          tavern={previewTavern}
          onClose={() => setPreviewTavern(null)}
        />
      ) : null}
    </ProductShell>
  )
}
