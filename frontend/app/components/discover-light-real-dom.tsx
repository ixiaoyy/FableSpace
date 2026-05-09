import {
  ArrowRight,
  Bookmark,
  BookOpenText,
  ChevronDown,
  ChevronRight,
  Compass,
  Home,
  Mail,
  MapPin,
  PlusCircle,
  Search,
  Settings,
  SlidersHorizontal,
  UsersRound,
  X,
} from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router"

import discoverLightSliceNavBar from "../assets/discover/light/slices/discover-light-slice-01a-nav-bar.png"
import discoverLightSliceNavBar2x from "../assets/discover/light/slices/discover-light-slice-01a-nav-bar-2x.png"
import discoverLightActivityWaveImage from "../assets/discover/light/elements/discover-light-activity-wave.png"
import discoverLightActivityWaveImage2x from "../assets/discover/light/elements/discover-light-activity-wave-2x.png"
import discoverLightBottomCityImage from "../assets/discover/light/elements/discover-light-bottom-city.png"
import discoverLightBottomCityImage2x from "../assets/discover/light/elements/discover-light-bottom-city-2x.png"
import discoverLightCard01Cover from "../assets/discover/light/elements/discover-light-card-01-cover.png"
import discoverLightCard01Cover2x from "../assets/discover/light/elements/discover-light-card-01-cover-2x.png"
import discoverLightCard02Cover from "../assets/discover/light/elements/discover-light-card-02-cover.png"
import discoverLightCard02Cover2x from "../assets/discover/light/elements/discover-light-card-02-cover-2x.png"
import discoverLightCard03Cover from "../assets/discover/light/elements/discover-light-card-03-cover.png"
import discoverLightCard03Cover2x from "../assets/discover/light/elements/discover-light-card-03-cover-2x.png"
import discoverLightCard04Cover from "../assets/discover/light/elements/discover-light-card-04-cover.png"
import discoverLightCard04Cover2x from "../assets/discover/light/elements/discover-light-card-04-cover-2x.png"
import discoverLightCard05Cover from "../assets/discover/light/elements/discover-light-card-05-cover.png"
import discoverLightCard05Cover2x from "../assets/discover/light/elements/discover-light-card-05-cover-2x.png"
import discoverLightCard06Cover from "../assets/discover/light/elements/discover-light-card-06-cover.png"
import discoverLightCard06Cover2x from "../assets/discover/light/elements/discover-light-card-06-cover-2x.png"
import discoverLightCard07Cover from "../assets/discover/light/elements/discover-light-card-07-cover.png"
import discoverLightCard07Cover2x from "../assets/discover/light/elements/discover-light-card-07-cover-2x.png"
import discoverLightCard08Cover from "../assets/discover/light/elements/discover-light-card-08-cover.png"
import discoverLightCard08Cover2x from "../assets/discover/light/elements/discover-light-card-08-cover-2x.png"
import discoverLightRightThumb01 from "../assets/discover/light/elements/discover-light-right-thumb-01.png"
import discoverLightRightThumb012x from "../assets/discover/light/elements/discover-light-right-thumb-01-2x.png"
import discoverLightRightThumb02 from "../assets/discover/light/elements/discover-light-right-thumb-02.png"
import discoverLightRightThumb022x from "../assets/discover/light/elements/discover-light-right-thumb-02-2x.png"
import discoverLightRightThumb03 from "../assets/discover/light/elements/discover-light-right-thumb-03.png"
import discoverLightRightThumb032x from "../assets/discover/light/elements/discover-light-right-thumb-03-2x.png"
import discoverLightRightThumb04 from "../assets/discover/light/elements/discover-light-right-thumb-04.png"
import discoverLightRightThumb042x from "../assets/discover/light/elements/discover-light-right-thumb-04-2x.png"
import discoverLightRightThumb05 from "../assets/discover/light/elements/discover-light-right-thumb-05.png"
import discoverLightRightThumb052x from "../assets/discover/light/elements/discover-light-right-thumb-05-2x.png"
import discoverLightSidebarOrbImage from "../assets/discover/light/elements/discover-light-sidebar-orb.png"
import discoverLightSidebarOrbImage2x from "../assets/discover/light/elements/discover-light-sidebar-orb-2x.png"
import discoverLightSidebarRadarImage from "../assets/discover/light/elements/discover-light-sidebar-radar.png"
import discoverLightSidebarRadarImage2x from "../assets/discover/light/elements/discover-light-sidebar-radar-2x.png"
import type { Tavern } from "../lib/taverns"
import { DISCOVER_REFERENCE_ARTBOARD, DISCOVER_REFERENCE_SECTIONS, discoverLocalStyle, discoverSectionStyle, type DiscoverReferenceSection as DiscoverLightPageSection, type DiscoverReferenceSectionId as DiscoverLightSectionId } from "./discover-reference-layout"
import { LightReferenceTopNav } from "./light-reference-top-nav"

