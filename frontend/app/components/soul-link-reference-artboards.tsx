import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from "react"
import { Link } from "react-router"
import {
  Bell,
  Info,
  ArrowUpRight,
  BookOpen,
  Bookmark,
  ChevronDown,
  Compass,
  Home as HomeIcon,
  MapPin,
  MessageCircle,
  Play,
  Search,
  Send,
} from "lucide-react"

import discoverCardCafe from "../assets/soul-link-05-10/discover/cards/card-cafe-square.png"
import discoverCardCompass from "../assets/soul-link-05-10/discover/cards/card-compass-square.png"
import discoverCardLibrarySunlit from "../assets/soul-link-05-10/discover/cards/card-library-sunlit-square.png"
import discoverCardLibraryWide from "../assets/soul-link-05-10/discover/cards/card-library-wide-square.png"
import discoverCardPlane from "../assets/soul-link-05-10/discover/cards/card-plane-square.png"
import discoverCardSeaLane from "../assets/soul-link-05-10/discover/cards/card-sea-lane-square.png"
import discoverCardSkyCity from "../assets/soul-link-05-10/discover/cards/card-sky-city-square.png"
import discoverCardTrainPlatform from "../assets/soul-link-05-10/discover/cards/card-train-platform-square.png"
import homeBlackInviteCard from "../assets/soul-link-05-10/home-black/invite-card.png"
import homeBlackInviteCard2x from "../assets/soul-link-05-10/home-black/invite-card-2x.png"
import homeBlackGuideDatabaseIcon from "../assets/soul-link-05-10/home-black/guide-database-icon.png"
import homeBlackGuideProtocolIcon from "../assets/soul-link-05-10/home-black/guide-protocol-icon.png"
import homeBlackGuideSecurityIcon from "../assets/soul-link-05-10/home-black/guide-security-icon.png"
import homeBlackHeroVisual from "../assets/soul-link-05-10/home-black/hero-system-visual.png"
import homeBlackNodeDataHarbor from "../assets/soul-link-05-10/home-black/node-data-harbor.png"
import homeBlackNodeNeonRuins from "../assets/soul-link-05-10/home-black/node-neon-ruins.png"
import homeBlackNodeOldPlatform from "../assets/soul-link-05-10/home-black/node-old-platform.png"
import homeBlackNodeWhiteTower from "../assets/soul-link-05-10/home-black/node-white-tower.png"
import homeBlackRecentEchoWaveform from "../assets/soul-link-05-10/home-black/recent-echo-waveform.png"
import homeBlackUserAvatar from "../assets/soul-link-05-10/home-black/user-avatar-node07.png"
import homeBlackWorldStatsSparkline from "../assets/soul-link-05-10/home-black/world-stats-sparkline.png"
import homeLightInviteCard from "../assets/soul-link-05-10/home-light/invite-card.png"
import homeLightInviteCard2x from "../assets/soul-link-05-10/home-light/invite-card-2x.png"
import lightMessageIcon from "../assets/soul-link-05-10/home-light/icon-message-glow.png"
import lightPinIcon from "../assets/soul-link-05-10/home-light/icon-map-pin-glow.png"
import lightPlaneIcon from "../assets/soul-link-05-10/home-light/icon-plane-glow.png"
import lightPulseIcon from "../assets/soul-link-05-10/home-light/icon-pulse-bars-glow.png"
import lightArrowIcon from "../assets/soul-link-05-10/home-light/icon-arrow-glow.png"
import lightPlaneWash from "../assets/soul-link-05-10/home-light/bg-plane-wash.png"
import lightPaperPlaneSoft from "../assets/soul-link-05-10/home-light/bg-paper-plane-soft.png"
import lightSeaLane from "../assets/soul-link-05-10/home-light/scene-sea-lane.png"
import lightSkyCityBalcony from "../assets/soul-link-05-10/home-light/scene-sky-city-balcony.png"
import lightTrainRainPlatform from "../assets/soul-link-05-10/home-light/scene-train-platform-rain.png"
import lightLibrarySunlit from "../assets/soul-link-05-10/home-light/scene-library-sunlit.png"
import lightLibraryCafeWide from "../assets/soul-link-05-10/home-light/scene-library-cafe-wide.png"
import lightGuideStarterBg from "../assets/soul-link-05-10/home-light/card-invite-soft.png"
import lightGuideEnvelopeBg from "../assets/soul-link-05-10/home-light/card-envelope-soft.png"
import lightGuideShieldBg from "../assets/soul-link-05-10/home-light/card-shield-soft.png"
import soulLinkUserAvatar from "../assets/npc-style-cast/portraits-hd/commission-zhideng.png"
import { buildTavernFirstMinuteGuide } from "../lib/tavern-first-minute"
import type { Tavern } from "../lib/taverns"

type Variant = "light" | "black"

type HomeReferenceProps = {
  variant: Variant
  featuredCitySlices: { id?: string; name?: string; description?: string; visit_count?: number; image?: string; tags?: string[] }[]
  worldPulseItems?: SoulLinkFeedItem[]
  dailyQuote?: SoulLinkDailyQuote
  onlineEntities?: SoulLinkOnlineEntity[]
  recentMemories?: SoulLinkRecentMemory[]
  guideCards?: SoulLinkGuideCard[]
  worldStats?: SoulLinkWorldStat[]
  search?: string
  onSearchChange?: (value: string) => void
  onSearchSubmit?: () => void
  onToggleTheme: () => void
}

type DiscoverReferenceProps = {
  variant: Variant
  search: string
  taverns: Tavern[]
  onSearchChange: (value: string) => void
  onClear: () => void
  onTogglePlaceType: (placeTypeId: string) => void
  onToggleSpecialType: (specialTypeId: string) => void
  onToggleCategory: (label: string) => void
  onPublicOnlyChange: (value: boolean) => void
  onOpenOnlyChange: (value: boolean) => void
  sideFeedItems?: SoulLinkFeedItem[]
  onlineEntities?: SoulLinkOnlineEntity[]
  onToggleTheme: () => void
}

type Slice = {
  src: string
  src2x: string
  alt: string
  x: number
  y: number
  w: number
  h: number
}

type Artboard = {
  width: number
  height: number
  marker: string
  background: string
  slices: Slice[]
}

type Hotspot = {
  label: string
  to: string
  x: number
  y: number
  w: number
  h: number
}

type SoulLinkUserProfile = {
  name: string
  meta: string
  avatar: string
}

type SoulLinkFeedItem = {
  id: string
  title: string
  subtitle: string
  meta: string
  image: string
  squareImage?: boolean
  to?: string
}

type SoulLinkDailyQuote = {
  title: string
  quote: string
  source?: string
}

type SoulLinkOnlineEntity = {
  id: string
  name: string
  location: string
  status: string
  avatar: string
  squareImage?: boolean
  to?: string
}

type SoulLinkRecentMemory = {
  id: string
  title: string
  source: string
  meta: string
  image: string
  to?: string
}

type SoulLinkGuideCard = {
  id: string
  title: string
  text: string
  to?: string
  image?: string
  accent?: "violet" | "blue" | "rose" | "cyan"
}

type SoulLinkWorldStat = {
  id: string
  label: string
  value: string
}

const DEFAULT_SOUL_LINK_USER: SoulLinkUserProfile = {
  name: "星野奈奈",
  meta: "Lv.28",
  avatar: soulLinkUserAvatar,
}

const DEFAULT_DAILY_QUOTE: SoulLinkDailyQuote = {
  title: "每日一句",
  quote: "世界很大，而我们在某个坐标相遇。",
}

const DEFAULT_GUIDE_CARDS: SoulLinkGuideCard[] = [
  { id: "starter", title: "新手指南", text: "如何开始你的旅程", to: "/quests", accent: "violet" },
  { id: "worldbook", title: "坐标百科", text: "了解这个世界的规则", to: "/discover", accent: "blue" },
  { id: "safety", title: "安全指引", text: "让探索更安心", to: "/create", accent: "rose" },
]

const DEFAULT_WORLD_STATS: SoulLinkWorldStat[] = [
  { id: "coordinates", label: "新增坐标", value: "12" },
  { id: "entities", label: "在线灵魂", value: "28" },
  { id: "echoes", label: "回响记录", value: "156" },
  { id: "explores", label: "探索次数", value: "3,214" },
]

const LIGHT_GUIDE_BACKGROUNDS = [lightGuideStarterBg, lightGuideEnvelopeBg, lightGuideShieldBg] as const

const LIGHT_FALLBACK_COORDINATE_CARDS = [
  {
    name: "雨巷书店",
    description: "雨声落在旧木窗边，店主的 AI 书童正等你递来一句开场白。",
    tag: "治愈",
    image: lightLibrarySunlit,
  },
  {
    name: "海街的尽头",
    description: "沿着潮湿的路牌走到尽头，会遇见一个只在傍晚醒来的守望者。",
    tag: "纽带",
    image: lightSeaLane,
  },
  {
    name: "时光咖啡馆",
    description: "每张桌子都记得一段回访，适合把今天的心事暂存在这里。",
    tag: "温暖",
    image: lightLibraryCafeWide,
  },
  {
    name: "旧车站月台",
    description: "列车不再进站，但仍有人把未寄出的信交给站台 NPC。",
    tag: "静谧",
    image: lightTrainRainPlatform,
  },
] as const

const DISCOVER_CARD_IMAGES = [
  discoverCardLibrarySunlit,
  discoverCardSeaLane,
  discoverCardCafe,
  discoverCardTrainPlatform,
  discoverCardSkyCity,
  discoverCardLibraryWide,
  discoverCardCompass,
  discoverCardPlane,
] as const

const BLACK_FALLBACK_COORDINATE_CARDS = [
  {
    name: "数据港湾",
    description: "巨大的数据海湾，信息在这里流动不息。",
    tag: "ACTIVE",
    image: homeBlackNodeDataHarbor,
  },
  {
    name: "霓虹废墟",
    description: "被遗忘的商业区，仍有信号在闪烁。",
    tag: "ACTIVE",
    image: homeBlackNodeNeonRuins,
  },
  {
    name: "旧地铁站",
    description: "信号时有时无，可能存在未知干扰。",
    tag: "UNSTABLE",
    image: homeBlackNodeOldPlatform,
  },
  {
    name: "白塔图书馆",
    description: "存储着大量知识，但连接需要权限。",
    tag: "LOW SIGNAL",
    image: homeBlackNodeWhiteTower,
  },
] as const

const BLACK_GUIDE_ICONS = [homeBlackGuideProtocolIcon, homeBlackGuideDatabaseIcon, homeBlackGuideSecurityIcon] as const

const HOME_LIGHT: Artboard = {
  width: 1536,
  height: 1024,
  marker: "home-light-real-dom-1536x1024",
  background: "#eef4ff",
  slices: [],
}

const HOME_BLACK: Artboard = {
  width: 1536,
  height: 1024,
  marker: "home-black-real-dom-1536x1024",
  background: "#020710",
  slices: [],
}

const DISCOVER_LIGHT: Artboard = {
  width: 1536,
  height: 1024,
  marker: "discover-light-real-dom-1536x1024",
  background: "#eef4ff",
  slices: [],
}

const DISCOVER_BLACK: Artboard = {
  width: 1536,
  height: 1024,
  marker: "discover-black-real-dom-1536x1024",
  background: "#030712",
  slices: [],
}

const DISCOVER_RIGHT_RAIL = {
  signalFeed: { x: 1236, y: 300, w: 270, h: 250 },
  onlineEntities: { x: 1236, y: 574, w: 270, h: 260 },
} as const

const homeSharedCardBoxes = [
  [242, 598, 218, 222],
  [472, 598, 218, 222],
  [710, 598, 218, 222],
  [940, 598, 218, 222],
] as const

const discoverSharedCardBoxes = [
  [228, 589, 224, 195],
  [467, 589, 224, 195],
  [706, 589, 224, 195],
  [945, 589, 236, 195],
  [228, 817, 224, 195],
  [467, 817, 224, 195],
  [706, 817, 224, 195],
  [945, 817, 236, 195],
] as const

// Light / black home variants intentionally share one geometry source.
// Theme differences stay in materials, copy, and color branches only.
const HOME_LAYOUT = {
  sidebar: {
    panel: { x: 0, y: 0, w: 220, h: 1024 },
    logo: { x: 50, y: 48, w: 136, h: 52 },
    navItems: [
      { id: "home", label: "首页", eyebrow: "HOME", to: "/", x: 42, y: 143, w: 158, h: 46 },
      { id: "discover", label: "探索", eyebrow: "EXPLORE", to: "/discover", x: 42, y: 207, w: 158, h: 46 },
      { id: "echoes", label: "回响", eyebrow: "ECHOES", to: "/home-me", x: 42, y: 273, w: 158, h: 46, badge: "12" },
      { id: "memory", label: "记忆", eyebrow: "MEMORY", to: "/home-me", x: 42, y: 340, w: 158, h: 46 },
      { id: "saved", label: "收藏", eyebrow: "SAVED", to: "/home-me", x: 42, y: 407, w: 158, h: 46 },
      { id: "anchors", label: "我的锚点", eyebrow: "ANCHORS", to: "/home-me", x: 42, y: 474, w: 158, h: 46 },
      { id: "create", label: "创建坐标", eyebrow: "CREATE", to: "/create", x: 42, y: 541, w: 158, h: 46 },
    ],
    invite: { x: 46, y: 712, w: 151, h: 170 },
    bottomActions: [
      { label: "切换主题", x: 53, y: 938, w: 34, h: 34, action: "theme" },
      { label: "打开回响", x: 103, y: 938, w: 34, h: 34, to: "/home-me" },
    ],
  },
  userCluster: { x: 1234, y: 26, w: 286, h: 72 },
  cards: homeSharedCardBoxes,
  hero: { x: 220, y: 18, w: 1000, h: 530 },
  title: { x: 280, y: 145, w: 520, h: 178 },
  heroDecorations: {
    primary: { x: 830, y: 72, w: 36, h: 36 },
    secondary: { x: 532, y: 126, w: 22, h: 22 },
  },
  currentCoordinate: { x: 1000, y: 397, w: 170, h: 76 },
  recommendedHeader: { x: 252, y: 560, w: 936, h: 44 },
  search: { x: 864, y: 41, w: 335, h: 44 },
  heroActions: {
    primary: { x: 280, y: 330, w: 136, h: 48 },
    secondary: { x: 438, y: 330, w: 176, h: 48 },
  },
  rightRailSurface: { x: 1220, y: 0, w: 316, h: 1024 },
  rightRail: {
    worldPulse: { x: 1248, y: 118, w: 240, h: 316 },
    dailyQuote: { x: 1248, y: 446, w: 240, h: 108 },
    onlineEntities: { x: 1192, y: 575, w: 286, h: 238 },
  },
  bottomRail: {
    recentMemories: { x: 242, y: 840, w: 350, h: 154 },
    guideCards: { x: 602, y: 840, w: 430, h: 154 },
    worldStats: { x: 1048, y: 848, w: 443, h: 144 },
  },
} as const

const SIDEBAR_MATERIALS = {
  light: {
    inviteCard: { src: homeLightInviteCard, src2x: homeLightInviteCard2x },
  },
  black: {
    inviteCard: { src: homeBlackInviteCard, src2x: homeBlackInviteCard2x },
  },
} as const

const DISCOVER_LAYOUT = {
  cards: discoverSharedCardBoxes,
  title: { x: 228, y: 34, w: 240, h: 72 },
  search: { x: 540, y: 27, w: 426, h: 48 },
  filters: {
    all: { x: 413, y: 118, w: 72, h: 42 },
    openOnly: { x: 500, y: 118, w: 120, h: 42 },
    recent: { x: 650, y: 118, w: 120, h: 42 },
    lowSignal: { x: 782, y: 118, w: 120, h: 42 },
    cozy: { x: 916, y: 118, w: 120, h: 42 },
    more: { x: 1040, y: 118, w: 145, h: 42 },
  },
  create: { label: "创建新的坐标", to: "/create", x: 1258, y: 854, w: 260, h: 138 },
} as const

