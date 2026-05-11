import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from "react"
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

import discoverBlackMain from "../assets/soul-link-05-10/discover-black/main.png"
import discoverBlackMain2x from "../assets/soul-link-05-10/discover-black/main-2x.png"
import discoverBlackRightRail from "../assets/soul-link-05-10/discover-black/right-rail.png"
import discoverBlackRightRail2x from "../assets/soul-link-05-10/discover-black/right-rail-2x.png"
import discoverLightMain from "../assets/soul-link-05-10/discover-light/main.png"
import discoverLightMain2x from "../assets/soul-link-05-10/discover-light/main-2x.png"
import discoverLightRightRail from "../assets/soul-link-05-10/discover-light/right-rail.png"
import discoverLightRightRail2x from "../assets/soul-link-05-10/discover-light/right-rail-2x.png"
import homeBlackMain from "../assets/soul-link-05-10/home-black/main.png"
import homeBlackMain2x from "../assets/soul-link-05-10/home-black/main-2x.png"
import homeBlackRightRail from "../assets/soul-link-05-10/home-black/right-rail.png"
import homeBlackRightRail2x from "../assets/soul-link-05-10/home-black/right-rail-2x.png"
import homeBlackInviteCard from "../assets/soul-link-05-10/home-black/invite-card.png"
import homeBlackInviteCard2x from "../assets/soul-link-05-10/home-black/invite-card-2x.png"
import homeBlackSidePanel from "../assets/soul-link-05-10/home-black/sidebar.png"
import homeBlackSidePanel2x from "../assets/soul-link-05-10/home-black/sidebar-2x.png"
import homeLightInviteCard from "../assets/soul-link-05-10/home-light/invite-card.png"
import homeLightInviteCard2x from "../assets/soul-link-05-10/home-light/invite-card-2x.png"
import navAnchorsIcon from "../assets/soul-link-05-10/icons/nav-anchors.png"
import navCreateIcon from "../assets/soul-link-05-10/icons/nav-create.png"
import navDiscoverIcon from "../assets/soul-link-05-10/icons/nav-discover.png"
import navEchoesIcon from "../assets/soul-link-05-10/icons/nav-echoes.png"
import navHomeIcon from "../assets/soul-link-05-10/icons/nav-home.png"
import navMemoryIcon from "../assets/soul-link-05-10/icons/nav-memory.png"
import navSavedIcon from "../assets/soul-link-05-10/icons/nav-saved.png"
import lightBellIcon from "../assets/soul-link-05-10/user-cuts-light/icon-bell-glow.png"
import lightBookIcon from "../assets/soul-link-05-10/user-cuts-light/icon-book-glow.png"
import lightBookmarkIcon from "../assets/soul-link-05-10/user-cuts-light/icon-bookmark-glow.png"
import lightCompassIcon from "../assets/soul-link-05-10/user-cuts-light/icon-compass-glow.png"
import lightHomeIcon from "../assets/soul-link-05-10/user-cuts-light/icon-home-glow.png"
import lightMessageIcon from "../assets/soul-link-05-10/user-cuts-light/icon-message-glow.png"
import lightPinIcon from "../assets/soul-link-05-10/user-cuts-light/icon-map-pin-glow.png"
import lightPlaneIcon from "../assets/soul-link-05-10/user-cuts-light/icon-plane-glow.png"
import lightPulseIcon from "../assets/soul-link-05-10/user-cuts-light/icon-pulse-bars-glow.png"
import lightSearchIcon from "../assets/soul-link-05-10/user-cuts-light/icon-search-glow.png"
import lightPlayIcon from "../assets/soul-link-05-10/user-cuts-light/icon-play-glow.png"
import lightArrowIcon from "../assets/soul-link-05-10/user-cuts-light/icon-arrow-glow.png"
import lightPlaneWash from "../assets/soul-link-05-10/user-cuts-light/bg-plane-wash.png"
import lightPaperPlaneSoft from "../assets/soul-link-05-10/user-cuts-light/bg-paper-plane-soft.png"
import lightSeaLane from "../assets/soul-link-05-10/user-cuts-light/scene-sea-lane.png"
import lightSkyCityBalcony from "../assets/soul-link-05-10/user-cuts-light/scene-sky-city-balcony.png"
import lightTrainRainPlatform from "../assets/soul-link-05-10/user-cuts-light/scene-train-platform-rain.png"
import lightLibraryWide from "../assets/soul-link-05-10/user-cuts-light/scene-library-wide.png"
import lightLibrarySunlit from "../assets/soul-link-05-10/user-cuts-light/scene-library-sunlit.png"
import lightLibraryCafeWide from "../assets/soul-link-05-10/user-cuts-light/scene-library-cafe-wide.png"
import lightGuideStarterBg from "../assets/soul-link-05-10/user-cuts-light/card-invite-soft.png"
import lightGuideEnvelopeBg from "../assets/soul-link-05-10/user-cuts-light/card-envelope-soft.png"
import lightGuideShieldBg from "../assets/soul-link-05-10/user-cuts-light/card-shield-soft.png"
import soulLinkUserAvatar from "../assets/npc-style-cast/portraits-hd/commission-zhideng.png"
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
  slices: [
    { src: homeBlackMain, src2x: homeBlackMain2x, alt: "SoulLink 首页黑色设计稿主内容切片", x: 220, y: 0, w: 1000, h: 1024 },
    { src: homeBlackRightRail, src2x: homeBlackRightRail2x, alt: "SoulLink 首页黑色设计稿右侧栏切片", x: 1220, y: 0, w: 316, h: 1024 },
  ],
}

const DISCOVER_LIGHT: Artboard = {
  width: 1536,
  height: 1024,
  marker: "discover-light-real-dom-1536x1024",
  background: "#eef4ff",
  slices: [
    { src: discoverLightMain, src2x: discoverLightMain2x, alt: "SoulLink 探索页亮色设计稿主内容切片", x: 220, y: 0, w: 1000, h: 1024 },
    { src: discoverLightRightRail, src2x: discoverLightRightRail2x, alt: "SoulLink 探索页亮色设计稿右侧栏切片", x: 1220, y: 0, w: 316, h: 1024 },
  ],
}

