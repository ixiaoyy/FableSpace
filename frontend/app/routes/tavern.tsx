import type { ClientLoaderFunctionArgs } from "react-router"
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  Bookmark,
  CalendarDays,
  Compass,
  DoorOpen,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  MoreVertical,
  RadioTower,
  Share2,
  UserRoundCheck,
  UsersRound,
} from "lucide-react"
import { useMemo, useState, type MouseEvent } from "react"
import { Link, useLoaderData } from "react-router"
import homeBlackHeroVisual from "../assets/fable-map-05-10/home-black/hero-system-visual.png"
import homeBlackRecentEchoWaveform from "../assets/fable-map-05-10/home-black/recent-echo-waveform.png"
import { TavernChatWorkbench } from "../features/tavern-chat-workbench"
import { resolveHomepageTavernCover } from "../lib/homepage-taverns"
import { derivePlaceTypeDisplay } from "../lib/place-types.js"
import { fallbackRoleplayState } from "../lib/roleplay-state"
import { buildTavernFirstMinuteGuide } from "../lib/tavern-first-minute"
import { FALLBACK_ATMOSPHERE_IMAGES, normalizePublicWelfareNpcAssetPath } from "../lib/tavern-runtime-config.js"
import {
  DEFAULT_VISITOR_ID,
  errorMessage,
  getRoleplayState,
  getTavern,
  type RoleplayState,
  type Tavern,
  type TavernCharacter,
} from "../lib/taverns"
import { formatTavernAnchorLocation } from "../product/mapAnchorCopy.js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

type TavernLoaderData = {
  tavernId: string
  currentUserId: string
  tavern: Tavern | null
  roleplay: RoleplayState | null
  error: string
}

function getCurrentUserIdFromRequest(request: Request) {
  const url = new URL(request.url)
  return (
    url.searchParams.get("user_id")?.trim() ||
    url.searchParams.get("owner_id")?.trim() ||
    url.searchParams.get("visitor_id")?.trim() ||
    DEFAULT_VISITOR_ID
  )
}

export async function clientLoader({ params, request }: ClientLoaderFunctionArgs): Promise<TavernLoaderData> {
  const tavernId = params.tavernId ?? ""
  const currentUserId = getCurrentUserIdFromRequest(request)
  if (!tavernId) {
    return { tavernId, currentUserId, tavern: null, roleplay: null, error: "缺少空间 ID" }
  }
  try {
    const tavern = await getTavern(tavernId, currentUserId, { view: "entry" })
    let roleplay: RoleplayState | null = null
    try {
      roleplay = await getRoleplayState(tavernId, currentUserId)
    } catch {
      roleplay = null
    }
    return { tavernId, currentUserId, tavern, roleplay, error: "" }
  } catch (error) {
    return { tavernId, currentUserId, tavern: null, roleplay: null, error: errorMessage(error) }
  }
}

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ")
}

function compactText(value: unknown, fallback: string, maxLength = 84) {
  const text = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : ""
  const display = text || fallback
  return display.length > maxLength ? `${display.slice(0, maxLength)}…` : display
}
function canRenderImage(src: string) {
  return /^(https?:)?\/\//.test(src) || src.startsWith("/") || src.startsWith("data:")
}

function characterAvatarSource(character: TavernCharacter | undefined) {
  if (!character) return ""
  const sprites = character.sprites || {}
  return normalizePublicWelfareNpcAssetPath(
    character.avatar || character.image_url || sprites.neutral || sprites.default || Object.values(sprites)[0] || "",
  )
}

function entryStatusDisplay(tavern: Tavern) {
  const access = String(tavern.access || "public").toLowerCase()
  const status = String(tavern.status || "open").toLowerCase()
  const isClosed = tavern.is_open === false || status === "closed"

  if (isClosed) {
    return {
      label: "今日熄灯",
      helper: "可预览，稍后再进入",
      className: "border-slate-400/20 bg-slate-400/10 text-slate-100",
    }
  }

  if (access === "password") {
    return {
      label: "口令门扉",
      helper: "带口令进入，不公开扩散",
      className: "border-amber-200/28 bg-amber-300/12 text-amber-50",
    }
  }

  if (access === "private") {
    return {
      label: "主人私域",
      helper: "仅主人或授权访客可见",
      className: "border-violet-200/28 bg-violet-300/12 text-violet-50",
    }
  }

  return {
    label: "公开入口",
    helper: "可直接进入和 NPC 对话",
    className: "border-cyan-200/30 bg-cyan-300/14 text-cyan-50",
  }
}

function handleMainlineAnchorClick(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault()
  const target = document.getElementById("tavern-mainline")
  if (!target) return
  target.scrollIntoView({ behavior: "smooth", block: "start" })
  window.history.replaceState(null, "", "#tavern-mainline")
}

type TavernLooseRecord = Tavern & Record<string, unknown>

type SpaceHomeActivity = {
  id: string
  time: string
  name: string
  role: string
  avatar: string
  text: string
  hearts: string
}

type SpaceHomeStoryEntry = {
  id: string
  title: string
  subtitle: string
  meta: string
  image: string
  primary?: boolean
}

type SpaceHomeMemory = {
  id: string
  image: string
  quote: string
  source: string
  age: string
  hearts: string
  replies: string
}

const desktopNavItems = [
  { to: "/", label: "镜像面", meta: "MIRROR", icon: Home },
  { to: "/discover", label: "发现空间", meta: "SPACES", icon: Compass, active: true },
  { to: "/quests", label: "游玩指南", meta: "GUIDE", icon: BookOpen },
  { to: "/home-me", label: "回访记忆", meta: "MEMORY", icon: MessageCircle },
  { to: "/home-me", label: "日常回访", meta: "REVISIT", icon: CalendarDays, badge: "12" },
  { to: "/owner", label: "私密空间", meta: "PRIVATE", icon: Bookmark },
  { to: "/discover", label: "位置焦点", meta: "PLACES", icon: MapPin },
  { to: "/owner", label: "店主后台", meta: "OWNER", icon: RadioTower },
]