const DISCOVER_FILTER_GROUPS = [
  {
    title: "情绪筛选",
    items: ["治愈", "温暖", "神秘", "浪漫", "孤独", "怀旧", "希望", "幻想"],
  },
  {
    title: "空间类型",
    items: ["城市", "自然", "室内", "奇幻", "未来", "其他"],
  },
  {
    title: "连接状态",
    items: ["任何状态", "稳定连接", "信号波动", "连接中断"],
  },
] as const

const DISCOVER_TIMELINE = [
  { time: "03:41", title: "雨巷书店", subtitle: "新增 3 段回响", tone: "bg-violet-500", image: discoverCardLibraryWide },
  { time: "03:38", title: "旧车站月台", subtitle: "信号重新连接", tone: "bg-emerald-400", image: discoverCardTrainPlatform },
  { time: "03:32", title: "月亮不眠电台", subtitle: "有人留下了一段广播", tone: "bg-indigo-500", image: discoverCardSkyCity },
  { time: "03:21", title: "云上图书馆", subtitle: "新增书签《风的记忆》", tone: "bg-sky-400", image: discoverCardLibrarySunlit },
  { time: "03:17", title: "海街的尽头", subtitle: "连接不稳定", tone: "bg-rose-500", image: discoverCardSeaLane },
] as const

const DISCOVER_RIGHT_QUOTES = [
  "在这里，我第一次放下了过去。",
  "如果你也在等一个人，就来这里吧。",
  "这本书里藏着一个秘密，等你发现。",
] as const

function pct(value: number, total: number) {
  return `${(value / total) * 100}%`
}

function boxStyle(artboard: Artboard, x: number, y: number, w: number, h: number): CSSProperties {
  return {
    left: pct(x, artboard.width),
    top: pct(y, artboard.height),
    width: pct(w, artboard.width),
    height: pct(h, artboard.height),
  }
}

function panelBoxStyle(panel: { w: number; h: number }, x: number, y: number, w: number, h: number): CSSProperties {
  return {
    left: pct(x, panel.w),
    top: pct(y, panel.h),
    width: pct(w, panel.w),
    height: pct(h, panel.h),
  }
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function UserCutImage({
  src,
  className,
  imgClassName,
  style,
  scale = 1,
  loading = "lazy",
}: {
  src: string
  className?: string
  imgClassName?: string
  style?: CSSProperties
  scale?: number
  loading?: "lazy" | "eager"
}) {
  return (
    <span aria-hidden="true" className={cx("relative inline-block overflow-hidden", className)} style={style}>
      <img
        src={src}
        alt=""
        draggable={false}
        loading={loading}
        decoding="async"
        className={cx("absolute inset-0 h-full w-full select-none object-cover", imgClassName)}
        style={scale === 1 ? undefined : { transform: `scale(${scale})` }}
      />
    </span>
  )
}

function targetFor(id?: string) {
  return id ? `/tavern/${encodeURIComponent(id)}` : "/discover"
}

function homeCoordinateCardData(slice: HomeReferenceProps["featuredCitySlices"][number] | undefined, index: number, variant: Variant) {
  const fallback = variant === "black"
    ? BLACK_FALLBACK_COORDINATE_CARDS[index % BLACK_FALLBACK_COORDINATE_CARDS.length]
    : LIGHT_FALLBACK_COORDINATE_CARDS[index % LIGHT_FALLBACK_COORDINATE_CARDS.length]
  const visitCount = Number(slice?.visit_count || 0)
  return {
    id: slice?.id,
    name: slice?.name || fallback.name,
    description: slice?.description || fallback.description,
    tag: slice?.tags?.[0] || fallback.tag,
    image: fallback.image,
    visitLabel: visitCount > 0 ? `${visitCount} 人在这里` : "等待第一个回响",
  }
}

function discoverCardData(tavern: Tavern | undefined, index: number) {
  const fallback = LIGHT_FALLBACK_COORDINATE_CARDS[index % LIGHT_FALLBACK_COORDINATE_CARDS.length]
  const visitCount = Number(tavern?.visit_count || 0)
  const characterCount = tavern?.characters?.length || 0
  const minutes = index < 4 ? (index + 1) * 3 + 2 : index * 7
  const guide = tavern ? buildTavernFirstMinuteGuide(tavern) : null
  return {
    id: tavern?.id,
    name: tavern?.name || fallback.name,
    description: tavern?.description || fallback.description,
    tag: (tavern as (Tavern & { tags?: string[] }) | undefined)?.tags?.[0] || fallback.tag,
    image: DISCOVER_CARD_IMAGES[index % DISCOVER_CARD_IMAGES.length],
    visitLabel: visitCount > 0 ? `${visitCount} 人在这里` : "等待回响",
    characterLabel: characterCount > 0 ? `${characterCount} 位 NPC` : "待配置 NPC",
    timeLabel: minutes < 60 ? `${minutes} 分钟前` : "1 小时前",
    whyHere: guide?.whyHere || "真实坐标决定这间空间的门牌、氛围和第一段对话线索。",
    tryPrompt: guide?.tryThisFirst?.[0] || "这里为什么必须开在这个坐标？",
    experienceType: guide?.experienceType || "地点叙事",
  }
}

function suppressMouseFocus(event: MouseEvent<HTMLElement>) {
  event.preventDefault()
}

function initialFor(value = "?") {
  return value.trim().slice(0, 1).toUpperCase() || "?"
}

function SidebarNavIcon({ id, variant, className }: { id: string; variant: Variant; className?: string }) {
  const Icon =
    id === "home" ? HomeIcon
    : id === "discover" ? Compass
    : id === "echoes" ? MessageCircle
    : id === "memory" ? BookOpen
    : id === "saved" ? Bookmark
    : id === "anchors" ? MapPin
    : Send

  return (
    <Icon
      aria-hidden="true"
      strokeWidth={variant === "black" ? 2.15 : 2.25}
      className={cx("shrink-0", className)}
    />
  )
}

function SidebarBottomIcon({ id, className }: { id: "theme" | "echoes"; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className,
  }

  if (id === "theme") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="3.4" />
        <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18" />
      </svg>
    )
  }
  if (id === "echoes") {
    return (
      <svg {...common}>
        <path d="M5.2 6.8h13.6v9.5H9l-3.8 2.5V6.8Z" />
        <path d="M8.5 10.2h.01M11.9 10.2h.01M15.3 10.2h.01" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.8v2.1M12 18.1v2.1M4.9 4.9l1.5 1.5M17.6 17.6l1.5 1.5M3.8 12h2.1M18.1 12h2.1M4.9 19.1l1.5-1.5M17.6 6.4l1.5-1.5" />
    </svg>
  )
}

