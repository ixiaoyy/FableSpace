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

import discoverBlackNav from "../assets/discover/black/slices/discover-black-slice-01a-nav-bar.png"
import discoverBlackNav2x from "../assets/discover/black/slices/discover-black-slice-01a-nav-bar-2x.png"
import bottomBunny from "../assets/discover/black/elements/discover-black-bottom-bunny.png"
import bottomBunny2x from "../assets/discover/black/elements/discover-black-bottom-bunny-2x.png"
import card01 from "../assets/discover/black/elements/discover-black-card-01-cover.png"
import card012x from "../assets/discover/black/elements/discover-black-card-01-cover-2x.png"
import card02 from "../assets/discover/black/elements/discover-black-card-02-cover.png"
import card022x from "../assets/discover/black/elements/discover-black-card-02-cover-2x.png"
import card03 from "../assets/discover/black/elements/discover-black-card-03-cover.png"
import card032x from "../assets/discover/black/elements/discover-black-card-03-cover-2x.png"
import card04 from "../assets/discover/black/elements/discover-black-card-04-cover.png"
import card042x from "../assets/discover/black/elements/discover-black-card-04-cover-2x.png"
import card05 from "../assets/discover/black/elements/discover-black-card-05-cover.png"
import card052x from "../assets/discover/black/elements/discover-black-card-05-cover-2x.png"
import card06 from "../assets/discover/black/elements/discover-black-card-06-cover.png"
import card062x from "../assets/discover/black/elements/discover-black-card-06-cover-2x.png"
import card07 from "../assets/discover/black/elements/discover-black-card-07-cover.png"
import card072x from "../assets/discover/black/elements/discover-black-card-07-cover-2x.png"
import card08 from "../assets/discover/black/elements/discover-black-card-08-cover.png"
import card082x from "../assets/discover/black/elements/discover-black-card-08-cover-2x.png"
import thumb01 from "../assets/discover/black/elements/discover-black-right-thumb-01.png"
import thumb012x from "../assets/discover/black/elements/discover-black-right-thumb-01-2x.png"
import thumb02 from "../assets/discover/black/elements/discover-black-right-thumb-02.png"
import thumb022x from "../assets/discover/black/elements/discover-black-right-thumb-02-2x.png"
import thumb03 from "../assets/discover/black/elements/discover-black-right-thumb-03.png"
import thumb032x from "../assets/discover/black/elements/discover-black-right-thumb-03-2x.png"
import thumb04 from "../assets/discover/black/elements/discover-black-right-thumb-04.png"
import thumb042x from "../assets/discover/black/elements/discover-black-right-thumb-04-2x.png"
import thumb05 from "../assets/discover/black/elements/discover-black-right-thumb-05.png"
import thumb052x from "../assets/discover/black/elements/discover-black-right-thumb-05-2x.png"
import sidebarAvatar from "../assets/discover/black/elements/discover-black-sidebar-avatar.png"
import sidebarAvatar2x from "../assets/discover/black/elements/discover-black-sidebar-avatar-2x.png"
import sidebarRadar from "../assets/discover/black/elements/discover-black-sidebar-radar.png"
import sidebarRadar2x from "../assets/discover/black/elements/discover-black-sidebar-radar-2x.png"
import type { Tavern } from "../lib/taverns"
import {
  DISCOVER_REFERENCE_ARTBOARD,
  DISCOVER_REFERENCE_SECTIONS,
  discoverLocalStyle,
  discoverSectionStyle,
  type DiscoverReferenceSection,
  type DiscoverReferenceSectionId,
} from "./discover-reference-layout"