const mobileNavItems = [
  { to: "/", label: "首页", icon: Home },
  { to: "/discover", label: "发现", icon: Compass },
  { to: "#tavern-mainline", label: "进店", icon: DoorOpen, anchor: true },
  { to: "/home-me", label: "清单", icon: MessageCircle },
  { to: "/owner", label: "管理", icon: Bookmark },
]

const activityTimes = ["2 分钟前", "5 分钟前", "11 分钟前", "23 分钟前", "1 小时前"]
const activityStates = ["NPC", "玩家", "玩家", "玩家", "玩家"]
const onlineStates = ["正在布置", "正在闲聊", "正在探索", "正在创作"]

/**
 * Reads a string from a public tavern payload without assuming optional fields exist.
 * @param source Tavern payload or nested public record returned by the API.
 * @param key Field name to inspect.
 * @returns Trimmed string value, or an empty string; has no side effects.
 */
function readPublicString(source: Record<string, unknown> | null | undefined, key: string) {
  const value = source?.[key]
  return typeof value === "string" ? value.trim() : ""
}

/**
 * Formats unknown numeric payload values as compact visitor-facing counters.
 * @param value API value that may be a number or numeric string.
 * @returns A zh-CN compact number string, falling back to "0"; has no side effects.
 */
function formatCompactCount(value: unknown) {
  const numeric = Number(value || 0)
  if (!Number.isFinite(numeric) || numeric <= 0) return "0"
  if (numeric >= 10000) return `${(numeric / 10000).toFixed(numeric >= 100000 ? 0 : 1)}万`
  if (numeric >= 1000) return `${(numeric / 1000).toFixed(numeric >= 10000 ? 0 : 1)}k`
  return Math.round(numeric).toLocaleString("zh-CN")
}

/**
 * Formats optional tavern creation dates for the right-rail information panel.
 * @param value API date string, usually created_at, if available.
 * @returns YYYY-MM-DD when parseable, otherwise a stable placeholder; has no side effects.
 */
function formatPublicDate(value: unknown) {
  const text = typeof value === "string" ? value.trim() : ""
  if (!text) return "待同步"
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return text.slice(0, 10) || "待同步"
  return date.toISOString().slice(0, 10)
}

/**
 * Selects a reusable atmosphere image for a homepage card slot.
 * @param tavern Current public tavern payload used as the deterministic seed.
 * @param index Slot index within the homepage section.
 * @returns Public image URL suitable for img src; has no side effects.
 */
function resolveSpaceHomeImage(tavern: Tavern, index = 0) {
  if (index <= 0) return resolveHomepageTavernCover(tavern, 0) || homeBlackHeroVisual
  return FALLBACK_ATMOSPHERE_IMAGES[index % FALLBACK_ATMOSPHERE_IMAGES.length] || resolveHomepageTavernCover(tavern, index) || homeBlackHeroVisual
}

/**
 * Builds recent-activity rows from public NPC and tavern description fields.
 * @param tavern Public tavern payload for the current route.
 * @param characters Public-safe character summaries returned in entry view.
 * @returns UI-only activity rows; does not create chat, memory, or persistence records.
 */
function buildSpaceHomeActivities(tavern: Tavern, characters: TavernCharacter[]): SpaceHomeActivity[] {
  const fallbackText = compactText(tavern.description || tavern.scene_prompt, "有人刚刚推开门，正在确认第一句问候。", 58)
  const rows = characters.slice(0, 5).map((character, index) => ({
    id: character.id || `${tavern.id}-activity-${index}`,
    time: activityTimes[index] || `${index + 2} 分钟前`,
    name: character.name || "在场 NPC",
    role: activityStates[index] || "NPC",
    avatar: characterAvatarSource(character),
    text: compactText(character.first_mes || character.description || character.personality, fallbackText, 66),
    hearts: String(12 - index > 5 ? 12 - index : 6),
  }))

  if (rows.length) return rows
  return [{
    id: `${tavern.id}-activity-empty`,
    time: "刚刚",
    name: tavern.name || "空间入口",
    role: "空间",
    avatar: resolveSpaceHomeImage(tavern, 0),
    text: fallbackText,
    hearts: "6",
  }]
}

/**
 * Builds story-entry cards from published gameplay summaries and public NPC fields.
 * @param tavern Public tavern payload for the current route.
 * @param characters Public-safe character summaries returned in entry view.
 * @returns UI-only homepage cards that all route to the existing chat/workbench anchor.
 */
function buildSpaceHomeStoryEntries(tavern: Tavern, characters: TavernCharacter[]): SpaceHomeStoryEntry[] {
  const gameplays = Array.isArray(tavern.gameplay_definitions) ? tavern.gameplay_definitions as Array<Record<string, unknown>> : []
  const gameplayCards = gameplays.slice(0, 3).map((gameplay, index) => ({
    id: readPublicString(gameplay, "id") || `${tavern.id}-gameplay-${index}`,
    title: compactText(readPublicString(gameplay, "title") || readPublicString(gameplay, "name"), "空间故事", 18),
    subtitle: compactText(readPublicString(gameplay, "summary") || readPublicString(gameplay, "description"), "从一个公开玩法摘要开始。", 34),
    meta: `${index + 1} 个故事入口`,
    image: resolveSpaceHomeImage(tavern, index + 1),
    primary: index === 0,
  }))
  const leadCharacter = characters[0]
  const characterCard = leadCharacter ? [{
    id: `${leadCharacter.id}-dialogue-entry`,
    title: leadCharacter.name || "驻场角色",
    subtitle: compactText(leadCharacter.description || leadCharacter.personality || leadCharacter.first_mes, "和第一位 NPC 对话。", 34),
    meta: "1 人正在对话",
    image: characterAvatarSource(leadCharacter) || resolveSpaceHomeImage(tavern, 2),
    primary: gameplayCards.length === 0,
  }] : []
  const publicChatCard = [{
    id: `${tavern.id}-public-chat-entry`,
    title: "公共聊天",
    subtitle: compactText(tavern.description || tavern.scene_prompt, "和大家一起确认这里正在发生什么。", 34),
    meta: `${formatCompactCount(tavern.visit_count)} 人看过`,
    image: resolveSpaceHomeImage(tavern, 0),
    primary: gameplayCards.length === 0 && characterCard.length === 0,
  }]
  const createCard = [{
    id: `${tavern.id}-fresh-branch`,
    title: "创建新故事",
    subtitle: "从门口开一条新的互动支线。",
    meta: "让空间记住你",
    image: resolveSpaceHomeImage(tavern, 4),
  }]

  return [...publicChatCard, ...characterCard, ...gameplayCards, ...createCard].slice(0, 4)
}