function SoulLinkSidebar({
  artboard,
  variant,
  active,
  onToggleTheme,
}: {
  artboard: Artboard
  variant: Variant
  active: "home" | "discover"
  onToggleTheme: () => void
}) {
  const sidebar = HOME_LAYOUT.sidebar
  const panel = sidebar.panel
  const inviteCard = SIDEBAR_MATERIALS[variant].inviteCard
  const isBlack = variant === "black"
  const useDiscoverDomInvite = active === "discover"
  const panelClass = isBlack
    ? "border-cyan-300/20 bg-[#020710] shadow-[inset_-1px_0_0_rgba(34,211,238,0.2),0_0_34px_rgba(0,255,255,0.08)]"
    : "border-white/70 bg-gradient-to-b from-white via-white to-white/95 shadow-[24px_0_70px_rgba(104,126,190,0.16),inset_-1px_0_0_rgba(148,163,184,0.16)] backdrop-blur-xl"
  const activeItemClass = variant === "black"
    ? "bg-cyan-300/14 text-cyan-100"
    : "bg-[#f0edff] text-[#7b66ff]"
  const inactiveItemClass = variant === "black"
    ? "text-cyan-100/58 hover:bg-cyan-300/8 hover:text-cyan-100"
    : "text-[#8b98b4] hover:bg-[#f6f4ff] hover:text-[#7b66ff]"

  return (
    <aside
      data-soul-link-sidebar="shared"
      data-soul-link-sidebar-active={active}
      className={cx("absolute z-30 overflow-hidden rounded-r-[1.45rem] border-r", panelClass)}
      style={boxStyle(artboard, panel.x, panel.y, panel.w, panel.h)}
    >
      <Link
        to="/"
        aria-label="SoulLink"
        onMouseDown={suppressMouseFocus}
        className={cx(
          "absolute touch-manipulation rounded-2xl outline-none focus:ring-4 focus:ring-violet-400/45",
          "flex items-center gap-2",
        )}
        style={panelBoxStyle(panel, sidebar.logo.x, sidebar.logo.y, sidebar.logo.w, sidebar.logo.h)}
      >
        {isBlack ? (
          <>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-cyan-300/18 bg-cyan-300/10 text-cyan-200">
              <Compass size={20} strokeWidth={2.6} />
            </span>
            <span className="min-w-0">
              <span className="block text-[1.02rem] font-black leading-tight text-cyan-50">SoulLink</span>
              <span className="block truncate text-[10px] font-bold text-cyan-100/48">连接另一个数字世界</span>
            </span>
          </>
        ) : (
          <>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-500 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.12)]">
              <Send size={18} strokeWidth={2.6} />
            </span>
            <span className="min-w-0">
              <span className="block text-[1.08rem] font-black leading-tight text-slate-800">SoulLink</span>
              <span className="block truncate text-[11px] font-bold text-slate-400">连接每一个真实坐标</span>
            </span>
          </>
        )}
        <span className="sr-only">SoulLink 连接另一个灵魂坐标</span>
      </Link>

      <nav aria-label="SoulLink navigation" className="absolute inset-0">
        {sidebar.navItems.map((item) => {
          const selected = item.id === active
          return (
            <Link
              key={item.id}
              to={item.to}
              aria-current={selected ? "page" : undefined}
              aria-label={item.label}
              onMouseDown={suppressMouseFocus}
              className={cx(
                "absolute flex min-h-11 touch-manipulation items-center rounded-2xl px-[18px] font-semibold outline-none transition focus:ring-4 focus:ring-violet-400/45",
                isBlack ? "text-sm" : "text-[15px]",
                selected ? activeItemClass : inactiveItemClass,
              )}
              style={panelBoxStyle(panel, item.x, item.y, item.w, item.h)}
            >
              <SidebarNavIcon id={item.id} variant={variant} className="h-5 w-5 shrink-0" />
              <span className="ml-[15px] leading-none">{item.label}</span>
              {"badge" in item && (
                <span className={cx(
                  "ml-auto rounded-full px-2 py-1 text-xs font-bold leading-none",
                  variant === "black" ? "bg-cyan-300/16 text-cyan-100" : "bg-[#efecff] text-[#8d79ff]",
                )}>
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {useDiscoverDomInvite ? (
        <Link
          to="/create"
          data-soul-link-sidebar-cta="shared"
          data-soul-link-sidebar-invite="real-dom"
          aria-label="邀请朋友"
          onMouseDown={suppressMouseFocus}
          className={cx(
            "absolute flex touch-manipulation flex-col overflow-hidden rounded-[1.55rem] border p-3 outline-none focus:ring-4 focus:ring-violet-400/45",
            isBlack
              ? "border-cyan-300/18 bg-cyan-300/[0.055] shadow-[0_0_26px_rgba(34,211,238,0.1)]"
              : "border-violet-100 bg-white/88 shadow-[0_16px_36px_rgba(104,126,190,0.14)]",
          )}
          style={panelBoxStyle(panel, sidebar.invite.x, sidebar.invite.y, sidebar.invite.w, sidebar.invite.h)}
        >
          <img
            data-soul-link-discover-square-image="512x512"
            src={discoverCardPlane}
            alt=""
            aria-hidden="true"
            draggable={false}
            decoding="async"
            className={cx(
              "h-16 w-16 shrink-0 rounded-[1.05rem] object-cover",
              isBlack ? "border border-cyan-300/14 shadow-[0_12px_28px_rgba(0,0,0,0.32)]" : "shadow-[0_12px_28px_rgba(124,112,255,0.16)]",
            )}
          />
            <span data-soul-link-sidebar-invite-copy="real-text" className="mt-3 min-w-0">
              <span className={cx("block text-[13px] font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>邀请朋友</span>
              <span className={cx("mt-1 block line-clamp-2 text-[11px] font-bold leading-4", isBlack ? "text-cyan-100/48" : "text-slate-400")}>一起探索更多坐标</span>
            </span>
            <span className={cx("mt-auto inline-flex min-h-8 items-center justify-center rounded-xl px-3 text-[12px] font-black", isBlack ? "bg-cyan-300/16 text-cyan-100" : "bg-violet-500 text-white")}>
              立即邀请 →
            </span>
        </Link>
      ) : (
        <Link
          to="/create"
          data-soul-link-sidebar-cta="shared"
          aria-label="邀请朋友"
          onMouseDown={suppressMouseFocus}
          className={cx(
            "absolute touch-manipulation overflow-hidden rounded-[1.55rem] outline-none focus:ring-4 focus:ring-violet-400/45",
            isBlack ? "" : "shadow-[0_16px_36px_rgba(104,126,190,0.14)]",
          )}
          style={panelBoxStyle(panel, sidebar.invite.x, sidebar.invite.y, sidebar.invite.w, sidebar.invite.h)}
        >
          <img
            data-soul-link-sidebar-invite="fixed-image"
            src={inviteCard.src}
            srcSet={`${inviteCard.src} 1x, ${inviteCard.src2x} 2x`}
            alt=""
            aria-hidden="true"
            draggable={false}
            decoding="async"
            className={cx("h-full w-full select-none object-cover object-center", isBlack ? "opacity-85" : "opacity-100")}
          />
          <span className="sr-only">邀请朋友，一起探索更多坐标，立即邀请</span>
        </Link>
      )}

      {sidebar.bottomActions.map((item) =>
        "action" in item && item.action === "theme" ? (
          <button
            key={item.label}
            type="button"
            aria-label={item.label}
            onClick={onToggleTheme}
            onMouseDown={suppressMouseFocus}
            className={cx(
              "absolute grid touch-manipulation place-items-center rounded-full outline-none transition focus:ring-4 focus:ring-violet-400/45",
              isBlack ? "text-cyan-100/70 hover:text-cyan-100" : "text-[#8491ad] hover:text-[#7b66ff]",
            )}
            style={panelBoxStyle(panel, item.x, item.y, item.w, item.h)}
          >
            <SidebarBottomIcon id="theme" className="h-[22px] w-[22px]" />
          </button>
        ) : (
          <Link
            key={item.label}
            to={"to" in item ? item.to : "/"}
            aria-label={item.label}
            onMouseDown={suppressMouseFocus}
            className={cx(
              "absolute grid touch-manipulation place-items-center rounded-full outline-none transition focus:ring-4 focus:ring-violet-400/45",
              isBlack ? "text-cyan-100/70 hover:text-cyan-100" : "text-[#8491ad] hover:text-[#7b66ff]",
            )}
            style={panelBoxStyle(panel, item.x, item.y, item.w, item.h)}
          >
            <SidebarBottomIcon id="echoes" className="h-[22px] w-[22px]" />
          </Link>
        ),
      )}
    </aside>
  )
}

function SoulLinkNotificationBell({ variant }: { variant: Variant }) {
  const isBlack = variant === "black"
  return (
    <button
      type="button"
      data-soul-link-notification="real-button"
      aria-label="通知中心"
      onMouseDown={suppressMouseFocus}
      className={cx(
        "relative grid h-full aspect-square shrink-0 touch-manipulation place-items-center rounded-2xl border outline-none transition focus:ring-4 focus:ring-violet-400/45",
        isBlack
          ? "border-cyan-300/18 bg-cyan-300/8 text-cyan-100 hover:border-cyan-300/35"
          : "border-slate-200/70 bg-white/82 text-slate-600 shadow-[0_10px_24px_rgba(88,106,160,0.1)] hover:text-violet-600",
      )}
    >
      {isBlack ? (
        <Bell size={18} strokeWidth={2.4} />
      ) : (
        <Bell size={18} strokeWidth={2.6} />
      )}
      <span className={cx("absolute right-[18%] top-[18%] h-[22%] w-[22%] rounded-full", isBlack ? "bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.75)]" : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]")} />
    </button>
  )
}

function SoulLinkUserAvatar({ avatar, name, variant }: { avatar: string; name: string; variant: Variant }) {
  const isBlack = variant === "black"
  const blackAvatarStyle: CSSProperties | undefined = isBlack
    ? { backgroundImage: `url(${avatar})`, backgroundPosition: "center", backgroundSize: "cover" }
    : undefined
  return (
    <span
      data-soul-link-user-avatar="real-image"
      className={cx(
        "block h-full aspect-square shrink-0 overflow-hidden rounded-full border p-[2px]",
        isBlack ? "border-cyan-300/24 bg-cyan-300/10" : "border-violet-100 bg-violet-50",
      )}
      style={blackAvatarStyle}
    >
      {isBlack ? (
        <img src={avatar} alt="" aria-hidden="true" className="hidden h-full w-full rounded-full object-cover" loading="eager" decoding="async" />
      ) : (
        <span className="grid h-full w-full place-items-center rounded-full bg-gradient-to-br from-violet-100 via-white to-sky-100 text-[0.72rem] font-black text-violet-500">
          {initialFor(name)}
        </span>
      )}
    </span>
  )
}

function SoulLinkUserIdentity({ name, meta, variant }: { name: string; meta: string; variant: Variant }) {
  const isBlack = variant === "black"
  return (
      <span data-soul-link-user-name="real-text" className="min-w-0 flex-1 text-left">
        <span className={cx("block truncate font-black leading-tight", isBlack ? "text-[clamp(0.72rem,0.9vw,1rem)] text-cyan-50" : "text-[clamp(0.82rem,1vw,1.08rem)] text-slate-700")}>{name}</span>
        <span className={cx("mt-1 block truncate font-black leading-none", isBlack ? "text-[clamp(0.6rem,0.72vw,0.84rem)] text-cyan-100/58" : "text-[clamp(0.68rem,0.8vw,0.9rem)] text-slate-400")}>{meta}</span>
      </span>
  )
}

function SoulLinkUserCluster({
  artboard,
  variant,
  profile = DEFAULT_SOUL_LINK_USER,
  forceVisible = false,
}: {
  artboard: Artboard
  variant: Variant
  profile?: SoulLinkUserProfile
  forceVisible?: boolean
}) {
  const isBlack = variant === "black"
  const box = HOME_LAYOUT.userCluster
  const resolvedProfile = isBlack
    ? { name: "USER_07", meta: "ID: 0x7A31...9F2C", avatar: homeBlackUserAvatar }
    : profile
  return (
    <div
      data-soul-link-user-cluster="shared"
      className={cx(
        "absolute z-30 flex items-center gap-[4%] rounded-[1.75rem] border p-[0.55%] pr-[0.75%]",
        forceVisible ? "opacity-100" : "opacity-0",
        isBlack
          ? "border-cyan-300/16 bg-[#020710]/96 shadow-[0_0_30px_rgba(0,255,255,0.1)]"
          : "border-white/80 bg-white/92 shadow-[0_14px_36px_rgba(83,103,166,0.13)] backdrop-blur-xl",
      )}
      style={boxStyle(artboard, box.x, box.y, box.w, box.h)}
    >
      <SoulLinkNotificationBell variant={variant} />
      <Link
        to="/home-me"
        aria-label={`${resolvedProfile.name} 个人中心`}
        onMouseDown={suppressMouseFocus}
        className="flex h-full min-w-0 flex-1 touch-manipulation items-center gap-[7%] rounded-[1.35rem] px-[2%] outline-none transition focus:ring-4 focus:ring-violet-400/45"
      >
        <SoulLinkUserAvatar avatar={resolvedProfile.avatar} name={resolvedProfile.name} variant={variant} />
        <SoulLinkUserIdentity name={resolvedProfile.name} meta={resolvedProfile.meta} variant={variant} />
        <ChevronDown size={14} strokeWidth={3} className={cx("shrink-0 opacity-60", isBlack ? "text-cyan-300" : "text-slate-500")} />
      </Link>
    </div>
  )
}

function fallbackFeedItemsFromHome(featuredCitySlices: HomeReferenceProps["featuredCitySlices"]): SoulLinkFeedItem[] {
  return featuredCitySlices.slice(0, 3).map((slice, index) => ({
    id: slice.id || `home-feed-${index}`,
    title: slice.name || `坐标 ${index + 1}`,
    subtitle: slice.tags?.[2] || slice.description || "新的坐标记忆正在浮现",
    meta: `${index * 3 + 2} 分钟前`,
    image: slice.image || DEFAULT_SOUL_LINK_USER.avatar,
    to: targetFor(slice.id),
  }))
}

function fallbackFeedItemsFromTaverns(taverns: Tavern[]): SoulLinkFeedItem[] {
  return taverns.slice(0, 3).map((tavern, index) => ({
    id: tavern.id || `discover-feed-${index}`,
    title: tavern.name || `坐标 ${index + 1}`,
    subtitle: tavern.description || "信号仍在波动",
    meta: `${index * 5 + 3} 分钟前`,
    image: tavern.characters?.[0]?.avatar || DEFAULT_SOUL_LINK_USER.avatar,
    to: targetFor(tavern.id),
  }))
}

function fallbackOnlineEntitiesFromFeed(items: SoulLinkFeedItem[]): SoulLinkOnlineEntity[] {
  return items.slice(0, 3).map((item, index) => ({
    id: `online-${item.id || index}`,
    name: item.title,
    location: `在 ${item.subtitle || "某个坐标"}`,
    status: index < 2 ? "在线" : `${index * 5 + 5} 分钟前`,
    avatar: item.image,
    squareImage: item.squareImage,
    to: item.to,
  }))
}

function withDiscoverSquareFeedImages(items: SoulLinkFeedItem[]): SoulLinkFeedItem[] {
  return items.map((item, index) => ({
    ...item,
    image: DISCOVER_CARD_IMAGES[(index + 4) % DISCOVER_CARD_IMAGES.length],
    squareImage: true,
  }))
}

function withDiscoverSquareOnlineImages(entities: SoulLinkOnlineEntity[]): SoulLinkOnlineEntity[] {
  return entities.map((entity, index) => ({
    ...entity,
    avatar: DISCOVER_CARD_IMAGES[(index + 6) % DISCOVER_CARD_IMAGES.length],
    squareImage: true,
  }))
}

function fallbackRecentMemoriesFromHome(featuredCitySlices: HomeReferenceProps["featuredCitySlices"]): SoulLinkRecentMemory[] {
  const sourceItems = featuredCitySlices.length
    ? featuredCitySlices
    : [
      {
        id: "fallback-memory",
        name: "云上图书馆",
        description: "在这里，我第一次不再害怕黑夜。",
        image: soulLinkUserAvatar,
      },
    ]

  return sourceItems.slice(0, 2).map((slice, index) => ({
    id: `memory-${slice.id || index}`,
    title: `“${slice.description || (index === 0 ? "在这里，我第一次不再害怕黑夜。" : "谢谢你，陪我等到了黎明。")}”`,
    source: `来自 ${slice.name || "某个坐标"}`,
    meta: `${index * 3 + 2} 小时前`,
    image: slice.image || soulLinkUserAvatar,
    to: targetFor(slice.id),
  }))
}

function SoulLinkPanelShell({
  artboard,
  variant,
  box,
  children,
  className,
  forceVisible = false,
}: {
  artboard: Artboard
  variant: Variant
  box: { x: number; y: number; w: number; h: number }
  children: ReactNode
  className?: string
  forceVisible?: boolean
}) {
  const isBlack = variant === "black"
  return (
    <section
      className={cx(
        "absolute z-30 rounded-[1.55rem] border p-[1.55%]",
        forceVisible ? "opacity-100" : "pointer-events-none opacity-0",
        isBlack
          ? "rounded-[0.55rem] border-cyan-300/14 bg-[#020710]/96 text-cyan-50 shadow-[0_0_0_1px_rgba(34,211,238,0.04)]"
          : "border-white/80 bg-white text-slate-700 shadow-[0_18px_44px_rgba(85,103,160,0.13)]",
        className,
      )}
      style={boxStyle(artboard, box.x, box.y, box.w, box.h)}
    >
      {children}
    </section>
  )
}

function SoulLinkOnlineStatus({ status, variant, compact = false }: { status: string; variant: Variant; compact?: boolean }) {
  const isBlack = variant === "black"
  const isOnline = /在线|online/i.test(status)
  return (
    <span
      data-soul-link-online-status="real-text"
      className={cx(
        "inline-flex shrink-0 items-center gap-1 font-bold leading-none",
        compact ? "text-[9px]" : "text-[10px]",
        isOnline
          ? isBlack
            ? "text-emerald-300"
            : "text-emerald-400"
          : isBlack
            ? "text-cyan-100/48"
            : "text-slate-400",
      )}
    >
      {status}
    </span>
  )
}

function SoulLinkOnlineEntityRow({ entity, variant, compact = false }: { entity: SoulLinkOnlineEntity; variant: Variant; compact?: boolean }) {
  const isBlack = variant === "black"
  const rowClass = cx(
    "flex touch-manipulation items-center rounded-xl outline-none transition focus:ring-4 focus:ring-violet-400/40",
    compact ? "min-h-11 gap-2.5" : "min-h-[52px] gap-3",
    isBlack ? "hover:bg-cyan-300/6" : "hover:bg-violet-50/70",
  )
  const staticRowClass = cx(
    "flex items-center rounded-xl",
    compact ? "min-h-11 gap-2.5" : "min-h-[52px] gap-3",
  )
  const avatarSizeClass = compact ? "h-8 w-8" : "h-9 w-9"
  const content = (
    <>
      <span className={cx("relative shrink-0", avatarSizeClass)}>
        <img
          data-soul-link-online-avatar="real-image"
          data-soul-link-discover-square-image={entity.squareImage ? "512x512" : undefined}
          src={entity.avatar}
          alt={`${entity.name} 头像`}
          className={cx(avatarSizeClass, "rounded-full border object-cover", isBlack ? "border-cyan-300/18" : "border-violet-100")}
          loading="lazy"
          decoding="async"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span data-soul-link-online-name="real-text" className={cx("block truncate font-black", isBlack ? (compact ? "text-[0.72rem] leading-4" : "text-xs leading-4") : (compact ? "text-[0.78rem] leading-4" : "text-[13px] leading-4"), isBlack ? "text-cyan-50" : "text-slate-700")}>{entity.name}</span>
        <span data-soul-link-online-location="real-text" className={cx("mt-0.5 block truncate font-bold", isBlack ? (compact ? "text-[9px] leading-3" : "text-[10px] leading-4") : (compact ? "text-[10px] leading-3" : "text-[11px] leading-4"), isBlack ? "text-cyan-100/48" : "text-slate-400")}>{entity.location}</span>
      </span>
      <SoulLinkOnlineStatus status={entity.status} variant={variant} compact={compact} />
    </>
  )

  if (entity.to) {
    return (
      <Link to={entity.to} onMouseDown={suppressMouseFocus} className={rowClass}>
        {content}
      </Link>
    )
  }

  return <div className={staticRowClass}>{content}</div>
}

function SoulLinkOnlineEntitiesPanel({
  artboard,
  variant,
  box,
  entities,
  forceVisible = false,
}: {
  artboard: Artboard
  variant: Variant
  box: { x: number; y: number; w: number; h: number }
  entities: SoulLinkOnlineEntity[]
  forceVisible?: boolean
}) {
  const isBlack = variant === "black"
  const isCompact = forceVisible
  const visibleEntities = entities.slice(0, 3)
  return (
    <SoulLinkPanelShell artboard={artboard} variant={variant} box={box} forceVisible={forceVisible} className={cx("flex flex-col p-4", isCompact ? "gap-2.5" : "gap-3")}>
      <header className="flex items-center justify-between gap-3">
        <span className={cx("block font-black leading-none", isBlack ? "text-sm text-cyan-50" : "text-[15px] text-slate-800")}>{isBlack ? "ONLINE ENTITIES" : "在线的灵魂"}</span>
        <Link to="/home-me" onMouseDown={suppressMouseFocus} className={cx("font-black leading-none outline-none transition focus:ring-4 focus:ring-violet-400/40", isBlack ? "text-[10px] text-cyan-300" : "text-[11px] text-violet-300")}>
          {isBlack ? "查看全部" : "查看全部"} →
        </Link>
      </header>
      <div data-soul-link-online-panel="real-list" className={cx("flex flex-col overflow-hidden", isBlack ? "divide-y divide-cyan-300/12" : "divide-y divide-slate-200/60")}>
        {visibleEntities.length ? (
          visibleEntities.map((entity) => <SoulLinkOnlineEntityRow key={entity.id} entity={entity} variant={variant} compact={isCompact} />)
        ) : (
          <p className={cx("flex flex-col items-center gap-2 py-8 text-center text-sm font-bold", isBlack ? "text-cyan-100/48" : "text-slate-400")}>
            {!isBlack ? <Bell size={24} strokeWidth={2.4} className="text-violet-300" /> : null}
            暂时没有在线灵魂
          </p>
        )}
      </div>
    </SoulLinkPanelShell>
  )
}

function SoulLinkPanelHeader({ title, eyebrow, variant }: { title: string; eyebrow?: string; variant: Variant }) {
  const isBlack = variant === "black"
  return (
    <header className="flex items-start justify-between gap-3">
      <span>
        <span className={cx("block font-black leading-tight", isBlack ? "text-[clamp(0.78rem,0.96vw,1.02rem)] text-cyan-50" : "text-[clamp(0.88rem,1.05vw,1.12rem)] text-slate-800")}>{title}</span>
        {eyebrow ? <span className={cx("mt-1 block font-black uppercase tracking-[0.1em]", isBlack ? "text-[clamp(0.5rem,0.62vw,0.68rem)] text-cyan-100/45" : "text-[clamp(0.58rem,0.7vw,0.76rem)] text-slate-400")}>{eyebrow}</span> : null}
      </span>
      <span className={cx("grid h-7 w-7 shrink-0 place-items-center rounded-xl", isBlack ? "bg-cyan-300/10 text-cyan-300" : "bg-violet-50 text-violet-400")}>
        {isBlack ? (
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <rect x="4" y="10" width="2.6" height="8" rx="1.3" />
            <rect x="9" y="6" width="2.6" height="12" rx="1.3" />
            <rect x="14" y="12" width="2.6" height="6" rx="1.3" />
            <rect x="19" y="4" width="2.6" height="14" rx="1.3" />
          </svg>
        ) : (
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <rect x="4" y="11" width="2.6" height="7" rx="1.3" />
            <rect x="9" y="7" width="2.6" height="11" rx="1.3" />
            <rect x="14" y="13" width="2.6" height="5" rx="1.3" />
            <rect x="19" y="5" width="2.6" height="13" rx="1.3" />
          </svg>
        )}
      </span>
    </header>
  )
}

function SoulLinkFeedItemRow({ item, variant, compact = false }: { item: SoulLinkFeedItem; variant: Variant; compact?: boolean }) {
  const isBlack = variant === "black"
  const rowClass = cx(
    "flex touch-manipulation items-center rounded-2xl outline-none transition focus:ring-4 focus:ring-violet-400/40",
    compact ? "min-h-12 gap-2.5" : "min-h-14 gap-3",
    isBlack ? "hover:bg-cyan-300/6" : "hover:bg-violet-50/70",
  )
  const staticRowClass = cx(
    "flex items-center rounded-2xl",
    compact ? "min-h-12 gap-2.5" : "min-h-14 gap-3",
  )
  const content = (
    <>
      <img
        data-soul-link-feed-thumb="real-image"
        data-soul-link-discover-square-image={item.squareImage ? "512x512" : undefined}
        src={item.image}
        alt={`${item.title} 缩略图`}
        className={cx(compact ? "h-10 w-10" : "h-11 w-11", "shrink-0 rounded-full border object-cover", isBlack ? "border-cyan-300/18" : "border-violet-100")}
        loading="lazy"
        decoding="async"
      />
      <span className="min-w-0 flex-1">
        <span data-soul-link-feed-title="real-text" className={cx("block truncate font-black", isBlack ? (compact ? "text-[0.82rem] leading-4" : "text-sm") : (compact ? "text-[0.88rem] leading-4" : "text-[15px]"), isBlack ? "text-cyan-50" : "text-slate-700")}>{item.title}</span>
        <span className={cx("mt-1 block truncate font-bold", isBlack ? (compact ? "text-[0.72rem] leading-4" : "text-xs") : (compact ? "text-[0.78rem] leading-4" : "text-[13px]"), isBlack ? "text-cyan-100/48" : "text-slate-400")}>{item.subtitle}</span>
      </span>
      <span className={cx("shrink-0 font-black", isBlack ? (compact ? "text-[0.72rem]" : "text-xs") : (compact ? "text-[0.78rem]" : "text-[13px]"), isBlack ? "text-cyan-100/45" : "text-slate-400")}>{item.meta}</span>
    </>
  )

  if (item.to) {
    return (
      <Link to={item.to} onMouseDown={suppressMouseFocus} className={rowClass}>
        {content}
      </Link>
    )
  }

  return <div className={staticRowClass}>{content}</div>
}

function SoulLinkFeedPanel({
  artboard,
  variant,
  box,
  title,
  eyebrow,
  items,
  actionLabel,
  actionTo = "/discover",
  forceVisible = false,
}: {
  artboard: Artboard
  variant: Variant
  box: { x: number; y: number; w: number; h: number }
  title: string
  eyebrow?: string
  items: SoulLinkFeedItem[]
  actionLabel?: string
  actionTo?: string
  forceVisible?: boolean
}) {
  const isBlack = variant === "black"
  const isCompact = forceVisible
  const visibleItems = items.slice(0, 3)
  return (
    <SoulLinkPanelShell artboard={artboard} variant={variant} box={box} forceVisible={forceVisible} className={cx("flex flex-col", isCompact ? "gap-3" : "gap-4")}>
      <SoulLinkPanelHeader title={title} eyebrow={eyebrow} variant={variant} />
      <div data-soul-link-feed-panel="real-list" className={cx("flex flex-col overflow-hidden", isBlack ? "divide-y divide-cyan-300/12" : "divide-y divide-slate-200/60")}>
        {visibleItems.length ? (
          visibleItems.map((item) => <SoulLinkFeedItemRow key={item.id} item={item} variant={variant} compact={isCompact} />)
        ) : (
          <p className={cx("py-8 text-center text-sm font-bold", isBlack ? "text-cyan-100/48" : "text-slate-400")}>暂无新的坐标信号</p>
        )}
      </div>
      {actionLabel ? (
        <Link to={actionTo} onMouseDown={suppressMouseFocus} className={cx("mt-auto inline-flex touch-manipulation items-center justify-center gap-2 rounded-2xl font-black outline-none transition focus:ring-4 focus:ring-violet-400/40", isCompact ? "min-h-8 text-[0.82rem]" : "min-h-9 text-sm", isBlack ? "text-cyan-300 hover:bg-cyan-300/8" : "text-violet-500 hover:bg-violet-50")}>
          {actionLabel}
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </SoulLinkPanelShell>
  )
}

function SoulLinkDailyQuotePanel({
  artboard,
  variant,
  box,
  quote,
  forceVisible = false,
}: {
  artboard: Artboard
  variant: Variant
  box: { x: number; y: number; w: number; h: number }
  quote: SoulLinkDailyQuote
  forceVisible?: boolean
}) {
  const isBlack = variant === "black"
  return (
    <SoulLinkPanelShell artboard={artboard} variant={variant} box={box} forceVisible={forceVisible} className={cx("overflow-hidden", !isBlack && "[padding:16px_20px]")}>
      <div data-soul-link-daily-quote="real-text" className="relative z-10">
        <p className={cx("text-sm font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>{isBlack ? "RECENT ECHO" : quote.title}</p>
        <blockquote className={cx("font-bold", isBlack ? "mt-4 max-w-[14rem] text-[clamp(0.82rem,0.9vw,1rem)] leading-7 text-cyan-100/62" : "mt-3 text-[clamp(0.68rem,0.76vw,0.82rem)] leading-5 text-slate-500")}>“{quote.quote}”</blockquote>
        {quote.source ? <p className={cx("mt-2 text-xs font-bold", isBlack ? "text-cyan-100/42" : "text-slate-400")}>— {quote.source}</p> : null}
      </div>
      {isBlack ? (
        <img src={homeBlackRecentEchoWaveform} alt="" aria-hidden="true" className="absolute bottom-2 right-2 h-16 w-28 object-contain opacity-70" loading="lazy" decoding="async" />
      ) : (
        <UserCutImage src={lightPlaneIcon} className="absolute bottom-2 right-3 h-16 w-16 rounded-full opacity-35" scale={2.2} />
      )}
    </SoulLinkPanelShell>
  )
}

function SoulLinkRecentMemoryRow({ memory, variant }: { memory: SoulLinkRecentMemory; variant: Variant }) {
  const isBlack = variant === "black"
  const content = (
    <>
      <img
        data-soul-link-memory-thumb="real-image"
        src={memory.image}
        alt={`${memory.source} 记忆缩略图`}
        className={cx("h-9 w-11 shrink-0 rounded-xl border object-cover", isBlack ? "border-cyan-300/18" : "border-slate-100")}
        loading="lazy"
        decoding="async"
      />
      <span className="min-w-0 flex-1">
        <span data-soul-link-memory-title="real-text" className={cx("block truncate text-[0.72rem] font-black leading-4", isBlack ? "text-cyan-50" : "text-slate-700")}>{memory.title}</span>
        <span data-soul-link-memory-source="real-text" className={cx("mt-0.5 block truncate text-[0.6rem] font-bold", isBlack ? "text-cyan-100/46" : "text-slate-400")}>{memory.source} · {memory.meta}</span>
      </span>
    </>
  )

  if (memory.to) {
    return (
      <Link to={memory.to} onMouseDown={suppressMouseFocus} className={cx("flex min-h-10 touch-manipulation items-center gap-2 rounded-2xl outline-none transition focus:ring-4 focus:ring-violet-400/40", isBlack ? "hover:bg-cyan-300/6" : "hover:bg-violet-50/70")}>
        {content}
      </Link>
    )
  }

  return <div className="flex min-h-10 items-center gap-2 rounded-2xl">{content}</div>
}

function SoulLinkRecentMemoriesPanel({
  artboard,
  variant,
  memories,
  forceVisible = false,
}: {
  artboard: Artboard
  variant: Variant
  memories: SoulLinkRecentMemory[]
  forceVisible?: boolean
}) {
  const isBlack = variant === "black"
  const visibleMemories = memories.slice(0, 2)
  return (
    <SoulLinkPanelShell artboard={artboard} variant={variant} box={HOME_LAYOUT.bottomRail.recentMemories} forceVisible={forceVisible} className="flex flex-col gap-1.5 !p-3">
      <header className="flex items-center justify-between gap-3">
        <h2 className={cx("text-[0.82rem] font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>{isBlack ? "MEMORY STREAM" : "最近的记忆"}</h2>
        <Link to="/home-me" onMouseDown={suppressMouseFocus} className={cx("text-[0.62rem] font-black outline-none transition focus:ring-4 focus:ring-violet-400/40", isBlack ? "text-cyan-300" : "text-slate-400")}>查看全部 →</Link>
      </header>
      <div data-soul-link-recent-memories="real-list" className={cx("flex flex-col overflow-hidden", isBlack ? "divide-y divide-cyan-300/12" : "divide-y divide-slate-200/60")}>
        {visibleMemories.length ? (
          visibleMemories.map((memory) => <SoulLinkRecentMemoryRow key={memory.id} memory={memory} variant={variant} />)
        ) : (
          <p className={cx("py-7 text-center text-sm font-bold", isBlack ? "text-cyan-100/48" : "text-slate-400")}>暂时没有新的记忆</p>
        )}
      </div>
    </SoulLinkPanelShell>
  )
}

function guideToneClasses(accent: SoulLinkGuideCard["accent"], variant: Variant) {
  const isBlack = variant === "black"
  if (isBlack) {
    switch (accent) {
      case "rose":
        return "border-rose-300/18 bg-rose-300/8 text-rose-100"
      case "blue":
        return "border-cyan-300/18 bg-cyan-300/8 text-cyan-100"
      case "cyan":
        return "border-sky-300/18 bg-sky-300/8 text-sky-100"
      default:
        return "border-violet-300/18 bg-violet-300/8 text-violet-100"
    }
  }

  switch (accent) {
    case "rose":
      return "border-rose-100 bg-rose-50 text-rose-500"
    case "blue":
      return "border-sky-100 bg-sky-50 text-indigo-500"
    case "cyan":
      return "border-cyan-100 bg-cyan-50 text-cyan-600"
    default:
      return "border-violet-100 bg-violet-50 text-violet-500"
  }
}

function SoulLinkGuideGlyph({ accent, variant }: { accent: SoulLinkGuideCard["accent"]; variant: Variant }) {
  const isBlack = variant === "black"
  return (
    <svg
      data-soul-link-guide-image="real-svg"
      role="img"
      aria-label="探索指南图标"
      className={cx("absolute bottom-1.5 right-1.5 h-8 w-8 opacity-45", isBlack ? "text-current" : accent === "rose" ? "text-rose-300" : accent === "blue" ? "text-indigo-300" : "text-violet-300")}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 15h24l7 8v26H17z" />
      <path d="M41 15v9h8" />
      <path d="m24 38 6-6 5 5 6-9" />
      <path d="M22 48h18" />
    </svg>
  )
}

function SoulLinkGuideCardView({ card, variant }: { card: SoulLinkGuideCard; variant: Variant }) {
  const content = (
    <>
      <span data-soul-link-guide-title="real-text" className="relative z-10 block text-[0.68rem] font-black">{card.title}</span>
      <span data-soul-link-guide-text="real-text" className="relative z-10 mt-1.5 block text-[0.72rem] font-black leading-4 opacity-80">{card.text}</span>
      {card.image && variant !== "black" ? (
        <img data-soul-link-guide-image="real-image" src={card.image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full origin-center scale-[1.14] object-cover" loading="lazy" decoding="async" />
      ) : card.image ? (
        <img data-soul-link-guide-image="real-image" src={card.image} alt={`${card.title} 图标`} className="absolute bottom-1.5 right-1.5 h-8 w-8 object-contain opacity-55" loading="lazy" decoding="async" />
      ) : (
        <SoulLinkGuideGlyph accent={card.accent} variant={variant} />
      )}
    </>
  )
  const className = cx("relative h-full min-h-[4.7rem] overflow-hidden rounded-2xl border p-3 text-left outline-none transition focus:ring-4 focus:ring-violet-400/40", guideToneClasses(card.accent, variant))

  if (card.to) {
    return <Link to={card.to} onMouseDown={suppressMouseFocus} className={className}>{content}</Link>
  }

  return <div className={className}>{content}</div>
}

function SoulLinkGuidePanel({ artboard, variant, cards, forceVisible = false }: { artboard: Artboard; variant: Variant; cards: SoulLinkGuideCard[]; forceVisible?: boolean }) {
  const isBlack = variant === "black"
  const visibleCards = cards.slice(0, 3)
  const cardsWithLightBackgrounds = visibleCards.map((card, index) => (
    isBlack ? { ...card, image: card.image || BLACK_GUIDE_ICONS[index] } : { ...card, image: card.image || LIGHT_GUIDE_BACKGROUNDS[index] }
  ))
  return (
    <SoulLinkPanelShell artboard={artboard} variant={variant} box={HOME_LAYOUT.bottomRail.guideCards} forceVisible={forceVisible} className="flex flex-col gap-2 !p-3">
      <header className="flex items-center justify-between gap-3">
        <h2 className={cx("text-[0.82rem] font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>{isBlack ? "EXPLORATION GUIDE" : "探索指南"}</h2>
        <Link to="/quests" onMouseDown={suppressMouseFocus} className={cx("text-[0.62rem] font-black outline-none transition focus:ring-4 focus:ring-violet-400/40", isBlack ? "text-cyan-300" : "text-slate-400")}>查看全部 →</Link>
      </header>
      <div data-soul-link-guide-panel="real-cards" className="grid flex-1 grid-cols-3 gap-3 overflow-hidden">
        {cardsWithLightBackgrounds.map((card) => <SoulLinkGuideCardView key={card.id} card={card} variant={variant} />)}
      </div>
    </SoulLinkPanelShell>
  )
}

function SoulLinkWorldStatsPanel({ artboard, variant, stats, forceVisible = false }: { artboard: Artboard; variant: Variant; stats: SoulLinkWorldStat[]; forceVisible?: boolean }) {
  const isBlack = variant === "black"
  const visibleStats = stats.length ? stats.slice(0, 4) : DEFAULT_WORLD_STATS
  return (
    <SoulLinkPanelShell artboard={artboard} variant={variant} box={HOME_LAYOUT.bottomRail.worldStats} forceVisible={forceVisible} className="overflow-hidden p-[1.25%]">
      {!isBlack ? (
        <img data-soul-link-world-stats-deco="real-image" src={lightPaperPlaneSoft} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full origin-center scale-[1.18] object-cover" loading="lazy" decoding="async" />
      ) : null}
      <div data-soul-link-world-stats="real-data" className="relative z-10 flex h-full flex-col">
        <header className="flex items-center gap-1.5">
          <h2 className={cx("text-[0.9rem] font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>{isBlack ? "WORLD STATS" : "今日世界统计"}</h2>
          <Info size={12} strokeWidth={3} className={cx("shrink-0", isBlack ? "text-cyan-100/56" : "text-slate-400")} />
        </header>
        <div className="mt-auto grid grid-cols-4 divide-x divide-slate-200/70">
          {visibleStats.map((stat) => (
            <div key={stat.id} className="px-3 text-center first:pl-0 last:pr-0">
              <p data-soul-link-world-stat-value="real-text" className={cx("text-[clamp(1rem,1.35vw,1.45rem)] font-black leading-tight", isBlack ? "text-cyan-200" : "text-violet-500")}>{stat.value}</p>
              <p data-soul-link-world-stat-label="real-text" className={cx("mt-2 truncate text-[0.72rem] font-black", isBlack ? "text-cyan-100/46" : "text-slate-500")}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
      {isBlack ? (
        <img data-soul-link-world-stats-deco="real-image" src={homeBlackWorldStatsSparkline} alt="" aria-hidden="true" className="absolute bottom-0 right-2 h-20 w-56 object-contain opacity-42" loading="lazy" decoding="async" />
      ) : null}
    </SoulLinkPanelShell>
  )
}

function ArtboardShell({ artboard, variant, kind, children }: { artboard: Artboard; variant: Variant; kind: "home" | "discover"; children: ReactNode }) {
  const isHome = kind === "home"
  const isDiscover = kind === "discover"
  return (
    <main
      data-soul-link-real-dom="true"
      data-soul-link-variant={variant}
      className="min-h-screen overflow-x-hidden"
      style={{ background: artboard.background }}
    >
      <section
        id={isDiscover ? "discover-mainline" : undefined}
        data-soul-link-reference={artboard.marker}
        data-soul-link-dom={kind}
        data-soul-link-design-lock="owner-reference-1-to-1"
        className={cx(
          "relative mx-auto w-full select-none",
          isDiscover && "scroll-mt-28",
          isHome || isDiscover ? "min-h-screen overflow-visible md:min-h-0 md:overflow-hidden md:aspect-[1536/1024]" : "overflow-hidden",
        )}
        style={{
          maxWidth: `${artboard.width}px`,
          aspectRatio: `${artboard.width} / ${artboard.height}`,
          background: artboard.background,
        }}
      >
        {artboard.slices.map((slice) => (
          <img
            key={slice.alt}
            src={slice.src}
            srcSet={`${slice.src} 1x, ${slice.src2x} 2x`}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="absolute block h-full w-full object-fill"
            style={boxStyle(artboard, slice.x, slice.y, slice.w, slice.h)}
          />
        ))}
        {children}
      </section>
    </main>
  )
}

function OverlayLink({ artboard, hotspot, className }: { artboard: Artboard; hotspot: Hotspot; className?: string }) {
  return (
    <Link
      to={hotspot.to}
      aria-label={hotspot.label}
      title={hotspot.label}
      onMouseDown={suppressMouseFocus}
      className={cx(
        "absolute z-10 min-h-11 touch-manipulation rounded-xl opacity-0 outline-none transition focus:opacity-100 focus:ring-4 focus:ring-violet-400/70",
        className,
      )}
      style={boxStyle(artboard, hotspot.x, hotspot.y, hotspot.w, hotspot.h)}
    />
  )
}

function OverlayButton({ artboard, label, onClick, x, y, w, h }: { artboard: Artboard; label: string; onClick: () => void; x: number; y: number; w: number; h: number }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      onMouseDown={suppressMouseFocus}
      className="absolute z-10 min-h-11 touch-manipulation rounded-full opacity-0 outline-none transition focus:opacity-100 focus:ring-4 focus:ring-violet-400/70"
      style={boxStyle(artboard, x, y, w, h)}
    />
  )
}

function OverlayText({ artboard, children, x, y, w, h }: { artboard: Artboard; children: ReactNode; x: number; y: number; w: number; h: number }) {
  return (
    <span className="pointer-events-none absolute z-10 opacity-0" style={boxStyle(artboard, x, y, w, h)}>
      {children}
    </span>
  )
}

function OverlayInput({
  artboard,
  value,
  onChange,
  onSubmit,
  placeholder,
  variant = "light",
  forceVisible = false,
  x,
  y,
  w,
  h,
}: {
  artboard: Artboard
  value: string
  onChange?: (value: string) => void
  onSubmit?: () => void
  placeholder: string
  variant?: Variant
  forceVisible?: boolean
  x: number
  y: number
  w: number
  h: number
}) {
  const shellToneClass =
    variant === "black"
      ? "border-cyan-300/28 bg-[#061226] text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.14),inset_0_0_0_1px_rgba(103,232,249,0.1)]"
      : "border-white/70 bg-white text-[#99a4d3] shadow-[0_10px_28px_rgba(74,98,176,0.12),inset_0_0_0_1px_rgba(255,255,255,0.78)]"
  const inputToneClass =
    variant === "black"
      ? "text-cyan-50 caret-cyan-300 placeholder:text-cyan-100/52 focus:placeholder:text-cyan-100/40"
      : "text-slate-900 caret-violet-500 placeholder:text-slate-400/90 focus:placeholder:text-slate-400/70"
  const keyToneClass =
    variant === "black"
      ? "border-cyan-300/16 bg-cyan-100/8 text-cyan-100/70"
      : "bg-slate-100/80 text-slate-400"

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown as any)
    return () => window.removeEventListener("keydown", handleGlobalKeyDown as any)
  }, [])

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || !onSubmit) return
    event.preventDefault()
    onSubmit()
  }

  return (
    <label
      data-soul-link-search={onChange ? "real-input" : undefined}
      className={cx(
        "absolute z-20 flex min-h-11 cursor-text touch-manipulation items-center rounded-full border transition focus-within:ring-2",
        forceVisible ? "opacity-100" : "opacity-0 focus-within:opacity-100",
        shellToneClass,
      )}
      style={boxStyle(artboard, x, y, w, h)}
    >
      <span className="sr-only">搜索地点、角色、记忆或关键词</span>
      {variant === "black" ? (
        <Search size={18} strokeWidth={2.6} className="pointer-events-none absolute left-[7.5%] opacity-60" />
      ) : (
        <Search size={18} strokeWidth={2.75} className="pointer-events-none absolute left-[7.5%] text-[#90a5ff] opacity-72" />
      )}
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        onKeyDown={handleKeyDown}
        readOnly={!onChange}
        placeholder={placeholder}
        className={cx(
          "h-full min-h-11 w-full rounded-full border-0 bg-transparent py-0 pl-[18%] pr-[18%] font-semibold outline-none transition",
          variant === "black" ? "text-sm" : "text-[15px]",
          inputToneClass,
        )}
      />
      <span aria-hidden="true" className={cx("pointer-events-none absolute right-[6%] grid h-8 w-8 place-items-center rounded-xl text-sm font-black leading-none", keyToneClass)}>
        /
      </span>
    </label>
  )
}

function SoulLinkHomeCoordinateCard({
  artboard,
  box,
  slice,
  index,
  variant,
  to,
}: {
  artboard: Artboard
  box: readonly [number, number, number, number]
  slice?: HomeReferenceProps["featuredCitySlices"][number]
  index: number
  variant: Variant
  to?: string
}) {
  const isBlack = variant === "black"
  const card = homeCoordinateCardData(slice, index, variant)
  const [x, y, w, h] = box

  return (
    <Link
      to={to || targetFor(card.id)}
      data-soul-link-home-card="real-card"
      data-soul-link-home-light-card={variant === "light" ? "real-card" : undefined}
      onMouseDown={suppressMouseFocus}
      className={cx(
        "absolute z-20 min-h-11 touch-manipulation overflow-hidden rounded-[1.2rem] border outline-none transition hover:-translate-y-1 focus:ring-4",
        isBlack
          ? "border-cyan-300/16 bg-[#06111f]/94 text-cyan-50 shadow-[0_16px_36px_rgba(0,0,0,0.38),0_0_26px_rgba(34,211,238,0.08)] hover:border-cyan-300/28 hover:shadow-[0_22px_46px_rgba(0,0,0,0.48),0_0_34px_rgba(34,211,238,0.12)] focus:ring-cyan-300/35"
          : "border-white/90 bg-white text-slate-800 shadow-[0_18px_42px_rgba(108,123,178,0.14)] hover:shadow-[0_22px_48px_rgba(108,123,178,0.2)] focus:ring-violet-400/35",
      )}
      style={boxStyle(artboard, x, y, w, h)}
    >
      <div className="relative h-[45%] overflow-hidden">
        <img src={card.image} alt={`${card.name} 坐标封面`} className={cx("h-full w-full object-cover", isBlack ? "opacity-76 saturate-[1.08]" : "")} loading="lazy" decoding="async" />
        {isBlack ? <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#06111f]/70 via-transparent to-transparent" /> : null}
        <span
          className={cx(
            "absolute left-3 top-3 rounded-full px-3 py-1 text-[clamp(0.46rem,0.68vw,0.72rem)] font-black shadow-[0_8px_18px_rgba(118,91,255,0.22)]",
            isBlack ? "border border-cyan-200/20 bg-cyan-300/14 text-cyan-50" : "bg-violet-500/82 text-white",
          )}
        >
          {card.tag}
        </span>
      </div>
      <div className="flex h-[55%] flex-col px-[7%] py-[5%]">
        <h3 data-soul-link-home-card-title="real-text" className={cx("truncate text-[clamp(0.68rem,0.9vw,1rem)] font-black leading-tight", isBlack ? "text-cyan-50" : "text-slate-800")}>{card.name}</h3>
        <p className={cx("mt-[5%] line-clamp-2 text-[clamp(0.5rem,0.74vw,0.82rem)] font-bold leading-5", isBlack ? "text-cyan-100/50" : "text-slate-400")}>{card.description}</p>
        <div className={cx("mt-auto flex items-center justify-between gap-2 text-[clamp(0.48rem,0.68vw,0.72rem)] font-bold", isBlack ? "text-cyan-100/45" : "text-slate-400")}>
          <span className="flex min-w-0 items-center gap-1 truncate">
            {isBlack ? (
              <MessageCircle size={14} strokeWidth={2.6} className="shrink-0 text-cyan-300/70" />
            ) : (
              <UserCutImage src={lightMessageIcon} className="h-5 w-5 rounded-full" scale={2.2} />
            )}
            {card.visitLabel}
          </span>
          <span aria-hidden="true" className={isBlack ? "text-cyan-300/58" : "text-violet-300"}>♡</span>
        </div>
      </div>
    </Link>
  )
}

function SoulLinkDiscoverCard({
  artboard,
  box,
  tavern,
  index,
  variant,
}: {
  artboard: Artboard
  box: readonly [number, number, number, number]
  tavern?: Tavern
  index: number
  variant: Variant
}) {
  const [x, y, w, h] = box
  const card = discoverCardData(tavern, index)
  const isBlack = variant === "black"

  return (
    <Link
      to={targetFor(tavern?.id)}
      data-soul-link-discover-card="real-card"
      onMouseDown={suppressMouseFocus}
      className={cx(
        "absolute z-20 flex touch-manipulation gap-3 overflow-hidden rounded-[1.1rem] border p-3 outline-none transition duration-300 hover:scale-[1.02] hover:-translate-y-0.5 focus:ring-4",
        isBlack
          ? "border-cyan-300/14 bg-[#061226]/92 text-cyan-50 shadow-[0_18px_38px_rgba(0,0,0,0.35),0_0_26px_rgba(34,211,238,0.08)] hover:border-cyan-300/26 hover:shadow-[0_22px_46px_rgba(0,0,0,0.42),0_0_40px_rgba(34,211,238,0.18)] focus:ring-cyan-300/35"
          : "border-white/90 bg-white/95 text-slate-800 shadow-[0_12px_32px_rgba(108,123,178,0.12)] hover:shadow-[0_16px_48px_rgba(108,123,178,0.22)] focus:ring-violet-400/35",
      )}
      style={boxStyle(artboard, x, y, w, h)}
    >
      <div className={cx("relative mt-1 aspect-square w-[39%] shrink-0 overflow-hidden rounded-[0.95rem]", isBlack ? "bg-cyan-300/8" : "bg-violet-50")}>
        <img data-soul-link-discover-card-cover="real-image" data-soul-link-discover-square-image="512x512" src={card.image} alt={`${card.name} 封面`} className={cx("h-full w-full object-cover", isBlack && "opacity-90 saturate-[1.05]")} loading="lazy" decoding="async" />
      </div>
      <div data-soul-link-discover-card-copy="real-text-layer" className="flex min-w-0 flex-1 flex-col py-1">
        <span className={cx("mb-2 inline-flex w-max max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-[10px] font-black", isBlack ? "bg-cyan-300/12 text-cyan-200" : "bg-violet-50 text-violet-500")}>
          <span aria-hidden="true">✦</span>
          {card.tag}
        </span>
        <h3 data-soul-link-discover-card-title="real-text" className={cx("truncate text-[15px] font-black leading-tight", isBlack ? "text-cyan-50" : "text-slate-800")}>{card.name}</h3>
        <p className={cx("mt-1.5 line-clamp-2 text-[12px] font-bold leading-[1.35rem]", isBlack ? "text-cyan-100/52" : "text-slate-400")}>{card.description}</p>
        <div data-first-minute-guide="soul-link-discover-card" className={cx("mt-2 rounded-[0.85rem] border px-2 py-1.5", isBlack ? "border-cyan-300/14 bg-cyan-300/[0.055]" : "border-violet-100 bg-violet-50/55")}>
          <p className={cx("truncate text-[10px] font-black", isBlack ? "text-cyan-200/80" : "text-violet-500")}>Why here · {card.experienceType}</p>
          <p className={cx("mt-0.5 line-clamp-2 text-[10px] font-bold leading-4", isBlack ? "text-cyan-100/44" : "text-slate-400")}>{card.whyHere}</p>
          <p className={cx("mt-1 truncate text-[10px] font-black", isBlack ? "text-cyan-300/72" : "text-violet-400")}>先试：{card.tryPrompt}</p>
        </div>
        <div className={cx("mt-auto grid gap-1 text-[10px] font-black", isBlack ? "text-cyan-100/44" : "text-slate-300")}>
          <span className="flex min-w-0 items-center gap-1 truncate">
            <MapPin size={12} strokeWidth={3} className={cx("shrink-0", isBlack ? "text-cyan-300/70" : "text-violet-300")} />
            {card.visitLabel}
          </span>
          <span className={cx("flex min-w-0 items-center gap-1 truncate", isBlack ? "text-cyan-300/72" : "text-violet-300")}>
            {card.characterLabel}
            <ArrowUpRight size={10} strokeWidth={4} />
          </span>
        </div>
      </div>
    </Link>
  )
}

function HomeCurrentCoordinateBadge({ artboard, variant }: { artboard: Artboard; variant: Variant }) {
  const isBlack = variant === "black"
  const box = HOME_LAYOUT.currentCoordinate
  return (
    <div
      data-soul-link-current-coordinate="shared"
      className={cx(
        "absolute z-10 rounded-[1.25rem] border px-5 py-4",
        isBlack
          ? "border-cyan-300/18 bg-[#020710]/78 shadow-[0_0_28px_rgba(34,211,238,0.1)]"
          : "border-white/90 bg-white/88 shadow-[0_18px_42px_rgba(118,133,190,0.16)]",
      )}
      style={boxStyle(artboard, box.x, box.y, box.w, box.h)}
    >
      <p className={cx("text-[clamp(0.44rem,0.62vw,0.66rem)] font-black", isBlack ? "text-cyan-100/48" : "text-slate-400")}>
        {isBlack ? "CURRENT NODE" : "当前坐标"}
      </p>
      <p className={cx("mt-2 flex items-center justify-between gap-2 text-[clamp(0.66rem,0.9vw,1rem)] font-black", isBlack ? "text-cyan-50" : "text-slate-700")}>
        {isBlack ? "NODE_07" : "云上图书馆"}
        {isBlack ? (
          <MapPin size={18} strokeWidth={2.6} className="shrink-0 text-cyan-300/80" />
        ) : (
          <UserCutImage src={lightPinIcon} className="h-5 w-5 shrink-0 rounded-full" scale={1.7} loading="eager" />
        )}
      </p>
    </div>
  )
}

function SoulLinkHomeMainSurface({
  artboard,
  featuredCitySlices,
  variant,
}: {
  artboard: Artboard
  featuredCitySlices: HomeReferenceProps["featuredCitySlices"]
  variant: Variant
}) {
  const isBlack = variant === "black"
  const heroBox = HOME_LAYOUT.hero
  const titleBox = HOME_LAYOUT.title
  const heroDecorations = HOME_LAYOUT.heroDecorations
  const recommendedHeaderBox = HOME_LAYOUT.recommendedHeader
  const cardBoxes = HOME_LAYOUT.cards
  const rightRailSurface = HOME_LAYOUT.rightRailSurface
  return (
    <>
      <div aria-hidden="true" className="absolute inset-0 z-0 overflow-hidden">
        {isBlack ? (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_26%,rgba(34,211,238,0.18),transparent_34%),linear-gradient(180deg,#06111f_0%,#020710_60%,#020710_100%)]" />
            <div className="absolute left-[28%] top-0 h-[72%] w-[48%] rounded-full bg-cyan-300/10 blur-3xl" />
          </>
        ) : (
          <img src={lightPlaneWash} alt="" className="h-full w-full object-cover opacity-60" draggable={false} decoding="async" />
        )}
      </div>
      <div
        aria-hidden="true"
        className={cx(
          "absolute z-0 overflow-hidden rounded-[2rem] border shadow-[0_24px_80px_rgba(116,135,190,0.14)]",
          isBlack ? "rounded-[0.45rem] border-transparent bg-[#020710] shadow-[0_0_34px_rgba(34,211,238,0.08)]" : "border-transparent bg-white",
        )}
        style={boxStyle(artboard, heroBox.x, heroBox.y, heroBox.w, heroBox.h)}
      >
        {isBlack ? (
          <>
            <div className="absolute inset-0 bg-[#020710]" />
            <img
              src={homeBlackHeroVisual}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center opacity-95"
              draggable={false}
              decoding="async"
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_42%,rgba(34,211,238,0.12),transparent_32%)]" />
          </>
        ) : (
          <img
            src={lightSkyCityBalcony}
            alt=""
            className="h-full w-full object-cover opacity-78"
            draggable={false}
            decoding="async"
          />
        )}
        <div className={cx("absolute inset-0", isBlack ? "bg-gradient-to-r from-[#020710]/96 via-[#020710]/44 to-[#020710]/6" : "bg-gradient-to-r from-white/92 via-white/72 to-white/22")} />
      </div>
      <div
        aria-hidden="true"
        className={cx("absolute z-0 overflow-hidden rounded-[1.75rem]", isBlack ? "bg-[#020710]" : "bg-white/92")}
        style={boxStyle(artboard, rightRailSurface.x, rightRailSurface.y, rightRailSurface.w, rightRailSurface.h)}
      >
        <div className={cx("absolute inset-0", isBlack ? "bg-gradient-to-b from-cyan-300/8 via-[#020710]/70 to-[#020710]" : "bg-white/72")} />
      </div>
      {isBlack ? (
        <>
          <span aria-hidden="true" className="absolute z-10 rounded-full bg-cyan-300/18 blur-2xl" style={boxStyle(artboard, heroDecorations.primary.x, heroDecorations.primary.y, heroDecorations.primary.w, heroDecorations.primary.h)} />
          <span aria-hidden="true" className="absolute z-10 rounded-full border border-cyan-200/15 bg-cyan-300/8" style={boxStyle(artboard, heroDecorations.secondary.x, heroDecorations.secondary.y, heroDecorations.secondary.w, heroDecorations.secondary.h)} />
        </>
      ) : (
        <>
          <UserCutImage src={lightPlaneIcon} className="absolute z-10 rounded-full opacity-85" style={boxStyle(artboard, heroDecorations.primary.x, heroDecorations.primary.y, heroDecorations.primary.w, heroDecorations.primary.h)} scale={2.2} loading="eager" />
          <span aria-hidden="true" className="absolute z-10 text-violet-400/70" style={boxStyle(artboard, heroDecorations.secondary.x, heroDecorations.secondary.y, heroDecorations.secondary.w, heroDecorations.secondary.h)}>
            ✦
          </span>
        </>
      )}
      <div className="absolute z-10" style={boxStyle(artboard, titleBox.x, titleBox.y, titleBox.w, titleBox.h)}>
        <p className={cx("text-[clamp(0.48rem,0.72vw,0.8rem)] font-black uppercase tracking-[0.24em]", isBlack ? "text-cyan-300/80" : "text-violet-400")}>{isBlack ? "ONLINE COORDINATE NETWORK" : "REAL COORDINATES / AI NPC"}</p>
        <h1
          data-soul-link-home-title="real-text"
          data-soul-link-home-light-title={variant === "light" ? "real-text" : undefined}
          className={cx("mt-3 max-w-[12em] text-[clamp(1.45rem,2.35vw,2.45rem)] font-black leading-[1.25] tracking-[-0.04em]", isBlack ? "text-cyan-50" : "text-slate-800")}
        >
          {isBlack ? (
            <>
              接入仍在回应的
              <br />
              数字坐标网络
            </>
          ) : (
            <>
              在每一个坐标里，
              <br />
              遇见另一种可能的自己。
            </>
          )}
        </h1>
        <p className={cx("mt-4 max-w-[32em] text-[clamp(0.58rem,0.9vw,0.95rem)] font-bold leading-7", isBlack ? "text-cyan-100/62" : "text-slate-500")}>
          {isBlack ? "在数据的海洋中，寻找仍在闪烁的信号。" : "连接仍在回应的灵魂，探索属于你的故事。"}
        </p>
      </div>
      <HomeCurrentCoordinateBadge artboard={artboard} variant={variant} />
      <div className="absolute z-10 flex items-center justify-between" style={boxStyle(artboard, recommendedHeaderBox.x, recommendedHeaderBox.y, recommendedHeaderBox.w, recommendedHeaderBox.h)}>
        <h2 className={cx("text-[clamp(0.72rem,1vw,1rem)] font-black", isBlack ? "uppercase tracking-[0.16em] text-cyan-50" : "text-slate-800")}>{isBlack ? "ACTIVE NODES" : "为你推荐的坐标"}</h2>
        <Link to="/discover" onMouseDown={suppressMouseFocus} className={cx("inline-flex min-h-9 touch-manipulation items-center gap-2 rounded-full px-3 text-[clamp(0.52rem,0.68vw,0.72rem)] font-black outline-none transition focus:ring-4", isBlack ? "text-cyan-300 hover:bg-cyan-300/8 focus:ring-cyan-300/35" : "text-slate-400 hover:bg-white/70 hover:text-violet-500 focus:ring-violet-400/35")}>
          查看全部 →
        </Link>
      </div>
      {cardBoxes.map((box, index) => (
        <SoulLinkHomeCoordinateCard
          key={`home-${variant}-real-card-${featuredCitySlices[index]?.id || index}`}
          artboard={artboard}
          box={box}
          slice={featuredCitySlices[index]}
          index={index}
          variant={variant}
          to={targetFor(featuredCitySlices[index]?.id)}
        />
      ))}
    </>
  )
}

function SoulLinkHomeMobile({
  featuredCitySlices,
  onToggleTheme,
  variant,
}: {
  featuredCitySlices: HomeReferenceProps["featuredCitySlices"]
  onToggleTheme: () => void
  variant: Variant
}) {
  const isBlack = variant === "black"
  const cards = HOME_LAYOUT.cards.map((_, index) => homeCoordinateCardData(featuredCitySlices[index], index, variant))
  return (
    <div className={cx("relative z-40 min-h-screen px-4 py-5 md:hidden", isBlack ? "bg-[#020710]" : "bg-[linear-gradient(180deg,#f4f8ff_0%,#eef4ff_46%,#fff_100%)]")}>
      <header className={cx("flex items-center justify-between rounded-[1.5rem] border p-3", isBlack ? "border-cyan-300/16 bg-[#061226]/92 shadow-[0_0_30px_rgba(34,211,238,0.12)]" : "border-white/80 bg-white/86 shadow-[0_18px_42px_rgba(108,123,178,0.14)]")}>
        <Link to="/" className="flex min-h-11 touch-manipulation items-center gap-3 rounded-2xl outline-none focus:ring-4 focus:ring-violet-400/35">
          {isBlack ? (
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-300/18 bg-cyan-300/10 text-cyan-200">
              <Send size={20} strokeWidth={2.6} />
            </span>
          ) : (
            <UserCutImage src={lightPlaneIcon} className="h-11 w-11 rounded-2xl" scale={2.4} loading="eager" />
          )}
          <span>
            <span className={cx("block text-base font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>FableMap</span>
            <span className={cx("block text-xs font-bold", isBlack ? "text-cyan-100/52" : "text-slate-400")}>真实坐标里的 AI 空间</span>
          </span>
        </Link>
        <button type="button" onClick={onToggleTheme} className={cx("grid h-11 w-11 touch-manipulation place-items-center rounded-2xl border", isBlack ? "border-cyan-300/16 bg-cyan-300/8 text-cyan-200" : "border-violet-100 bg-violet-50 text-violet-500")} aria-label="切换主题">
          ☼
        </button>
      </header>
      <section className={cx("relative mt-5 overflow-hidden rounded-[2rem] border p-5", isBlack ? "border-cyan-300/16 bg-[#061226]/82 shadow-[0_0_36px_rgba(34,211,238,0.12)]" : "border-white/80 bg-white/80 shadow-[0_22px_54px_rgba(108,123,178,0.16)]")}>
        {isBlack ? (
          <>
            <div aria-hidden="true" className="absolute inset-0 bg-[#020710]" />
            <img src={homeBlackHeroVisual} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-45" loading="lazy" decoding="async" />
          </>
        ) : (
          <img src={lightSkyCityBalcony} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-34" loading="lazy" decoding="async" />
        )}
        <div aria-hidden="true" className={cx("absolute inset-0", isBlack ? "bg-[#020710]/78" : "bg-white/78")} />
        <p className={cx("relative z-10 text-xs font-black uppercase tracking-[0.22em]", isBlack ? "text-cyan-300/78" : "text-violet-400")}>Real coordinates</p>
        <h1
          data-soul-link-home-title-mobile="real-text"
          data-soul-link-home-light-title-mobile={variant === "light" ? "real-text" : undefined}
          className={cx("relative z-10 mt-3 text-3xl font-black leading-tight tracking-[-0.04em]", isBlack ? "text-cyan-50" : "text-slate-800")}
        >
          {isBlack ? "接入仍在回应的数字坐标网络。" : "在每一个坐标里，遇见另一种可能的自己。"}
        </h1>
        <p className={cx("relative z-10 mt-3 text-sm font-bold leading-7", isBlack ? "text-cyan-100/58" : "text-slate-500")}>用真实地点打开一间空间，和主人配置的 AI NPC 对话、回访、留下记忆。</p>
        <div className="relative z-10 mt-5 flex gap-3">
          <Link to="/discover" className={cx("inline-flex min-h-11 flex-1 touch-manipulation items-center justify-center rounded-2xl px-4 text-sm font-black", isBlack ? "bg-cyan-300 text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.22)]" : "bg-violet-500 text-white shadow-[0_16px_32px_rgba(118,91,255,0.25)]")}>开始探索</Link>
          <Link to="/create" className={cx("inline-flex min-h-11 flex-1 touch-manipulation items-center justify-center rounded-2xl border px-4 text-sm font-black", isBlack ? "border-cyan-300/20 bg-cyan-300/8 text-cyan-100" : "border-violet-100 bg-white text-violet-500")}>创建空间</Link>
        </div>
      </section>
      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className={cx("font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>推荐坐标</h2>
          <Link to="/discover" className={cx("text-sm font-black", isBlack ? "text-cyan-300" : "text-violet-400")}>全部 →</Link>
        </div>
        <div className="grid gap-3">
          {cards.map((slice, index) => (
            <Link
              key={slice.id || `fallback-${index}`}
              to={targetFor(slice.id)}
              data-soul-link-home-card="real-card"
              data-soul-link-home-light-card={variant === "light" ? "real-card" : undefined}
              className={cx("flex min-h-28 touch-manipulation gap-3 rounded-[1.5rem] border p-3", isBlack ? "border-cyan-300/16 bg-[#061226]/90 shadow-[0_0_24px_rgba(34,211,238,0.08)]" : "border-white/80 bg-white shadow-[0_14px_34px_rgba(108,123,178,0.12)]")}
            >
              <img src={slice.image} alt={`${slice.name} 封面`} className="h-24 w-28 rounded-[1.15rem] object-cover" loading="lazy" decoding="async" />
              <span className="min-w-0 flex-1 py-1">
                <span data-soul-link-home-card-title="real-text" className={cx("block truncate font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>{slice.name}</span>
                <span className={cx("mt-2 line-clamp-2 block text-sm font-bold leading-6", isBlack ? "text-cyan-100/52" : "text-slate-400")}>{slice.description}</span>
                <span className={cx("mt-2 block text-xs font-black", isBlack ? "text-cyan-300" : "text-violet-400")}>{slice.tag}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function HomeHeroActions({ artboard, variant, forceVisible = false }: { artboard: Artboard; variant: Variant; forceVisible?: boolean }) {
  const isBlack = variant === "black"
  const playIconSize = 14
  const playIconStrokeWidth = 2.75
  const actions = HOME_LAYOUT.heroActions
  const primaryClass = isBlack
    ? "border-cyan-200/50 bg-cyan-300 text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.28)]"
    : "border-violet-300/45 bg-[#8e83ff] text-white shadow-[0_14px_28px_rgba(126,111,255,0.22)]"
  const secondaryClass = isBlack
    ? "border-cyan-300/35 bg-[#061226]/88 text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.12)]"
    : "border-slate-300/60 bg-white/86 text-slate-700 shadow-[0_10px_24px_rgba(74,98,176,0.1)]"

  return (
    <>
      <Link
        to="/discover"
        aria-label={isBlack ? "连接网络" : "开始探索"}
        onMouseDown={suppressMouseFocus}
        className={cx(
          "absolute z-20 flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-[1.15rem] border text-sm font-black transition hover:-translate-y-0.5 focus:outline-none focus:ring-4",
          forceVisible ? "opacity-100" : "opacity-0 focus:opacity-100",
          primaryClass,
        )}
        style={boxStyle(artboard, actions.primary.x, actions.primary.y, actions.primary.w, actions.primary.h)}
      >
        <span>{isBlack ? "连接网络" : "开始探索"}</span>
        {isBlack ? (
          <ArrowUpRight size={16} strokeWidth={3} className="opacity-70" />
        ) : (
          <UserCutImage src={lightArrowIcon} className="h-4 w-4" scale={2.8} />
        )}
      </Link>
      <Link
        to="/discover"
        aria-label={isBlack ? "扫描信号" : "观看世界介绍"}
        onMouseDown={suppressMouseFocus}
        className={cx(
          "absolute z-20 flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-[1.15rem] border text-sm font-black transition hover:-translate-y-0.5 focus:outline-none focus:ring-4",
          forceVisible ? "opacity-100" : "opacity-0 focus:opacity-100",
          secondaryClass,
        )}
        style={boxStyle(artboard, actions.secondary.x, actions.secondary.y, actions.secondary.w, actions.secondary.h)}
      >
        <span
          aria-hidden="true"
          className="grid h-7 w-7 shrink-0 place-items-center"
        >
          <Play
            size={playIconSize}
            fill="currentColor"
            strokeWidth={playIconStrokeWidth}
            className="ml-0.5"
          />
        </span>
        <span>{isBlack ? "扫描信号" : "观看世界介绍"}</span>
      </Link>
    </>
  )
}

function DiscoverFilterChip({
  label,
  onClick,
  muted = false,
  variant = "light",
}: {
  label: string
  onClick: () => void
  muted?: boolean
  variant?: Variant
}) {
  const isBlack = variant === "black"
  return (
    <button
      type="button"
      data-soul-link-discover-filter="real-button"
      onClick={onClick}
      onMouseDown={suppressMouseFocus}
      className={cx(
        "inline-flex min-h-9 touch-manipulation items-center justify-center gap-1.5 rounded-xl border px-3 text-[12px] font-black outline-none transition focus:ring-4 focus:ring-violet-400/30",
        isBlack
          ? muted
            ? "border-cyan-300/12 bg-cyan-300/[0.035] text-cyan-100/42 hover:border-cyan-300/24 hover:text-cyan-100"
            : "border-cyan-300/16 bg-cyan-300/[0.075] text-cyan-100 shadow-[0_10px_26px_rgba(0,0,0,0.22)] hover:-translate-y-0.5 hover:border-cyan-300/28 hover:text-cyan-50"
          : muted
            ? "border-slate-200 bg-white/50 text-slate-400 hover:border-violet-100 hover:text-violet-500"
            : "border-white/90 bg-white/84 text-[#66719c] shadow-[0_10px_26px_rgba(92,110,170,0.08)] hover:-translate-y-0.5 hover:text-violet-500",
      )}
    >
      <span aria-hidden="true" className={isBlack ? "text-cyan-300" : "text-violet-400"}>✧</span>
      {label}
    </button>
  )
}

function SoulLinkDiscoverFilterPanel({
  artboard,
  onClear,
  onTogglePlaceType,
  onToggleSpecialType,
  onToggleCategory,
  onPublicOnlyChange,
  onOpenOnlyChange,
  variant,
}: {
  artboard: Artboard
  onClear: () => void
  onTogglePlaceType: (placeTypeId: string) => void
  onToggleSpecialType: (specialTypeId: string) => void
  onToggleCategory: (label: string) => void
  onPublicOnlyChange: (value: boolean) => void
  onOpenOnlyChange: (value: boolean) => void
  variant: Variant
}) {
  const isBlack = variant === "black"
  function handleFilter(label: string) {
    if (label === "任何状态") return onClear()
    if (label === "稳定连接") return onOpenOnlyChange(true)
    if (label === "信号波动") return onPublicOnlyChange(true)
    if (label === "连接中断") return onToggleSpecialType("cultivation-retreat")
    if (label === "城市" || label === "室内") return onTogglePlaceType("bookstore")
    if (label === "自然") return onTogglePlaceType("cafe")
    if (label === "奇幻" || label === "未来" || label === "其他") return onToggleSpecialType("cultivation-retreat")
    return onToggleCategory(label)
  }

  return (
    <>
      <div className="absolute z-20 flex items-center gap-5" style={boxStyle(artboard, 226, 118, 970, 48)}>
        <span className={cx("mr-3 text-[16px] font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>快速探索</span>
        <DiscoverFilterChip variant={variant} label="全部" onClick={onClear} />
        <DiscoverFilterChip variant={variant} label="正在被探索" onClick={() => onOpenOnlyChange(true)} />
        <DiscoverFilterChip variant={variant} label="最近活跃" onClick={() => onPublicOnlyChange(true)} />
        <DiscoverFilterChip variant={variant} label="低频空间" onClick={() => onToggleSpecialType("cultivation-retreat")} />
        <DiscoverFilterChip variant={variant} label="回响最多" onClick={() => onToggleCategory("陪伴树洞")} />
        <DiscoverFilterChip variant={variant} label="更多筛选" onClick={() => onTogglePlaceType("bookstore")} muted />
      </div>
      <section
        data-soul-link-discover-filter-panel="real-dom"
        className={cx(
          "absolute z-20 grid grid-cols-[1.65fr_1.05fr_1fr] gap-5 rounded-[1.45rem] border p-5 shadow-[0_18px_54px_rgba(87,107,166,0.12)] backdrop-blur-xl",
          isBlack ? "border-cyan-300/14 bg-[#061226]/82 text-cyan-100" : "border-white/90 bg-white/86 text-slate-700",
        )}
        style={boxStyle(artboard, 222, 178, 796, 166)}
      >
        {DISCOVER_FILTER_GROUPS.map((group, groupIndex) => (
          <div key={group.title} className={cx("min-w-0", groupIndex > 0 ? (isBlack ? "border-l border-cyan-300/12 pl-6" : "border-l border-slate-200/70 pl-6") : "")}>
            <h2 className={cx("text-[13px] font-black", isBlack ? "text-cyan-50" : "text-slate-700")}>{group.title}</h2>
            <div className={cx("mt-4 grid", groupIndex === 0 ? "grid-cols-4 gap-2" : "grid-cols-2 gap-2.5")}>
              {group.items.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleFilter(label)}
                  onMouseDown={suppressMouseFocus}
                  className={cx(
                    "inline-flex min-h-8 touch-manipulation items-center rounded-xl text-left text-[12px] font-black outline-none transition focus:ring-4 focus:ring-violet-400/30",
                    groupIndex === 0 ? "gap-1.5 px-2" : "gap-2 px-3",
                    isBlack ? "bg-cyan-300/[0.045] text-cyan-100/58 hover:bg-cyan-300/10 hover:text-cyan-50" : "bg-white/64 text-[#7f8aa9] hover:bg-violet-50 hover:text-violet-500",
                  )}
                >
                  <span aria-hidden="true" className={cx("grid h-4 w-4 place-items-center rounded-md text-[10px]", groupIndex === 0 ? "text-rose-400" : groupIndex === 1 ? "text-indigo-400" : "text-violet-400")}>
                    {groupIndex === 0 ? "♡" : groupIndex === 1 ? "⌂" : "◎"}
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>
      <aside
        className={cx(
          "absolute z-20 flex items-center gap-3 overflow-hidden rounded-[1.45rem] border p-4 shadow-[0_18px_46px_rgba(99,118,172,0.14)]",
          isBlack ? "border-cyan-300/14 bg-[#061226]/76" : "border-white/90 bg-white/82",
        )}
        style={boxStyle(artboard, 1024, 178, 180, 166)}
      >
        <img data-soul-link-discover-square-image="512x512" src={discoverCardSkyCity} alt="" aria-hidden="true" className={cx("h-16 w-16 shrink-0 rounded-[1.05rem] object-cover", isBlack ? "shadow-[0_12px_28px_rgba(0,0,0,0.34)]" : "shadow-[0_12px_28px_rgba(99,118,172,0.18)]")} loading="lazy" decoding="async" />
        <div className="min-w-0">
          <p className={cx("text-[13px] font-black", isBlack ? "text-cyan-50" : "text-slate-700")}>提示</p>
          <p className={cx("mt-2 text-[12px] font-bold leading-5", isBlack ? "text-cyan-100/52" : "text-slate-500")}>试试组合筛选，发现更异侧的坐标。</p>
        </div>
      </aside>
    </>
  )
}

function SoulLinkDiscoverTimeline({ artboard, variant }: { artboard: Artboard; variant: Variant }) {
  const isBlack = variant === "black"
  return (
    <section data-soul-link-discover-timeline="real-dom" className="absolute z-20" style={boxStyle(artboard, 226, 372, 980, 154)}>
      <header className="flex items-center gap-5">
        <h2 className={cx("text-[16px] font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>时间流</h2>
        <p className={cx("text-[12px] font-black", isBlack ? "text-cyan-100/45" : "text-slate-400")}>世界正在发生的事</p>
      </header>
      <div className="relative mt-6 flex items-start gap-4">
        <span aria-hidden="true" className={cx("absolute left-0 right-0 top-8 h-px", isBlack ? "bg-gradient-to-r from-cyan-300/28 via-cyan-300/10 to-transparent" : "bg-gradient-to-r from-violet-200 via-sky-100 to-transparent")} />
        <span aria-hidden="true" className={cx("absolute left-5 top-8 h-20 w-px", isBlack ? "bg-cyan-300/36" : "bg-violet-300")} />
        {DISCOVER_TIMELINE.map((item, index) => (
          <Link
            key={item.title}
            to="/discover"
            onMouseDown={suppressMouseFocus}
            className={cx(
              "relative min-h-[80px] w-[17.9%] rounded-[1rem] border p-4 outline-none transition hover:-translate-y-0.5 focus:ring-4 focus:ring-violet-400/30",
              isBlack ? "border-cyan-300/14 bg-[#061226]/86 shadow-[0_14px_34px_rgba(0,0,0,0.28)]" : "border-white/88 bg-white/92 shadow-[0_12px_32px_rgba(89,108,169,0.1)]",
            )}
          >
            <span className={cx("absolute -top-7 left-0 text-[12px] font-black", isBlack ? "text-cyan-100/44" : "text-slate-400")}>{item.time}</span>
            <span aria-hidden="true" className={cx("absolute -top-[18px] left-0 h-3 w-3 rounded-full border-2 shadow-[0_0_0_4px_rgba(124,112,255,0.12)]", isBlack ? "border-[#061226]" : "border-white", item.tone)} />
            <span className="flex items-center gap-3">
              <img data-soul-link-discover-square-image="512x512" src={item.image} alt="" aria-hidden="true" className="h-9 w-9 shrink-0 rounded-xl object-cover" loading="lazy" decoding="async" />
              <span className="min-w-0">
                <span className={cx("block truncate text-[13px] font-black", isBlack ? "text-cyan-50" : "text-slate-700")}>{item.title}</span>
                <span className={cx("mt-1 block truncate text-[11px] font-bold", isBlack ? "text-cyan-100/45" : "text-slate-400")}>{item.subtitle}</span>
              </span>
            </span>
            <span aria-hidden="true" className={cx("mt-3 block h-3 rounded-full", isBlack ? "bg-[repeating-linear-gradient(90deg,rgba(34,211,238,0.24)_0_3px,transparent_3px_7px)]" : "bg-[repeating-linear-gradient(90deg,rgba(124,112,255,0.2)_0_3px,transparent_3px_7px)]")} />
          </Link>
        ))}
      </div>
    </section>
  )
}

function SoulLinkDiscoverRightRail({
  artboard,
  taverns,
  variant,
}: {
  artboard: Artboard
  taverns: Tavern[]
  variant: Variant
}) {
  const cards = DISCOVER_LAYOUT.cards.map((_, index) => discoverCardData(taverns[index], index))
  const footprintCards = cards.slice(0, 4)
  const railPanel = { w: 316, h: 1024 }
  const isBlack = variant === "black"
  const panelClass = isBlack
    ? "border-cyan-300/14 bg-[#061226]/90 text-cyan-50 shadow-[0_18px_50px_rgba(0,0,0,0.34),0_0_28px_rgba(34,211,238,0.07)]"
    : "border-white/90 bg-white/92 text-slate-800 shadow-[0_18px_50px_rgba(86,105,166,0.12)]"
  const subtleLinkClass = isBlack
    ? "text-cyan-300 outline-none focus:ring-4 focus:ring-cyan-300/30"
    : "text-violet-300 outline-none focus:ring-4 focus:ring-violet-400/30"
  return (
    <aside data-soul-link-discover-right-rail="real-dom" className="pointer-events-none absolute z-20" style={boxStyle(artboard, 1220, 0, 316, 1024)}>
      <section className={cx("pointer-events-auto absolute overflow-hidden rounded-[1.35rem] border p-6", panelClass)} style={panelBoxStyle(railPanel, 12, 28, 286, 268)}>
        <header className="flex items-center gap-2">
          <h2 className={cx("text-[16px] font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>世界状态</h2>
          <span className={cx("text-[11px] font-black", isBlack ? "text-cyan-100/44" : "text-slate-300")}>实时更新</span>
        </header>
        <div className="relative mt-6 h-24">
          <svg data-soul-link-discover-world-orbit="real-svg" aria-hidden="true" className={cx("absolute right-3 top-0 h-24 w-36", isBlack ? "text-cyan-300/45" : "text-violet-300/45")} viewBox="0 0 180 120" fill="none" stroke="currentColor">
            <circle cx="92" cy="60" r="12" fill="currentColor" opacity=".16" className="animate-pulse" />
            <circle cx="92" cy="60" r="34" strokeDasharray="4 10" className="opacity-40" />
            <circle cx="92" cy="60" r="58" strokeDasharray="3 12" className="opacity-20" />
            <path d="M32 60h120M92 6v108" opacity=".28" />
          </svg>
          <p className={cx("relative z-10 text-3xl font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>1,298</p>
          <p className={cx("relative z-10 mt-2 text-[13px] font-bold", isBlack ? "text-cyan-100/48" : "text-slate-400")}>在线灵魂</p>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-5">
          <div>
            <p className={cx("text-xl font-black", isBlack ? "text-cyan-100" : "text-slate-700")}>56</p>
            <p className={cx("text-[12px] font-bold", isBlack ? "text-cyan-100/48" : "text-slate-400")}>信号波动</p>
          </div>
          <div>
            <p className={cx("text-xl font-black", isBlack ? "text-cyan-100" : "text-slate-700")}>12</p>
            <p className={cx("text-[12px] font-bold", isBlack ? "text-cyan-100/48" : "text-slate-400")}>坐标异常</p>
          </div>
        </div>
      </section>

      <section className={cx("pointer-events-auto absolute rounded-[1.35rem] border p-5", panelClass)} style={panelBoxStyle(railPanel, 12, 310, 286, 240)}>
        <header className="mb-4 flex items-center justify-between">
          <h2 className={cx("text-[15px] font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>推荐回响</h2>
          <Link to="/home-me" onMouseDown={suppressMouseFocus} className={cx("text-[11px] font-black", subtleLinkClass)}>查看全部 →</Link>
        </header>
        <div className="space-y-4">
          {DISCOVER_RIGHT_QUOTES.map((quote, index) => (
            <Link key={quote} to={targetFor(cards[index]?.id)} onMouseDown={suppressMouseFocus} className={cx("block rounded-xl outline-none transition focus:ring-4", isBlack ? "hover:bg-cyan-300/8 focus:ring-cyan-300/30" : "hover:bg-violet-50/60 focus:ring-violet-400/30")}>
              <p className={cx("truncate text-[13px] font-black", isBlack ? "text-cyan-100" : "text-slate-600")}>“{quote}”</p>
              <p className={cx("mt-1 text-[11px] font-bold", isBlack ? "text-cyan-100/45" : "text-slate-400")}>来自 {cards[index]?.name || "某个坐标"} · {index * 5 + 2} 分钟前</p>
            </Link>
          ))}
        </div>
      </section>

      <section className={cx("pointer-events-auto absolute rounded-[1.35rem] border p-5", panelClass)} style={panelBoxStyle(railPanel, 12, 566, 286, 270)}>
        <header className="mb-4 flex items-center justify-between">
          <h2 className={cx("text-[15px] font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>探索足迹</h2>
          <Link to="/discover" onMouseDown={suppressMouseFocus} className={cx("text-[11px] font-black", subtleLinkClass)}>查看全部 →</Link>
        </header>
        <div className="space-y-3">
          {footprintCards.map((card, index) => (
            <Link key={`${card.name}-${index}`} to={targetFor(card.id)} onMouseDown={suppressMouseFocus} className={cx("flex min-h-11 touch-manipulation items-center gap-3 rounded-xl outline-none transition focus:ring-4", isBlack ? "hover:bg-cyan-300/8 focus:ring-cyan-300/30" : "hover:bg-violet-50/60 focus:ring-violet-400/30")}>
              <img data-soul-link-discover-square-image="512x512" src={card.image} alt={`${card.name} 缩略图`} className="h-10 w-10 rounded-xl object-cover" loading="lazy" decoding="async" />
              <span className="min-w-0 flex-1">
                <span className={cx("block truncate text-[13px] font-black", isBlack ? "text-cyan-50" : "text-slate-700")}>{card.name}</span>
                <span className={cx("mt-1 block text-[11px] font-bold", isBlack ? "text-cyan-100/45" : "text-slate-400")}>{card.timeLabel}</span>
              </span>
              <span aria-hidden="true" className={isBlack ? "text-cyan-300/42" : "text-slate-300"}>♡</span>
            </Link>
          ))}
        </div>
      </section>

      <Link
        to="/create"
        onMouseDown={suppressMouseFocus}
        className="pointer-events-auto absolute overflow-hidden rounded-[1.35rem] border border-indigo-950/20 bg-indigo-950 p-4 text-white shadow-[0_20px_56px_rgba(26,30,80,0.24)] outline-none transition hover:-translate-y-0.5 focus:ring-4 focus:ring-violet-400/30"
        style={panelBoxStyle(railPanel, 12, 852, 286, 140)}
      >
        <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(141,130,255,0.42),transparent_34%),linear-gradient(135deg,#17204d_0%,#11173b_52%,#29205d_100%)]" />
        <span className="relative z-10 grid h-full grid-cols-[4.75rem_1fr] items-center gap-4">
          <img data-soul-link-discover-square-image="512x512" src={discoverCardTrainPlatform} alt="" aria-hidden="true" className="h-[4.75rem] w-[4.75rem] rounded-[1.1rem] object-cover shadow-[0_16px_32px_rgba(0,0,0,0.22)]" loading="lazy" decoding="async" />
          <span className="min-w-0">
            <span className="block text-[17px] font-black">创建你的坐标</span>
            <span className="mt-2 block truncate text-[12px] font-bold text-white/70">留下你的故事，等待另一个灵魂发现。</span>
            <span className="mt-3 inline-flex w-max items-center gap-2 rounded-xl bg-[#8d82ff] px-4 py-1.5 text-[13px] font-black">
              创建新坐标 <ArrowUpRight size={13} strokeWidth={3} />
            </span>
          </span>
        </span>
      </Link>
    </aside>
  )
}

function SoulLinkDiscoverSurface({
  artboard,
  search,
  taverns,
  onSearchChange,
  onClear,
  onTogglePlaceType,
  onToggleSpecialType,
  onToggleCategory,
  onPublicOnlyChange,
  onOpenOnlyChange,
  variant,
}: DiscoverReferenceProps & { artboard: Artboard }) {
  const isBlack = variant === "black"
  return (
    <>
      <div aria-hidden="true" className={cx("absolute inset-0 z-0 overflow-hidden", isBlack ? "bg-[#030712]" : "bg-[linear-gradient(180deg,#f6f9ff_0%,#eef4ff_48%,#f7fbff_100%)]")}>
        {isBlack ? (
          <>
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_34%_17%,rgba(34,211,238,0.16),transparent_27%),radial-gradient(circle_at_74%_22%,rgba(99,102,241,0.16),transparent_29%),linear-gradient(135deg,#061226_0%,#030712_52%,#020710_100%)]" />
            <span className="absolute left-[22%] top-[5%] h-[36%] w-[50%] rounded-full bg-cyan-300/8 blur-3xl" />
            <span className="absolute right-[8%] top-[18%] h-[42%] w-[25%] rounded-full bg-violet-500/10 blur-3xl" />
          </>
        ) : (
          <>
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.95),transparent_26%),radial-gradient(circle_at_74%_24%,rgba(199,210,254,0.5),transparent_28%),linear-gradient(135deg,#f8fbff_0%,#edf4ff_50%,#ffffff_100%)]" />
            <span className="absolute left-[20%] top-[6%] h-[38%] w-[52%] rounded-full bg-white/70 blur-3xl" />
            <span className="absolute right-[8%] top-[16%] h-[42%] w-[26%] rounded-full bg-violet-200/30 blur-3xl" />
          </>
        )}
      </div>
      <div className="absolute z-10" style={boxStyle(artboard, 228, 34, 250, 66)}>
        <h1 data-soul-link-discover-title="real-text" className={cx("text-[31px] font-black leading-tight tracking-[-0.04em]", isBlack ? "text-cyan-50" : "text-slate-900")}>
          探索 <span className={isBlack ? "text-cyan-300" : "text-violet-500"}>✦</span>
        </h1>
        <p className={cx("mt-2 text-[13px] font-bold", isBlack ? "text-cyan-100/46" : "text-slate-400")}>在无数坐标中，寻找与你产生共鸣的地方。</p>
      </div>
      <OverlayInput
        artboard={artboard}
        value={search}
        onChange={onSearchChange}
        placeholder="搜索地点、角色、记忆或关键词..."
        variant={variant}
        forceVisible
        {...DISCOVER_LAYOUT.search}
      />
      <SoulLinkDiscoverFilterPanel
        artboard={artboard}
        onClear={onClear}
        onTogglePlaceType={onTogglePlaceType}
        onToggleSpecialType={onToggleSpecialType}
        onToggleCategory={onToggleCategory}
        onPublicOnlyChange={onPublicOnlyChange}
        onOpenOnlyChange={onOpenOnlyChange}
        variant={variant}
      />
      <SoulLinkDiscoverTimeline artboard={artboard} variant={variant} />
      <div className="absolute z-20 flex items-center justify-between" style={boxStyle(artboard, 226, 548, 980, 38)}>
        <h2 className={cx("text-[20px] font-black", isBlack ? "text-cyan-50" : "text-slate-900")}>
          探索结果 <span className={cx("text-[13px] font-bold", isBlack ? "text-cyan-100/42" : "text-slate-400")}>{Math.max(taverns.length, DISCOVER_LAYOUT.cards.length)} 个坐标</span>
        </h2>
        <div className={cx("flex items-center gap-4 text-[12px] font-black", isBlack ? "text-cyan-100/45" : "text-slate-400")}>
          <span>排序：推荐⌄</span>
          <span aria-hidden="true" className={cx("grid h-7 w-7 place-items-center rounded-xl", isBlack ? "bg-cyan-300/12 text-cyan-300" : "bg-violet-100 text-violet-500")}>▦</span>
          <span aria-hidden="true">☰</span>
        </div>
      </div>
    </>
  )
}

function SoulLinkDiscoverMobile({
  search,
  taverns,
  onSearchChange,
  onClear,
  onTogglePlaceType,
  onToggleCategory,
  onToggleTheme,
  variant,
}: DiscoverReferenceProps) {
  const cards = DISCOVER_LAYOUT.cards.map((_, index) => discoverCardData(taverns[index], index)).slice(0, 6)
  const isBlack = variant === "black"
  return (
    <div className={cx("relative z-40 min-h-screen px-4 py-5 md:hidden", isBlack ? "bg-[linear-gradient(180deg,#061226_0%,#030712_48%,#020710_100%)]" : "bg-[linear-gradient(180deg,#f4f8ff_0%,#eef4ff_45%,#fff_100%)]")}>
      <header className={cx("flex items-center justify-between rounded-[1.5rem] border p-3", isBlack ? "border-cyan-300/14 bg-[#061226]/86 shadow-[0_18px_42px_rgba(0,0,0,0.32)]" : "border-white/80 bg-white/88 shadow-[0_18px_42px_rgba(108,123,178,0.14)]")}>
        <Link to="/" className="flex min-h-11 touch-manipulation items-center gap-3 rounded-2xl outline-none focus:ring-4 focus:ring-violet-400/35">
          <span className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-2xl shadow-[inset_0_0_0_1px_rgba(139,92,246,0.12)]", isBlack ? "bg-cyan-300/10 text-cyan-300" : "bg-violet-50 text-violet-500")}>
            <Compass size={22} strokeWidth={2.6} />
          </span>
          <span>
            <span data-soul-link-discover-title="real-text" className={cx("block text-lg font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>探索</span>
            <span className={cx("block text-[13px] font-bold", isBlack ? "text-cyan-100/48" : "text-slate-400")}>查找真实坐标里的 AI 空间</span>
          </span>
        </Link>
        <button type="button" onClick={onToggleTheme} className={cx("grid h-11 w-11 touch-manipulation place-items-center rounded-2xl border", isBlack ? "border-cyan-300/18 bg-cyan-300/10 text-cyan-200" : "border-violet-100 bg-violet-50 text-violet-500")} aria-label="切换主题">
          ☼
        </button>
      </header>
      <label data-soul-link-search={onSearchChange ? "real-input" : undefined} className={cx("relative mt-5 flex min-h-12 items-center rounded-2xl border px-4", isBlack ? "border-cyan-300/16 bg-[#061226] shadow-[0_16px_38px_rgba(0,0,0,0.3)]" : "border-white/80 bg-white shadow-[0_16px_38px_rgba(108,123,178,0.14)]")}>
        <span className="sr-only">搜索地点、角色、记忆或关键词</span>
        <Search size={18} strokeWidth={2.8} className={isBlack ? "text-cyan-300" : "text-violet-400"} />
        <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="搜索地点、角色、记忆或关键词..." className={cx("min-h-12 flex-1 bg-transparent px-3 text-base font-bold outline-none", isBlack ? "text-cyan-50 placeholder:text-cyan-100/42" : "text-slate-800 placeholder:text-slate-400")} />
      </label>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        <DiscoverFilterChip variant={variant} label="全部" onClick={onClear} />
        <DiscoverFilterChip variant={variant} label="舒适空间" onClick={() => onTogglePlaceType("bookstore")} />
        <DiscoverFilterChip variant={variant} label="回响最多" onClick={() => onToggleCategory("陪伴树洞")} />
      </div>
      <section className={cx("mt-5 rounded-[1.75rem] border p-4", isBlack ? "border-cyan-300/14 bg-[#061226]/86 shadow-[0_18px_42px_rgba(0,0,0,0.28)]" : "border-white/80 bg-white/88 shadow-[0_18px_42px_rgba(108,123,178,0.12)]")}>
        <h2 className={cx("text-base font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>时间流</h2>
        <div className="mt-3 grid gap-3">
          {DISCOVER_TIMELINE.slice(0, 3).map((item) => (
            <Link key={item.title} to="/discover" className={cx("flex min-h-14 touch-manipulation items-center gap-3 rounded-2xl p-3", isBlack ? "bg-cyan-300/[0.055]" : "bg-violet-50/50")}>
              <img data-soul-link-discover-square-image="512x512" src={item.image} alt="" aria-hidden="true" className="h-11 w-11 rounded-xl object-cover" loading="lazy" decoding="async" />
              <span className="min-w-0 flex-1">
                <span className={cx("block truncate text-[15px] font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>{item.title}</span>
                <span className={cx("mt-1 block truncate text-[13px] font-bold", isBlack ? "text-cyan-100/45" : "text-slate-400")}>{item.subtitle}</span>
              </span>
              <span className={cx("text-[13px] font-black", isBlack ? "text-cyan-300" : "text-violet-400")}>{item.time}</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className={cx("text-lg font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>探索结果</h2>
          <Link to="/create" className={cx("text-[15px] font-black", isBlack ? "text-cyan-300" : "text-violet-500")}>创建坐标 →</Link>
        </div>
        <div className="grid gap-3">
          {cards.map((card, index) => (
            <Link key={`${card.name}-${index}`} to={targetFor(card.id)} data-soul-link-discover-card="real-card" className={cx("flex min-h-32 touch-manipulation gap-3 rounded-[1.5rem] border p-3", isBlack ? "border-cyan-300/14 bg-[#061226]/90 shadow-[0_14px_34px_rgba(0,0,0,0.32)]" : "border-white/80 bg-white shadow-[0_14px_34px_rgba(108,123,178,0.12)]")}>
              <img data-soul-link-discover-square-image="512x512" src={card.image} alt={`${card.name} 封面`} className="h-28 w-28 rounded-[1.15rem] object-cover" loading="lazy" decoding="async" />
              <span className="min-w-0 flex-1 py-1">
                <span className={cx("block truncate text-[17px] font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>{card.name}</span>
                <span className={cx("mt-2 line-clamp-2 block text-[15px] font-bold leading-6", isBlack ? "text-cyan-100/48" : "text-slate-400")}>{card.description}</span>
                <span data-first-minute-guide="soul-link-mobile-card" className={cx("mt-2 block rounded-2xl border px-3 py-2 text-[12px] font-bold leading-5", isBlack ? "border-cyan-300/14 bg-cyan-300/[0.055] text-cyan-100/55" : "border-violet-100 bg-violet-50/60 text-slate-500")}>
                  <span className={cx("block text-[11px] font-black", isBlack ? "text-cyan-300" : "text-violet-500")}>Why here · {card.experienceType}</span>
                  <span className="line-clamp-2">{card.whyHere}</span>
                </span>
                <span className={cx("mt-2 block text-[13px] font-black", isBlack ? "text-cyan-300" : "text-violet-400")}>{card.visitLabel}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function DiscoverCardLinks({
  artboard,
  taverns,
  variant,
  forceVisible = false,
}: {
  artboard: Artboard
  taverns: Tavern[]
  variant: Variant
  forceVisible?: boolean
}) {
  return (
    <>
      {DISCOVER_LAYOUT.cards.map((box, index) => {
        const [x, y, w, h] = box
        const tavern = taverns[index]
        if (forceVisible) {
          return (
            <SoulLinkDiscoverCard
              key={`discover-card-${tavern?.id || index}`}
              artboard={artboard}
              box={box}
              tavern={tavern}
              index={index}
              variant={variant}
            />
          )
        }
        return (
          <OverlayLink
            key={`discover-card-${index}`}
            artboard={artboard}
            hotspot={{
              label: `进入探索坐标 ${tavern?.name || index + 1}`,
              to: targetFor(tavern?.id),
              x,
              y,
              w,
              h,
            }}
          />
        )
      })}
    </>
  )
}

export function SoulLinkHomeReference({
  variant,
  featuredCitySlices,
  worldPulseItems,
  dailyQuote = DEFAULT_DAILY_QUOTE,
  onlineEntities,
  recentMemories,
  guideCards = DEFAULT_GUIDE_CARDS,
  worldStats = DEFAULT_WORLD_STATS,
  search,
  onSearchChange,
  onSearchSubmit,
  onToggleTheme,
}: HomeReferenceProps) {
  const artboard = variant === "black" ? HOME_BLACK : HOME_LIGHT
  const resolvedWorldPulseItems = worldPulseItems?.length ? worldPulseItems : fallbackFeedItemsFromHome(featuredCitySlices)
  const resolvedOnlineEntities = onlineEntities?.length ? onlineEntities : fallbackOnlineEntitiesFromFeed(resolvedWorldPulseItems)
  const resolvedRecentMemories = recentMemories?.length ? recentMemories : fallbackRecentMemoriesFromHome(featuredCitySlices)
  const rightRail = HOME_LAYOUT.rightRail
  const searchBox = HOME_LAYOUT.search
  return (
    <ArtboardShell artboard={artboard} variant={variant} kind="home">
      <SoulLinkHomeMobile featuredCitySlices={featuredCitySlices} onToggleTheme={onToggleTheme} variant={variant} />
      <div className="relative hidden h-full md:block">
        <SoulLinkHomeMainSurface artboard={artboard} featuredCitySlices={featuredCitySlices} variant={variant} />
        <SoulLinkSidebar artboard={artboard} variant={variant} active="home" onToggleTheme={onToggleTheme} />
        <SoulLinkUserCluster artboard={artboard} variant={variant} forceVisible />
        <SoulLinkFeedPanel
          artboard={artboard}
          variant={variant}
          box={rightRail.worldPulse}
          title={variant === "black" ? "SIGNAL ACTIVITY" : "世界脉搏"}
          eyebrow={variant === "black" ? "信号活动" : "实时回响"}
          items={resolvedWorldPulseItems}
          actionLabel={variant === "black" ? "查看全部活动" : "查看全部动态"}
          forceVisible
        />
        <SoulLinkDailyQuotePanel artboard={artboard} variant={variant} box={rightRail.dailyQuote} quote={dailyQuote} forceVisible />
        <SoulLinkOnlineEntitiesPanel artboard={artboard} variant={variant} box={rightRail.onlineEntities} entities={resolvedOnlineEntities} forceVisible />
        <SoulLinkRecentMemoriesPanel artboard={artboard} variant={variant} memories={resolvedRecentMemories} forceVisible />
        <SoulLinkGuidePanel artboard={artboard} variant={variant} cards={guideCards} forceVisible />
        <SoulLinkWorldStatsPanel artboard={artboard} variant={variant} stats={worldStats} forceVisible />
        <OverlayInput
          artboard={artboard}
          value={search || ""}
          onChange={onSearchChange}
          onSubmit={onSearchSubmit}
          placeholder={variant === "black" ? "SCAN FOR ACTIVE SIGNALS... 扫描活跃信号..." : "输入你想前往的地方..."}
          variant={variant}
          forceVisible
          {...searchBox}
        />
        <HomeHeroActions artboard={artboard} variant={variant} forceVisible />
      </div>
    </ArtboardShell>
  )
}

export function SoulLinkDiscoverReference(props: DiscoverReferenceProps) {
  const artboard = props.variant === "black" ? DISCOVER_BLACK : DISCOVER_LIGHT
  const resolvedSideFeedItems = props.sideFeedItems?.length ? props.sideFeedItems : fallbackFeedItemsFromTaverns(props.taverns)
  const resolvedOnlineEntities = props.onlineEntities?.length ? props.onlineEntities : fallbackOnlineEntitiesFromFeed(resolvedSideFeedItems)
  const discoverSideFeedItems = withDiscoverSquareFeedImages(resolvedSideFeedItems)
  const discoverOnlineEntities = withDiscoverSquareOnlineImages(resolvedOnlineEntities)
  return (
    <ArtboardShell artboard={artboard} variant={props.variant} kind="discover">
      <SoulLinkDiscoverMobile {...props} />
      <div className="relative hidden h-full md:block">
        <SoulLinkDiscoverSurface artboard={artboard} {...props} />
        <SoulLinkSidebar artboard={artboard} variant={props.variant} active="discover" onToggleTheme={props.onToggleTheme} />
        <SoulLinkUserCluster artboard={artboard} variant={props.variant} />
        <SoulLinkFeedPanel
          artboard={artboard}
          variant={props.variant}
          box={DISCOVER_RIGHT_RAIL.signalFeed}
          title="信号动态"
          eyebrow="Signal Feed"
          items={discoverSideFeedItems}
          actionLabel="查看全部"
        />
        <SoulLinkOnlineEntitiesPanel artboard={artboard} variant={props.variant} box={DISCOVER_RIGHT_RAIL.onlineEntities} entities={discoverOnlineEntities} />
        <SoulLinkDiscoverRightRail artboard={artboard} taverns={props.taverns} variant={props.variant} />
        <DiscoverCardLinks
          artboard={artboard}
          taverns={props.taverns}
          variant={props.variant}
          forceVisible
        />
      </div>
    </ArtboardShell>
  )
}