const DISCOVER_BLACK: Artboard = {
  width: 1536,
  height: 1024,
  marker: "discover-black-real-dom-1536x1024",
  background: "#030712",
  slices: [
    { src: discoverBlackMain, src2x: discoverBlackMain2x, alt: "SoulLink 探索页黑色设计稿主内容切片", x: 220, y: 0, w: 1000, h: 1024 },
    { src: discoverBlackRightRail, src2x: discoverBlackRightRail2x, alt: "SoulLink 探索页黑色设计稿右侧栏切片", x: 1220, y: 0, w: 316, h: 1024 },
  ],
}

const SHARED_USER_CLUSTER = { x: 1234, y: 26, w: 286, h: 72 } as const
const HOME_RIGHT_RAIL = {
  worldPulse: { x: 1248, y: 118, w: 240, h: 316 },
  dailyQuote: { x: 1248, y: 446, w: 240, h: 108 },
  onlineEntities: { x: 1192, y: 575, w: 286, h: 238 },
} as const
const HOME_BOTTOM_RAIL = {
  recentMemories: { x: 242, y: 840, w: 350, h: 154 },
  guideCards: { x: 602, y: 840, w: 430, h: 154 },
  worldStats: { x: 1048, y: 848, w: 443, h: 144 },
} as const
const DISCOVER_RIGHT_RAIL = {
  signalFeed: { x: 1236, y: 300, w: 270, h: 250 },
  onlineEntities: { x: 1236, y: 574, w: 270, h: 260 },
} as const

const SHARED_SIDEBAR_NAV_ITEMS = [
  { id: "home", label: "首页", eyebrow: "HOME", to: "/", x: 42, y: 143, w: 158, h: 46 },
  { id: "discover", label: "探索", eyebrow: "EXPLORE", to: "/discover", x: 42, y: 207, w: 158, h: 46 },
  { id: "echoes", label: "回响", eyebrow: "ECHOES", to: "/home-me", x: 42, y: 273, w: 158, h: 46, badge: "12" },
  { id: "memory", label: "记忆", eyebrow: "MEMORY", to: "/home-me", x: 42, y: 340, w: 158, h: 46 },
  { id: "saved", label: "收藏", eyebrow: "SAVED", to: "/home-me", x: 42, y: 407, w: 158, h: 46 },
  { id: "anchors", label: "我的锚点", eyebrow: "ANCHORS", to: "/home-me", x: 42, y: 474, w: 158, h: 46 },
  { id: "create", label: "创建坐标", eyebrow: "CREATE", to: "/create", x: 42, y: 541, w: 158, h: 46 },
] as const

const SHARED_SIDEBAR_INVITE = { x: 46, y: 712, w: 151, h: 170 } as const
const SHARED_SIDEBAR_BOTTOM_ACTIONS = [
  { label: "切换主题", x: 53, y: 938, w: 34, h: 34, action: "theme" },
  { label: "打开回响", x: 103, y: 938, w: 34, h: 34, to: "/home-me" },
  { label: "打开事务所", x: 154, y: 938, w: 34, h: 34, to: "/owner" },
] as const

const SIDEBAR_REFERENCE_PANELS = {
  light: { x: 0, y: 0, w: 220, h: 1024 },
  black: { src: homeBlackSidePanel, src2x: homeBlackSidePanel2x, x: 0, y: 0, w: 236, h: 1024 },
} as const