/**
 * Builds visible memory rows from public scene, gameplay, and NPC text only.
 * @param tavern Public tavern payload for the current route.
 * @param characters Public-safe character summaries returned in entry view.
 * @returns UI-only memory rows; no private visitor memory or world_info is read.
 */
function buildSpaceHomeMemories(tavern: Tavern, characters: TavernCharacter[]): SpaceHomeMemory[] {
  const gameplays = Array.isArray(tavern.gameplay_definitions) ? tavern.gameplay_definitions as Array<Record<string, unknown>> : []
  const memorySources = [
    {
      quote: compactText(tavern.scene_prompt || tavern.description, "这里的灯还亮着，等你从第一句话开始。", 54),
      source: characters[0]?.name || tavern.name || "空间记录",
      image: resolveSpaceHomeImage(tavern, 4),
      age: "7 天前",
    },
    ...characters.slice(0, 2).map((character, index) => ({
      quote: compactText(character.first_mes || character.description || character.personality, "下次回来时，从这句问候继续。", 54),
      source: character.name || "NPC",
      image: characterAvatarSource(character) || resolveSpaceHomeImage(tavern, index + 5),
      age: index === 0 ? "3 天前" : "1 天前",
    })),
    ...gameplays.slice(0, 1).map((gameplay) => ({
      quote: compactText(readPublicString(gameplay, "summary") || readPublicString(gameplay, "description"), "一条公开玩法支线等待继续。", 54),
      source: readPublicString(gameplay, "title") || "故事入口",
      image: resolveSpaceHomeImage(tavern, 6),
      age: "今天",
    })),
  ].filter((item) => item.quote)

  return memorySources.slice(0, 3).map((item, index) => ({
    id: `${tavern.id}-memory-${index}`,
    image: item.image,
    quote: `“${item.quote}”`,
    source: item.source,
    age: item.age,
    hearts: String(26 + index * 5),
    replies: String(18 + index * 6),
  }))
}
/**
 * Renders the mobile bottom dock for the shared tavern homepage.
 * @returns Fixed mobile navigation; the entry item only scrolls to the workbench.
 */
function TavernMobileDock() {
  return (
    <nav
      className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 gap-1 rounded-[1.45rem] border border-cyan-200/16 bg-[#061126]/92 p-1.5 shadow-2xl shadow-black/30 backdrop-blur-xl lg:hidden"
      aria-label="Mobile navigation"
    >
      {mobileNavItems.map((item) => {
        const content = (
          <>
            <item.icon className="h-5 w-5" />
            <span className="max-w-full truncate">{item.label}</span>
          </>
        )
        const className = "flex min-h-14 touch-manipulation flex-col items-center justify-center gap-1 rounded-[1.05rem] px-1.5 text-[0.66rem] font-bold text-cyan-100/62 transition hover:bg-cyan-300/10 hover:text-cyan-50"
        return item.anchor ? (
          <a key={item.to} href={item.to} onClick={handleMainlineAnchorClick} className={className}>
            {content}
          </a>
        ) : (
          <Link key={item.to} to={item.to} className={className}>
            {content}
          </Link>
        )
      })}
    </nav>
  )
}
/**
 * Renders the desktop app sidebar around every tavern homepage.
 * @param tavern Public tavern payload used for the space status block.
 * @returns Sticky sidebar with navigation links and no persistence side effects.
 */
function TavernDesktopSidebar({ tavern }: { tavern: Tavern }) {
  const status = entryStatusDisplay(tavern)
  return (
    <aside className="sticky top-0 hidden h-screen min-h-[760px] w-[220px] shrink-0 flex-col border-r border-cyan-200/12 bg-[#020916]/95 px-5 py-8 shadow-[inset_-1px_0_0_rgba(34,211,238,0.10),22px_0_62px_rgba(0,0,0,0.34)] lg:flex">
      <Link
        to="/"
        className="rounded-[1.15rem] border border-cyan-200/16 bg-white/[0.025] px-5 py-5 text-left shadow-[0_0_36px_rgba(34,211,238,0.07)]"
      >
        <p className="text-2xl font-black leading-none text-white">FableMap</p>
        <p className="mt-2 text-[0.72rem] font-bold text-cyan-100/46">世界的镜像面</p>
      </Link>

      <nav className="mt-9 space-y-2" aria-label="Space page navigation">
        {desktopNavItems.map((item) => (
          <Link
            key={`${item.meta}-${item.to}`}
            to={item.to}
            className={cx(
              "group grid min-h-14 grid-cols-[2.35rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[1.05rem] px-3 text-cyan-100/55 transition hover:bg-cyan-300/9 hover:text-cyan-50",
              item.active && "border border-cyan-200/14 bg-cyan-300/13 text-cyan-50 shadow-[0_12px_32px_rgba(34,211,238,0.12)]",
            )}
          >
            <span className={cx(
              "grid h-9 w-9 place-items-center rounded-xl text-cyan-100/70 transition group-hover:text-cyan-50",
              item.active ? "bg-cyan-300/14 text-cyan-50" : "bg-white/[0.035]",
            )}>
              <item.icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[0.76rem] font-black uppercase tracking-[0.16em] text-white/82">{item.meta}</span>
              <span className="block truncate text-[0.68rem] font-bold text-cyan-100/48">{item.label}</span>
            </span>
            {item.badge ? (
              <span className="rounded-full bg-cyan-300/14 px-2 py-0.5 text-[0.64rem] font-black text-cyan-100">{item.badge}</span>
            ) : null}
          </Link>
        ))}
      </nav>

      <div className="mt-auto overflow-hidden rounded-[1.15rem] border border-cyan-200/16 bg-[#031326]/90 p-4 shadow-[0_0_34px_rgba(34,211,238,0.08)]">
        <p className="text-[0.75rem] font-black uppercase tracking-[0.18em] text-cyan-200">Space Status</p>
        <p className="mt-1 text-xs font-bold text-cyan-100/46">空间状态</p>
        <div className="mt-4 flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-slate-950/38 p-3">
          <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.9)]" />
          <div className="min-w-0">
            <p className="truncate text-xs font-black text-white">{tavern.name || "未命名空间"}</p>
            <p className="mt-1 truncate text-[0.68rem] font-bold text-cyan-100/44">{status.label}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <span>
            <span className="block text-lg font-black text-white">{formatCompactCount(tavern.visit_count)}</span>
            <span className="text-[0.68rem] font-bold text-cyan-100/42">当前在线</span>
          </span>
          <span>
            <span className="block text-lg font-black text-white">{tavern.characters?.length || 0}</span>
            <span className="text-[0.68rem] font-bold text-cyan-100/42">活跃角色</span>
          </span>
        </div>
        <div className="mt-4 rounded-xl border border-cyan-200/10 bg-cyan-300/[0.045] p-3">
          <img src={homeBlackRecentEchoWaveform} alt="" className="h-8 w-full object-cover opacity-75" loading="lazy" decoding="async" />
          <p className="mt-2 flex items-center gap-2 text-[0.7rem] font-black uppercase tracking-[0.14em] text-cyan-100/68">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
            Mirror Ready
          </p>
        </div>
      </div>
    </aside>
  )
}
/**
 * Renders an NPC avatar or deterministic initial fallback.
 * @param character Optional public NPC summary used for image/name.
 * @param className Optional sizing and shape classes from the caller.
 * @returns Image or initial badge; has no side effects.
 */