type DiscoverLightProps = {
  search: string
  taverns: Tavern[]
  onSearchChange: (value: string) => void
  onClear: () => void
  onTogglePlaceType: (placeTypeId: string) => void
  onToggleSpecialType: (specialTypeId: string) => void
  onToggleCategory: (label: string) => void
  onPublicOnlyChange: (value: boolean) => void
  onOpenOnlyChange: (value: boolean) => void
  onToggleTheme: () => void
}

type LightDiscoverCard = {
  id: string
  name: string
  description: string
  coordinate: string
  distance: string
  npcCount: number
  image: string
  image2x: string
  tags: string[]
  badge: string
  to: string
  tone: "blue" | "violet" | "pink" | "amber"
}

type LightDiscoverStat = {
  label: string
  value: string
  helper: string
  tone: "blue" | "violet" | "pink" | "green"
}

type DiscoverLightReferenceImage = {
  src: string
  src2x: string
}

type LightRecommendation = {
  label: string
  tag: string
  distance: string
  image: string
  image2x: string
  to: string
}

const ARTBOARD_WIDTH = DISCOVER_REFERENCE_ARTBOARD.width
const ARTBOARD_HEIGHT = DISCOVER_REFERENCE_ARTBOARD.height
const NAV_HEIGHT = DISCOVER_REFERENCE_ARTBOARD.navHeight
const BODY_HEIGHT = ARTBOARD_HEIGHT - NAV_HEIGHT
const BODY_SECTION_COUNT = 5
const TOTAL_SECTION_COUNT = 1 + BODY_SECTION_COUNT
const TOTAL_RUNTIME_SLICE_COUNT = 1

const navBacking = {
  id: "01a-nav-bar",
  label: "FableMap 明亮主题搜索页顶部导航栏",
  src: discoverLightSliceNavBar,
  src2x: discoverLightSliceNavBar2x,
  width: ARTBOARD_WIDTH,
  height: NAV_HEIGHT,
} as const

const sections: DiscoverLightPageSection[] = DISCOVER_REFERENCE_SECTIONS

const referenceCardImages: DiscoverLightReferenceImage[] = [
  { src: discoverLightCard01Cover, src2x: discoverLightCard01Cover2x },
  { src: discoverLightCard02Cover, src2x: discoverLightCard02Cover2x },
  { src: discoverLightCard03Cover, src2x: discoverLightCard03Cover2x },
  { src: discoverLightCard04Cover, src2x: discoverLightCard04Cover2x },
  { src: discoverLightCard05Cover, src2x: discoverLightCard05Cover2x },
  { src: discoverLightCard06Cover, src2x: discoverLightCard06Cover2x },
  { src: discoverLightCard07Cover, src2x: discoverLightCard07Cover2x },
  { src: discoverLightCard08Cover, src2x: discoverLightCard08Cover2x },
] as const