export type DiscoverBlackReferenceProps = {
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

type BlackTone = "cyan" | "violet" | "fuchsia" | "emerald"
type BlackImage = { src: string; src2x: string }
type BlackCard = {
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
  tone: BlackTone
}
type BlackStat = { label: string; value: string; helper: string; tone: BlackTone }

const ARTBOARD_WIDTH = DISCOVER_REFERENCE_ARTBOARD.width
const ARTBOARD_HEIGHT = DISCOVER_REFERENCE_ARTBOARD.height
const NAV_HEIGHT = DISCOVER_REFERENCE_ARTBOARD.navHeight
const BODY_HEIGHT = ARTBOARD_HEIGHT - NAV_HEIGHT
const BODY_SECTION_COUNT = 5
const TOTAL_SECTION_COUNT = 1 + BODY_SECTION_COUNT
const TOTAL_RUNTIME_SLICE_COUNT = 1

const navBacking = {
  id: "black-01a-nav-bar",
  label: "FableMap 黑色赛博主题搜索页顶部导航栏",
  src: discoverBlackNav,
  src2x: discoverBlackNav2x,
  width: ARTBOARD_WIDTH,
  height: NAV_HEIGHT,
} as const

export const DISCOVER_BLACK_NAV_BACKING = navBacking
export const DISCOVER_BLACK_ARTBOARD_WIDTH = ARTBOARD_WIDTH
export const DISCOVER_BLACK_BODY_HEIGHT = BODY_HEIGHT
export const DISCOVER_BLACK_TOTAL_SECTION_COUNT = TOTAL_SECTION_COUNT
export const DISCOVER_BLACK_RUNTIME_SLICE_COUNT = TOTAL_RUNTIME_SLICE_COUNT

const sections: DiscoverReferenceSection[] = DISCOVER_REFERENCE_SECTIONS
const cardImages: BlackImage[] = [
  { src: card01, src2x: card012x },
  { src: card02, src2x: card022x },
  { src: card03, src2x: card032x },
  { src: card04, src2x: card042x },
  { src: card05, src2x: card052x },
  { src: card06, src2x: card062x },
  { src: card07, src2x: card072x },
  { src: card08, src2x: card082x },
] as const
const rightThumbs: BlackImage[] = [
  { src: thumb01, src2x: thumb012x },
  { src: thumb02, src2x: thumb022x },
  { src: thumb03, src2x: thumb032x },
  { src: thumb04, src2x: thumb042x },
  { src: thumb05, src2x: thumb052x },
] as const

const referenceCards = [
  { name: "雨巷书店", description: "雨幕里的霓虹书店，坐标入口正在闪烁。", badge: "人气", tags: ["深夜", "适合对话", "赛博"], coordinate: "25.047, 121.517", distance: "142 m", npcCount: 8, tone: "violet" },
  { name: "镜海码头", description: "蓝紫潮汐与冷光广告牌交织的临海入口。", badge: "", tags: ["治愈", "安静", "幻想"], coordinate: "25.058, 121.536", distance: "213 m", npcCount: 6, tone: "cyan" },
  { name: "霓虹花房", description: "发光植物覆盖玻璃温室，记忆像花粉漂浮。", badge: "新", tags: ["治愈", "幻想", "适合对话"], coordinate: "25.033, 121.564", distance: "318 m", npcCount: 7, tone: "fuchsia" },
  { name: "月亮不眠电台", description: "地下频段持续广播，月相与留言同步刷新。", badge: "", tags: ["深夜", "安静", "适合对话"], coordinate: "25.065, 121.548", distance: "411 m", npcCount: 5, tone: "cyan" },
  { name: "小灯塔问路铺", description: "巷口灯塔投下冷光，为迷路旅人校准坐标。", badge: "指引", tags: ["治愈", "安静", "适合新手"], coordinate: "25.045, 121.502", distance: "128 m", npcCount: 4, tone: "cyan" },
  { name: "黑锋数据站", description: "旧服务器仍在低鸣，存着被遗忘的城市真相。", badge: "神秘", tags: ["神秘", "幻想", "深夜"], coordinate: "25.060, 121.523", distance: "356 m", npcCount: 9, tone: "violet" },
  { name: "星图观测台", description: "高处的星图屏幕，记录每一条回访信号。", badge: "", tags: ["安静", "幻想", "治愈"], coordinate: "25.041, 121.561", distance: "289 m", npcCount: 6, tone: "emerald" },
  { name: "记忆收纳馆", description: "霓虹柜格收纳遗落片段，等待下一次重逢。", badge: "热门", tags: ["治愈", "适合对话", "幻想"], coordinate: "25.052, 121.534", distance: "176 m", npcCount: 7, tone: "fuchsia" },
] satisfies Array<Omit<BlackCard, "id" | "image" | "image2x" | "to">>

export const discoverBlackReferenceStats: BlackStat[] = [
  { label: "附近地点", value: "36 个", helper: "半径 1 公里范围", tone: "violet" },
  { label: "活跃 NPC", value: "82 位", helper: "正在与你共鸣", tone: "cyan" },
  { label: "新记忆", value: "12 条", helper: "过去 24 小时", tone: "fuchsia" },
  { label: "热门故事片段", value: "8 个", helper: "本周最受欢迎", tone: "violet" },
  { label: "信号强度", value: "85%", helper: "当前区域稳定", tone: "emerald" },
]
const cardLabels = ["进入第一个搜索结果", "进入第二个搜索结果", "进入第三个搜索结果", "进入第四个搜索结果", "进入第五个搜索结果", "进入第六个搜索结果", "进入第七个搜索结果", "进入第八个搜索结果"] as const
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

function sectionById(id: DiscoverReferenceSectionId) {
  const section = sections.find((candidate) => candidate.id === id)
  if (!section) throw new Error(`Unknown discover black section: ${id}`)
  return section
}

function sectionStyle(section: DiscoverReferenceSection) {
  return discoverSectionStyle(section, BODY_HEIGHT)
}

function localStyle(section: DiscoverReferenceSection, left: number, top: number, width: number, height: number) {
  return discoverLocalStyle(section, left, top, width, height)
}

function initialFor(value = "?") {
  return value.trim().slice(0, 1).toUpperCase() || "?"
}

export function buildDiscoverBlackCards(taverns: Tavern[]): BlackCard[] {
  return referenceCards.map((referenceCard, index) => {
    const tavernId = taverns[index]?.id
    const image = cardImages[index]
    return {
      ...referenceCard,
      id: tavernId || `fallback-${index}`,
      image: image.src,
      image2x: image.src2x,
      to: tavernId ? `/tavern/${tavernId}` : "/discover",
    }
  })
}

function tagClass(tone: BlackTone) {
  if (tone === "emerald") return "border-emerald-300/36 bg-emerald-300/12 text-emerald-100"
  if (tone === "violet") return "border-violet-300/38 bg-violet-300/14 text-violet-100"
  if (tone === "fuchsia") return "border-fuchsia-300/38 bg-fuchsia-300/14 text-fuchsia-100"
  return "border-cyan-300/38 bg-cyan-300/14 text-cyan-100"
}

function statToneClass(tone: BlackTone) {
  if (tone === "emerald") return "border-emerald-300/35 bg-emerald-300/12 text-emerald-100"
  if (tone === "violet") return "border-violet-300/35 bg-violet-300/12 text-violet-100"
  if (tone === "fuchsia") return "border-fuchsia-300/35 bg-fuchsia-300/12 text-fuchsia-100"
  return "border-cyan-300/35 bg-cyan-300/12 text-cyan-100"
}

function SectionShell({ section, children }: { section: DiscoverReferenceSection; children: ReactNode }) {
  return (
    <section
      data-discover-black-section={section.id}
      data-discover-black-section-boundary="real-page-section"
      data-discover-black-section-dom="real-dom-replacement"
      data-discover-black-section-hotspots="owned"
      data-discover-shared-template-section={section.id}
      className="absolute overflow-hidden"
      style={sectionStyle(section)}
      aria-label={section.label}
    >
      {children}
    </section>
  )
}

export function DiscoverBlackSidebar() {
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
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#071225_0%,#030712_58%,#071225_100%)]" />
      <div className="absolute inset-y-0 right-0 w-px bg-[linear-gradient(180deg,transparent,rgba(34,211,238,0.38),transparent)]" />
      <img src={sidebarAvatar} srcSet={`${sidebarAvatar} 1x, ${sidebarAvatar2x} 2x`} alt="" aria-hidden="true" className="absolute select-none drop-shadow-[0_0_22px_rgba(34,211,238,0.22)]" style={localStyle(section, 34, 24, 118, 124)} decoding="async" draggable={false} />
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Link key={item.label} data-discover-black-hotspot={item.label} data-discover-black-section-hotspot="sidebar" to={item.to} aria-label={item.label} className={`absolute flex items-center gap-4 rounded-2xl px-5 text-[clamp(7px,0.9vw,13px)] font-black transition ${item.active ? "border border-cyan-300/35 bg-cyan-300/12 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.16)]" : "text-cyan-100/58 hover:bg-cyan-300/8 hover:text-cyan-100"}`} style={localStyle(section, 21, item.top, 132, 53)}>
            <Icon className="h-[clamp(10px,1.1vw,18px)] w-[clamp(10px,1.1vw,18px)]" strokeWidth={2.25} />
            <span>{item.text}</span>
            {item.badge ? <span className="ml-auto grid h-5 w-5 place-items-center rounded-full bg-fuchsia-500 text-[10px] text-white">{item.badge}</span> : null}
          </Link>
        )
      })}
      <div className="absolute bottom-[20%] left-[20%] right-[8%] h-px bg-cyan-300/18" />
      <div className="absolute bottom-[17%] left-[20%] text-[clamp(6px,0.72vw,10px)] font-black uppercase tracking-[0.14em] text-cyan-200/54">Location</div>
      <div className="absolute bottom-[14%] left-[20%] flex items-center gap-2 text-[clamp(7px,0.84vw,12px)] font-bold text-cyan-100/58"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.9)]" />自动定位中</div>
      <img src={sidebarRadar} srcSet={`${sidebarRadar} 1x, ${sidebarRadar2x} 2x`} alt="" aria-hidden="true" className="absolute select-none drop-shadow-[0_0_22px_rgba(217,70,239,0.18)]" style={localStyle(section, 48, 654, 116, 122)} decoding="async" draggable={false} />
      <Link data-discover-black-hotspot="侧边栏设置" data-discover-black-section-hotspot="sidebar" to="/home-me" aria-label="侧边栏设置" className="absolute grid place-items-center rounded-full border border-cyan-300/24 bg-cyan-300/8 text-cyan-100/70 shadow-[0_0_18px_rgba(34,211,238,0.08)] transition hover:text-cyan-100" style={localStyle(section, 40, 932, 36, 36)}><Settings className="h-[clamp(10px,1.1vw,16px)] w-[clamp(10px,1.1vw,16px)]" /></Link>
      <Link data-discover-black-hotspot="侧边栏主页" data-discover-black-section-hotspot="sidebar" to="/" aria-label="侧边栏主页" className="absolute grid place-items-center rounded-full border border-cyan-300/24 bg-cyan-300/8 text-cyan-100/70 shadow-[0_0_18px_rgba(34,211,238,0.08)] transition hover:text-cyan-100" style={localStyle(section, 104, 932, 36, 36)}><Home className="h-[clamp(10px,1.1vw,16px)] w-[clamp(10px,1.1vw,16px)]" /></Link>
    </SectionShell>
  )
}