function TavernCharacterAvatar({ character, className = "" }: { character?: TavernCharacter; className?: string }) {
  const src = characterAvatarSource(character)
  if (src && canRenderImage(src)) {
    return (
      <img
        src={src}
        alt={character?.name || "NPC avatar"}
        className={cx("shrink-0 rounded-2xl object-cover ring-1 ring-cyan-200/20", className)}
        loading="lazy"
        decoding="async"
      />
    )
  }

  return (
    <span className={cx("grid shrink-0 place-items-center rounded-2xl bg-cyan-300/12 text-lg font-black text-cyan-50 ring-1 ring-cyan-200/20", className)}>
      {(character?.name || "?").slice(0, 1)}
    </span>
  )
}

/**
 * Renders the compact top controls above the tavern homepage stream.
 * @param tavern Public tavern payload used for the share title and fallback URL.
 * @returns A responsive top bar; copying the current URL is its only browser side effect.
 */
function TavernTopBar({ tavern }: { tavern: Tavern }) {
  const [shareStatus, setShareStatus] = useState("")

  /**
   * Copies the current tavern URL for sharing without calling backend APIs.
   * @returns Promise that resolves after UI status is updated; writes only to clipboard when available.
   */
  async function handleShareClick() {
    const url = typeof window !== "undefined" ? window.location.href : `/tavern/${tavern.id}`
    try {
      if (!navigator?.clipboard?.writeText) {
        setShareStatus("复制不可用")
        return
      }
      await navigator.clipboard.writeText(url)
      setShareStatus("已复制")
    } catch {
      setShareStatus("复制失败")
    }
  }

  return (
    <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
      <Link
        to="/discover"
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3.5 text-sm font-black text-cyan-50 backdrop-blur transition hover:border-cyan-200/30 hover:bg-cyan-300/10"
      >
        <ArrowLeft className="h-4 w-4" />
        返回探索
      </Link>
      <div className="flex items-center gap-2">
        {shareStatus ? <span className="hidden text-xs font-bold text-cyan-100/56 sm:inline">{shareStatus}</span> : null}
        <button
          type="button"
          onClick={handleShareClick}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan-200/18 bg-white/[0.045] px-4 text-sm font-black text-cyan-50 backdrop-blur transition hover:border-cyan-200/38 hover:bg-cyan-300/10"
        >
          <Share2 className="h-4 w-4" />
          分享空间
        </button>
        <button
          type="button"
          aria-label="更多空间操作"
          className="grid h-11 w-11 place-items-center rounded-full border border-cyan-200/18 bg-white/[0.045] text-cyan-50 backdrop-blur transition hover:border-cyan-200/38 hover:bg-cyan-300/10"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/**
 * Renders a reusable section header matching the reference homepage rhythm.
 * @param title Section title shown in the content stream.
 * @param action Optional small action label on the right.
 * @returns Header row with no side effects.
 */
function TavernSectionHeader({ title, action = "查看全部" }: { title: string; action?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-xl font-black text-white">{title}</h2>
      <a href="#tavern-mainline" onClick={handleMainlineAnchorClick} className="inline-flex items-center gap-1.5 text-xs font-black text-cyan-200 transition hover:text-cyan-50">
        {action}
        <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </div>
  )
}

/**
 * Renders the full-bleed visual hero for every shared tavern homepage.
 * @param tavern Public tavern payload for title, copy, metrics, and cover art.
 * @param isOwner Whether the current viewer owns this tavern, used only for a visible badge.
 * @returns Homepage hero section; anchors scroll to the chat workbench and do not persist data.
 */
function TavernHeroPanel({ tavern, isOwner }: { tavern: Tavern; isOwner: boolean }) {
  const coverImage = resolveSpaceHomeImage(tavern, 0)
  const firstMinute = buildTavernFirstMinuteGuide(tavern)
  const placeType = derivePlaceTypeDisplay(tavern)
  const anchor = formatTavernAnchorLocation(tavern)
  const status = entryStatusDisplay(tavern)
  const characters = Array.isArray(tavern.characters) ? tavern.characters : []
  const activeCount = Number(tavern.visit_count || 0) || characters.length * 4 || 12

  return (
    <section className="relative min-h-[360px] overflow-hidden rounded-[1.55rem] border border-cyan-200/14 bg-[#061126] shadow-[0_34px_90px_rgba(0,0,0,0.36)]">
      <div className="absolute inset-0">
        <img src={coverImage} alt="" className="h-full w-full object-cover opacity-[0.88]" loading="eager" decoding="async" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,7,16,0.92)_0%,rgba(2,7,16,0.70)_38%,rgba(2,7,16,0.24)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,7,16,0.08)_0%,rgba(2,7,16,0.34)_62%,rgba(2,7,16,0.88)_100%)]" />
      </div>

      <div className="relative z-10 flex min-h-[360px] max-w-[760px] flex-col justify-center px-6 py-7 sm:px-8 lg:px-9">
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-cyan-200/18 bg-slate-950/42 px-3 text-[0.68rem] font-black text-cyan-100 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
            {characters.length || 2} 位活跃角色
          </span>
          <span className={cx("inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-[0.68rem] font-black backdrop-blur", status.className)}>
            <DoorOpen className="h-3.5 w-3.5" />
            {status.label}
          </span>
          {isOwner ? (
            <span className="inline-flex min-h-8 items-center rounded-full border border-amber-200/22 bg-amber-300/12 px-3 text-[0.68rem] font-black text-amber-50 backdrop-blur">
              店主视角
            </span>
          ) : null}
        </div>

        <h1 className="max-w-3xl text-4xl font-black leading-[0.96] text-white drop-shadow-2xl sm:text-5xl lg:text-6xl">
          {tavern.name || "未命名空间"}
        </h1>
        <p className="mt-4 max-w-2xl text-xl font-black leading-7 text-white sm:text-2xl">
          {compactText(tavern.description || firstMinute.experienceType, firstMinute.playObjective, 34)}
        </p>
        <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-cyan-50/76 sm:text-base">
          {compactText(tavern.scene_prompt || tavern.description, firstMinute.sceneHint, 104)}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-5 text-xs font-bold text-cyan-100/62">
          <span className="inline-flex items-center gap-2"><UserRoundCheck className="h-4 w-4 text-cyan-200" />当前在线 {activeCount}</span>
          <span className="inline-flex items-center gap-2"><UsersRound className="h-4 w-4 text-cyan-200" />活跃角色 {characters.length}</span>
          <span className="inline-flex items-center gap-2"><Activity className="h-4 w-4 text-cyan-200" />访问次数 {formatCompactCount(tavern.visit_count)}</span>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a
            href="#tavern-mainline"
            onClick={handleMainlineAnchorClick}
            className="inline-flex min-h-14 w-full touch-manipulation items-center justify-center gap-2 rounded-[1.05rem] border border-violet-200/45 bg-[linear-gradient(135deg,#7c3aed_0%,#4f8cff_100%)] px-7 text-base font-black text-white shadow-[0_18px_44px_rgba(79,140,255,0.28)] transition hover:-translate-y-0.5 sm:w-auto"
          >
            开始故事
            <ArrowRight className="h-5 w-5" />
          </a>
          <a
            href="#space-activity"
            className="inline-flex min-h-14 w-full touch-manipulation items-center justify-center gap-2 rounded-[1.05rem] border border-cyan-200/18 bg-slate-950/52 px-7 text-base font-black text-cyan-50 backdrop-blur transition hover:border-cyan-200/38 hover:bg-cyan-300/10 sm:w-auto"
          >
            看看大家在聊什么
          </a>
        </div>
      </div>

      <div className="absolute bottom-5 right-5 hidden max-w-[300px] rounded-[1rem] border border-white/10 bg-slate-950/40 p-3 text-xs font-bold leading-5 text-cyan-50/68 backdrop-blur xl:block">
        <MapPin className="mb-2 h-4 w-4 text-cyan-200" />
        {anchor.text !== "坐标待确认" ? anchor.text : `${Number(tavern.lat).toFixed(4)}, ${Number(tavern.lon).toFixed(4)}`}
        <span className="mx-1.5 text-cyan-100/28">·</span>
        {placeType.shortLabel || placeType.label || firstMinute.experienceType}
      </div>
    </section>
  )
}

