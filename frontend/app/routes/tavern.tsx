import type { ClientLoaderFunctionArgs } from "react-router"
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bookmark,
  Clock3,
  Clock,
  Compass,
  Copy,
  DoorOpen,
  Home,
  MapPin,
  MessageCircle,
  RadioTower,
  Share2,
  Sparkles,
  Star,
  UsersRound,
} from "lucide-react"
import { useEffect, useMemo, useState, type MouseEvent } from "react"
import { Link, useLoaderData } from "react-router"
import homeBlackHeroVisual from "../assets/fable-map-05-10/home-black/hero-system-visual.png"
import homeBlackRecentEchoWaveform from "../assets/fable-map-05-10/home-black/recent-echo-waveform.png"
import homeBlackWorldStatsSparkline from "../assets/fable-map-05-10/home-black/world-stats-sparkline.png"
import { TavernChatWorkbench } from "../features/tavern-chat-workbench"
import { resolveHomepageTavernCover } from "../lib/homepage-taverns"
import { derivePlaceTypeDisplay } from "../lib/place-types.js"
import { fallbackRoleplayState } from "../lib/roleplay-state"
import { buildTavernFirstMinuteGuide } from "../lib/tavern-first-minute"
import { normalizePublicWelfareNpcAssetPath } from "../lib/tavern-runtime-config.js"
import { buildTavernShareDisplay, buildTavernSharePayload } from "../lib/tavern-share.js"
import {
  createVisitorNote,
  DEFAULT_VISITOR_ID,
  errorMessage,
  getRoleplayState,
  getTavern,
  getTavernShare,
  type RoleplayState,
  type Tavern,
  type TavernCharacter,
  type TavernSharePayload,
} from "../lib/taverns"
import { formatTavernAnchorLocation } from "../product/mapAnchorCopy.js"
import { Button } from "../ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

// Atmosphere tag definitions for Hero panel
const ATMOSPHERE_TAGS = [
  { label: "3D沉浸", icon: "🎮", color: "violet" },
  { label: "NPC扮演", icon: "🎭", color: "cyan" },
  { label: "氛围营造", icon: "✨", color: "amber" },
]

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

function formatMetricNumber(value: unknown) {
  const numberValue = Number(value || 0)
  if (!Number.isFinite(numberValue) || numberValue <= 0) return "0"
  return Math.round(numberValue).toLocaleString("zh-CN")
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

const desktopNavItems = [
  { to: "/", label: "镜像面", meta: "Mirror", icon: Home },
  { to: "/discover", label: "发现空间", meta: "Spaces", icon: Compass },
  { to: "/quests", label: "游玩指南", meta: "Guide", icon: BookOpen },
  { to: "/home-me", label: "回访记忆", meta: "Memory", icon: MessageCircle },
  { to: "/owner", label: "店主后台", meta: "Owner", icon: Bookmark },
]

const mobileNavItems = [
  { to: "/", label: "镜像面", icon: Home },
  { to: "/discover", label: "发现", icon: Compass },
  { to: "/quests", label: "指南", icon: BookOpen },
  { to: "/home-me", label: "回访", icon: MessageCircle },
]

function TavernMobileDock() {
  return (
    <nav
      className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-4 gap-1 rounded-[1.45rem] border border-cyan-200/16 bg-[#061126]/92 p-1.5 shadow-2xl shadow-black/30 backdrop-blur-xl lg:hidden"
      aria-label="Mobile navigation"
    >
      {mobileNavItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className="flex min-h-14 touch-manipulation flex-col items-center justify-center gap-1 rounded-[1.05rem] px-2 text-[0.68rem] font-bold text-cyan-100/62 transition hover:bg-cyan-300/10 hover:text-cyan-50"
        >
          <item.icon className="h-5 w-5" />
          <span className="max-w-full truncate">{item.label}</span>
        </Link>
      ))}
    </nav>
  )
}