const referenceCards = [
  {
    name: "雨巷书店",
    description: "雨后的巷口酒馆，故事在微醺时分开始。",
    badge: "人气",
    tags: ["深夜", "适合对话", "治愈"],
    coordinate: "25.047, 121.517",
    distance: "142 m",
    npcCount: 8,
    tone: "violet",
  },
  {
    name: "镜海码头",
    description: "潮汐与雾气交织，远航者的第一站。",
    badge: "",
    tags: ["治愈", "安静", "幻想"],
    coordinate: "25.058, 121.536",
    distance: "213 m",
    npcCount: 6,
    tone: "blue",
  },
  {
    name: "霓虹花房",
    description: "被光照亮的花房，保存着温柔的记忆。",
    badge: "新",
    tags: ["治愈", "幻想", "适合对话"],
    coordinate: "25.033, 121.564",
    distance: "318 m",
    npcCount: 7,
    tone: "pink",
  },
  {
    name: "月亮不眠电台",
    description: "在月亮低垂的夜晚，听见被收藏的心事。",
    badge: "",
    tags: ["深夜", "安静", "适合对话"],
    coordinate: "25.065, 121.548",
    distance: "411 m",
    npcCount: 5,
    tone: "blue",
  },
  {
    name: "小灯塔问路铺",
    description: "迷路时来这里，灯塔会给你方向。",
    badge: "指引",
    tags: ["治愈", "安静", "适合新手"],
    coordinate: "25.045, 121.502",
    distance: "128 m",
    npcCount: 4,
    tone: "blue",
  },
  {
    name: "黑锋数据站",
    description: "沉睡的数据里，藏着被遗忘的真相。",
    badge: "神秘",
    tags: ["神秘", "幻想", "深夜"],
    coordinate: "25.060, 121.523",
    distance: "356 m",
    npcCount: 9,
    tone: "violet",
  },
  {
    name: "星图观测台",
    description: "抬头看星，低语会被宇宙听见。",
    badge: "",
    tags: ["安静", "幻想", "治愈"],
    coordinate: "25.041, 121.561",
    distance: "289 m",
    npcCount: 6,
    tone: "violet",
  },
  {
    name: "记忆收纳馆",
    description: "收纳你遗落的记忆，等你再次相遇。",
    badge: "热门",
    tags: ["治愈", "适合对话", "幻想"],
    coordinate: "25.052, 121.534",
    distance: "176 m",
    npcCount: 7,
    tone: "pink",
  },
] satisfies Array<{
  name: string
  description: string
  badge: string
  tags: string[]
  coordinate: string
  distance: string
  npcCount: number
  tone: LightDiscoverCard["tone"]
}>

const referenceRecommendations = [
  { label: "雨巷书店", tag: "安静", distance: "186 m", image: discoverLightRightThumb01, image2x: discoverLightRightThumb012x },
  { label: "地下音乐厅", tag: "深夜", distance: "233 m", image: discoverLightRightThumb02, image2x: discoverLightRightThumb022x },
  { label: "云端茶室", tag: "治愈", distance: "297 m", image: discoverLightRightThumb03, image2x: discoverLightRightThumb032x },
  { label: "时光照相馆", tag: "幻想", distance: "346 m", image: discoverLightRightThumb04, image2x: discoverLightRightThumb042x },
  { label: "遗失物中转站", tag: "神秘", distance: "402 m", image: discoverLightRightThumb05, image2x: discoverLightRightThumb052x },
] as const

const referenceStats: LightDiscoverStat[] = [
  { label: "附近地点", value: "36 个", helper: "半径 1 公里范围", tone: "violet" },
  { label: "活跃 NPC", value: "82 位", helper: "正在与你共鸣", tone: "blue" },
  { label: "新记忆", value: "12 条", helper: "过去 24 小时", tone: "pink" },
  { label: "热门故事片段", value: "8 个", helper: "本周最受欢迎", tone: "pink" },
  { label: "信号强度", value: "85%", helper: "当前区域稳定", tone: "green" },
]

const cardLabels = ["进入第一张地点卡", "进入第二张地点卡", "进入第三张地点卡", "进入第四张地点卡", "进入第五张地点卡", "进入第六张地点卡", "进入第七张地点卡", "进入第八张地点卡"] as const
const cardPositions = [
  { left: 31, top: 2 },
  { left: 268, top: 2 },
  { left: 504, top: 2 },
  { left: 739, top: 2 },
  { left: 31, top: 353 },
  { left: 268, top: 353 },
  { left: 504, top: 353 },
  { left: 739, top: 353 },
] as const

function sectionById(id: DiscoverLightSectionId) {
  const section = sections.find((candidate) => candidate.id === id)
  if (!section) throw new Error(`Unknown discover light section: ${id}`)
  return section
}

function sectionStyle(section: DiscoverLightPageSection) {
  return discoverSectionStyle(section, BODY_HEIGHT)
}

function localStyle(section: DiscoverLightPageSection, left: number, top: number, width: number, height: number) {
  return discoverLocalStyle(section, left, top, width, height)
}

function initialFor(value = "?") {
  return value.trim().slice(0, 1).toUpperCase() || "?"
}

function buildCards(taverns: Tavern[]): LightDiscoverCard[] {
  return referenceCards.map((referenceCard, index) => {
    const tavern = taverns[index]
    const image = referenceCardImages[index]
    return {
      id: tavern?.id || `fallback-${index}`,
      name: referenceCard.name,
      description: referenceCard.description,
      coordinate: referenceCard.coordinate,
      distance: referenceCard.distance,
      npcCount: referenceCard.npcCount,
      image: image.src,
      image2x: image.src2x,
      tags: referenceCard.tags,
      badge: referenceCard.badge,
      to: tavern?.id ? `/tavern/${tavern.id}` : "/discover",
      tone: referenceCard.tone,
    }
  })
}