export function DiscoverBlackSearchSection({ search, onSearchChange, onClear, onTogglePlaceType, onToggleSpecialType, onToggleCategory, onPublicOnlyChange, onOpenOnlyChange }: DiscoverBlackReferenceProps) {
  const section = sectionById("main-search")
  const filters = [
    { label: "全部筛选", text: "全部", prefix: "", suffix: true, onClick: onClear, width: 76, active: true },
    { label: "附近筛选", text: "附近", prefix: "⌖", onClick: () => onPublicOnlyChange(true), width: 76, active: false },
    { label: "热门筛选", text: "热门", prefix: "♨", onClick: () => onOpenOnlyChange(true), width: 76, active: false },
    { label: "最新筛选", text: "最新", prefix: "▥", onClick: onClear, width: 76, active: false },
    { label: "深夜筛选", text: "深夜", prefix: "✦", onClick: () => onTogglePlaceType("convenience-store"), width: 76, active: false },
    { label: "治愈筛选", text: "治愈", prefix: "♢", onClick: () => onTogglePlaceType("hospital"), width: 76, active: false },
    { label: "神秘筛选", text: "神秘", prefix: "♙", onClick: () => onToggleSpecialType("digital-human-studio"), width: 76, active: false },
    { label: "幻想筛选", text: "幻想", prefix: "◎", onClick: () => onToggleSpecialType("cultivation-retreat"), width: 76, active: false },
    { label: "安静筛选", text: "安静", prefix: "▣", onClick: () => onTogglePlaceType("bookstore"), width: 76, active: false },
    { label: "适合对话筛选", text: "适合对话", prefix: "▤", onClick: () => onToggleCategory("陪伴树洞"), width: 92, active: false },
  ] as const
  return (
    <SectionShell section={section}>
      <label data-discover-black-search="real-input" data-discover-black-section-hotspot="main-search" className="absolute z-30 flex items-center gap-3 rounded-full border border-cyan-300/28 bg-[#061226]/88 px-5 text-cyan-50 shadow-[0_0_28px_rgba(34,211,238,0.10),inset_0_0_0_1px_rgba(255,255,255,0.04)]" style={localStyle(section, 31, 27, 920, 46)}>
        <Search aria-hidden="true" className="h-[clamp(10px,1.2vw,18px)] w-[clamp(10px,1.2vw,18px)] shrink-0 text-cyan-100" strokeWidth={2.4} />
        <span className="sr-only">搜索地点、氛围、故事、角色或记忆线索</span>
        <input value={search} onChange={(event) => onSearchChange(event.target.value)} className="h-full min-w-0 flex-1 bg-transparent text-[clamp(7px,1.05vw,15px)] font-semibold text-cyan-50 outline-none placeholder:text-cyan-100/35" placeholder="搜索地点、氛围、故事、角色或记忆线索..." />
        <button data-discover-black-hotspot="搜索筛选设置" data-discover-black-section-hotspot="main-search" type="button" onClick={search ? onClear : undefined} className="grid h-8 w-8 place-items-center rounded-full border border-cyan-300/24 bg-cyan-300/8 text-cyan-100/80 transition hover:bg-cyan-300/14 hover:text-cyan-50" aria-label={search ? "清空搜索" : "打开搜索筛选设置"}>{search ? <X className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}</button>
      </label>
      <div className="absolute flex items-center gap-[1.75%]" style={localStyle(section, 31, 89, 910, 34)}>
        {filters.map((filter) => (
          <button key={filter.label} data-discover-black-hotspot={filter.label} data-discover-black-section-hotspot="main-search" type="button" onClick={filter.onClick} aria-label={filter.label} className={`inline-flex h-full items-center justify-center gap-1.5 rounded-full border px-3 text-[clamp(6px,0.83vw,12px)] font-extrabold shadow-[0_4px_12px_rgba(0,0,0,0.18)] transition ${filter.active ? "border-cyan-300/52 bg-cyan-300/16 text-cyan-50" : "border-cyan-300/22 bg-[#081429]/80 text-cyan-100/66 hover:border-cyan-300/40 hover:bg-cyan-300/12 hover:text-cyan-50"}`} style={{ width: `${filter.width}px` }}>
            {filter.prefix ? <span className="text-[0.92em] text-fuchsia-200">{filter.prefix}</span> : null}
            <span>{filter.text}</span>
            {"suffix" in filter ? <ChevronDown className="h-3 w-3" /> : null}
          </button>
        ))}
        <button data-discover-black-hotspot="更多筛选" data-discover-black-section-hotspot="main-search" type="button" onClick={onClear} aria-label="更多筛选" className="grid h-full w-[34px] place-items-center rounded-full border border-cyan-300/22 bg-[#081429]/80 text-cyan-100/66 shadow-[0_4px_12px_rgba(0,0,0,0.18)] transition hover:border-cyan-300/40 hover:bg-cyan-300/12 hover:text-cyan-50"><ChevronRight className="h-4 w-4" /></button>
      </div>
    </SectionShell>
  )
}