function TavernDesktopSidebar({ tavern }: { tavern: Tavern }) {
  const status = entryStatusDisplay(tavern)
  return (
    <aside className="sticky top-0 hidden h-screen min-h-[760px] w-[236px] shrink-0 flex-col border-r border-cyan-200/14 bg-[#030914]/92 px-5 py-7 shadow-[inset_-1px_0_0_rgba(34,211,238,0.12),24px_0_70px_rgba(0,0,0,0.28)] lg:flex">
      <Link
        to="/"
        className="rounded-[1.55rem] border border-cyan-200/18 bg-cyan-300/8 px-5 py-4 text-left shadow-[0_0_38px_rgba(34,211,238,0.08)]"
      >
        <p className="text-3xl font-black leading-none text-white">FableMap</p>
        <p className="mt-2 text-sm font-bold text-cyan-100/58">世界的镜像面</p>
      </Link>

      <nav className="mt-8 space-y-2" aria-label="Space page navigation">
        {desktopNavItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="group grid min-h-16 grid-cols-[2.8rem_minmax(0,1fr)] items-center gap-3 rounded-[1.35rem] px-3 text-cyan-100/56 transition hover:bg-cyan-300/9 hover:text-cyan-50"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-200/12 bg-white/[0.025] text-cyan-100/70 transition group-hover:border-cyan-200/28 group-hover:bg-cyan-300/10 group-hover:text-cyan-50">
              <item.icon className="h-6 w-6" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-black uppercase text-white/86">{item.meta}</span>
              <span className="block truncate text-xs font-bold">{item.label}</span>
            </span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto rounded-[1.55rem] border border-cyan-200/18 bg-cyan-300/8 p-5 shadow-[0_0_34px_rgba(34,211,238,0.08)]">
        <p className="text-xl font-black uppercase tracking-[0.12em] text-cyan-50">Space Status</p>
        <p className="mt-3 text-sm font-bold text-cyan-100/58">{status.label}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <span className="rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2">
            <span className="block text-lg font-black text-cyan-50">{formatMetricNumber(tavern.visit_count)}</span>
            <span className="text-xs font-bold text-cyan-100/46">到访</span>
          </span>
          <span className="rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2">
            <span className="block text-lg font-black text-cyan-50">{tavern.characters?.length || 0}</span>
            <span className="text-xs font-bold text-cyan-100/46">NPC</span>
          </span>
        </div>
      </div>
    </aside>
  )
}

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

function TavernMetricPanel({ icon: Icon, label, value, helper }: { icon: typeof Activity; label: string; value: string; helper: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-cyan-200/14 bg-cyan-300/[0.06] px-4 py-3">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-cyan-100/56">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1.5 truncate text-xl font-black text-white">{value}</p>
      <p className="mt-0.5 truncate text-xs font-bold text-cyan-100/44">{helper}</p>
    </div>
  )
}

function TavernHeroPanel({ tavern, isOwner }: { tavern: Tavern; isOwner: boolean }) {
  const coverImage = resolveHomepageTavernCover(tavern, 0) || homeBlackHeroVisual
  const firstMinute = buildTavernFirstMinuteGuide(tavern)
  const placeType = derivePlaceTypeDisplay(tavern)
  const anchor = formatTavernAnchorLocation(tavern)
  const status = entryStatusDisplay(tavern)
  const characters = Array.isArray(tavern.characters) ? tavern.characters : []
  const leadCharacter = characters[0]
  const localTime = tavern.local_time_display || tavern.time_status?.local_time_display || ""

  // Clock display state
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date()
    return now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
  })

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }))
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="relative min-h-[420px] overflow-hidden rounded-[2rem] border border-cyan-200/16 bg-[#061126] shadow-[0_34px_90px_rgba(0,0,0,0.35)]">
      {/* 背景图 */}
      <div className="absolute inset-0">
        <img src={coverImage} alt="" className="h-full w-full object-cover opacity-80" loading="eager" decoding="async" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,7,16,0.95)_0%,rgba(2,7,16,0.68)_38%,rgba(2,7,16,0.40)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,7,16,0.18)_0%,rgba(2,7,16,0.50)_70%,rgba(2,7,16,0.92)_100%)]" />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-px bg-cyan-200/50" />

      {/* 右上角时钟 */}
      <div className="absolute right-6 top-6 z-20 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-2 backdrop-blur">
        <Clock className="h-4 w-4 text-cyan-100" />
        <span className="text-sm font-black text-cyan-50">{currentTime}</span>
      </div>

      {/* 主内容区域：左侧信息 + 右侧竖栏 */}
      <div className="relative z-10 flex min-h-[420px] justify-between p-6 md:p-8 lg:gap-8">
        {/* 左侧信息内容 */}
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          {/* 顶部状态标签 + 锚点标签 */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cx("inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-black", status.className)}>
                <DoorOpen className="h-4 w-4" />
                {status.label}
              </span>
              {isOwner ? (
                <span className="inline-flex min-h-10 items-center rounded-full border border-amber-200/20 bg-amber-300/12 px-4 text-sm font-black text-amber-50">
                  店主视角
                </span>
              ) : null}
            </div>
            {/* 锚点标签 (天文台 · 普通空间) */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-black text-white/70">
              <MapPin className="h-4 w-4 text-cyan-100" />
              {anchor.text !== "坐标待确认" ? anchor.text : `${Number(tavern.lat).toFixed(4)}, ${Number(tavern.lon).toFixed(4)}`}
              <span className="text-white/30">·</span>
              {placeType.shortLabel || placeType.label || firstMinute.experienceType}
            </div>
          </div>

          {/* 主要信息 */}
          <div className="max-w-3xl space-y-4">
            {/* 标题和描述 */}
            <h1 className="max-w-2xl text-5xl font-black leading-tight text-white md:text-6xl">
              {tavern.name || "未命名空间"}
            </h1>
            <p className="max-w-2xl text-base font-bold leading-8 text-violet-50/74">
              {compactText(tavern.description || tavern.scene_prompt, firstMinute.sceneHint, 132)}
            </p>

            {/* 操作按钮 */}
            <div className="flex flex-wrap gap-3">
              <a
                href="#tavern-mainline"
                onClick={handleMainlineAnchorClick}
                className="inline-flex min-h-14 touch-manipulation items-center justify-center gap-2 rounded-[1.15rem] border border-cyan-100/50 bg-cyan-300 px-6 text-base font-black text-slate-950 shadow-[0_0_34px_rgba(103,232,249,0.26)] transition hover:-translate-y-0.5"
              >
                <DoorOpen className="h-5 w-5" />
                进入空间
                <ArrowRight className="h-5 w-5" />
              </a>
              <Link
                to="/discover"
                className="inline-flex min-h-14 touch-manipulation items-center justify-center gap-2 rounded-[1.15rem] border border-cyan-200/20 bg-slate-950/42 px-6 text-base font-black text-cyan-50 backdrop-blur transition hover:border-cyan-200/42 hover:bg-cyan-300/10"
              >
                <ArrowLeft className="h-5 w-5" />
                返回发现
              </Link>
            </div>
          </div>

          {/* 底部指标面板 */}
          <div className="grid gap-3 md:grid-cols-3">
            <TavernMetricPanel
              icon={UsersRound}
              label="Active NPC"
              value={characters.length ? `${characters.length}` : "0"}
              helper={leadCharacter?.name || "等待店主配置角色"}
            />
            <TavernMetricPanel
              icon={RadioTower}
              label="First Minute"
              value={firstMinute.playObjective}
              helper={firstMinute.hostRole}
            />
            <TavernMetricPanel
              icon={Clock3}
              label="Local Signal"
              value={localTime || (tavern.is_open === false ? "Closed" : "Open")}
              helper={status.helper}
            />
          </div>
        </div>

        {/* 右侧竖栏：游戏世界指数 + 氛围标签卡片 */}
        <div className="hidden w-[220px] shrink-0 flex-col gap-4 lg:flex">
          {/* 游戏世界指数 */}
          <div className="overflow-hidden rounded-[1.5rem] border border-cyan-200/16 bg-slate-950/55 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-wider text-cyan-100/68">游戏世界指数</p>
              <RadioTower className="h-4 w-4 text-cyan-100/50" />
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-3xl font-black text-white">{characters.length + 12}</p>
                <p className="mt-1 text-xs font-bold text-cyan-100/50">探索者</p>
              </div>
              <img src={homeBlackWorldStatsSparkline} alt="" className="h-12 w-20 object-contain" loading="lazy" />
            </div>
          </div>

          {/* 氛围标签卡片 */}
          <div className="space-y-2">
            {ATMOSPHERE_TAGS.map((tag) => (
              <div
                key={tag.label}
                className={cx(
                  "flex items-center gap-3 rounded-2xl border px-4 py-3",
                  tag.color === "violet" && "border-violet-200/16 bg-violet-300/[0.075]",
                  tag.color === "cyan" && "border-cyan-200/16 bg-cyan-300/[0.075]",
                  tag.color === "amber" && "border-amber-200/16 bg-amber-300/[0.075]",
                )}
              >
                <span className="text-lg">{tag.icon}</span>
                <span className={cx(
                  "text-sm font-black",
                  tag.color === "violet" && "text-violet-50",
                  tag.color === "cyan" && "text-cyan-50",
                  tag.color === "amber" && "text-amber-50",
                )}>{tag.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function TavernRightRail({ tavern }: { tavern: Tavern }) {
  const firstMinute = buildTavernFirstMinuteGuide(tavern)
  const characters = Array.isArray(tavern.characters) ? tavern.characters : []
  const anchor = formatTavernAnchorLocation(tavern)
  const status = entryStatusDisplay(tavern)

  return (
    <aside className="hidden min-w-0 space-y-4 xl:flex xl:w-[300px] xl:flex-col xl:shrink-0 xl:gap-4">
      {/* 空间回声卡片 */}
      <section className="overflow-hidden rounded-[1.8rem] border border-cyan-200/16 bg-[#061126]/86 p-5 shadow-[0_28px_70px_rgba(0,0,0,0.30)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-white">空间回声</h2>
            <p className="mt-0.5 text-xs font-black uppercase tracking-wider text-cyan-100/48">Recent Echoes</p>
          </div>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan-200/16 bg-cyan-300/10 text-cyan-100">
            <Activity className="h-5 w-5" />
          </span>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/45 p-4">
          <p className="text-sm font-bold leading-5 text-violet-50/76">{firstMinute.sceneHint}</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-cyan-100/54">
            <MapPin className="h-3 w-3" />
            {anchor.text !== "坐标待确认" ? anchor.text : `${Number(tavern.lat).toFixed(3)}, ${Number(tavern.lon).toFixed(3)}`}
          </p>
        </div>
        <a href="#tavern-mainline" onClick={handleMainlineAnchorClick} className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-200/24 bg-cyan-300/12 text-sm font-black text-cyan-50 transition hover:bg-cyan-300/18">
          查看入口
          <ArrowRight className="h-4 w-4" />
        </a>
      </section>

      {/* 驻场角色卡片 */}
      <section className="relative overflow-hidden rounded-[1.8rem] border border-violet-200/18 bg-[#061126]/86 p-5 shadow-[0_28px_70px_rgba(0,0,0,0.26)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white">驻场角色</h2>
            <p className="mt-0.5 text-xs font-bold text-violet-100/48">{characters.length} 位 NPC 在场</p>
          </div>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-200/16 bg-violet-300/10 text-violet-100">
            <Sparkles className="h-5 w-5" />
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {characters.slice(0, 3).map((character) => (
            <div
              key={character.id || character.name}
              className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3"
            >
              <TavernCharacterAvatar character={character} className="h-11 w-11" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-white">{character.name || "NPC"}</p>
                <p className="mt-0.5 truncate text-xs font-bold text-violet-100/50">
                  {compactText(character.description || character.personality || "", "等待访客", 28)}
                </p>
              </div>
            </div>
          ))}
          {characters.length === 0 && (
            <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center text-xs font-bold text-violet-100/50">
              暂无驻场角色
            </p>
          )}
        </div>
      </section>

      {/* World Stats 卡片 */}
      <section className="relative overflow-hidden rounded-[1.8rem] border border-cyan-200/16 bg-[#061126]/86 p-5 shadow-[0_28px_70px_rgba(0,0,0,0.26)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white">World Stats</h2>
            <p className="mt-0.5 text-xs font-bold text-cyan-100/48">世界动态</p>
          </div>
          <RadioTower className="h-5 w-5 text-cyan-100/50" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            { label: "开放状态", value: status.label, color: "cyan" },
            { label: "累计到访", value: formatMetricNumber(tavern.visit_count), color: "violet" },
            { label: "驻场 NPC", value: String(characters.length), color: "cyan" },
            { label: "坐标锚定", value: Number.isFinite(Number(tavern.lat)) && Number.isFinite(Number(tavern.lon)) ? "已锚定" : "待确认", color: "violet" },
          ].map((item) => (
            <div
              key={item.label}
              className={cx(
                "rounded-xl border px-3 py-2.5",
                item.color === "cyan" && "border-cyan-200/16 bg-cyan-300/[0.06]",
                item.color === "violet" && "border-violet-200/16 bg-violet-300/[0.06]",
              )}
            >
              <p className={cx(
                "text-xs font-bold",
                item.color === "cyan" && "text-cyan-100/44",
                item.color === "violet" && "text-violet-100/44",
              )}>{item.label}</p>
              <p className="mt-1 truncate text-lg font-black text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </section>
    </aside>
  )
}

function TavernMobileHeader({ tavern }: { tavern: Tavern }) {
  const status = entryStatusDisplay(tavern)
  return (
    <header className="lg:hidden">
      <div className="flex items-center justify-between gap-3 rounded-[1.45rem] border border-cyan-200/16 bg-[#061126]/86 p-3 shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
        <Link to="/discover" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-200/18 bg-cyan-300/10 text-cyan-50" aria-label="返回发现">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black text-white">{tavern.name || "空间入口"}</p>
          <p className="truncate text-xs font-bold text-cyan-100/54">{status.label} · {tavern.characters?.length || 0} 位 NPC</p>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-100">
          <Star className="h-5 w-5" />
        </span>
      </div>
    </header>
  )
}

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
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#020710] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,#061226_0%,#030712_48%,#020710_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(103,232,249,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.04)_1px,transparent_1px)] [background-size:56px_56px]" />
      <div className="relative mx-auto w-full max-w-[1536px]">
        {/* 三栏布局：sidebar(236px) | main | right-rail(300px) */}
        <div className="hidden lg:grid lg:grid-cols-[236px_minmax(0,1fr)_300px] lg:items-start">
          <TavernDesktopSidebar tavern={tavern} />
          <div className="min-w-0 px-4 py-4 sm:px-6 lg:px-6 lg:py-8 xl:px-8">
            <TavernMobileHeader tavern={tavern} />
            <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_300px]">
              <TavernHeroPanel tavern={tavern} isOwner={isOwner} />
              <TavernRightRail tavern={tavern} />
            </div>
            <section id="tavern-mainline" className="mt-4 scroll-mt-6 lg:mt-6">
              <TavernChatWorkbench
                tavern={tavern}
                roleplay={roleplay}
                currentUserId={currentUserId}
                isOwner={isOwner}
                publicPanel={
                  <div className="space-y-4">
                    <TavernShareCard tavern={tavern} />
                    <VisitorFeedbackCard tavern={tavern} />
                  </div>
                }
              />
            </section>
          </div>
        </div>
        {/* 移动端：保持原有堆叠布局 */}
        <div className="lg:hidden">
          <TavernMobileHeader tavern={tavern} />
          <div className="min-w-0 px-4 py-4 pb-28 sm:px-6">
            <TavernHeroPanel tavern={tavern} isOwner={isOwner} />
            <TavernRightRail tavern={tavern} />
            <section id="tavern-mainline" className="mt-4 scroll-mt-6">
              <TavernChatWorkbench
                tavern={tavern}
                roleplay={roleplay}
                currentUserId={currentUserId}
                isOwner={isOwner}
                publicPanel={
                  <div className="space-y-4">
                    <TavernShareCard tavern={tavern} />
                    <VisitorFeedbackCard tavern={tavern} />
                  </div>
                }
              />
            </section>
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

function TavernShareCard({ tavern }: { tavern: Tavern }) {
  const [copyStatus, setCopyStatus] = useState("")
  const [shareStatus, setShareStatus] = useState("正在同步公开分享信息…")
  const [serverSharePayload, setServerSharePayload] = useState<TavernSharePayload | null>(null)
  const fallbackSharePayload = useMemo(
    () => buildTavernSharePayload(tavern, {
      origin: typeof window !== "undefined" ? window.location.origin : "",
    }),
    [tavern],
  )
  const sharePayload = useMemo(
    () => (serverSharePayload ? buildTavernShareDisplay(serverSharePayload) : fallbackSharePayload),
    [fallbackSharePayload, serverSharePayload],
  )

  useEffect(() => {
    let cancelled = false
    setShareStatus("正在同步公开分享信息…")
    setServerSharePayload(null)

    getTavernShare(tavern.id, DEFAULT_VISITOR_ID)
      .then((payload) => {
        if (cancelled) return
        setServerSharePayload(payload)
        setShareStatus("")
      })
      .catch(() => {
        if (cancelled) return
        setShareStatus("当前先使用本地邀请文案；分享信息稍后再同步。")
      })

    return () => {
      cancelled = true
    }
  }, [tavern.id])

  async function handleCopyShareText() {
    setCopyStatus("")
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        setCopyStatus("当前浏览器不支持自动复制，请手动选中文案复制。")
        return
      }
      await navigator.clipboard.writeText(sharePayload.copyText)
      setCopyStatus("已复制邀请文案。")
    } catch {
      setCopyStatus("当前浏览器不允许自动复制，请手动选中文案复制。")
    }
  }

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-theme-accent-text" />
              邀请链接
            </CardTitle>
            <CardDescription className="mt-2">
              复制这间空间的入口给朋友。邀请文案只整理店主已经公开的内容。
            </CardDescription>
          </div>
          <Button type="button" variant="secondary" onClick={handleCopyShareText}>
            <Copy className="h-4 w-4" />
            复制邀请
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-3xl border border-theme-border bg-theme-card p-4">
          <p className="text-sm font-bold text-theme-primary">{sharePayload.title}</p>
          <p className="mt-2 text-sm leading-6 text-violet-50/70">{sharePayload.summary}</p>
          {sharePayload.characters ? (
            <p className="mt-2 text-sm font-bold text-theme-accent-text">
              <span className="text-theme-muted">NPC：</span>{sharePayload.characters}
            </p>
          ) : null}
          <p className="mt-3 break-all rounded-2xl bg-theme-card px-3 py-2 text-xs text-theme-accent-text">
            {sharePayload.url}
          </p>
        </div>
        <textarea
          readOnly
          value={sharePayload.copyText}
          rows={4}
          className="w-full resize-none rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-sm leading-6 text-violet-50 outline-none focus:border-theme-accent-border"
          aria-label="空间邀请文案"
        />
        {shareStatus ? <p className="rounded-2xl border border-theme-border bg-theme-card p-3 text-sm text-violet-50/64">{shareStatus}</p> : null}
        {copyStatus ? <p className="rounded-2xl border border-theme-accent-border bg-theme-accent-bg p-3 text-sm text-theme-accent-text">{copyStatus}</p> : null}
      </CardContent>
    </Card>
  )
}

function VisitorFeedbackCard({ tavern }: { tavern: Tavern }) {
  const [visitorId, setVisitorId] = useState(DEFAULT_VISITOR_ID)
  const [nickname, setNickname] = useState("旅人")
  const [content, setContent] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  async function handleSubmitNote() {
    setBusy(true)
    setMessage("")
    try {
      await createVisitorNote(tavern.id, { visitor_nickname: nickname, content }, visitorId)
      setContent("")
      setMessage("已发送给店主。你的反馈不会成为公开留言墙。")
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="min-w-0 overflow-hidden border-violet-300/18 bg-violet-300/8">
      <CardHeader>
        <CardTitle>给店主的私密反馈</CardTitle>
        <CardDescription className="mt-2">
          这条反馈只会送到店主那里，不会公开展示。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="text-theme-muted">你的访客标识</span>
            <input value={visitorId} onChange={(event) => setVisitorId(event.target.value)} className="w-full rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border" />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="text-theme-muted">昵称</span>
            <input value={nickname} onChange={(event) => setNickname(event.target.value)} className="w-full rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border" />
          </label>
        </div>
        <label className="space-y-1.5 text-sm">
          <span className="text-theme-muted">反馈内容</span>
          <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={3} maxLength={500} placeholder="告诉店主这次回访的感受，或希望下次看到什么。" className="w-full rounded-2xl border border-theme-border bg-theme-card px-4 py-3 text-theme-primary outline-none focus:border-theme-accent-border" />
        </label>
        <Button type="button" disabled={!content.trim() || busy} className="w-full" onClick={handleSubmitNote}>
          发送给店主
        </Button>
        {message ? <p className="rounded-2xl border border-theme-accent-border bg-theme-accent-bg p-3 text-sm text-theme-accent-text">{message}</p> : null}
      </CardContent>
    </Card>
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