function tagClass(tone: LightDiscoverCard["tone"]) {
  if (tone === "amber") return "bg-amber-100 text-amber-600"
  if (tone === "violet") return "bg-violet-100 text-violet-600"
  if (tone === "pink") return "bg-pink-100 text-pink-600"
  return "bg-sky-100 text-sky-600"
}

function buttonToneClass(tone: LightDiscoverCard["tone"]) {
  if (tone === "pink") return "border-pink-200 text-pink-600"
  if (tone === "violet") return "border-violet-200 text-violet-600"
  if (tone === "amber") return "border-amber-200 text-amber-600"
  return "border-sky-200 text-sky-600"
}

function statToneClass(tone: LightDiscoverStat["tone"]) {
  if (tone === "violet") return "border-violet-200 bg-violet-100 text-violet-600"
  if (tone === "pink") return "border-pink-200 bg-pink-100 text-pink-600"
  if (tone === "green") return "border-emerald-200 bg-emerald-100 text-emerald-600"
  return "border-sky-200 bg-sky-100 text-sky-600"
}

function SectionShell({ section, children }: { section: DiscoverLightPageSection; children: ReactNode }) {
  return (
    <section
      data-discover-light-section={section.id}
      data-discover-light-section-boundary="real-page-section"
      data-discover-light-section-dom="real-dom-replacement"
      className="absolute overflow-hidden"
      style={sectionStyle(section)}
      aria-label={section.label}
    >
      {children}
    </section>
  )
}

function Sidebar() {
  const section = sectionById("sidebar")
  const items = [
    { label: "侧边栏发现", text: "发现", to: "/discover", icon: Compass, top: 158, active: true, badge: "" },
    { label: "我的地点", text: "我的地点", to: "/home-me", icon: MapPin, top: 234, active: false, badge: "" },
    { label: "消息", text: "消息", to: "/home-me", icon: Mail, top: 296, active: false, badge: "3" },
    { label: "书签", text: "书签", to: "/home-me", icon: Bookmark, top: 359, active: false, badge: "" },
    { label: "日志", text: "日志", to: "/home-me", icon: BookOpenText, top: 421, active: false, badge: "" },
    { label: "创建", text: "创建", to: "/create", icon: PlusCircle, top: 482, active: false, badge: "" },
  ] as const
  return (
    <SectionShell section={section}>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#f7fbff_0%,#edf6ff_52%,#f7fbff_100%)]" />
      <img
        src={discoverLightSidebarOrbImage}
        srcSet={`${discoverLightSidebarOrbImage} 1x, ${discoverLightSidebarOrbImage2x} 2x`}
        alt=""
        aria-hidden="true"
        className="absolute select-none"
        style={localStyle(section, 38, 34, 94, 96)}
        decoding="async"
        draggable={false}
      />
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.label}
            data-discover-light-hotspot={item.label}
            data-discover-light-section-hotspot="sidebar"
            to={item.to}
            aria-label={item.label}
            className={`absolute flex items-center gap-4 rounded-2xl px-5 text-[clamp(7px,0.9vw,13px)] font-black transition ${item.active ? "bg-violet-100/86 text-violet-600 shadow-[0_10px_30px_rgba(124,103,255,0.14)]" : "text-slate-500 hover:bg-white/70 hover:text-violet-600"}`}
            style={localStyle(section, 21, item.top, 132, 53)}
          >
            <Icon className="h-[clamp(10px,1.1vw,18px)] w-[clamp(10px,1.1vw,18px)]" strokeWidth={2.25} />
            <span>{item.text}</span>
            {item.badge ? <span className="ml-auto grid h-5 w-5 place-items-center rounded-full bg-violet-500 text-[10px] text-white">{item.badge}</span> : null}
          </Link>
        )
      })}
      <div className="absolute bottom-[20%] left-[20%] right-[8%] h-px bg-slate-200" />
      <div className="absolute bottom-[17%] left-[20%] text-[clamp(6px,0.72vw,10px)] font-black uppercase tracking-[0.14em] text-violet-300">Location</div>
      <div className="absolute bottom-[14%] left-[20%] flex items-center gap-2 text-[clamp(7px,0.84vw,12px)] font-bold text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />自动定位中</div>
      <img
        src={discoverLightSidebarRadarImage}
        srcSet={`${discoverLightSidebarRadarImage} 1x, ${discoverLightSidebarRadarImage2x} 2x`}
        alt=""
        aria-hidden="true"
        className="absolute select-none"
        style={localStyle(section, 67, 654, 97, 102)}
        decoding="async"
        draggable={false}
      />
      <Link data-discover-light-hotspot="侧边栏设置" data-discover-light-section-hotspot="sidebar" to="/home-me" aria-label="侧边栏设置" className="absolute grid place-items-center rounded-full border border-[#dfe8fb] bg-white/84 text-[#7383a8] shadow-[0_8px_20px_rgba(63,91,169,0.08)] transition hover:text-violet-600" style={localStyle(section, 40, 932, 36, 36)}>
        <Settings className="h-[clamp(10px,1.1vw,16px)] w-[clamp(10px,1.1vw,16px)]" />
      </Link>
      <Link data-discover-light-hotspot="侧边栏主页" data-discover-light-section-hotspot="sidebar" to="/" aria-label="侧边栏主页" className="absolute grid place-items-center rounded-full border border-[#dfe8fb] bg-white/84 text-[#7383a8] shadow-[0_8px_20px_rgba(63,91,169,0.08)] transition hover:text-violet-600" style={localStyle(section, 104, 932, 36, 36)}>
        <Home className="h-[clamp(10px,1.1vw,16px)] w-[clamp(10px,1.1vw,16px)]" />
      </Link>
    </SectionShell>
  )
}