/**
 * Renders the recent public activity list from derived homepage rows.
 * @param rows UI-only activity rows built from public tavern/NPC fields.
 * @returns Timeline-style panel; has no side effects.
 */
function TavernActivityFeed({ rows }: { rows: SpaceHomeActivity[] }) {
  return (
    <section id="space-activity" className="rounded-[1.35rem] border border-cyan-200/12 bg-[#061126]/72 p-5 shadow-[0_26px_70px_rgba(0,0,0,0.22)]">
      <TavernSectionHeader title="最近发生" />
      <div className="relative space-y-3 pl-20 sm:pl-24">
        <div className="absolute bottom-3 left-[4.3rem] top-1 w-px bg-cyan-200/16 sm:left-[5rem]" />
        {rows.map((row) => (
          <div key={row.id} className="relative">
            <span className="absolute -left-20 top-5 w-16 text-right text-[0.7rem] font-bold text-cyan-100/42 sm:-left-24 sm:w-20">{row.time}</span>
            <span className="absolute -left-[0.9rem] top-6 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.8)]" />
            <div className="flex min-w-0 items-center gap-3 rounded-[1rem] border border-cyan-200/12 bg-slate-950/36 p-3 transition hover:border-cyan-200/26 hover:bg-cyan-300/[0.055]">
              {row.avatar && canRenderImage(row.avatar) ? (
                <img src={row.avatar} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-cyan-200/18" loading="lazy" decoding="async" />
              ) : (
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cyan-300/10 text-sm font-black text-cyan-50 ring-1 ring-cyan-200/18">{row.name.slice(0, 1)}</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-black text-white">
                  {row.name}
                  <span className="rounded-md border border-cyan-200/18 bg-cyan-300/10 px-1.5 py-0.5 text-[0.6rem] font-black text-cyan-200">{row.role}</span>
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-cyan-50/70">{row.text}</p>
              </div>
              <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-xs font-black text-cyan-100/62">
                <Heart className="h-3.5 w-3.5" />
                {row.hearts}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * Renders story-entry cards that all lead into the existing tavern workbench.
 * @param entries UI-only cards derived from public gameplay and NPC summaries.
 * @returns Responsive card grid; anchors scroll only and do not auto-send chat.
 */
function TavernStoryEntrances({ entries }: { entries: SpaceHomeStoryEntry[] }) {
  return (
    <section className="rounded-[1.35rem] border border-cyan-200/12 bg-[#061126]/72 p-5 shadow-[0_26px_70px_rgba(0,0,0,0.22)]">
      <TavernSectionHeader title="故事入口" action="进入主线" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {entries.map((entry) => (
          <a
            key={entry.id}
            href="#tavern-mainline"
            onClick={handleMainlineAnchorClick}
            className={cx(
              "group relative min-h-[210px] overflow-hidden rounded-[1rem] border bg-slate-950/44 shadow-[0_18px_42px_rgba(0,0,0,0.20)] transition hover:-translate-y-0.5 hover:border-cyan-200/38",
              entry.primary ? "border-cyan-200/36" : "border-cyan-200/14",
            )}
          >
            <img src={entry.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-72 transition group-hover:scale-[1.03]" loading="lazy" decoding="async" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,7,16,0.08)_0%,rgba(2,7,16,0.48)_46%,rgba(2,7,16,0.94)_100%)]" />
            <div className="relative z-10 flex h-full min-h-[210px] flex-col justify-end p-4">
              <p className="text-lg font-black leading-6 text-white">{entry.title}</p>
              <p className="mt-2 min-h-10 text-xs font-bold leading-5 text-cyan-50/74">{entry.subtitle}</p>
              <p className="mt-4 flex items-center justify-between text-xs font-black text-cyan-100/68">
                {entry.meta}
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-cyan-50 transition group-hover:bg-cyan-300/18">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </p>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}

/**
 * Renders public resident-character cards for the shared tavern homepage.
 * @param characters Public-safe NPC summaries returned in entry view.
 * @returns Character card carousel/grid; buttons only scroll to the workbench.
 */
function TavernResidentCharacters({ characters }: { characters: TavernCharacter[] }) {
  return (
    <section className="rounded-[1.35rem] border border-cyan-200/12 bg-[#061126]/72 p-5 shadow-[0_26px_70px_rgba(0,0,0,0.22)]">
      <TavernSectionHeader title="驻场角色" action="查看全部" />
      {characters.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {characters.slice(0, 4).map((character, index) => (
            <article key={character.id || character.name} className="overflow-hidden rounded-[1rem] border border-cyan-200/15 bg-slate-950/42 shadow-[0_18px_42px_rgba(0,0,0,0.18)]">
              <div className="relative aspect-[4/3] overflow-hidden">
                <TavernCharacterAvatar character={character} className="h-full w-full rounded-none object-cover ring-0" />
                <span className="absolute left-3 top-3 rounded-full border border-emerald-200/22 bg-emerald-300/16 px-2.5 py-1 text-[0.65rem] font-black text-emerald-50">
                  在线
                </span>
              </div>
              <div className="p-4">
                <h3 className="truncate text-lg font-black text-white">{character.name || "NPC"}</h3>
                <p className="mt-2 min-h-10 text-xs font-bold leading-5 text-cyan-50/64">
                  {compactText(character.description || character.personality || character.first_mes, "等待访客进入对话。", 42)}
                </p>
                <a
                  href="#tavern-mainline"
                  onClick={handleMainlineAnchorClick}
                  className={cx(
                    "mt-4 flex min-h-10 items-center justify-center gap-2 rounded-full border px-3 text-xs font-black transition",
                    index === 0 ? "border-cyan-200/36 bg-cyan-300/14 text-cyan-50" : "border-white/12 bg-white/[0.035] text-cyan-100/68 hover:border-cyan-200/30 hover:text-cyan-50",
                  )}
                >
                  进入对话
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-[1rem] border border-dashed border-cyan-200/18 bg-slate-950/36 p-6 text-center text-sm font-bold text-cyan-100/52">
          这间空间还没有公开驻场角色。
        </div>
      )}
    </section>
  )
}

/**
 * Renders public, derived continuity rows for the homepage memory section.
 * @param rows UI-only memory rows built from public tavern/NPC text.
 * @returns Memory list panel; has no persistence side effects.
 */
function TavernMemoryList({ rows }: { rows: SpaceHomeMemory[] }) {
  return (
    <section className="rounded-[1.35rem] border border-cyan-200/12 bg-[#061126]/72 p-5 shadow-[0_26px_70px_rgba(0,0,0,0.22)]">
      <TavernSectionHeader title="空间记忆" />
      <div className="space-y-3">
        {rows.map((row) => (
          <article key={row.id} className="flex min-w-0 items-center gap-4 rounded-[1rem] border border-cyan-200/12 bg-slate-950/38 p-3">
            <img src={row.image} alt="" className="h-16 w-28 shrink-0 rounded-xl object-cover ring-1 ring-cyan-200/12" loading="lazy" decoding="async" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-white">{row.quote}</p>
              <p className="mt-2 text-xs font-bold text-cyan-100/42">{row.source} / {row.age}</p>
            </div>
            <div className="hidden shrink-0 gap-3 text-xs font-black text-cyan-100/54 sm:flex">
              <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{row.hearts}</span>
              <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{row.replies}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

/**
 * Renders the right-side information rail from public tavern fields.
 * @param tavern Public tavern payload for metadata, counters, and calls to action.
 * @param characters Public-safe character summaries returned in entry view.
 * @returns Sticky info rail; anchors scroll to existing route sections without persistence.
 */
function TavernRightRail({ tavern, characters }: { tavern: Tavern; characters: TavernCharacter[] }) {
  const firstMinute = buildTavernFirstMinuteGuide(tavern)
  const coverImage = resolveSpaceHomeImage(tavern, 0)
  const placeType = derivePlaceTypeDisplay(tavern)
  const status = entryStatusDisplay(tavern)
  const loose = tavern as TavernLooseRecord
  const createdAt = formatPublicDate(loose.created_at)
  const ownerName = readPublicString(loose, "owner_name") || tavern.owner_id || "空间主人"
  const storyCount = Array.isArray(tavern.gameplay_definitions) ? tavern.gameplay_definitions.length : 0

  return (
    <aside className="hidden min-w-0 space-y-5 xl:block">
      <section className="rounded-[1.35rem] border border-cyan-200/12 bg-[#061126]/78 p-5 shadow-[0_28px_70px_rgba(0,0,0,0.30)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-white">空间信息</h2>
          <span className="grid h-8 w-8 place-items-center rounded-full border border-cyan-200/12 bg-cyan-300/8 text-cyan-100"><MoreVertical className="h-4 w-4" /></span>
        </div>
        <div className="grid grid-cols-[6.4rem_minmax(0,1fr)] gap-4">
          <img src={coverImage} alt="" className="h-24 w-full rounded-xl object-cover ring-1 ring-cyan-200/12" loading="lazy" decoding="async" />
          <div className="min-w-0 space-y-2 text-sm">
            {[
              ["创建时间", createdAt],
              ["空间主人", ownerName],
              ["空间类型", placeType.shortLabel || placeType.label || "公共空间"],
              ["成员数", formatCompactCount(tavern.visit_count || characters.length * 300)],
              ["故事数", formatCompactCount(storyCount || 1)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 text-xs font-bold">
                <span className="text-cyan-100/38">{label}</span>
                <span className="truncate text-cyan-50/90">{value}</span>
              </div>
            ))}
          </div>
        </div>
        <a href="#tavern-mainline" onClick={handleMainlineAnchorClick} className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-[0.95rem] bg-[linear-gradient(135deg,#7c3aed_0%,#4f8cff_100%)] text-sm font-black text-white shadow-[0_14px_34px_rgba(79,140,255,0.24)]">
          加入空间
          <UsersRound className="h-4 w-4" />
        </a>
        <a href="#space-characters" className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-[0.95rem] border border-cyan-200/14 bg-white/[0.035] text-sm font-black text-cyan-100/72 transition hover:border-cyan-200/28 hover:text-cyan-50">
          <Heart className="h-4 w-4" />
          已关注
        </a>
      </section>

      <section className="rounded-[1.35rem] border border-cyan-200/12 bg-[#061126]/78 p-5 shadow-[0_28px_70px_rgba(0,0,0,0.26)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-white">当前在线</h2>
          <span className="rounded-full border border-cyan-200/16 bg-cyan-300/10 px-2.5 py-1 text-xs font-black text-cyan-200">{characters.length || 1}</span>
        </div>
        <div className="space-y-3">
          {(characters.length ? characters : [{ id: `${tavern.id}-host`, name: tavern.name, description: status.helper } as TavernCharacter]).slice(0, 4).map((character, index) => (
            <div key={character.id || character.name} className="flex min-w-0 items-center gap-3">
              <TavernCharacterAvatar character={character} className="h-10 w-10 rounded-full" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-white">{character.name || "空间角色"}</p>
                <p className="mt-0.5 truncate text-xs font-bold text-cyan-100/42">{onlineStates[index] || "正在回应"}</p>
              </div>
            </div>
          ))}
        </div>
        <a href="#space-characters" className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-cyan-200 transition hover:text-cyan-50">
          查看全部在线
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </section>

      <section className="rounded-[1.35rem] border border-cyan-200/12 bg-[#061126]/78 p-5 shadow-[0_28px_70px_rgba(0,0,0,0.26)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-white">空间公告</h2>
          <span className="grid h-8 w-8 place-items-center rounded-full border border-cyan-200/12 bg-cyan-300/8 text-cyan-100"><Bell className="h-4 w-4" /></span>
        </div>
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/34 p-4">
          <p className="text-sm font-black text-white">{firstMinute.hostRole || "酒馆守则"}</p>
          <p className="mt-3 text-sm font-semibold leading-6 text-cyan-50/62">
            {compactText(firstMinute.sceneHint || tavern.description, "欢迎来到这间空间。先确认入口，再选择想对话的 NPC。", 92)}
          </p>
          <p className="mt-4 text-xs font-bold text-cyan-100/34">{createdAt}</p>
        </div>
        <a href="#tavern-mainline" onClick={handleMainlineAnchorClick} className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-cyan-200 transition hover:text-cyan-50">
          查看全部公告
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </section>

      <section className="rounded-[1.35rem] border border-cyan-200/12 bg-[#061126]/78 p-5 shadow-[0_28px_70px_rgba(0,0,0,0.26)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black text-white">相关入口</h2>
          <Link to="/discover" className="text-xs font-black text-cyan-200">换一批</Link>
        </div>
        <div className="space-y-3">
          {[
            { to: "/discover", title: "探索更多空间", helper: "同城附近", image: resolveSpaceHomeImage(tavern, 7) },
            { to: "/quests", title: "游玩指南", helper: "玩法说明", image: resolveSpaceHomeImage(tavern, 8) },
            { to: "/home-me", title: "回访记忆", helper: "继续关系", image: resolveSpaceHomeImage(tavern, 9) },
          ].map((item) => (
            <Link key={item.title} to={item.to} className="flex min-w-0 items-center gap-3 rounded-xl border border-cyan-200/12 bg-slate-950/34 p-2.5 transition hover:border-cyan-200/28 hover:bg-cyan-300/[0.055]">
              <img src={item.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" loading="lazy" decoding="async" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-white">{item.title}</span>
                <span className="mt-0.5 block truncate text-xs font-bold text-cyan-100/42">{item.helper}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </aside>
  )
}
/**
 * Renders the compact mobile-only tavern header above the homepage stream.
 * @param tavern Public tavern payload for title and status copy.
 * @returns Header bar with navigation links only; has no persistence side effects.
 */
function TavernMobileHeader({ tavern }: { tavern: Tavern }) {
  const status = entryStatusDisplay(tavern)
  return (
    <header className="mb-4 lg:hidden">
      <div className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-cyan-200/16 bg-[#061126]/86 p-3 shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
        <Link to="/discover" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-200/18 bg-cyan-300/10 text-cyan-50" aria-label="返回发现">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black text-white">{tavern.name || "空间入口"}</p>
          <p className="truncate text-xs font-bold text-cyan-100/54">{status.label} · {tavern.characters?.length || 0} 位 NPC</p>
        </div>
        <a href="#tavern-mainline" onClick={handleMainlineAnchorClick} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-100" aria-label="进入空间">
          <DoorOpen className="h-5 w-5" />
        </a>
      </div>
    </header>
  )
}
/**
 * Composes the shared tavern homepage shell and keeps the existing chat workbench below it.
 * @param tavern Public tavern payload returned by entry view.
 * @param roleplay Existing roleplay state used by the chat workbench.
 * @param currentUserId Current viewer id passed through to the workbench.
 * @param isOwner Whether the current viewer owns the space, used for owner-visible UI.
 * @returns Full responsive tavern homepage; no schema or backend writes.
 */
function TavernSpacePage({
  tavern,
  roleplay,
  currentUserId,
  isOwner,
}: {
  tavern: Tavern
  roleplay: RoleplayState | null
  currentUserId: string
  isOwner: boolean
}) {
  const characters = useMemo(() => (Array.isArray(tavern.characters) ? tavern.characters : []), [tavern.characters])
  const activityRows = useMemo(() => buildSpaceHomeActivities(tavern, characters), [tavern, characters])
  const storyEntries = useMemo(() => buildSpaceHomeStoryEntries(tavern, characters), [tavern, characters])
  const memoryRows = useMemo(() => buildSpaceHomeMemories(tavern, characters), [tavern, characters])

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#020710] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_0%,rgba(37,99,235,0.18),transparent_34rem),linear-gradient(135deg,#061226_0%,#030712_48%,#020710_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-38 [background-image:linear-gradient(rgba(103,232,249,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.04)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="relative mx-auto w-full max-w-[1500px]">
        <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
          <TavernDesktopSidebar tavern={tavern} />
          <div className="min-w-0 px-3 py-4 pb-28 sm:px-5 lg:px-6 lg:py-6 xl:px-7">
            <TavernMobileHeader tavern={tavern} />
            <div className="hidden lg:block">
              <TavernTopBar tavern={tavern} />
            </div>
            <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-5">
              <div className="min-w-0 space-y-5">
                <TavernHeroPanel tavern={tavern} isOwner={isOwner} />
                <TavernActivityFeed rows={activityRows} />
                <TavernStoryEntrances entries={storyEntries} />
                <div id="space-characters" className="scroll-mt-6">
                  <TavernResidentCharacters characters={characters} />
                </div>
                <TavernMemoryList rows={memoryRows} />
                <section id="tavern-mainline" className="scroll-mt-6 rounded-[1.35rem] border border-cyan-200/12 bg-[#061126]/72 p-3 shadow-[0_26px_70px_rgba(0,0,0,0.22)] sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-4 px-1">
                    <div>
                      <h2 className="text-xl font-black text-white">进入空间</h2>
                      <p className="mt-1 text-sm font-bold text-cyan-100/48">从这里开始对话、接玩法或继续回访。</p>
                    </div>
                    <span className="hidden rounded-full border border-cyan-200/14 bg-cyan-300/8 px-3 py-1 text-xs font-black text-cyan-100/62 sm:inline-flex">
                      Chat Workbench
                    </span>
                  </div>
                  <TavernChatWorkbench
                    tavern={tavern}
                    roleplay={roleplay}
                    currentUserId={currentUserId}
                    isOwner={isOwner}
                  />
                </section>
              </div>
              <TavernRightRail tavern={tavern} characters={characters} />
            </div>
          </div>
        </div>
      </div>
      <TavernMobileDock />
    </main>
  )
}
function TavernErrorPage({ tavernId, error }: { tavernId: string; error: string }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020710] px-4 py-8 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,#061226_0%,#030712_48%,#020710_100%)]" />
      <div className="relative mx-auto max-w-3xl">
        <Link to="/discover" className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-200/18 bg-cyan-300/10 px-4 text-sm font-black text-cyan-50">
          <ArrowLeft className="h-4 w-4" />
          返回发现
        </Link>
        <Card className="mt-8 min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>无法进入空间</CardTitle>
            <CardDescription className="mt-2">
              {error || `未找到空间 ${tavernId}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="rounded-2xl border border-theme-border bg-theme-card p-4 text-sm leading-6 text-violet-50/70">
              请确认空间链接是否正确，或让店主重新分享入口。
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export default function TavernRoute() {
  const { tavernId, currentUserId, tavern, roleplay, error } = useLoaderData<typeof clientLoader>()
  const characters = tavern?.characters || []
  const effectiveRoleplay = tavern ? roleplay || fallbackRoleplayState(tavern, characters) : null
  const isOwner = Boolean(tavern?.owner_id && tavern.owner_id === currentUserId)

  if (!tavern) return <TavernErrorPage tavernId={tavernId} error={error} />

  return (
    <TavernSpacePage
      tavern={tavern}
      roleplay={effectiveRoleplay}
      currentUserId={currentUserId}
      isOwner={isOwner}
    />
  )
}
