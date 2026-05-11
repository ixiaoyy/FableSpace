import {
  ArrowRight,
  Brain,
  KeyRound,
  LockKeyhole,
  MapPinned,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react"
import { Link, useLoaderData, useNavigate } from "react-router"
import { useState } from "react"

import discoverRadarSurfaceImage from "../assets/soul-link-05-10/discover-black/main-2x.png"
import lightRadarSurface from "../assets/soul-link-05-10/home-light/scene-sky-city-balcony.png"
import { SoulLinkHomeReference } from "../components/soul-link-reference-artboards"
import { HOMEPAGE_NPC_PREVIEW_PORTRAITS } from "../features/tavern-npc-stage/portraitCatalogConfig"
import { buildHomepageView, type HomepageMetric, type HomepageMetricId } from "../lib/homepage-taverns"
import { errorMessage, listTaverns, type TavernListResponse } from "../lib/taverns"
import { useTheme } from "../hooks/useTheme"
import { Button } from "../ui/button"

type Metric = HomepageMetric & {
  icon: LucideIcon
}

type CitySlicePreview = {
  image: string
  name: string
  location: string
  entryMeta: string
  tags: string[]
  id: string
}

type Feature = {
  icon: LucideIcon
  title: string
  text: string
}

type HomeLoaderData = {
  result: TavernListResponse
  error: string
}

const navItems = [
  { to: "/discover", label: "探索" },
  { to: "/discover", label: "区域" },
  { to: "/discover", label: "角色" },
  { to: "/discover", label: "记忆" },
  { to: "/create", label: "创建空间" },
]

const metricIcons: Record<HomepageMetricId, LucideIcon> = {
  coordinates: MapPinned,
  characters: UsersRound,
  encounters: MessageCircle,
  open: Star,
}

const features: Feature[] = [
  { icon: MapPinned, title: "真实坐标", text: "每个入口都落在现实地图上，而不是漂浮空间。" },
  { icon: Brain, title: "记忆回响", text: "角色和区域会保留回访上下文，让相遇不只是一次性对话。" },
  { icon: ShieldCheck, title: "主人边界", text: "内容、访问和记忆权限由空间主人控制，平台不越权发布。" },
]

const portraits = HOMEPAGE_NPC_PREVIEW_PORTRAITS

function withMetricIcons(metrics: HomepageMetric[]): Metric[] {
  return metrics.map((metric) => ({
    ...metric,
    icon: metricIcons[metric.id],
  }))
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9 rounded-full text-theme-muted hover:text-theme-primary"
      aria-label="切换主题"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}

function HomeNav() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"

  return (
    <header className={`sticky top-0 z-40 border-b ${isDark ? "border-theme-border bg-theme-header" : "border-indigo-100/50 bg-white/70"} backdrop-blur-xl`}>
      <div className="mx-auto flex max-w-[1320px] items-center justify-between px-6 py-4">
        <Link to="/" className="flex touch-manipulation items-center gap-3">
          <span className={`grid h-10 w-10 place-items-center rounded-full border ${isDark ? "border-theme-accent-border bg-theme-accent-bg text-theme-accent-text" : "border-indigo-300 bg-indigo-50 text-indigo-600"} text-sm font-black`}>
            FM
          </span>
          <div className="hidden sm:block">
            <p className={`font-black tracking-wide ${isDark ? "text-theme-primary" : "text-indigo-900"}`}>FableMap</p>
            <p className={`text-[0.65rem] ${isDark ? "text-theme-muted" : "text-indigo-400"}`}>Cyber life on real coordinates</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) => (
            <Link key={item.label} to={item.to} className={`text-sm font-bold transition ${isDark ? "text-theme-muted hover:text-theme-primary" : "text-indigo-900/60 hover:text-indigo-600"}`}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-4 lg:max-w-md lg:justify-normal">
          <div className="relative flex-1">
            <Search className={`absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${isDark ? "text-theme-muted" : "text-indigo-300"}`} />
            <input
              type="text"
              placeholder="搜索附近坐标、角色、记忆线索"
              className={`h-11 w-full rounded-full border ${isDark ? "border-theme-border bg-theme-bg" : "border-indigo-100/50 bg-white/80"} pl-11 pr-4 text-sm outline-none transition focus:border-indigo-400/50`}
            />
            {!isDark && <Sparkles className="absolute right-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-indigo-200" />}
          </div>
          <ThemeToggle />
          <Link to="/tavern-owner-management" className={`hidden text-sm font-black transition sm:block ${isDark ? "text-theme-muted hover:text-theme-primary" : "text-indigo-600 hover:text-indigo-800"}`}>
            管理入口
          </Link>
          <Button asChild size="sm" className="hidden lg:flex">
            <Link to="/discover">开始探索</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

function MetricCard({ value, label, id }: HomepageMetric) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const iconIdx = ["coordinates", "characters", "encounters", "open"].indexOf(id)
  const portrait = HOMEPAGE_NPC_PREVIEW_PORTRAITS[iconIdx] || HOMEPAGE_NPC_PREVIEW_PORTRAITS[0]

  return (
    <div className={`group relative p-3 sm:p-4 ${isDark ? "rounded-2xl border border-theme-border bg-theme-card" : "ornate-card"}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className={`text-xs font-black uppercase tracking-wider ${isDark ? "text-theme-muted" : "text-indigo-400"}`}>
            {label}
          </p>
          <p className={`text-2xl font-black ${isDark ? "text-theme-primary" : "text-indigo-950"}`}>
            {value}
            <span className="ml-1 text-sm font-medium opacity-50">+</span>
          </p>
        </div>
        <div className={`h-12 w-12 overflow-hidden rounded-xl border ${isDark ? "border-theme-border" : "border-indigo-100 shadow-sm"}`}>
          <img src={portrait} alt="" className="h-full w-full object-cover transition group-hover:scale-110" />
        </div>
      </div>
      {!isDark && (
        <>
          <div className="ornate-corner -left-1 -top-1 border-l-2 border-t-2 rounded-tl-lg" />
          <div className="ornate-corner -right-1 -bottom-1 border-r-2 border-b-2 rounded-br-lg" />
        </>
      )}
    </div>
  )
}

function DesktopMetricRail({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="hidden lg:grid lg:grid-cols-2 lg:gap-3">
      {metrics.map(({ icon: Icon, value, label }) => (
        <div key={label} className="rounded-2xl border border-theme-border bg-theme-card p-4 shadow-[0_18px_50px_rgba(0,0,0,0.12)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <Icon className="h-5 w-5 text-theme-accent-text" />
            <span className="h-px flex-1 bg-theme-accent-bg" />
          </div>
          <p className="mt-3 text-2xl font-black text-theme-primary">{value}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-theme-muted">{label}</p>
        </div>
      ))}
    </div>
  )
}

function CitySlicePreviewCard({ image, name, location, entryMeta, tags, id }: CitySlicePreview) {
  return (
    <Link
      to={`/tavern/${id}`}
      className="group ornate-frame touch-manipulation overflow-hidden transition hover:-translate-y-1 hover:border-theme-accent-border"
    >
      <div className="relative h-64 overflow-hidden lg:h-72">
        <img
          src={image}
          alt={`${name} 区域封面`}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-theme-bg via-theme-bg/10 to-transparent" />
        <LockKeyhole className="absolute left-4 top-4 h-4 w-4 text-theme-primary/80" />
        <span className="absolute bottom-4 right-4 rounded-full border border-theme-accent-border bg-theme-accent-bg px-3 py-1 text-xs font-bold text-theme-accent-text backdrop-blur-md">
          {entryMeta}
        </span>
      </div>
      <div className="space-y-3 p-5">
        <div>
          <h3 className="text-xl font-black text-theme-primary">{name}</h3>
          <p className="mt-1 text-sm text-theme-muted">{location}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="rounded-lg border border-theme-border bg-theme-bg px-2.5 py-1 text-xs font-bold text-theme-muted">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  )
}

function FeatureItem({ icon: Icon, title, text }: Feature) {
  return (
    <div className="rounded-2xl border border-theme-border bg-theme-card p-6">
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-theme-accent-border bg-theme-accent-bg text-theme-accent-text">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-5 font-black text-theme-primary">{title}</p>
      <p className="mt-2 text-sm leading-6 text-theme-muted">{text}</p>
    </div>
  )
}

function EmptyCitySliceState({ error }: { error?: string }) {
  return (
    <div className="grid min-h-64 place-items-center rounded-[1.75rem] border border-theme-border bg-theme-card text-center md:col-span-3">
      <div className="max-w-md space-y-3 px-6">
        <MapPinned className="mx-auto h-10 w-10 text-theme-accent-text opacity-65" />
        <p className="font-black text-theme-primary">暂时没有可展示的真实坐标入口</p>
        <p className="text-sm leading-6 text-theme-muted">
          {error ? `空间列表暂不可用：${error}` : "创建第一个公开空间后，这里会自动显示真实入口与对应氛围图。"}
        </p>
        <Button asChild variant="secondary">
          <Link to="/create">创建我的空间</Link>
        </Button>
      </div>
    </div>
  )
}

function HeroPosterPreview() {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  return (
    <div className={`relative min-h-[420px] overflow-hidden rounded-[1.75rem] border ${isDark ? "border-theme-accent-border bg-slate-950 shadow-[0_26px_80px_rgba(0,0,0,0.18)]" : "border-indigo-200 bg-white shadow-[0_20px_50px_rgba(59,130,246,0.08)]"} lg:min-h-[560px]`}>
      <img
        src={isDark ? discoverRadarSurfaceImage : lightRadarSurface}
        alt="FableMap 真实坐标雷达视觉"
        className={`absolute inset-0 h-full w-full object-cover object-center ${isDark ? "" : "opacity-90 contrast-[1.1]"}`}
        decoding="async"
      />
      <div className={`absolute inset-0 ${isDark ? "bg-[radial-gradient(circle_at_53%_51%,rgba(0,229,255,0.16),transparent_16rem),linear-gradient(90deg,rgba(3,5,18,0.82),rgba(3,5,18,0.24)_48%,rgba(3,5,18,0.62))]" : "bg-[radial-gradient(circle_at_53%_51%,rgba(59,130,246,0.1),transparent_20rem),linear-gradient(90deg,rgba(255,255,255,0.9),rgba(255,255,255,0.4)_48%,rgba(255,255,255,0.85))]"}`} />
      <div className={`absolute inset-4 rounded-[1.35rem] border ${isDark ? "border-cyan-200/18 bg-[linear-gradient(90deg,rgba(125,249,255,0.07)_1px,transparent_1px),linear-gradient(0deg,rgba(125,249,255,0.05)_1px,transparent_1px)]" : "border-blue-500/10 bg-[linear-gradient(90deg,rgba(59,130,246,0.04)_1px,transparent_1px),linear-gradient(0deg,rgba(59,130,246,0.03)_1px,transparent_1px)]"} bg-[size:42px_42px]`} />
      <div className={`absolute left-4 top-4 rounded-full border ${isDark ? "border-cyan-300/36 bg-cyan-300/12 text-cyan-100" : "border-blue-300/30 bg-blue-50 text-blue-600"} px-4 py-2 text-xs font-black uppercase tracking-[0.22em] backdrop-blur-md`}>
        Signal detected
      </div>
      <div className={`absolute right-4 top-4 hidden rounded-2xl border ${isDark ? "border-white/14 bg-slate-950/56 text-white" : "border-blue-100 bg-white/80 text-blue-900"} p-3 text-right backdrop-blur-xl sm:block`}>
        <p className={`text-[0.65rem] font-black uppercase tracking-[0.18em] ${isDark ? "text-cyan-100/74" : "text-blue-500/74"}`}>Live radius</p>
        <p className="mt-1 text-lg font-black">2.4 km</p>
      </div>
      <div className="absolute left-8 right-8 top-[5.8rem] hidden items-center gap-3 lg:flex">
        <span className={`h-px flex-1 ${isDark ? "bg-gradient-to-r from-transparent via-cyan-300/35 to-transparent" : "bg-gradient-to-r from-transparent via-blue-400/20 to-transparent"}`} />
        <span className={`rounded-full border ${isDark ? "border-white/12 bg-slate-950/46 text-violet-100/64" : "border-blue-100 bg-white/60 text-blue-500/70"} px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.22em] backdrop-blur-md`}>
          Coordinate grid / Memory field / NPC signal
        </span>
        <span className={`h-px flex-1 ${isDark ? "bg-gradient-to-r from-transparent via-fuchsia-300/28 to-transparent" : "bg-gradient-to-r from-transparent via-indigo-400/15 to-transparent"}`} />
      </div>
      <div className={`absolute left-[22%] top-[34%] h-4 w-4 rounded-full border ${isDark ? "border-cyan-100 bg-cyan-300 shadow-[0_0_32px_rgba(34,211,238,0.95)]" : "border-blue-400 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]"}`} />
      <div className={`absolute right-[25%] top-[42%] h-3 w-3 rounded-full border ${isDark ? "border-fuchsia-100 bg-fuchsia-300 shadow-[0_0_30px_rgba(217,70,239,0.85)]" : "border-indigo-300 bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]"}`} />
      <div className={`absolute bottom-[28%] right-[14%] h-3.5 w-3.5 rounded-full border ${isDark ? "border-cyan-100 bg-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.85)]" : "border-blue-400 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]"}`} />
      <div className={`absolute bottom-5 left-5 max-w-md rounded-3xl border ${isDark ? "border-white/14 bg-slate-950/62" : "border-blue-100 bg-white/90"} p-4 backdrop-blur-xl sm:p-5`}>
        <p className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? "text-cyan-100/80" : "text-blue-600/80"}`}>35.6987, 139.7713 · 23:47</p>
        <p className={`mt-3 text-sm leading-6 ${isDark ? "text-violet-100/82" : "text-blue-900/70"}`}>不是普通地图标记。坐标、角色和记忆同时亮起，等待你进入。</p>
      </div>
      <div className={`absolute right-5 top-28 hidden w-44 rounded-3xl border ${isDark ? "border-cyan-300/18 bg-slate-950/50" : "border-blue-100 bg-white/70"} p-4 backdrop-blur-xl lg:block`}>
        <p className={`text-[0.65rem] font-black uppercase tracking-[0.2em] ${isDark ? "text-cyan-100/64" : "text-blue-500/64"}`}>Active layers</p>
        <div className={`mt-3 space-y-2 text-xs font-bold ${isDark ? "text-violet-100/68" : "text-blue-900/50"}`}>
          <p className="flex items-center justify-between"><span>坐标入口</span><span className={`${isDark ? "text-cyan-100" : "text-blue-600"}`}>ON</span></p>
          <p className="flex items-center justify-between"><span>角色信号</span><span className={`${isDark ? "text-fuchsia-100" : "text-indigo-600"}`}>356</span></p>
          <p className="flex items-center justify-between"><span>记忆回响</span><span className={`${isDark ? "text-cyan-100" : "text-blue-600"}`}>LIVE</span></p>
        </div>
      </div>
      <div className={`absolute bottom-5 right-5 hidden rounded-full border ${isDark ? "border-fuchsia-300/28 bg-fuchsia-300/12 text-fuchsia-100" : "border-blue-300/30 bg-blue-50 text-blue-600"} px-4 py-2 text-xs font-black backdrop-blur-md md:block`}>
        EXPLORE / REAL COORDINATE
      </div>
    </div>
  )
}