export function DiscoverBlackCardGrid({ cards }: { cards: BlackCard[] }) {
  const section = sectionById("main-card-grid")
  return (
    <SectionShell section={section}>
      {cards.map((card, index) => {
        const position = cardPositions[index]
        return (
          <Link key={`${card.id}-${index}`} data-discover-black-hotspot={cardLabels[index]} data-discover-black-section-hotspot="main-card-grid" to={card.to} aria-label={cardLabels[index]} className="absolute block overflow-hidden rounded-[1.15rem] border border-cyan-300/24 bg-[#071226]/94 text-cyan-50 shadow-[0_0_28px_rgba(34,211,238,0.08)] transition hover:-translate-y-1 hover:border-cyan-300/45 hover:shadow-[0_0_34px_rgba(34,211,238,0.14)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/60" style={localStyle(section, position.left, position.top, 222, 335)}>
            <div className="relative overflow-hidden rounded-t-[1.05rem] bg-slate-950" style={{ height: "53.73%" }}>
              <img src={card.image} srcSet={`${card.image} 1x, ${card.image2x} 2x`} alt="" aria-hidden="true" className="h-full w-full object-cover" width={222} height={180} decoding="async" draggable={false} />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(3,7,18,0.38))]" />
            </div>
            <div className="space-y-2 px-4 py-3">
              <div className="flex items-center gap-2"><h3 className="truncate text-[clamp(8px,1vw,15px)] font-black text-cyan-50">{card.name}</h3>{card.badge ? <span className={`${tagClass(card.tone)} rounded-md border px-2 py-0.5 text-[clamp(5px,0.67vw,10px)] font-black`}>{card.badge}</span> : null}</div>
              <p className="line-clamp-2 min-h-[2.35em] text-[clamp(6px,0.78vw,11px)] font-semibold leading-[1.18] text-cyan-100/62">{card.description}</p>
              <div className="flex flex-wrap gap-1.5">{card.tags.slice(0, 3).map((tag) => <span key={tag} className={`${tagClass(card.tone)} rounded-md border px-2 py-1 text-[clamp(5px,0.66vw,10px)] font-black`}>{tag}</span>)}</div>
              <div className="flex items-center justify-between text-[clamp(5px,0.67vw,10px)] font-bold text-cyan-100/48"><span>⌖ {card.distance}</span><span className="inline-flex items-center gap-1"><UsersRound className="h-[1em] w-[1em]" /> {card.npcCount} 名 NPC</span></div>
              <span className={`${tagClass(card.tone)} mt-1 flex h-[clamp(18px,2.1vw,34px)] items-center justify-center gap-2 rounded-lg border bg-cyan-300/5 text-[clamp(6px,0.82vw,12px)] font-black`}>进入 <ArrowRight className="h-[clamp(8px,0.9vw,14px)] w-[clamp(8px,0.9vw,14px)]" /></span>
            </div>
          </Link>
        )
      })}
    </SectionShell>
  )
}