const SIDEBAR_INVITE_CARDS = {
  light: { src: homeLightInviteCard, src2x: homeLightInviteCard2x },
  black: { src: homeBlackInviteCard, src2x: homeBlackInviteCard2x },
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

// Light / black variants share the same interactive DOM layout.
// Theme differences stay in artboard slices, masks, and color classes only.
const HOME_LAYOUT = {
  cards: homeSharedCardBoxes,
  search: { x: 878, y: 41, w: 335, h: 44 },
  blackSearchMask: { x: 255, y: 14, w: 900, h: 82 },
  heroActionsMask: { x: 262, y: 304, w: 372, h: 62 },
  heroActions: {
    primary: { x: 280, y: 312, w: 136, h: 48 },
    secondary: { x: 438, y: 312, w: 176, h: 48 },
  },
  links: {
    allCoordinates: { label: "查看全部坐标", to: "/discover", x: 1070, y: 565, w: 122, h: 44 },
    memories: { label: "查看更多记忆", to: "/home-me", x: 515, y: 856, w: 82, h: 44 },
    guide: { label: "探索指南", to: "/quests", x: 603, y: 840, w: 412, h: 178 },
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

function lightCoordinateCardData(slice: HomeReferenceProps["featuredCitySlices"][number] | undefined, index: number) {
  const fallback = LIGHT_FALLBACK_COORDINATE_CARDS[index % LIGHT_FALLBACK_COORDINATE_CARDS.length]
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

function suppressMouseFocus(event: MouseEvent<HTMLElement>) {
  event.preventDefault()
}

const SIDEBAR_NAV_ICON_IMAGES: Record<string, string> = {
  home: navHomeIcon,
  discover: navDiscoverIcon,
  echoes: navEchoesIcon,
  memory: navMemoryIcon,
  saved: navSavedIcon,
  anchors: navAnchorsIcon,
  create: navCreateIcon,
}

function SidebarNavIcon({ id, variant, className }: { id: string; variant: Variant; className?: string }) {
  if (variant === "light") {
    const src =
      id === "home" ? lightHomeIcon
      : id === "discover" ? lightCompassIcon
      : id === "echoes" ? lightMessageIcon
      : id === "memory" ? lightBookIcon
      : id === "saved" ? lightBookmarkIcon
      : id === "anchors" ? lightPinIcon
      : lightPlaneIcon
    return (
      <img
        src={src}
        alt=""
        aria-hidden="true"
        draggable={false}
        decoding="async"
        className={cx("shrink-0 select-none object-contain", className)}
      />
    )
  }
  const src = SIDEBAR_NAV_ICON_IMAGES[id] || navCreateIcon
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      className={cx("select-none object-contain", className)}
    />
  )
}

function SidebarBottomIcon({ id, className }: { id: "theme" | "echoes" | "owner"; className?: string }) {
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
  const panel = SIDEBAR_REFERENCE_PANELS[variant]
  const blackPanel = SIDEBAR_REFERENCE_PANELS.black
  const inviteCard = SIDEBAR_INVITE_CARDS[variant]
  const isBlack = variant === "black"
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
      {isBlack ? (
        <div aria-hidden="true" className="absolute overflow-hidden" style={panelBoxStyle(blackPanel, 0, 0, blackPanel.w, 126)}>
          <img
            src={blackPanel.src}
            srcSet={`${blackPanel.src} 1x, ${blackPanel.src2x} 2x`}
            alt=""
            decoding="async"
            draggable={false}
            className="absolute left-0 top-0 w-full select-none object-fill"
            style={{ height: `${(blackPanel.h / 126) * 100}%` }}
          />
        </div>
      ) : (
        <div aria-hidden="true" className="absolute inset-x-6 top-7 h-16 rounded-[1.45rem] bg-gradient-to-r from-violet-50 via-white to-sky-50" />
      )}

      <Link
        to="/"
        aria-label="SoulLink"
        onMouseDown={suppressMouseFocus}
        className={cx(
          "absolute touch-manipulation rounded-2xl outline-none focus:ring-4 focus:ring-violet-400/45",
          isBlack ? "" : "flex items-center gap-3 px-1",
        )}
        style={panelBoxStyle(panel, 50, 48, 136, 52)}
      >
        {!isBlack ? (
          <>
            <UserCutImage src={lightPlaneIcon} className="h-8 w-8 rounded-xl" scale={2.2} loading="eager" />
            <span className="min-w-0">
              <span className="block text-[1.02rem] font-black leading-tight text-slate-800">FableMap</span>
              <span className="block truncate text-[10px] font-bold text-slate-400">连接每一个真实坐标</span>
            </span>
          </>
        ) : null}
        <span className="sr-only">SoulLink 连接另一个灵魂坐标</span>
      </Link>

      <nav aria-label="SoulLink navigation" className="absolute inset-0">
        {SHARED_SIDEBAR_NAV_ITEMS.map((item) => {
          const selected = item.id === active
          return (
            <Link
              key={item.id}
              to={item.to}
              aria-current={selected ? "page" : undefined}
              aria-label={item.label}
              onMouseDown={suppressMouseFocus}
              className={cx(
                "absolute flex min-h-11 touch-manipulation items-center rounded-2xl px-[18px] text-sm font-semibold outline-none transition focus:ring-4 focus:ring-violet-400/45",
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

      <Link
        to="/create"
        data-soul-link-sidebar-cta="shared"
        aria-label="邀请朋友"
        onMouseDown={suppressMouseFocus}
        className={cx(
          "absolute touch-manipulation overflow-hidden rounded-[1.55rem] outline-none focus:ring-4 focus:ring-violet-400/45",
          isBlack ? "" : "shadow-[0_16px_36px_rgba(104,126,190,0.14)]",
        )}
        style={panelBoxStyle(panel, SHARED_SIDEBAR_INVITE.x, SHARED_SIDEBAR_INVITE.y, SHARED_SIDEBAR_INVITE.w, SHARED_SIDEBAR_INVITE.h)}
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

      {SHARED_SIDEBAR_BOTTOM_ACTIONS.map((item) =>
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
            <SidebarBottomIcon id={"to" in item && item.to === "/owner" ? "owner" : "echoes"} className="h-[22px] w-[22px]" />
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
        <UserCutImage src={lightBellIcon} className="h-5 w-5" scale={2.4} />
      )}
      <span className={cx("absolute right-[18%] top-[18%] h-[22%] w-[22%] rounded-full", isBlack ? "bg-rose-400 shadow-[0_0_12px_rgba(251,113,133,0.75)]" : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]")} />
    </button>
  )
}

function SoulLinkUserAvatar({ avatar, name, variant }: { avatar: string; name: string; variant: Variant }) {
  const isBlack = variant === "black"
  return (
    <span
      data-soul-link-user-avatar="real-image"
      className={cx(
        "block h-full aspect-square shrink-0 overflow-hidden rounded-full border p-[2px]",
        isBlack ? "border-cyan-300/24 bg-cyan-300/10" : "border-violet-100 bg-violet-50",
      )}
    >
      <img src={avatar} alt={`${name} 头像`} className="h-full w-full rounded-full object-cover" loading="eager" decoding="async" />
    </span>
  )
}

function SoulLinkUserIdentity({ name, meta, variant }: { name: string; meta: string; variant: Variant }) {
  const isBlack = variant === "black"
  return (
    <span data-soul-link-user-name="real-text" className="min-w-0 flex-1 text-left">
      <span className={cx("block truncate text-[clamp(0.72rem,0.9vw,1rem)] font-black leading-tight", isBlack ? "text-cyan-50" : "text-slate-700")}>{name}</span>
      <span className={cx("mt-1 block truncate text-[clamp(0.6rem,0.72vw,0.84rem)] font-black leading-none", isBlack ? "text-cyan-100/58" : "text-slate-400")}>{meta}</span>
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
      style={boxStyle(artboard, SHARED_USER_CLUSTER.x, SHARED_USER_CLUSTER.y, SHARED_USER_CLUSTER.w, SHARED_USER_CLUSTER.h)}
    >
      <SoulLinkNotificationBell variant={variant} />
      <Link
        to="/home-me"
        aria-label={`${profile.name} 个人中心`}
        onMouseDown={suppressMouseFocus}
        className="flex h-full min-w-0 flex-1 touch-manipulation items-center gap-[7%] rounded-[1.35rem] px-[2%] outline-none transition focus:ring-4 focus:ring-violet-400/45"
      >
        <SoulLinkUserAvatar avatar={profile.avatar} name={profile.name} variant={variant} />
        <SoulLinkUserIdentity name={profile.name} meta={profile.meta} variant={variant} />
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
    to: item.to,
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
        forceVisible ? "opacity-100" : "opacity-0",
        isBlack
          ? "border-cyan-300/16 bg-[#020710] text-cyan-50 shadow-[0_0_28px_rgba(0,255,255,0.08)]"
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
          src={entity.avatar}
          alt={`${entity.name} 头像`}
          className={cx(avatarSizeClass, "rounded-full border object-cover", isBlack ? "border-cyan-300/18" : "border-violet-100")}
          loading="lazy"
          decoding="async"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span data-soul-link-online-name="real-text" className={cx("block truncate font-black", compact ? "text-[0.72rem] leading-4" : "text-xs leading-4", isBlack ? "text-cyan-50" : "text-slate-700")}>{entity.name}</span>
        <span data-soul-link-online-location="real-text" className={cx("mt-0.5 block truncate font-bold", compact ? "text-[9px] leading-3" : "text-[10px] leading-4", isBlack ? "text-cyan-100/48" : "text-slate-400")}>{entity.location}</span>
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
  const isCompact = forceVisible && !isBlack
  const visibleEntities = entities.slice(0, 3)
  return (
    <SoulLinkPanelShell artboard={artboard} variant={variant} box={box} forceVisible={forceVisible} className={cx("flex flex-col p-4", isCompact ? "gap-2.5" : "gap-3")}>
      <header className="flex items-center justify-between gap-3">
        <span className={cx("block text-sm font-black leading-none", isBlack ? "text-cyan-50" : "text-slate-800")}>在线的灵魂</span>
        <Link to="/home-me" onMouseDown={suppressMouseFocus} className={cx("text-[10px] font-black leading-none outline-none transition focus:ring-4 focus:ring-violet-400/40", isBlack ? "text-cyan-300" : "text-violet-300")}>
          查看全部 →
        </Link>
      </header>
      <div data-soul-link-online-panel="real-list" className="flex flex-col divide-y divide-slate-200/60 overflow-hidden">
        {visibleEntities.length ? (
          visibleEntities.map((entity) => <SoulLinkOnlineEntityRow key={entity.id} entity={entity} variant={variant} compact={isCompact} />)
        ) : (
          <p className={cx("flex flex-col items-center gap-2 py-8 text-center text-sm font-bold", isBlack ? "text-cyan-100/48" : "text-slate-400")}>
            {!isBlack ? <UserCutImage src={lightBellIcon} className="h-9 w-9 rounded-2xl opacity-75" scale={2.4} /> : null}
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
        <span className={cx("block text-[clamp(0.78rem,0.96vw,1.02rem)] font-black leading-tight", isBlack ? "text-cyan-50" : "text-slate-800")}>{title}</span>
        {eyebrow ? <span className={cx("mt-1 block text-[clamp(0.5rem,0.62vw,0.68rem)] font-black uppercase tracking-[0.1em]", isBlack ? "text-cyan-100/45" : "text-slate-400")}>{eyebrow}</span> : null}
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
          <UserCutImage src={lightPulseIcon} className="h-5 w-5 rounded-full" scale={2.4} />
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
        src={item.image}
        alt={`${item.title} 缩略图`}
        className={cx(compact ? "h-10 w-10" : "h-11 w-11", "shrink-0 rounded-full border object-cover", isBlack ? "border-cyan-300/18" : "border-violet-100")}
        loading="lazy"
        decoding="async"
      />
      <span className="min-w-0 flex-1">
        <span data-soul-link-feed-title="real-text" className={cx("block truncate font-black", compact ? "text-[0.82rem] leading-4" : "text-sm", isBlack ? "text-cyan-50" : "text-slate-700")}>{item.title}</span>
        <span className={cx("mt-1 block truncate font-bold", compact ? "text-[0.72rem] leading-4" : "text-xs", isBlack ? "text-cyan-100/48" : "text-slate-400")}>{item.subtitle}</span>
      </span>
      <span className={cx("shrink-0 font-black", compact ? "text-[0.72rem]" : "text-xs", isBlack ? "text-cyan-100/45" : "text-slate-400")}>{item.meta}</span>
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
  const isCompact = forceVisible && !isBlack
  const visibleItems = items.slice(0, 3)
  return (
    <SoulLinkPanelShell artboard={artboard} variant={variant} box={box} forceVisible={forceVisible} className={cx("flex flex-col", isCompact ? "gap-3" : "gap-4")}>
      <SoulLinkPanelHeader title={title} eyebrow={eyebrow} variant={variant} />
      <div data-soul-link-feed-panel="real-list" className="flex flex-col divide-y divide-slate-200/60 overflow-hidden">
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
    <SoulLinkPanelShell artboard={artboard} variant={variant} box={box} forceVisible={forceVisible} className="overflow-hidden">
      <div data-soul-link-daily-quote="real-text" className="relative z-10">
        <p className={cx("text-sm font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>{quote.title}</p>
        <blockquote className={cx("mt-4 text-[clamp(0.82rem,0.9vw,1rem)] font-bold leading-7", isBlack ? "text-cyan-100/62" : "text-slate-500")}>“{quote.quote}”</blockquote>
        {quote.source ? <p className={cx("mt-2 text-xs font-bold", isBlack ? "text-cyan-100/42" : "text-slate-400")}>— {quote.source}</p> : null}
      </div>
      {isBlack ? (
        <svg aria-hidden="true" className="absolute bottom-2 right-3 h-16 w-16 text-cyan-300 opacity-30" viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 51 82 18 60 82 44 57 10 51Z" />
          <path d="M44 57 82 18" />
        </svg>
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
    <SoulLinkPanelShell artboard={artboard} variant={variant} box={HOME_BOTTOM_RAIL.recentMemories} forceVisible={forceVisible} className="flex flex-col gap-1.5 !p-3">
      <header className="flex items-center justify-between gap-3">
        <h2 className={cx("text-[0.82rem] font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>最近的记忆</h2>
        <Link to="/home-me" onMouseDown={suppressMouseFocus} className={cx("text-[0.62rem] font-black outline-none transition focus:ring-4 focus:ring-violet-400/40", isBlack ? "text-cyan-300" : "text-slate-400")}>查看全部 →</Link>
      </header>
      <div data-soul-link-recent-memories="real-list" className="flex flex-col divide-y divide-slate-200/60 overflow-hidden">
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
    isBlack ? card : { ...card, image: card.image || LIGHT_GUIDE_BACKGROUNDS[index] }
  ))
  return (
    <SoulLinkPanelShell artboard={artboard} variant={variant} box={HOME_BOTTOM_RAIL.guideCards} forceVisible={forceVisible} className="flex flex-col gap-2 !p-3">
      <header className="flex items-center justify-between gap-3">
        <h2 className={cx("text-[0.82rem] font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>探索指南</h2>
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
    <SoulLinkPanelShell artboard={artboard} variant={variant} box={HOME_BOTTOM_RAIL.worldStats} forceVisible={forceVisible} className="overflow-hidden p-[1.25%]">
      {!isBlack ? (
        <img data-soul-link-world-stats-deco="real-image" src={lightPaperPlaneSoft} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full origin-center scale-[1.18] object-cover" loading="lazy" decoding="async" />
      ) : null}
      <div data-soul-link-world-stats="real-data" className="relative z-10 flex h-full flex-col">
        <header className="flex items-center gap-1.5">
          <h2 className={cx("text-[0.9rem] font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>今日世界统计</h2>
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
        <svg data-soul-link-world-stats-deco="real-svg" aria-hidden="true" className="absolute right-7 top-3 h-20 w-20 text-cyan-300 opacity-25" viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 51 82 18 60 82 44 57 10 51Z" />
          <path d="M44 57 82 18" />
          <path d="M24 70c5-7 12-10 20-9" strokeDasharray="4 6" />
        </svg>
      ) : null}
    </SoulLinkPanelShell>
  )
}

function ArtboardShell({ artboard, variant, kind, children }: { artboard: Artboard; variant: Variant; kind: "home" | "discover"; children: ReactNode }) {
  const isHomeLight = variant === "light" && kind === "home"
  return (
    <main
      data-soul-link-real-dom="true"
      data-soul-link-variant={variant}
      className="min-h-screen overflow-x-hidden"
      style={{ background: artboard.background }}
    >
      <section
        data-soul-link-reference={artboard.marker}
        data-soul-link-dom={kind}
        data-soul-link-design-lock="owner-reference-1-to-1"
        className={cx(
          "relative mx-auto w-full select-none",
          isHomeLight ? "min-h-screen overflow-visible md:min-h-0 md:overflow-hidden md:aspect-[1536/1024]" : "overflow-hidden",
        )}
        style={{
          maxWidth: `${artboard.width}px`,
          ...(isHomeLight ? {} : { aspectRatio: `${artboard.width} / ${artboard.height}` }),
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

function OverlayMask({ artboard, className, x, y, w, h }: { artboard: Artboard; className: string; x: number; y: number; w: number; h: number }) {
  return <span aria-hidden="true" className={cx("pointer-events-none absolute z-[12] opacity-0", className)} style={boxStyle(artboard, x, y, w, h)} />
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
        <UserCutImage src={lightSearchIcon} className="pointer-events-none absolute left-[7.5%] h-5 w-5 opacity-60" scale={2.5} />
      )}
      <input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        onKeyDown={handleKeyDown}
        readOnly={!onChange}
        placeholder={placeholder}
        className={cx(
          "h-full min-h-11 w-full rounded-full border-0 bg-transparent py-0 pl-[18%] pr-[18%] text-sm font-semibold outline-none transition",
          inputToneClass,
        )}
      />
      <span aria-hidden="true" className={cx("pointer-events-none absolute right-[6%] grid h-8 w-8 place-items-center rounded-xl text-sm font-black leading-none", keyToneClass)}>
        /
      </span>
    </label>
  )
}

function SoulLinkLightCoordinateCard({
  artboard,
  box,
  slice,
  index,
}: {
  artboard: Artboard
  box: readonly [number, number, number, number]
  slice?: HomeReferenceProps["featuredCitySlices"][number]
  index: number
}) {
  const card = lightCoordinateCardData(slice, index)
  const [x, y, w, h] = box

  return (
    <Link
      to={targetFor(card.id)}
      data-soul-link-home-light-card="real-card"
      onMouseDown={suppressMouseFocus}
      className="absolute z-20 min-h-11 touch-manipulation overflow-hidden rounded-[1.2rem] border border-white/90 bg-white shadow-[0_18px_42px_rgba(108,123,178,0.14)] outline-none transition hover:-translate-y-1 hover:shadow-[0_22px_48px_rgba(108,123,178,0.2)] focus:ring-4 focus:ring-violet-400/35"
      style={boxStyle(artboard, x, y, w, h)}
    >
      <div className="relative h-[45%] overflow-hidden">
        <img src={card.image} alt={`${card.name} 坐标封面`} className="h-full w-full object-cover" loading="lazy" decoding="async" />
        <span className="absolute left-3 top-3 rounded-full bg-violet-500/82 px-3 py-1 text-[clamp(0.46rem,0.68vw,0.72rem)] font-black text-white shadow-[0_8px_18px_rgba(118,91,255,0.22)]">
          {card.tag}
        </span>
      </div>
      <div className="flex h-[55%] flex-col px-[7%] py-[5%]">
        <h3 data-soul-link-home-card-title="real-text" className="truncate text-[clamp(0.68rem,0.9vw,1rem)] font-black leading-tight text-slate-800">{card.name}</h3>
        <p className="mt-[5%] line-clamp-2 text-[clamp(0.5rem,0.74vw,0.82rem)] font-bold leading-5 text-slate-400">{card.description}</p>
        <div className="mt-auto flex items-center justify-between gap-2 text-[clamp(0.48rem,0.68vw,0.72rem)] font-bold text-slate-400">
          <span className="flex min-w-0 items-center gap-1 truncate">
            <UserCutImage src={lightMessageIcon} className="h-5 w-5 rounded-full" scale={2.2} />
            {card.visitLabel}
          </span>
          <span aria-hidden="true" className="text-violet-300">♡</span>
        </div>
      </div>
    </Link>
  )
}

function SoulLinkLightDiscoverCard({
  artboard,
  box,
  tavern,
  index,
}: {
  artboard: Artboard
  box: readonly [number, number, number, number]
  tavern?: Tavern
  index: number
}) {
  const fallback = LIGHT_FALLBACK_COORDINATE_CARDS[index % LIGHT_FALLBACK_COORDINATE_CARDS.length]
  const [x, y, w, h] = box
  const name = tavern?.name || fallback.name
  const description = tavern?.description || fallback.description
  const tag = tavern?.tags?.[0] || fallback.tag
  const image = tavern?.characters?.[0]?.avatar || fallback.image

  return (
    <Link
      to={targetFor(tavern?.id)}
      data-soul-link-discover-light-card="real-card"
      onMouseDown={suppressMouseFocus}
      className="absolute z-20 flex touch-manipulation flex-col overflow-hidden rounded-[1.1rem] border border-white/90 bg-white/95 shadow-[0_12px_32px_rgba(108,123,178,0.12)] outline-none transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(108,123,178,0.18)] focus:ring-4 focus:ring-violet-400/35"
      style={boxStyle(artboard, x, y, w, h)}
    >
      <div className="relative h-[48%] overflow-hidden">
        <img src={image} alt={`${name} 封面`} className="h-full w-full object-cover" loading="lazy" decoding="async" />
        <span className="absolute left-2.5 top-2.5 rounded-full bg-violet-500/86 px-2 py-0.5 text-[9px] font-black text-white">
          {tag}
        </span>
      </div>
      <div className="flex h-[52%] flex-col px-[8%] py-[6%]">
        <h3 className="truncate text-[13px] font-black leading-tight text-slate-800">{name}</h3>
        <p className="mt-1.5 line-clamp-2 text-[10px] font-bold leading-4 text-slate-400">{description}</p>
        <div className="mt-auto flex items-center justify-between text-[9px] font-black text-slate-300">
          <span className="flex items-center gap-1">
            <UserCutImage src={lightPinIcon} className="h-4 w-4 rounded-full" scale={1.8} />
            正在被探索
          </span>
          <ArrowUpRight size={10} strokeWidth={4} />
        </div>
      </div>
    </Link>
  )
}

function SoulLinkHomeLightMainSurface({
  artboard,
  featuredCitySlices,
}: {
  artboard: Artboard
  featuredCitySlices: HomeReferenceProps["featuredCitySlices"]
}) {
  return (
    <>
      <div aria-hidden="true" className="absolute inset-0 z-0 overflow-hidden">
        <img src={lightPlaneWash} alt="" className="h-full w-full object-cover opacity-60" draggable={false} decoding="async" />
      </div>
      <div aria-hidden="true" className="absolute z-0 overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_80px_rgba(116,135,190,0.14)]" style={boxStyle(artboard, 220, 18, 1000, 530)}>
        <img src={lightSkyCityBalcony} alt="" className="h-full w-full object-cover opacity-78" draggable={false} decoding="async" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/92 via-white/72 to-white/22" />
      </div>
      <div aria-hidden="true" className="absolute z-0 overflow-hidden rounded-[1.75rem] bg-white/92" style={boxStyle(artboard, 1220, 0, 316, 1024)}>
        <div className="absolute inset-0 bg-white/72" />
      </div>
      <UserCutImage src={lightPlaneIcon} className="absolute z-10 rounded-full opacity-85" style={boxStyle(artboard, 600, 70, 64, 64)} scale={2.2} loading="eager" />
      <UserCutImage src={lightCompassIcon} className="absolute z-10 rounded-full opacity-50" style={boxStyle(artboard, 846, 126, 118, 118)} scale={2.0} loading="eager" />
      <div className="absolute z-10" style={boxStyle(artboard, 280, 145, 520, 178)}>
        <p className="text-[clamp(0.48rem,0.72vw,0.8rem)] font-black uppercase tracking-[0.24em] text-violet-400">REAL COORDINATES / AI NPC</p>
        <h1 data-soul-link-home-light-title="real-text" className="mt-3 max-w-[12em] text-[clamp(1.45rem,2.35vw,2.45rem)] font-black leading-[1.25] tracking-[-0.04em] text-slate-800">
          在每一个坐标里，
          <br />
          遇见另一种可能的自己。
        </h1>
        <p className="mt-4 max-w-[32em] text-[clamp(0.58rem,0.9vw,0.95rem)] font-bold leading-7 text-slate-500">
          连接仍在回应的灵魂，探索属于你的故事。
        </p>
      </div>
      <div className="absolute z-10 rounded-[1.25rem] border border-white/90 bg-white/88 px-5 py-4 shadow-[0_18px_42px_rgba(118,133,190,0.16)]" style={boxStyle(artboard, 1042, 397, 170, 76)}>
        <p className="text-[clamp(0.44rem,0.62vw,0.66rem)] font-black text-slate-400">当前坐标</p>
        <p className="mt-2 flex items-center justify-between gap-2 text-[clamp(0.66rem,0.9vw,1rem)] font-black text-slate-700">
          云上图书馆
          <UserCutImage src={lightPinIcon} className="h-5 w-5 shrink-0 rounded-full" scale={1.7} loading="eager" />
        </p>
      </div>
      <div className="absolute z-10 flex items-center justify-between" style={boxStyle(artboard, 252, 560, 936, 44)}>
        <h2 className="text-[clamp(0.72rem,1vw,1rem)] font-black text-slate-800">为你推荐的坐标</h2>
        <Link to="/discover" onMouseDown={suppressMouseFocus} className="inline-flex min-h-9 touch-manipulation items-center gap-2 rounded-full px-3 text-[clamp(0.52rem,0.68vw,0.72rem)] font-black text-slate-400 outline-none transition hover:bg-white/70 hover:text-violet-500 focus:ring-4 focus:ring-violet-400/35">
          查看全部 →
        </Link>
      </div>
      {HOME_LAYOUT.cards.map((box, index) => (
        <SoulLinkLightCoordinateCard
          key={`home-light-real-card-${featuredCitySlices[index]?.id || index}`}
          artboard={artboard}
          box={box}
          slice={featuredCitySlices[index]}
          index={index}
        />
      ))}
    </>
  )
}

function SoulLinkHomeLightMobile({
  featuredCitySlices,
  onToggleTheme,
}: {
  featuredCitySlices: HomeReferenceProps["featuredCitySlices"]
  onToggleTheme: () => void
}) {
  const cards = HOME_LAYOUT.cards.map((_, index) => lightCoordinateCardData(featuredCitySlices[index], index))
  return (
    <div className="relative z-40 min-h-screen bg-[linear-gradient(180deg,#f4f8ff_0%,#eef4ff_46%,#fff_100%)] px-4 py-5 md:hidden">
      <header className="flex items-center justify-between rounded-[1.5rem] border border-white/80 bg-white/86 p-3 shadow-[0_18px_42px_rgba(108,123,178,0.14)]">
        <Link to="/" className="flex min-h-11 touch-manipulation items-center gap-3 rounded-2xl outline-none focus:ring-4 focus:ring-violet-400/35">
          <UserCutImage src={lightPlaneIcon} className="h-11 w-11 rounded-2xl" scale={2.4} loading="eager" />
          <span>
            <span className="block text-base font-black text-slate-800">FableMap</span>
            <span className="block text-xs font-bold text-slate-400">真实坐标里的 AI 空间</span>
          </span>
        </Link>
        <button type="button" onClick={onToggleTheme} className="grid h-11 w-11 touch-manipulation place-items-center rounded-2xl border border-violet-100 bg-violet-50 text-violet-500" aria-label="切换主题">
          ☼
        </button>
      </header>
      <section className="relative mt-5 overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-[0_22px_54px_rgba(108,123,178,0.16)]">
        <img src={lightSkyCityBalcony} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-34" loading="lazy" decoding="async" />
        <div aria-hidden="true" className="absolute inset-0 bg-white/78" />
        <p className="relative z-10 text-xs font-black uppercase tracking-[0.22em] text-violet-400">Real coordinates</p>
        <h1 data-soul-link-home-light-title-mobile="real-text" className="relative z-10 mt-3 text-3xl font-black leading-tight tracking-[-0.04em] text-slate-800">在每一个坐标里，遇见另一种可能的自己。</h1>
        <p className="relative z-10 mt-3 text-sm font-bold leading-7 text-slate-500">用真实地点打开一间空间，和主人配置的 AI NPC 对话、回访、留下记忆。</p>
        <div className="relative z-10 mt-5 flex gap-3">
          <Link to="/discover" className="inline-flex min-h-11 flex-1 touch-manipulation items-center justify-center rounded-2xl bg-violet-500 px-4 text-sm font-black text-white shadow-[0_16px_32px_rgba(118,91,255,0.25)]">开始探索</Link>
          <Link to="/create" className="inline-flex min-h-11 flex-1 touch-manipulation items-center justify-center rounded-2xl border border-violet-100 bg-white px-4 text-sm font-black text-violet-500">创建空间</Link>
        </div>
      </section>
      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-black text-slate-800">推荐坐标</h2>
          <Link to="/discover" className="text-sm font-black text-violet-400">全部 →</Link>
        </div>
        <div className="grid gap-3">
          {cards.map((slice, index) => (
            <Link key={slice.id || `fallback-${index}`} to={targetFor(slice.id)} data-soul-link-home-light-card="real-card" className="flex min-h-28 touch-manipulation gap-3 rounded-[1.5rem] border border-white/80 bg-white p-3 shadow-[0_14px_34px_rgba(108,123,178,0.12)]">
              <img src={slice.image} alt={`${slice.name} 封面`} className="h-24 w-28 rounded-[1.15rem] object-cover" loading="lazy" decoding="async" />
              <span className="min-w-0 flex-1 py-1">
                <span data-soul-link-home-card-title="real-text" className="block truncate font-black text-slate-800">{slice.name}</span>
                <span className="mt-2 line-clamp-2 block text-sm font-bold leading-6 text-slate-400">{slice.description}</span>
                <span className="mt-2 block text-xs font-black text-violet-400">{slice.tag}</span>
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
  const playIconSize = isBlack ? 12 : 16
  const playIconStrokeWidth = isBlack ? 2 : 2.75
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
        aria-label="开始探索"
        onMouseDown={suppressMouseFocus}
        className={cx(
          "absolute z-20 flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-[1.15rem] border text-sm font-black transition hover:-translate-y-0.5 focus:outline-none focus:ring-4",
          forceVisible ? "opacity-100" : "opacity-0 focus:opacity-100",
          primaryClass,
        )}
        style={boxStyle(artboard, HOME_LAYOUT.heroActions.primary.x, HOME_LAYOUT.heroActions.primary.y, HOME_LAYOUT.heroActions.primary.w, HOME_LAYOUT.heroActions.primary.h)}
      >
        <span>开始探索</span>
        {isBlack ? (
          <ArrowUpRight size={16} strokeWidth={3} className="opacity-70" />
        ) : (
          <UserCutImage src={lightArrowIcon} className="h-4 w-4" scale={2.8} />
        )}
      </Link>
      <Link
        to="/discover"
        aria-label="观看世界介绍"
        onMouseDown={suppressMouseFocus}
        className={cx(
          "absolute z-20 flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-[1.15rem] border text-sm font-black transition hover:-translate-y-0.5 focus:outline-none focus:ring-4",
          forceVisible ? "opacity-100" : "opacity-0 focus:opacity-100",
          secondaryClass,
        )}
        style={boxStyle(artboard, HOME_LAYOUT.heroActions.secondary.x, HOME_LAYOUT.heroActions.secondary.y, HOME_LAYOUT.heroActions.secondary.w, HOME_LAYOUT.heroActions.secondary.h)}
      >
        <span
          aria-hidden="true"
          className={cx(
            "grid h-7 w-7 shrink-0 place-items-center",
            isBlack ? "rounded-full border border-current/30" : "",
          )}
        >
          {isBlack ? (
            <Play
              size={playIconSize}
              fill="currentColor"
              strokeWidth={playIconStrokeWidth}
              className="ml-0.5"
            />
          ) : (
            <UserCutImage src={lightPlayIcon} className="h-5 w-5" scale={2.2} />
          )}
        </span>
        <span>观看世界介绍</span>
      </Link>
    </>
  )
}

function HomeCardLinks({ artboard, featuredCitySlices }: { artboard: Artboard; featuredCitySlices: HomeReferenceProps["featuredCitySlices"] }) {
  return (
    <>
      {HOME_LAYOUT.cards.map(([x, y, w, h], index) => (
        <OverlayLink
          key={`home-card-${index}`}
          artboard={artboard}
          hotspot={{ label: `进入推荐坐标 ${featuredCitySlices[index]?.name || index + 1}`, to: targetFor(featuredCitySlices[index]?.id), x, y, w, h }}
        />
      ))}
    </>
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
  const isBlack = variant === "black"
  return (
    <>
      {DISCOVER_LAYOUT.cards.map((box, index) => {
        const [x, y, w, h] = box
        const tavern = taverns[index]
        if (!isBlack && forceVisible) {
          return (
            <SoulLinkLightDiscoverCard
              key={`discover-light-card-${tavern?.id || index}`}
              artboard={artboard}
              box={box}
              tavern={tavern}
              index={index}
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
  const forceRealHome = variant === "light"
  return (
    <ArtboardShell artboard={artboard} variant={variant} kind="home">
      {forceRealHome ? <SoulLinkHomeLightMobile featuredCitySlices={featuredCitySlices} onToggleTheme={onToggleTheme} /> : null}
      <div className={forceRealHome ? "hidden md:block" : undefined}>
        {forceRealHome ? <SoulLinkHomeLightMainSurface artboard={artboard} featuredCitySlices={featuredCitySlices} /> : null}
        <SoulLinkSidebar artboard={artboard} variant={variant} active="home" onToggleTheme={onToggleTheme} />
        <SoulLinkUserCluster artboard={artboard} variant={variant} forceVisible={forceRealHome} />
        <SoulLinkFeedPanel
          artboard={artboard}
          variant={variant}
          box={HOME_RIGHT_RAIL.worldPulse}
          title="世界脉搏"
          eyebrow="实时回响"
          items={resolvedWorldPulseItems}
          actionLabel="查看全部动态"
          forceVisible={forceRealHome}
        />
        <SoulLinkDailyQuotePanel artboard={artboard} variant={variant} box={HOME_RIGHT_RAIL.dailyQuote} quote={dailyQuote} forceVisible={forceRealHome} />
        <SoulLinkOnlineEntitiesPanel artboard={artboard} variant={variant} box={HOME_RIGHT_RAIL.onlineEntities} entities={resolvedOnlineEntities} forceVisible={forceRealHome} />
        <SoulLinkRecentMemoriesPanel artboard={artboard} variant={variant} memories={resolvedRecentMemories} forceVisible={forceRealHome} />
        <SoulLinkGuidePanel artboard={artboard} variant={variant} cards={guideCards} forceVisible={forceRealHome} />
        <SoulLinkWorldStatsPanel artboard={artboard} variant={variant} stats={worldStats} forceVisible={forceRealHome} />
        <OverlayText artboard={artboard} x={270} y={135} w={480} h={120}>
          {variant === "black" ? "接入仍在回应的数字坐标网络" : "在每一个坐标里，遇见另一种可能的自己。"}
        </OverlayText>
        {variant === "black" ? <OverlayMask artboard={artboard} className="rounded-[1.4rem] bg-[#02070e] shadow-[0_0_34px_rgba(2,7,14,0.92)]" {...HOME_LAYOUT.blackSearchMask} /> : null}
        <OverlayInput
          artboard={artboard}
          value={search || ""}
          onChange={onSearchChange}
          onSubmit={onSearchSubmit}
          placeholder="输入你想前往的地方..."
          variant={variant}
          forceVisible={forceRealHome}
          {...HOME_LAYOUT.search}
        />
        {variant === "black" ? <OverlayMask artboard={artboard} className="rounded-[1.25rem] bg-[#08101a]/92" {...HOME_LAYOUT.heroActionsMask} /> : null}
        <HomeHeroActions artboard={artboard} variant={variant} forceVisible={forceRealHome} />
        {variant === "black" ? <HomeCardLinks artboard={artboard} featuredCitySlices={featuredCitySlices} /> : null}
        <OverlayLink artboard={artboard} hotspot={HOME_LAYOUT.links.allCoordinates} />
      </div>
    </ArtboardShell>
  )
}

export function SoulLinkDiscoverReference(props: DiscoverReferenceProps) {
  const artboard = props.variant === "black" ? DISCOVER_BLACK : DISCOVER_LIGHT
  const resolvedSideFeedItems = props.sideFeedItems?.length ? props.sideFeedItems : fallbackFeedItemsFromTaverns(props.taverns)
  const resolvedOnlineEntities = props.onlineEntities?.length ? props.onlineEntities : fallbackOnlineEntitiesFromFeed(resolvedSideFeedItems)
  const forceRealDiscover = props.variant === "light"
  return (
    <ArtboardShell artboard={artboard} variant={props.variant} kind="discover">
      <SoulLinkSidebar artboard={artboard} variant={props.variant} active="discover" onToggleTheme={props.onToggleTheme} />
      <SoulLinkUserCluster artboard={artboard} variant={props.variant} forceVisible={forceRealDiscover} />
      <SoulLinkFeedPanel
        artboard={artboard}
        variant={props.variant}
        box={DISCOVER_RIGHT_RAIL.signalFeed}
        title="信号动态"
        eyebrow="Signal Feed"
        items={resolvedSideFeedItems}
        actionLabel="查看全部"
        forceVisible={forceRealDiscover}
      />
      <SoulLinkOnlineEntitiesPanel artboard={artboard} variant={props.variant} box={DISCOVER_RIGHT_RAIL.onlineEntities} entities={resolvedOnlineEntities} forceVisible={forceRealDiscover} />
      <OverlayText artboard={artboard} {...DISCOVER_LAYOUT.title}>
        探索
      </OverlayText>
      <OverlayInput
        artboard={artboard}
        value={props.search}
        onChange={props.onSearchChange}
        placeholder="搜索地点、角色、记忆 or 关键词..."
        variant={props.variant}
        forceVisible={forceRealDiscover}
        {...DISCOVER_LAYOUT.search}
      />
      <OverlayButton artboard={artboard} label="全部筛选" onClick={props.onClear} {...DISCOVER_LAYOUT.filters.all} />
      <OverlayButton artboard={artboard} label="正在被探索" onClick={() => props.onOpenOnlyChange(true)} {...DISCOVER_LAYOUT.filters.openOnly} />
      <OverlayButton artboard={artboard} label="最近活跃" onClick={() => props.onPublicOnlyChange(true)} {...DISCOVER_LAYOUT.filters.recent} />
      <OverlayButton artboard={artboard} label="低信号" onClick={() => props.onToggleSpecialType("cultivation-retreat")} {...DISCOVER_LAYOUT.filters.lowSignal} />
      <OverlayButton artboard={artboard} label="舒适空间" onClick={() => props.onTogglePlaceType("bookstore")} {...DISCOVER_LAYOUT.filters.cozy} />
      <OverlayButton artboard={artboard} label="更多筛选" onClick={() => props.onToggleCategory("陪伴树洞")} {...DISCOVER_LAYOUT.filters.more} />
      <DiscoverCardLinks
        artboard={artboard}
        taverns={props.taverns}
        variant={props.variant}
        forceVisible={forceRealDiscover}
      />
      <OverlayLink artboard={artboard} hotspot={DISCOVER_LAYOUT.create} />
    </ArtboardShell>
  )
}