export async function clientLoader(): Promise<HomeLoaderData> {
  try {
    return { result: await listTaverns(), error: "" }
  } catch (error) {
    return { result: { taverns: [], count: 0 }, error: errorMessage(error) }
  }
}

export default function HomeRoute() {
  const { result, error } = useLoaderData<typeof clientLoader>()
  const homepage = buildHomepageView(result, error)
  const metrics = withMetricIcons(homepage.metrics)
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [homeSearch, setHomeSearch] = useState("")
  const isDark = theme === "dark"
  const worldPulseItems = homepage.featuredCitySlices.slice(0, 4).map((slice, index) => ({
    id: slice.id,
    title: slice.name,
    subtitle: slice.tags[index % Math.max(1, slice.tags.length)] || slice.location || "新的坐标记忆正在浮现",
    meta: `${index * 3 + 2} 分钟前`,
    image: slice.image,
    to: `/tavern/${encodeURIComponent(slice.id)}`,
  }))
  const recentMemories = homepage.featuredCitySlices.slice(0, 3).map((slice, index) => ({
    id: `recent-memory-${slice.id}`,
    title: `“${index === 0 ? "在这里，我第一次不再害怕黑夜。" : "谢谢你，陪我等到了黎明。"}”`,
    source: `来自 ${slice.name}`,
    meta: `${index * 3 + 2} 小时前`,
    image: slice.image,
    to: `/tavern/${encodeURIComponent(slice.id)}`,
  }))
  const guideCards = [
    { id: "starter", title: "新手指南", text: "如何开始你的旅程", to: "/quests", accent: "violet" as const },
    { id: "worldbook", title: "坐标百科", text: "了解这个世界的规则", to: "/discover", accent: "blue" as const },
    { id: "safety", title: "安全指引", text: "让探索更安心", to: "/create", accent: "rose" as const },
  ]
  const metricValue = (id: HomepageMetricId, fallback = "0") => homepage.metrics.find((metric) => metric.id === id)?.value || fallback
  const worldStats = [
    { id: "coordinates", label: "新增坐标", value: metricValue("coordinates") },
    { id: "characters", label: "在线灵魂", value: metricValue("characters") },
    { id: "encounters", label: "回响记录", value: metricValue("encounters") },
    { id: "open", label: "探索次数", value: metricValue("open") },
  ]
  const dailyQuote = {
    title: "每日一句",
    quote: "世界很大，而我们在某个坐标相遇。",
  }
  const onlineEntities = result.taverns
    .flatMap((tavern, tavernIndex) =>
      (Array.isArray(tavern.characters) ? tavern.characters : []).slice(0, 1).map((character, characterIndex) => ({
        id: `${tavern.id}-${character.id || characterIndex}`,
        name: character.name || `灵魂 ${tavernIndex + 1}`,
        location: `在 ${tavern.name || "某个坐标"}`,
        status: tavernIndex < 2 ? "在线" : `${tavernIndex * 5 + 5} 分钟前`,
        avatar: character.avatar || portraits[(tavernIndex + characterIndex) % portraits.length],
        to: `/tavern/${encodeURIComponent(tavern.id)}`,
      })),
    )
    .slice(0, 4)

  function submitHomeSearch() {
    const query = homeSearch.trim()
    navigate(query ? `/discover?search=${encodeURIComponent(query)}` : "/discover")
  }

  const referenceProps = {
    featuredCitySlices: homepage.featuredCitySlices,
    worldPulseItems,
    dailyQuote,
    onlineEntities,
    recentMemories,
    guideCards,
    worldStats,
    search: homeSearch,
    onSearchChange: setHomeSearch,
    onSearchSubmit: submitHomeSearch,
    onToggleTheme: toggleTheme,
  }

  if (isDark) {
    return <SoulLinkHomeReference variant="black" {...referenceProps} />
  }

  return <SoulLinkHomeReference variant="light" {...referenceProps} />
}