export function DiscoverBlackRightRail({ cards }: { cards: BlackCard[] }) {
  const section = sectionById("right-rail")
  const recommendationLabels = ["雨巷书店", "地下音乐厅", "云端茶室", "时光照相馆", "遗失物中转站"]
  return (
    <SectionShell section={section}>
      <div className="absolute rounded-[1.35rem] border border-cyan-300/22 bg-[#071226]/88 shadow-[0_0_28px_rgba(34,211,238,0.07)]" style={localStyle(section, 6, 23, 250, 475)}>
        <h2 className="px-5 pt-5 text-[clamp(8px,1vw,15px)] font-black text-cyan-50">✣ 为你推荐</h2>
        <div className="mt-4 space-y-3 px-4">
          {recommendationLabels.map((label, index) => (
            <Link key={label} data-discover-black-hotspot={`推荐${label}`} data-discover-black-section-hotspot="right-rail" to={cards[index]?.to || "/discover"} aria-label={`推荐${label}`} className="flex min-h-[56px] items-center gap-3 rounded-2xl p-2 transition hover:bg-cyan-300/8">
              <img src={rightThumbs[index].src} srcSet={`${rightThumbs[index].src} 1x, ${rightThumbs[index].src2x} 2x`} alt="" className="h-[clamp(34px,4.2vw,58px)] w-[clamp(42px,5vw,76px)] rounded-lg border border-cyan-300/18 object-cover" decoding="async" draggable={false} />
              <span className="min-w-0 flex-1"><span className="block truncate text-[clamp(7px,0.9vw,13px)] font-black text-cyan-50">{label}</span><span className="mt-1 inline-flex rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-[clamp(5px,0.65vw,10px)] font-black text-cyan-100">{index % 2 ? "深夜" : "安静"}</span></span>
              <span className="text-[clamp(5px,0.65vw,10px)] font-bold text-cyan-100/45">⌖ {180 + index * 45} m</span>
            </Link>
          ))}
        </div>
        <Link data-discover-black-hotspot="查看更多推荐" data-discover-black-section-hotspot="right-rail" to="/discover" aria-label="查看更多推荐" className="mx-4 mt-3 flex h-10 items-center justify-center gap-2 rounded-xl border border-cyan-300/22 text-[clamp(6px,0.82vw,12px)] font-black text-cyan-100/70">查看更多推荐 <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
      <div className="absolute rounded-[1.35rem] border border-cyan-300/22 bg-[#071226]/88 p-5 shadow-[0_0_28px_rgba(217,70,239,0.07)]" style={localStyle(section, 6, 511, 250, 128)}>
        <h2 className="text-[clamp(8px,1vw,15px)] font-black text-cyan-50">✣ 正在活跃的氛围</h2>
        <div className="mt-5 flex h-8 items-end gap-1.5" aria-hidden="true">{[34, 58, 44, 72, 52, 86, 61, 48, 76, 55].map((height, index) => <span key={index} className="flex-1 rounded-t-full bg-[linear-gradient(180deg,#67e8f9,#a855f7)] opacity-80 shadow-[0_0_12px_rgba(34,211,238,0.18)]" style={{ height: `${height}%` }} />)}</div>
        <div className="mt-3 flex -space-x-2">{cards.slice(0, 6).map((card) => <span key={card.id} className="grid h-7 w-7 place-items-center rounded-full border-2 border-[#071226] bg-[linear-gradient(135deg,#0f172a,#22d3ee,#d946ef)] text-[10px] font-black text-white">{initialFor(card.name)}</span>)}<span className="grid h-7 w-9 place-items-center rounded-full border-2 border-[#071226] bg-fuchsia-500/25 text-[10px] font-black text-fuchsia-100">+28</span></div>
      </div>
      <div className="absolute rounded-[1.35rem] border border-cyan-300/22 bg-[#071226]/88 p-5 shadow-[0_0_28px_rgba(34,211,238,0.07)]" style={localStyle(section, 6, 662, 250, 160)}>
        <h2 className="text-[clamp(8px,1vw,15px)] font-black text-cyan-50">▧ 今日信号</h2>
        <div className="mt-4 space-y-3 text-[clamp(6px,0.76vw,11px)] font-bold text-cyan-100/58"><p className="flex justify-between"><span>附近出现 3 处新记忆片段</span><span>12 分钟前</span></p><p className="flex justify-between"><span>夜幕酒馆有新故事更新</span><span>26 分钟前</span></p><p className="flex justify-between"><span>霓虹花房信号强度提升</span><span>1 小时前</span></p></div>
        <Link data-discover-black-hotspot="查看全部动态" data-discover-black-section-hotspot="right-rail" to="/home-me" aria-label="查看全部动态" className="mt-4 flex h-9 items-center justify-center gap-2 rounded-xl border border-cyan-300/22 text-[clamp(6px,0.82vw,12px)] font-black text-cyan-100/70">查看全部动态 <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
    </SectionShell>
  )
}