function SearchSection({ search, onSearchChange, onClear, onTogglePlaceType, onToggleSpecialType, onToggleCategory, onPublicOnlyChange, onOpenOnlyChange }: DiscoverLightProps) {
  const section = sectionById("main-search")
  const filters = [
    { label: "全部筛选", text: "全部", prefix: "", suffix: true, onClick: onClear, width: 76, active: true },
    { label: "附近筛选", text: "附近", prefix: "⌖", suffix: false, onClick: () => onPublicOnlyChange(true), width: 76, active: false },
    { label: "热门筛选", text: "热门", prefix: "♨", suffix: false, onClick: () => onOpenOnlyChange(true), width: 76, active: false },
    { label: "最新筛选", text: "最新", prefix: "▥", suffix: false, onClick: onClear, width: 76, active: false },
    { label: "深夜筛选", text: "深夜", prefix: "✦", suffix: false, onClick: () => onTogglePlaceType("convenience-store"), width: 76, active: false },
    { label: "治愈筛选", text: "治愈", prefix: "♢", suffix: false, onClick: () => onTogglePlaceType("hospital"), width: 76, active: false },
    { label: "神秘筛选", text: "神秘", prefix: "♙", suffix: false, onClick: () => onToggleSpecialType("digital-human-studio"), width: 76, active: false },
    { label: "幻想筛选", text: "幻想", prefix: "◎", suffix: false, onClick: () => onToggleSpecialType("cultivation-retreat"), width: 76, active: false },
    { label: "安静筛选", text: "安静", prefix: "▣", suffix: false, onClick: () => onTogglePlaceType("bookstore"), width: 76, active: false },
    { label: "适合对话筛选", text: "适合对话", prefix: "▤", suffix: false, onClick: () => onToggleCategory("陪伴树洞"), width: 92, active: false },
  ] as const
  return (
    <SectionShell section={section}>
      <label data-discover-light-search="real-input" data-discover-light-section-hotspot="main-search" className="absolute z-30 flex items-center gap-3 rounded-full border border-[#d9e2f4]/90 bg-white/92 px-5 text-[#253a79] shadow-[0_12px_32px_rgba(84,105,170,0.12)]" style={localStyle(section, 31, 27, 920, 46)}>
        <Search aria-hidden="true" className="h-[clamp(10px,1.2vw,18px)] w-[clamp(10px,1.2vw,18px)] shrink-0 text-[#6075aa]" strokeWidth={2.4} />
        <span className="sr-only">搜索地点、氛围、故事、角色或记忆线索</span>
        <input value={search} onChange={(event) => onSearchChange(event.target.value)} className="h-full min-w-0 flex-1 bg-transparent text-[clamp(7px,1.05vw,15px)] font-semibold text-[#263a75] outline-none placeholder:text-[#a5afca]" placeholder="搜索地点、氛围、故事、角色或记忆线索..." />
        <button data-discover-light-hotspot="搜索筛选设置" data-discover-light-section-hotspot="main-search" type="button" onClick={search ? onClear : undefined} className="grid h-8 w-8 place-items-center rounded-full border border-[#e5ecfb] bg-white text-[#6677aa] transition hover:bg-[#eef3ff] hover:text-violet-600" aria-label={search ? "清空搜索" : "打开搜索筛选设置"}>
          {search ? <X className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
        </button>
      </label>
      <div className="absolute flex items-center gap-[1.75%]" style={localStyle(section, 31, 89, 910, 34)}>
        {filters.map((filter) => (
          <button key={filter.label} data-discover-light-hotspot={filter.label} data-discover-light-section-hotspot="main-search" type="button" onClick={filter.onClick} aria-label={filter.label} className={`inline-flex h-full items-center justify-center gap-1.5 rounded-full border px-3 text-[clamp(6px,0.83vw,12px)] font-extrabold shadow-[0_4px_12px_rgba(74,105,173,0.06)] transition ${filter.active ? "border-violet-300 bg-violet-50 text-violet-600" : "border-[#dce7fb] bg-white/80 text-[#6877a7] hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600"}`} style={{ width: `${filter.width}px` }}>
            {filter.prefix ? <span className="text-[0.92em] text-sky-400">{filter.prefix}</span> : null}
            <span>{filter.text}</span>
            {filter.suffix ? <ChevronDown className="h-3 w-3" /> : null}
          </button>
        ))}
        <button data-discover-light-hotspot="更多筛选" data-discover-light-section-hotspot="main-search" type="button" onClick={onClear} aria-label="更多筛选" className="grid h-full w-[34px] place-items-center rounded-full border border-[#dce7fb] bg-white/80 text-[#6877a7] shadow-[0_4px_12px_rgba(74,105,173,0.06)] transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </SectionShell>
  )
}

function CardGrid({ cards }: { cards: LightDiscoverCard[] }) {
  const section = sectionById("main-card-grid")
  return (
    <SectionShell section={section}>
      {cards.map((card, index) => {
        const position = cardPositions[index]
        return (
          <Link key={`${card.id}-${index}`} data-discover-light-hotspot={cardLabels[index]} data-discover-light-section-hotspot="main-card-grid" to={card.to} aria-label={cardLabels[index]} className="absolute block overflow-hidden rounded-[1.15rem] border border-[#dce6fb] bg-white/92 text-[#24376d] shadow-[0_12px_30px_rgba(63,91,169,0.10)] transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(63,91,169,0.16)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300/60" style={localStyle(section, position.left, position.top, 222, 335)}>
            <div className="relative overflow-hidden rounded-t-[1.05rem] bg-slate-100" style={{ height: "53.73%" }}>
              <img
                src={card.image}
                srcSet={`${card.image} 1x, ${card.image2x} 2x`}
                alt=""
                aria-hidden="true"
                className="h-full w-full object-cover"
                width={222}
                height={180}
                decoding="async"
                draggable={false}
              />
            </div>
            <div className="space-y-2 px-4 py-3">
              <div className="flex items-center gap-2"><h3 className="truncate text-[clamp(8px,1vw,15px)] font-black text-[#26346f]">{card.name}</h3>{card.badge ? <span className={`${tagClass(card.tone)} rounded-md px-2 py-0.5 text-[clamp(5px,0.67vw,10px)] font-black`}>{card.badge}</span> : null}</div>
              <p className="line-clamp-2 min-h-[2.35em] text-[clamp(6px,0.78vw,11px)] font-semibold leading-[1.18] text-[#7280a5]">{card.description}</p>
              <div className="flex flex-wrap gap-1.5">{card.tags.slice(0, 3).map((tag) => <span key={tag} className={`${tagClass(card.tone)} rounded-md px-2 py-1 text-[clamp(5px,0.66vw,10px)] font-black`}>{tag}</span>)}</div>
              <div className="flex items-center justify-between text-[clamp(5px,0.67vw,10px)] font-bold text-[#8290b0]"><span>⌖ {card.distance}</span><span>⌖ {card.npcCount} 名 NPC</span></div>
              <span className={`mt-1 flex h-[clamp(18px,2.1vw,34px)] items-center justify-center gap-2 rounded-lg border bg-white text-[clamp(6px,0.82vw,12px)] font-black ${buttonToneClass(card.tone)}`}>进入 <ArrowRight className="h-[clamp(8px,0.9vw,14px)] w-[clamp(8px,0.9vw,14px)]" /></span>
            </div>
          </Link>
        )
      })}
    </SectionShell>
  )
}

function RightRail({ cards }: { cards: LightDiscoverCard[] }) {
  const section = sectionById("right-rail")
  const recommendations: LightRecommendation[] = referenceRecommendations.map((recommendation, index) => ({
    ...recommendation,
    to: cards[index]?.to || "/discover",
  }))
  return (
    <SectionShell section={section}>
      <div className="absolute rounded-[1.35rem] border border-[#dde7fb] bg-white/80 shadow-[0_14px_34px_rgba(63,91,169,0.08)]" style={localStyle(section, 6, 23, 250, 475)}>
        <h2 className="px-5 pt-5 text-[clamp(8px,1vw,15px)] font-black text-[#26346f]">✣ 为你推荐</h2>
        <div className="mt-4 space-y-3 px-4">
          {recommendations.map((recommendation) => {
            return (
              <Link key={recommendation.label} data-discover-light-hotspot={`推荐${recommendation.label}`} data-discover-light-section-hotspot="right-rail" to={recommendation.to} aria-label={`推荐${recommendation.label}`} className="flex min-h-[56px] items-center gap-3 rounded-2xl p-2 transition hover:bg-sky-50">
                <img
                  src={recommendation.image}
                  srcSet={`${recommendation.image} 1x, ${recommendation.image2x} 2x`}
                  alt=""
                  className="h-[clamp(34px,4.2vw,58px)] w-[clamp(42px,5vw,76px)] rounded-lg object-cover"
                  decoding="async"
                  draggable={false}
                />
                <span className="min-w-0 flex-1"><span className="block truncate text-[clamp(7px,0.9vw,13px)] font-black text-[#2a386e]">{recommendation.label}</span><span className="mt-1 inline-flex rounded-md bg-sky-100 px-2 py-0.5 text-[clamp(5px,0.65vw,10px)] font-black text-sky-500">{recommendation.tag}</span></span>
                <span className="text-[clamp(5px,0.65vw,10px)] font-bold text-[#8a97b8]">⌖ {recommendation.distance}</span>
              </Link>
            )
          })}
        </div>
        <Link data-discover-light-hotspot="查看更多推荐" data-discover-light-section-hotspot="right-rail" to="/discover" aria-label="查看更多推荐" className="mx-4 mt-3 flex h-10 items-center justify-center gap-2 rounded-xl border border-[#dce6fb] text-[clamp(6px,0.82vw,12px)] font-black text-[#7b86a7]">查看更多推荐 <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
      <div className="absolute rounded-[1.35rem] border border-[#dde7fb] bg-white/80 p-5 shadow-[0_14px_34px_rgba(63,91,169,0.08)]" style={localStyle(section, 6, 511, 250, 128)}>
        <h2 className="text-[clamp(8px,1vw,15px)] font-black text-[#26346f]">✣ 正在活跃的氛围</h2>
        <img src={discoverLightActivityWaveImage} srcSet={`${discoverLightActivityWaveImage} 1x, ${discoverLightActivityWaveImage2x} 2x`} alt="" aria-hidden="true" className="mt-4 h-8 w-full object-contain" decoding="async" draggable={false} />
        <div className="mt-3 flex -space-x-2">{cards.slice(0, 6).map((card) => <span key={card.id} className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-[linear-gradient(135deg,#fff,#b8d7ff,#ffc2df)] text-[10px] font-black text-violet-600">{initialFor(card.name)}</span>)}<span className="grid h-7 w-9 place-items-center rounded-full border-2 border-white bg-violet-100 text-[10px] font-black text-violet-500">+28</span></div>
      </div>
      <div className="absolute rounded-[1.35rem] border border-[#dde7fb] bg-white/80 p-5 shadow-[0_14px_34px_rgba(63,91,169,0.08)]" style={localStyle(section, 6, 662, 250, 160)}>
        <h2 className="text-[clamp(8px,1vw,15px)] font-black text-[#26346f]">▧ 今日信号</h2>
        <div className="mt-4 space-y-3 text-[clamp(6px,0.76vw,11px)] font-bold text-[#7885a6]"><p className="flex justify-between"><span>附近出现 3 处新记忆片段</span><span>12 分钟前</span></p><p className="flex justify-between"><span>夜幕酒馆有新故事更新</span><span>26 分钟前</span></p><p className="flex justify-between"><span>霓虹花房信号强度提升</span><span>1 小时前</span></p></div>
        <Link data-discover-light-hotspot="查看全部动态" data-discover-light-section-hotspot="right-rail" to="/home-me" aria-label="查看全部动态" className="mt-4 flex h-9 items-center justify-center gap-2 rounded-xl border border-[#dce6fb] text-[clamp(6px,0.82vw,12px)] font-black text-[#7b86a7]">查看全部动态 <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
    </SectionShell>
  )
}

function BottomBand({ stats }: { stats: LightDiscoverStat[] }) {
  const section = sectionById("bottom-band")
  return (
    <SectionShell section={section}>
      <Link data-discover-light-hotspot="查看更多地点" data-discover-light-section-hotspot="bottom-band" to="/discover" aria-label="查看更多地点" className="absolute flex items-center justify-center gap-2 rounded-lg border border-[#dce6fb] bg-white/78 text-[clamp(6px,0.82vw,12px)] font-black text-[#7b86a7]" style={localStyle(section, 424, 10, 141, 32)}>加载更多地点 <ArrowRight className="h-3.5 w-3.5 rotate-90" /></Link>
      <div className="absolute flex items-center rounded-[1.35rem] border border-[#dce6fb] bg-white/82 px-7 shadow-[0_16px_40px_rgba(63,91,169,0.09)]" style={localStyle(section, 24, 50, 930, 96)}>
        {stats.map((stat, index) => (
          <Link key={stat.label} data-discover-light-hotspot={`底部统计：${stat.label}`} data-discover-light-section-hotspot="bottom-band" to={stat.label === "新记忆" ? "/home-me" : "/discover"} aria-label={`底部统计：${stat.label}`} className="flex min-w-0 flex-1 items-center gap-4 border-r border-slate-200/80 px-4 last:border-r-0">
            <span className={`${statToneClass(stat.tone)} grid h-[clamp(28px,3.6vw,48px)] w-[clamp(28px,3.6vw,48px)] place-items-center rounded-full border text-[clamp(12px,1.45vw,21px)] font-black`}>{index === 0 ? "♙" : index === 1 ? "♧" : index === 2 ? "✣" : index === 3 ? "◇" : "▥"}</span>
            <span className="min-w-0"><span className="block text-[clamp(6px,0.8vw,12px)] font-bold text-[#9aa5c0]">{stat.label}</span><span className="block text-[clamp(10px,1.2vw,18px)] font-black text-[#26346f]">{stat.value}</span><span className="block truncate text-[clamp(5px,0.68vw,10px)] font-bold text-[#9aa5c0]">{stat.helper}</span></span>
          </Link>
        ))}
      </div>
      <img
        src={discoverLightBottomCityImage}
        srcSet={`${discoverLightBottomCityImage} 1x, ${discoverLightBottomCityImage2x} 2x`}
        alt=""
        aria-hidden="true"
        className="absolute select-none object-contain mix-blend-multiply"
        style={localStyle(section, 986, 5, 256, 153)}
        decoding="async"
        draggable={false}
      />
    </SectionShell>
  )
}

export function DiscoverLightRealDom(props: DiscoverLightProps) {
  const cards = buildCards(props.taverns)
  const stats = referenceStats
  return (
    <main data-discover-light-reference="search-light-real-dom" className="min-h-screen bg-[#eaf2ff] p-0 text-[#172a66]">
      <h1 className="sr-only">FableMap 搜索发现页 — 明亮主题</h1>
      <div data-discover-light-artboard="search-light-1448x1086" data-discover-light-slice-count={TOTAL_RUNTIME_SLICE_COUNT} data-discover-light-section-count={TOTAL_SECTION_COUNT} data-discover-light-dom-complete="true" className="relative mx-auto w-full max-w-[1448px] overflow-hidden rounded-[0.9rem] border border-white/80 bg-[#f7fbff] shadow-[0_24px_80px_rgba(63,91,169,0.16)]">
        <LightReferenceTopNav variant="discover" backing={navBacking} toggleTheme={props.onToggleTheme} />
        <section data-discover-light-body="complete-dom-replacement" className="relative block overflow-hidden bg-[linear-gradient(180deg,#f7fbff_0%,#f2f8ff_62%,#f8fbff_100%)]" style={{ aspectRatio: `${ARTBOARD_WIDTH} / ${BODY_HEIGHT}` }} aria-label="FableMap 明亮主题搜索发现页主体">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(111,143,218,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(111,143,218,0.07)_1px,transparent_1px)] bg-[size:42px_42px] opacity-55" />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1/3 bg-[radial-gradient(circle_at_78%_86%,rgba(164,142,255,0.24),transparent_26%),radial-gradient(circle_at_20%_18%,rgba(164,203,255,0.18),transparent_34%)]" />
          <Sidebar />
          <SearchSection {...props} />
          <CardGrid cards={cards} />
          <RightRail cards={cards} />
          <BottomBand stats={stats} />
        </section>
      </div>
    </main>
  )
}