export function DiscoverBlackBottomBand({ stats }: { stats: BlackStat[] }) {
  const section = sectionById("bottom-band")
  return (
    <SectionShell section={section}>
      <Link data-discover-black-hotspot="查看更多地点" data-discover-black-section-hotspot="bottom-band" to="/discover" aria-label="查看更多地点" className="absolute flex items-center justify-center gap-2 rounded-lg border border-cyan-300/22 bg-[#071226]/82 text-[clamp(6px,0.82vw,12px)] font-black text-cyan-100/70" style={localStyle(section, 424, 10, 141, 32)}>加载更多地点 <ArrowRight className="h-3.5 w-3.5 rotate-90" /></Link>
      <div className="absolute flex items-center rounded-[1.35rem] border border-cyan-300/22 bg-[#071226]/82 px-7 shadow-[0_0_30px_rgba(34,211,238,0.08)]" style={localStyle(section, 24, 50, 930, 96)}>
        {stats.map((stat, index) => (
          <Link key={stat.label} data-discover-black-hotspot={`底部统计：${stat.label}`} data-discover-black-section-hotspot="bottom-band" to={stat.label === "新记忆" ? "/home-me" : "/discover"} aria-label={`底部统计：${stat.label}`} className="flex min-w-0 flex-1 items-center gap-4 border-r border-cyan-300/12 px-4 last:border-r-0">
            <span className={`${statToneClass(stat.tone)} grid h-[clamp(28px,3.6vw,48px)] w-[clamp(28px,3.6vw,48px)] place-items-center rounded-full border text-[clamp(12px,1.45vw,21px)] font-black`}>{index === 0 ? "♙" : index === 1 ? "♧" : index === 2 ? "✣" : index === 3 ? "◇" : "▥"}</span>
            <span className="min-w-0"><span className="block text-[clamp(6px,0.8vw,12px)] font-bold text-cyan-100/48">{stat.label}</span><span className="block text-[clamp(10px,1.2vw,18px)] font-black text-cyan-50">{stat.value}</span><span className="block truncate text-[clamp(5px,0.68vw,10px)] font-bold text-cyan-100/42">{stat.helper}</span></span>
          </Link>
        ))}
      </div>
      <img src={bottomBunny} srcSet={`${bottomBunny} 1x, ${bottomBunny2x} 2x`} alt="" aria-hidden="true" className="absolute select-none object-contain drop-shadow-[0_0_22px_rgba(217,70,239,0.16)]" style={localStyle(section, 986, 0, 260, 178)} decoding="async" draggable={false} />
    </SectionShell>
  )
}
