import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from "react"
import { Link } from "react-router"
import {
  Bell,
  Info,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bookmark,
  ChevronDown,
  Compass,
  Heart,
  Home as HomeIcon,
  MapPin,
  MessageCircle,
  Play,
  Search,
  Send,
} from "lucide-react"

import discoverCardCompass from "../assets/fable-space-05-10/discover/cards/card-compass-square.png"
import discoverCardPlane from "../assets/fable-space-05-10/discover/cards/card-plane-square.png"
import discoverCardSkyCity from "../assets/fable-space-05-10/discover/cards/card-sky-city-square.png"
import discoverCardTrainPlatform from "../assets/fable-space-05-10/discover/cards/card-train-platform-square.png"
import discoverWorldStatusBgBlack from "../assets/fable-space-05-10/discover/world-status/bg-black.png"
import homeBlackInviteCard from "../assets/fable-space-05-10/home-black/invite-card.webp"
import homeBlackGuideDatabaseIcon from "../assets/fable-space-05-10/home-black/guide-database-icon.webp"
import homeBlackGuideProtocolIcon from "../assets/fable-space-05-10/home-black/guide-protocol-icon.webp"
import homeBlackGuideSecurityIcon from "../assets/fable-space-05-10/home-black/guide-security-icon.webp"
import homeBlackHeroVisual from "../assets/fable-space-05-10/home-black/hero-system-visual.webp"
import homeBlackRecentEchoWaveform from "../assets/fable-space-05-10/home-black/recent-echo-waveform.webp"
import homeBlackUserAvatar from "../assets/fable-space-05-10/home-black/user-avatar-node07.webp"
import homeBlackWorldStatsSparkline from "../assets/fable-space-05-10/home-black/world-stats-sparkline.webp"
import sceneBar from "../assets/fable-space-scenes/bar.webp"
import sceneCafe from "../assets/fable-space-scenes/cafe.webp"
import sceneCompany from "../assets/fable-space-scenes/company.webp"
import sceneHotel from "../assets/fable-space-scenes/hotel.webp"
import sceneLibrary from "../assets/fable-space-scenes/library.webp"
import scenePetShop from "../assets/fable-space-scenes/pet-shop.webp"
import sceneSchool from "../assets/fable-space-scenes/school.webp"
import sceneSportsCenter from "../assets/fable-space-scenes/sports-center.webp"
import fableSpaceUserAvatarImage from "../assets/npc-style-cast/portraits-hd/commission-zhideng.png"
import { buildSpaceFirstMinuteGuide } from "../lib/space-first-minute"
import type { Space } from "../lib/spaces"
import { WEB_PATHS, spacePath } from "../lib/web-routes"

const homeLightInviteCard = homeBlackInviteCard
const homeLightInviteCard2x = homeBlackInviteCard
const lightMessageIcon = discoverCardPlane
const lightPinIcon = discoverCardCompass
const lightPlaneIcon = discoverCardPlane
const lightPulseIcon = homeBlackWorldStatsSparkline
const lightPlaneWash = homeBlackHeroVisual
const lightPaperPlaneSoft = homeBlackWorldStatsSparkline
const lightSkyCityBalcony = homeBlackHeroVisual
const lightGuideStarterBg = homeBlackGuideProtocolIcon
const lightGuideEnvelopeBg = homeBlackGuideDatabaseIcon
const lightGuideShieldBg = homeBlackGuideSecurityIcon

type Variant = "light" | "black"

type FableSpaceHeroCoordinate = {
  name: string
  coordinateLabel: string
  timeLabel?: string
}

type HomeReferenceProps = {
  variant: Variant
  featuredCitySlices: { id?: string; name?: string; description?: string; visit_count?: number; image?: string; tags?: string[] }[]
  isLoading?: boolean
  heroCoordinate?: FableSpaceHeroCoordinate
  worldPulseItems?: FableSpaceFeedItem[]
  dailyQuote?: FableSpaceDailyQuote
  onlineEntities?: FableSpaceOnlineEntity[]
  recentMemories?: FableSpaceRecentMemory[]
  guideCards?: FableSpaceGuideCard[]
  worldStats?: FableSpaceWorldStat[]
  search?: string
  onSearchChange?: (value: string) => void
  onSearchSubmit?: () => void
  onToggleTheme: () => void
}

type DiscoverReferenceProps = {
  variant: Variant
  search: string
  spaces: Space[]
  isLoading?: boolean
  onSearchChange: (value: string) => void
  onClear: () => void
  onTogglePlaceType: (placeTypeId: string) => void
  onToggleSpecialType: (specialTypeId: string) => void
  onToggleCategory: (label: string) => void
  onPublicOnlyChange: (value: boolean) => void
  onOpenOnlyChange: (value: boolean) => void
  sideFeedItems?: FableSpaceFeedItem[]
  onlineEntities?: FableSpaceOnlineEntity[]
  visitorReduced?: boolean
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

type FableSpaceUserProfile = {
  name: string
  meta: string
  avatar: string
}

type FableSpaceFeedItem = {
  id: string
  title: string
  subtitle: string
  meta: string
  image: string
  squareImage?: boolean
  to?: string
}

type FableSpaceDailyQuote = {
  title: string
  quote: string
  source?: string
}

type FableSpaceOnlineEntity = {
  id: string
  name: string
  location: string
  status: string
  avatar: string
  squareImage?: boolean
  to?: string
}

type FableSpaceRecentMemory = {
  id: string
  title: string
  source: string
  meta: string
  image: string
  to?: string
}

type FableSpaceGuideCard = {
  id: string
  title: string
  text: string
  to?: string
  image?: string
  accent?: "violet" | "blue" | "rose" | "cyan"
}

type FableSpaceWorldStat = {
  id: string
  label: string
  value: string
}

const DEFAULT_FABLE_SPACE_USER: FableSpaceUserProfile = {
  name: "星野奈奈",
  meta: "Lv.28",
  avatar: fableSpaceUserAvatarImage,
}

const DEFAULT_DAILY_QUOTE: FableSpaceDailyQuote = {
  title: "每日一句",
  quote: "世界很大，而我们在某个坐标相遇。",
}

const DEFAULT_GUIDE_CARDS: FableSpaceGuideCard[] = [
  { id: "starter", title: "新手指南", text: "如何开始你的旅程", to: WEB_PATHS.quests, accent: "violet" },
  { id: "worldbook", title: "坐标百科", text: "了解这个世界的规则", to: WEB_PATHS.spaces, accent: "blue" },
  { id: "safety", title: "安全指引", text: "让探索更安心", to: WEB_PATHS.createSpace, accent: "rose" },
]

const DEFAULT_WORLD_STATS: FableSpaceWorldStat[] = [
  { id: "coordinates", label: "新增坐标", value: "12" },
  { id: "entities", label: "活跃角色", value: "28" },
  { id: "echoes", label: "回访记录", value: "156" },
  { id: "explores", label: "探索次数", value: "3,214" },
]

const WORLD_TIME_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
})

const LIGHT_GUIDE_BACKGROUNDS = [lightGuideStarterBg, lightGuideEnvelopeBg, lightGuideShieldBg] as const

const LIGHT_FALLBACK_COORDINATE_CARDS = [
  {
    spaceId: "pw_lantern_helpdesk",
    name: "学校",
    description: "小刘老师在收作业，光头校长又来巡班，班长林夏悄悄给你留了座位。",
    tag: "校园",
    image: sceneSchool,
  },
  {
    spaceId: "pw_midnight_treehole",
    name: "酒店",
    description: "顾姐盯着大堂，小满在前台招手，吴姨刚捡到一把没人认领的伞。",
    tag: "入住",
    image: sceneHotel,
  },
  {
    spaceId: "pw_community_repair",
    name: "咖啡馆",
    description: "苏晚在盘账，江野认真冲咖啡，唐梨已经攒好了一肚子附近八卦。",
    tag: "闲聊",
    image: sceneCafe,
  },
  {
    spaceId: "pw_lost_found_archive",
    name: "宠物店",
    description: "程哥正哄柯基，猫娘白桃给猫梳毛，阿乐抱着新来的寄养箱等你帮忙。",
    tag: "宠物",
    image: scenePetShop,
  },
] as const

const BLACK_FALLBACK_COORDINATE_CARDS = [
  {
    spaceId: "pw_third_shelf_observatory",
    name: "图书馆",
    description: "顾馆长在整书架，许知书帮你找书，穿古风 cosplay 的沈月正在查冷门资料。",
    tag: "阅读",
    image: sceneLibrary,
  },
  {
    spaceId: "pw_midnight_commission_board",
    name: "公司",
    description: "高冷顾总话少判断快，程主管训人从不留情，小雨已经挪椅子来吐槽和安慰你。",
    tag: "职场",
    image: sceneCompany,
  },
  {
    spaceId: "pw_after_school_hero_supply",
    name: "酒吧",
    description: "北哥招呼客人，杀马特调酒师陆川在做无酒精特调，驻唱苏晴准备开麦。仅限成年人。",
    tag: "成年",
    image: sceneBar,
  },
  {
    spaceId: "pw_jingan_catbell_refuge",
    name: "体育馆",
    description: "周野教羽毛球，顾言守着乒乓球台，夏澄在泳池边等你开始训练。",
    tag: "运动",
    image: sceneSportsCenter,
  },
] as const

const FALLBACK_DISCOVERY_CARDS = [
  ...LIGHT_FALLBACK_COORDINATE_CARDS,
  ...BLACK_FALLBACK_COORDINATE_CARDS,
] as const

const DISCOVER_CARD_IMAGES = [
  sceneSchool,
  sceneHotel,
  sceneCafe,
  scenePetShop,
  sceneLibrary,
  sceneCompany,
  sceneBar,
  sceneSportsCenter,
] as const

const HOME_COORDINATE_CARD_AVATAR_IMAGES = [homeBlackUserAvatar, sceneCafe, sceneLibrary, sceneSportsCenter] as const
const DISCOVER_CARD_AVATAR_IMAGE_SETS = DISCOVER_CARD_IMAGES.map((_, index) => [
  DISCOVER_CARD_IMAGES[(index + 1) % DISCOVER_CARD_IMAGES.length],
  DISCOVER_CARD_IMAGES[(index + 2) % DISCOVER_CARD_IMAGES.length],
  DISCOVER_CARD_IMAGES[(index + 3) % DISCOVER_CARD_IMAGES.length],
] as const)

const BLACK_NODE_META = [
  { nodeId: "SPACE_05", entityLabel: "图书馆", tone: "active" },
  { nodeId: "SPACE_06", entityLabel: "公司", tone: "active" },
  { nodeId: "SPACE_07", entityLabel: "酒吧", tone: "active" },
  { nodeId: "SPACE_08", entityLabel: "体育馆", tone: "active" },
] as const

const BLACK_GUIDE_ICONS = [homeBlackGuideProtocolIcon, homeBlackGuideDatabaseIcon, homeBlackGuideSecurityIcon] as const

const HOME_BLACK: Artboard = {
  width: 1536,
  height: 1024,
  marker: "home-black-real-dom-1536x1024",
  background: "#020710",
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
  echoFeed: { x: 1236, y: 300, w: 270, h: 250 },
  onlineEntities: { x: 1236, y: 574, w: 270, h: 260 },
} as const
const DISCOVER_RIGHT_RAIL_PANEL = { w: 316, h: 1024 } as const

const homeSharedCardBoxes = [
  [256, 560, 224, 249],
  [493, 560, 224, 249],
  [731, 560, 224, 249],
  [968, 560, 224, 249],
] as const

const discoverSharedCardBoxes = [
  [252, 413, 224, 224],
  [491, 413, 224, 224],
  [730, 413, 224, 224],
  [969, 413, 236, 224],
  [252, 665, 224, 224],
  [491, 665, 224, 224],
  [730, 665, 224, 224],
  [969, 665, 236, 224],
] as const

// Light / black home variants intentionally share one geometry source.
// Theme differences stay in materials, copy, and color branches only.
const HOME_LAYOUT = {
  sidebar: {
    panel: { x: 0, y: 0, w: 236, h: 1024 },
    logo: { x: 30, y: 38, w: 194, h: 88 },
    navItems: [
      { id: "home", label: "镜像面", eyebrow: "首页", to: WEB_PATHS.home, x: 24, y: 154, w: 194, h: 62 },
      { id: "discover", label: "空间", eyebrow: "发现空间", to: WEB_PATHS.spaces, x: 24, y: 225, w: 194, h: 62 },
      { id: "echoes", label: "回访", eyebrow: "我的家", to: WEB_PATHS.myHome, x: 24, y: 296, w: 194, h: 62, badge: "12" },
      { id: "memory", label: "记忆", eyebrow: "回访记录", to: WEB_PATHS.myHome, x: 24, y: 367, w: 194, h: 62 },
      { id: "saved", label: "私密", eyebrow: "私密空间", to: WEB_PATHS.myHome, x: 24, y: 438, w: 194, h: 62 },
      { id: "anchors", label: "地点", eyebrow: "位置锚点", to: WEB_PATHS.spaces, x: 24, y: 509, w: 194, h: 62 },
      { id: "create", label: "店主", eyebrow: "店主后台", to: WEB_PATHS.owner, x: 24, y: 580, w: 194, h: 62 },
    ],
    status: { x: 38, y: 790, w: 190, h: 190 },
    bottomActions: [
      { label: "切换主题", x: 53, y: 938, w: 34, h: 34, action: "theme" },
      { label: "打开回访", x: 103, y: 938, w: 34, h: 34, to: WEB_PATHS.myHome },
    ],
  },
  userCluster: { x: 1182, y: 16, w: 346, h: 68 },
  cards: homeSharedCardBoxes,
  hero: { x: 256, y: 84, w: 936, h: 418 },
  title: { x: 280, y: 150, w: 420, h: 180 },
  heroDecorations: {
    primary: { x: 842, y: 112, w: 34, h: 34 },
    secondary: { x: 1078, y: 390, w: 22, h: 22 },
  },
  currentCoordinate: { x: 978, y: 206, w: 176, h: 78 },
  recommendedHeader: { x: 256, y: 520, w: 936, h: 40 },
  search: { x: 268, y: 23, w: 858, h: 54 },
  heroActions: {
    primary: { x: 280, y: 318, w: 144, h: 54 },
    secondary: { x: 438, y: 318, w: 133, h: 54 },
  },
  rightRailSurface: { x: 1220, y: 0, w: 316, h: 1024 },
  rightRail: {
    worldPulse: { x: 1220, y: 116, w: 300, h: 300 },
    dailyQuote: { x: 1220, y: 438, w: 300, h: 160 },
    onlineEntities: { x: 1220, y: 604, w: 300, h: 390 },
  },
  bottomRail: {
    recentMemories: { x: 256, y: 824, w: 291, h: 178 },
    guideCards: { x: 560, y: 824, w: 414, h: 178 },
    worldStats: { x: 987, y: 824, w: 526, h: 178 },
  },
} as const

const SIDEBAR_MATERIALS = {
  light: {
    inviteCard: { src: homeLightInviteCard, src2x: homeLightInviteCard2x },
  },
  black: {
    inviteCard: { src: homeBlackInviteCard, src2x: homeBlackInviteCard },
  },
} as const

const DISCOVER_LAYOUT = {
  cards: discoverSharedCardBoxes,
  title: { x: 252, y: 34, w: 240, h: 72 },
  search: { x: 540, y: 27, w: 426, h: 48 },
  topStatus: { x: 984, y: 26, w: 536, h: 64 },
  filters: {
    all: { x: 413, y: 118, w: 72, h: 42 },
    openOnly: { x: 500, y: 118, w: 120, h: 42 },
    recent: { x: 650, y: 118, w: 120, h: 42 },
    lowResonance: { x: 782, y: 118, w: 120, h: 42 },
    cozy: { x: 916, y: 118, w: 120, h: 42 },
    more: { x: 1040, y: 118, w: 145, h: 42 },
  },
  create: { label: "店主开设空间", to: WEB_PATHS.createSpace, x: 1258, y: 854, w: 260, h: 138 },
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
    title: "开门状态",
    items: ["任何状态", "正在营业", "临时休息", "需要预约"],
  },
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

function targetFor(space?: { id?: string; name?: string }) {
  return space?.id ? spacePath({ id: space.id, name: space.name || "空间" }) : WEB_PATHS.spaces
}

/** Build a stable local favorite key while fallback cards do not have persisted ids. */
function discoverFavoriteKey(kind: "echo" | "footprint", cardId: string | undefined, index: number) {
  return `${kind}:${cardId || `pending-${index}`}`
}

function homeCoordinateCardData(slice: HomeReferenceProps["featuredCitySlices"][number] | undefined, index: number, variant: Variant) {
  const fallback = variant === "black"
    ? BLACK_FALLBACK_COORDINATE_CARDS[index % BLACK_FALLBACK_COORDINATE_CARDS.length]
    : LIGHT_FALLBACK_COORDINATE_CARDS[index % LIGHT_FALLBACK_COORDINATE_CARDS.length]
  const matchingSlice = slice?.id === fallback.spaceId ? slice : undefined
  const visitCount = Number(matchingSlice?.visit_count || 0)
  const blackMeta = BLACK_NODE_META[index % BLACK_NODE_META.length]
  return {
    id: fallback.spaceId,
    name: fallback.name,
    description: fallback.description,
    tag: fallback.tag,
    image: fallback.image,
    visitLabel: visitCount > 0 ? `${visitCount} 人在这里` : "等待第一次到访",
    nodeId: variant === "black" ? blackMeta.nodeId : `COORD_${String(index + 1).padStart(2, "0")}`,
    entityLabel: variant === "black" ? blackMeta.entityLabel : visitCount > 0 ? `${visitCount} visits` : "new space",
    tone: variant === "black" ? blackMeta.tone : "active",
  }
}

function discoverCardData(space: Space | undefined, index: number) {
  const fallback = FALLBACK_DISCOVERY_CARDS[index % FALLBACK_DISCOVERY_CARDS.length]
  const matchingSpace = space?.id === fallback.spaceId ? space : undefined
  const visitCount = Number(matchingSpace?.visit_count || 0)
  const characterCount = matchingSpace?.characters?.length || 0
  const minutes = index < 4 ? (index + 1) * 3 + 2 : index * 7
  const guide = matchingSpace ? buildSpaceFirstMinuteGuide(matchingSpace) : null
  return {
    id: fallback.spaceId,
    name: fallback.name,
    description: fallback.description,
    tag: fallback.tag,
    image: fallback.image,
    visitLabel: visitCount > 0 ? `${visitCount} 人在这里` : "等待到访",
    characterLabel: characterCount > 0 ? `${characterCount} 位 NPC` : "待配置 NPC",
    favoriteCount: visitCount > 0 ? Math.max(1, Math.round(visitCount * 0.28) + 8 - index) : [23, 17, 11, 9][index % 4],
    timeLabel: minutes < 60 ? `${minutes} 分钟前` : "1 小时前",
    sceneHint: guide?.sceneHint || "真实坐标上的空间。",
    tryPrompt: guide?.tryThisFirst?.[0] || "这里为什么偏偏开在这里？",
    experienceType: guide?.experienceType || fallback.tag,
  }
}

function safeMetricNumber(value: unknown): number {
  const numberValue = Number(value || 0)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0
}

function formatStatusNumber(value: number): string {
  return Math.max(0, Math.round(value)).toLocaleString("en-US")
}

function formatWorldTime(date: Date): string {
  return WORLD_TIME_FORMATTER.format(date)
}

function discoverWorldStatusFromSpaces(spaces: Space[]) {
  const totalCoordinates = spaces.length
  const totalVisits = spaces.reduce((sum, space) => sum + safeMetricNumber(space.visit_count), 0)
  const npcCount = spaces.reduce((sum, space) => sum + (space.characters?.length || 0), 0)
  const openCoordinates = spaces.filter((space) => {
    const status = String(space.status || "open").toLowerCase()
    return status === "open" && space.is_open !== false
  }).length
  const unstableCoordinates = spaces.filter((space) => {
    const status = String(space.status || "").toLowerCase()
    return status && status !== "open"
  }).length
  const missingAnchors = spaces.filter((space) => {
    const lat = Number(space.lat)
    const lon = Number(space.lon)
    return !Number.isFinite(lat) || !Number.isFinite(lon)
  }).length
  const privateCoordinates = spaces.filter((space) => String(space.access || "").toLowerCase() === "private").length

  return {
    syncLabel: totalCoordinates ? `${formatStatusNumber(totalCoordinates)} 个坐标同步` : "实时更新",
    onlineSouls: formatStatusNumber(totalVisits + openCoordinates * 8 + npcCount),
    resonanceFluctuation: formatStatusNumber(unstableCoordinates + Math.ceil(npcCount / 3)),
    coordinateAnomalies: formatStatusNumber(missingAnchors + privateCoordinates),
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

function FableSpaceSidebar({
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
      data-fable-space-sidebar="shared"
      data-fable-space-sidebar-active={active}
      className={cx("absolute z-30 overflow-hidden rounded-r-[1.45rem] border-r", panelClass)}
      style={boxStyle(artboard, panel.x, panel.y, panel.w, panel.h)}
    >
      <Link
        to="/"
        aria-label="FableSpace 世界的镜像面"
        onMouseDown={suppressMouseFocus}
        className={cx(
          "absolute touch-manipulation rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-violet-400/45",
          "flex flex-col justify-center",
          isBlack ? "border border-cyan-300/14 bg-cyan-300/6" : "border border-violet-100 bg-white/82",
        )}
        style={panelBoxStyle(panel, sidebar.logo.x, sidebar.logo.y, sidebar.logo.w, sidebar.logo.h)}
      >
        <span className={cx("text-2xl font-black leading-none tracking-tight", isBlack ? "text-cyan-50" : "text-slate-900")}>FableSpace</span>
        <span className={cx("mt-2 text-[11px] font-bold leading-none", isBlack ? "text-cyan-100/50" : "text-slate-500")}>世界的镜像面</span>
      </Link>

      <nav aria-label="FableSpace 主导航" className="absolute inset-0">
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
              <SidebarNavIcon id={item.id} variant={variant} className="h-7 w-7 shrink-0" />
              <span className="ml-[16px] min-w-0 flex-1 leading-none">
                <span className={cx("block truncate text-[14px] font-black uppercase tracking-[0.08em]", selected && isBlack ? "text-cyan-50" : undefined)}>{item.label}</span>
                <span className={cx("mt-1.5 block truncate text-[11px] font-bold tracking-[0.08em]", isBlack ? "text-cyan-100/46" : "text-slate-400")}>{item.eyebrow}</span>
              </span>
              {"badge" in item && (
                <span className={cx(
                  "ml-auto rounded-md px-2 py-1 text-xs font-bold leading-none",
                  variant === "black" ? "bg-cyan-300/12 text-cyan-100/74" : "bg-[#efecff] text-[#8d79ff]",
                )}>
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <section
        data-fable-space-sidebar-status="dom-text"
        className={cx(
          "absolute overflow-hidden rounded-[0.9rem] border px-4 py-4",
          isBlack
            ? "border-cyan-300/16 bg-[#061226]/76 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_0_24px_rgba(34,211,238,0.08)]"
            : "border-white/80 bg-white/84 text-slate-700",
        )}
        style={panelBoxStyle(panel, sidebar.status.x, sidebar.status.y, sidebar.status.w, sidebar.status.h)}
      >
        <p className="text-[13px] font-black uppercase tracking-[0.13em] text-cyan-300">SPACE STATUS</p>
        <p className="mt-1 text-[11px] font-bold text-cyan-100/48">空间状态</p>
        <div className="mt-4 h-px w-full bg-cyan-300/16" />
        <p className="mt-5 flex items-center gap-2 text-[12px] font-black text-cyan-300">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
          MIRROR READY
        </p>
        <p className="mt-1 pl-4 text-[11px] font-bold text-cyan-100/48">镜像空间可进入</p>
      </section>

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

function FableSpaceNotificationBell({ variant }: { variant: Variant }) {
  const isBlack = variant === "black"
  return (
    <button
      type="button"
      data-fable-space-notification="real-button"
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

function FableSpaceUserAvatar({ avatar, name, variant }: { avatar: string; name: string; variant: Variant }) {
  const isBlack = variant === "black"
  const blackAvatarStyle: CSSProperties | undefined = isBlack
    ? { backgroundImage: `url(${avatar})`, backgroundPosition: "center", backgroundSize: "cover" }
    : undefined
  return (
    <span
      data-fable-space-user-avatar="real-image"
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

function FableSpaceUserIdentity({ name, meta, variant }: { name: string; meta: string; variant: Variant }) {
  const isBlack = variant === "black"
  return (
      <span data-fable-space-user-name="real-text" className="min-w-0 flex-1 text-left">
        <span className={cx("block truncate font-black leading-tight", isBlack ? "text-[clamp(0.72rem,0.9vw,1rem)] text-cyan-50" : "text-[clamp(0.82rem,1vw,1.08rem)] text-slate-700")}>{name}</span>
        <span className={cx("mt-1 block truncate font-black leading-none", isBlack ? "text-[clamp(0.6rem,0.72vw,0.84rem)] text-cyan-100/58" : "text-[clamp(0.68rem,0.8vw,0.9rem)] text-slate-400")}>{meta}</span>
      </span>
  )
}

function FableSpaceWorldTimeCard({ variant }: { variant: Variant }) {
  const isBlack = variant === "black"
  const [time, setTime] = useState("00:00:00")

  useEffect(() => {
    setTime(formatWorldTime(new Date()))
    const timer = window.setInterval(() => setTime(formatWorldTime(new Date())), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div
      data-fable-space-world-time-card="dynamic-text"
      className={cx(
        "flex h-full min-w-0 cursor-default items-center gap-[5%] overflow-hidden rounded-[1.15rem] border px-[6%] text-left",
        isBlack
          ? "border-cyan-300/14 bg-[#061226]/72 text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_14px_32px_rgba(0,0,0,0.26)]"
          : "border-white/90 bg-white/86 text-slate-700 shadow-[0_14px_32px_rgba(86,105,166,0.12)] backdrop-blur-xl",
      )}
    >
      <span className={cx("grid h-7 w-7 shrink-0 place-items-center rounded-full border", isBlack ? "border-violet-300/34 bg-violet-300/10 text-violet-200" : "border-violet-100 bg-violet-50 text-violet-500")}>
        <Compass size={15} strokeWidth={2.5} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className={cx("truncate text-[11px] font-black leading-none", isBlack ? "text-cyan-100/62" : "text-slate-500")}>世界时间</span>
          <span data-fable-space-world-time-english="real-text" className={cx("truncate text-[9px] font-black leading-none tracking-[0.08em]", isBlack ? "text-cyan-100/30" : "text-slate-300")}>WORLD TIME</span>
        </span>
        <span data-fable-space-world-time-value="dynamic-text" className={cx("mt-2 block text-[17px] font-black leading-none tabular-nums", isBlack ? "text-cyan-50" : "text-slate-800")}>{time}</span>
      </span>
    </div>
  )
}

function FableSpaceTopStatusBar({
  artboard,
  variant,
  profile = DEFAULT_FABLE_SPACE_USER,
}: {
  artboard: Artboard
  variant: Variant
  profile?: FableSpaceUserProfile
}) {
  const isBlack = variant === "black"
  const box = DISCOVER_LAYOUT.topStatus
  const resolvedProfile = isBlack
    ? { name: "USER_07", meta: "ID: 0x7A31...9F2C", avatar: homeBlackUserAvatar }
    : profile
  return (
    <div
      data-fable-space-top-status="real-dom"
      className="absolute z-30 grid grid-cols-[minmax(7.75rem,38%)_4rem_minmax(0,1fr)] items-center gap-[2%] overflow-hidden"
      style={boxStyle(artboard, box.x, box.y, box.w, box.h)}
    >
      <FableSpaceWorldTimeCard variant={variant} />
      <div className="h-full min-w-0 aspect-square">
        <FableSpaceNotificationBell variant={variant} />
      </div>
      <Link
        to={WEB_PATHS.myHome}
        data-fable-space-top-user-card="real-dom"
        aria-label={`${resolvedProfile.name} 个人中心`}
        onMouseDown={suppressMouseFocus}
        className={cx(
          "flex h-full min-w-0 touch-manipulation items-center gap-[4%] overflow-hidden rounded-[1.15rem] border px-[4%] outline-none transition focus:ring-4",
          isBlack
            ? "border-cyan-300/14 bg-[#061226]/76 shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_14px_34px_rgba(0,0,0,0.28)] focus:ring-cyan-300/30"
            : "border-white/90 bg-white/88 shadow-[0_14px_34px_rgba(86,105,166,0.12)] backdrop-blur-xl focus:ring-violet-400/30",
        )}
      >
        <span className="relative h-[70%] aspect-square shrink-0">
          <span className={cx("absolute left-[-0.35rem] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full", isBlack ? "bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.85)]" : "bg-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.38)]")} />
          <FableSpaceUserAvatar avatar={resolvedProfile.avatar} name={resolvedProfile.name} variant={variant} />
        </span>
        <FableSpaceUserIdentity name={resolvedProfile.name} meta={resolvedProfile.meta} variant={variant} />
        <ChevronDown size={15} strokeWidth={3} className={cx("shrink-0 opacity-60", isBlack ? "text-cyan-100" : "text-slate-500")} />
      </Link>
    </div>
  )
}

function FableSpaceUserCluster({
  artboard,
  variant,
  profile = DEFAULT_FABLE_SPACE_USER,
  forceVisible = false,
}: {
  artboard: Artboard
  variant: Variant
  profile?: FableSpaceUserProfile
  forceVisible?: boolean
}) {
  const isBlack = variant === "black"
  const box = HOME_LAYOUT.userCluster
  const resolvedProfile = isBlack
    ? { name: "USER_07", meta: "ID: 0x7A31...9F2C", avatar: homeBlackUserAvatar }
    : profile
  return (
    <div
      data-fable-space-user-cluster="shared"
      className={cx(
        "absolute z-30 flex items-center gap-[4%] rounded-[1.75rem] border p-[0.55%] pr-[0.75%]",
        forceVisible ? "opacity-100" : "opacity-0",
        isBlack
          ? "border-cyan-300/16 bg-[#020710]/96 shadow-[0_0_30px_rgba(0,255,255,0.1)]"
          : "border-white/80 bg-white/92 shadow-[0_14px_36px_rgba(83,103,166,0.13)] backdrop-blur-xl",
      )}
      style={boxStyle(artboard, box.x, box.y, box.w, box.h)}
    >
      <FableSpaceNotificationBell variant={variant} />
      <Link
        to={WEB_PATHS.myHome}
        aria-label={`${resolvedProfile.name} 个人中心`}
        onMouseDown={suppressMouseFocus}
        className="flex h-full min-w-0 flex-1 touch-manipulation items-center gap-[7%] rounded-[1.35rem] px-[2%] outline-none transition focus:ring-4 focus:ring-violet-400/45"
      >
        <FableSpaceUserAvatar avatar={resolvedProfile.avatar} name={resolvedProfile.name} variant={variant} />
        <FableSpaceUserIdentity name={resolvedProfile.name} meta={resolvedProfile.meta} variant={variant} />
        <ChevronDown size={14} strokeWidth={3} className={cx("shrink-0 opacity-60", isBlack ? "text-cyan-300" : "text-slate-500")} />
      </Link>
    </div>
  )
}

function FableSpaceDiscoverRailUserCard({
  variant,
  style,
  profile = DEFAULT_FABLE_SPACE_USER,
}: {
  variant: Variant
  style: CSSProperties
  profile?: FableSpaceUserProfile
}) {
  const isBlack = variant === "black"
  const resolvedProfile = isBlack
    ? { name: "USER_07", meta: "ID: 0x7A31...9F2C", avatar: homeBlackUserAvatar }
    : profile
  return (
    <Link
      to={WEB_PATHS.myHome}
      data-fable-space-discover-user-card="right-rail"
      aria-label={`${resolvedProfile.name} 个人中心`}
      onMouseDown={suppressMouseFocus}
      className={cx(
        "pointer-events-auto absolute flex min-w-0 touch-manipulation items-center gap-4 overflow-hidden rounded-[1.15rem] border px-5 outline-none transition focus:ring-4",
        isBlack
          ? "border-cyan-300/14 bg-[#061226]/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_14px_34px_rgba(0,0,0,0.28)] focus:ring-cyan-300/30"
          : "border-white/90 bg-white/90 shadow-[0_14px_34px_rgba(86,105,166,0.12)] backdrop-blur-xl focus:ring-violet-400/30",
      )}
      style={style}
    >
      <span className={cx("h-2 w-2 shrink-0 rounded-full", isBlack ? "bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.85)]" : "bg-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.38)]")} />
      <span className="h-[72%] aspect-square shrink-0">
        <FableSpaceUserAvatar avatar={resolvedProfile.avatar} name={resolvedProfile.name} variant={variant} />
      </span>
      <FableSpaceUserIdentity name={resolvedProfile.name} meta={resolvedProfile.meta} variant={variant} />
      <ChevronDown size={17} strokeWidth={3} className={cx("shrink-0 opacity-65", isBlack ? "text-cyan-100" : "text-slate-500")} />
    </Link>
  )
}

function fallbackFeedItemsFromHome(featuredCitySlices: HomeReferenceProps["featuredCitySlices"]): FableSpaceFeedItem[] {
  return featuredCitySlices.slice(0, 3).map((slice, index) => ({
    id: slice.id || `home-feed-${index}`,
    title: slice.name || `坐标 ${index + 1}`,
    subtitle: slice.tags?.[2] || slice.description || "新的坐标记忆正在浮现",
    meta: `${index * 3 + 2} 分钟前`,
    image: slice.image || DEFAULT_FABLE_SPACE_USER.avatar,
    to: targetFor(slice),
  }))
}

function fallbackFeedItemsFromSpaces(spaces: Space[]): FableSpaceFeedItem[] {
  return spaces.slice(0, 3).map((space, index) => ({
    id: space.id || `discover-feed-${index}`,
    title: space.name || `坐标 ${index + 1}`,
    subtitle: space.description || "这间空间正在整理新的记忆",
    meta: `${index * 5 + 3} 分钟前`,
    image: space.characters?.[0]?.avatar || DEFAULT_FABLE_SPACE_USER.avatar,
    to: targetFor(space),
  }))
}

function fallbackOnlineEntitiesFromFeed(items: FableSpaceFeedItem[]): FableSpaceOnlineEntity[] {
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

function withDiscoverSquareFeedImages(items: FableSpaceFeedItem[]): FableSpaceFeedItem[] {
  return items.map((item, index) => ({
    ...item,
    image: DISCOVER_CARD_IMAGES[(index + 4) % DISCOVER_CARD_IMAGES.length],
    squareImage: true,
  }))
}

function withDiscoverSquareOnlineImages(entities: FableSpaceOnlineEntity[]): FableSpaceOnlineEntity[] {
  return entities.map((entity, index) => ({
    ...entity,
    avatar: DISCOVER_CARD_IMAGES[(index + 6) % DISCOVER_CARD_IMAGES.length],
    squareImage: true,
  }))
}

function fallbackRecentMemoriesFromHome(featuredCitySlices: HomeReferenceProps["featuredCitySlices"]): FableSpaceRecentMemory[] {
  const sourceItems = featuredCitySlices.length
    ? featuredCitySlices
    : [
      {
        id: "fallback-memory",
        name: "云上图书馆",
        description: "在这里，我第一次不再害怕黑夜。",
        image: fableSpaceUserAvatarImage,
      },
    ]

  return sourceItems.slice(0, 2).map((slice, index) => ({
    id: `memory-${slice.id || index}`,
    title: `“${slice.description || (index === 0 ? "在这里，我第一次不再害怕黑夜。" : "谢谢你，陪我等到了黎明。")}”`,
    source: `来自 ${slice.name || "某个坐标"}`,
    meta: `${index * 3 + 2} 小时前`,
    image: slice.image || fableSpaceUserAvatarImage,
    to: targetFor(slice),
  }))
}

function FableSpacePanelShell({
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

function FableSpaceOnlineStatus({ status, variant, compact = false }: { status: string; variant: Variant; compact?: boolean }) {
  const isBlack = variant === "black"
  const isOnline = /在线|online/i.test(status)
  return (
    <span
      data-fable-space-online-status="real-text"
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

function FableSpaceOnlineEntityRow({ entity, variant, compact = false }: { entity: FableSpaceOnlineEntity; variant: Variant; compact?: boolean }) {
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
          data-fable-space-online-avatar="real-image"
          data-fable-space-discover-square-image={entity.squareImage ? "512x512" : undefined}
          src={entity.avatar}
          alt={`${entity.name} 头像`}
          className={cx(avatarSizeClass, "rounded-full border object-cover", isBlack ? "border-cyan-300/18" : "border-violet-100")}
          loading="lazy"
          decoding="async"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span data-fable-space-online-name="real-text" className={cx("block truncate font-black", isBlack ? (compact ? "text-[0.72rem] leading-4" : "text-xs leading-4") : (compact ? "text-[0.78rem] leading-4" : "text-[13px] leading-4"), isBlack ? "text-cyan-50" : "text-slate-700")}>{entity.name}</span>
        <span data-fable-space-online-location="real-text" className={cx("mt-0.5 block truncate font-bold", isBlack ? (compact ? "text-[9px] leading-3" : "text-[10px] leading-4") : (compact ? "text-[10px] leading-3" : "text-[11px] leading-4"), isBlack ? "text-cyan-100/48" : "text-slate-400")}>{entity.location}</span>
      </span>
      <FableSpaceOnlineStatus status={entity.status} variant={variant} compact={compact} />
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

function FableSpaceOnlineEntitiesPanel({
  artboard,
  variant,
  box,
  entities,
  forceVisible = false,
}: {
  artboard: Artboard
  variant: Variant
  box: { x: number; y: number; w: number; h: number }
  entities: FableSpaceOnlineEntity[]
  forceVisible?: boolean
}) {
  const isBlack = variant === "black"
  const isCompact = forceVisible
  const visibleEntities = entities.slice(0, 3)
  return (
    <FableSpacePanelShell artboard={artboard} variant={variant} box={box} forceVisible={forceVisible} className={cx("flex flex-col p-4", isCompact ? "gap-2.5" : "gap-3")}>
      <header className="flex items-center justify-between gap-3">
        <span className={cx("block font-black leading-none", isBlack ? "text-sm text-cyan-50" : "text-[15px] text-slate-800")}>{isBlack ? "ACTIVE SPACE ROLES" : "活跃空间角色"}</span>
        <Link to={WEB_PATHS.myHome} onMouseDown={suppressMouseFocus} className={cx("font-black leading-none outline-none transition focus:ring-4 focus:ring-violet-400/40", isBlack ? "text-[10px] text-cyan-300" : "text-[11px] text-violet-300")}>
          {isBlack ? "查看全部" : "查看全部"}
        </Link>
      </header>
      <div data-fable-space-online-panel="real-list" className={cx("flex flex-col overflow-hidden", isBlack ? "divide-y divide-cyan-300/12" : "divide-y divide-slate-200/60")}>
        {visibleEntities.length ? (
          visibleEntities.map((entity) => <FableSpaceOnlineEntityRow key={entity.id} entity={entity} variant={variant} compact={isCompact} />)
        ) : (
          <p className={cx("flex flex-col items-center gap-2 py-8 text-center text-sm font-bold", isBlack ? "text-cyan-100/48" : "text-slate-400")}>
            {!isBlack ? <Bell size={24} strokeWidth={2.4} className="text-violet-300" /> : null}
            暂时没有活跃角色
          </p>
        )}
      </div>
    </FableSpacePanelShell>
  )
}

function FableSpacePanelHeader({ title, eyebrow, variant }: { title: string; eyebrow?: string; variant: Variant }) {
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

function FableSpaceFeedItemRow({ item, variant, compact = false }: { item: FableSpaceFeedItem; variant: Variant; compact?: boolean }) {
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
        data-fable-space-feed-thumb="real-image"
        data-fable-space-discover-square-image={item.squareImage ? "512x512" : undefined}
        src={item.image}
        alt={`${item.title} 缩略图`}
        className={cx(compact ? "h-10 w-10" : "h-11 w-11", "shrink-0 rounded-full border object-cover", isBlack ? "border-cyan-300/18" : "border-violet-100")}
        loading="lazy"
        decoding="async"
      />
      <span className="min-w-0 flex-1">
        <span data-fable-space-feed-title="real-text" className={cx("block truncate font-black", isBlack ? (compact ? "text-[0.82rem] leading-4" : "text-sm") : (compact ? "text-[0.88rem] leading-4" : "text-[15px]"), isBlack ? "text-cyan-50" : "text-slate-700")}>{item.title}</span>
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

function FableSpaceFeedPanel({
  artboard,
  variant,
  box,
  title,
  eyebrow,
  items,
  actionLabel,
  actionTo = WEB_PATHS.spaces,
  forceVisible = false,
}: {
  artboard: Artboard
  variant: Variant
  box: { x: number; y: number; w: number; h: number }
  title: string
  eyebrow?: string
  items: FableSpaceFeedItem[]
  actionLabel?: string
  actionTo?: string
  forceVisible?: boolean
}) {
  const isBlack = variant === "black"
  const isCompact = forceVisible
  const visibleItems = items.slice(0, 3)
  return (
    <FableSpacePanelShell artboard={artboard} variant={variant} box={box} forceVisible={forceVisible} className={cx("flex flex-col", isCompact ? "gap-3" : "gap-4")}>
      <FableSpacePanelHeader title={title} eyebrow={eyebrow} variant={variant} />
      <div data-fable-space-feed-panel="real-list" className={cx("flex flex-col overflow-hidden", isBlack ? "divide-y divide-cyan-300/12" : "divide-y divide-slate-200/60")}>
        {visibleItems.length ? (
          visibleItems.map((item) => <FableSpaceFeedItemRow key={item.id} item={item} variant={variant} compact={isCompact} />)
        ) : (
          <p className={cx("py-8 text-center text-sm font-bold", isBlack ? "text-cyan-100/48" : "text-slate-400")}>暂无新的坐标记录</p>
        )}
      </div>
      {actionLabel ? (
        <Link to={actionTo} onMouseDown={suppressMouseFocus} className={cx("mt-auto inline-flex touch-manipulation items-center justify-center gap-2 rounded-2xl font-black outline-none transition focus:ring-4 focus:ring-violet-400/40", isCompact ? "min-h-8 text-[0.82rem]" : "min-h-9 text-sm", isBlack ? "text-cyan-300 hover:bg-cyan-300/8" : "text-violet-500 hover:bg-violet-50")}>
          {actionLabel}
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </FableSpacePanelShell>
  )
}

function FableSpaceDailyQuotePanel({
  artboard,
  variant,
  box,
  quote,
  forceVisible = false,
}: {
  artboard: Artboard
  variant: Variant
  box: { x: number; y: number; w: number; h: number }
  quote: FableSpaceDailyQuote
  forceVisible?: boolean
}) {
  const isBlack = variant === "black"
  return (
    <FableSpacePanelShell artboard={artboard} variant={variant} box={box} forceVisible={forceVisible} className={cx("overflow-hidden", !isBlack && "[padding:16px_20px]")}>
      <div data-fable-space-daily-quote="real-text" className="relative z-10">
        <p className={cx("text-sm font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>{isBlack ? "RECENT ECHO" : quote.title}</p>
        <blockquote className={cx("font-bold", isBlack ? "mt-4 max-w-[14rem] text-[clamp(0.82rem,0.9vw,1rem)] leading-7 text-cyan-100/62" : "mt-3 text-[clamp(0.68rem,0.76vw,0.82rem)] leading-5 text-slate-500")}>“{quote.quote}”</blockquote>
        {quote.source ? <p className={cx("mt-2 text-xs font-bold", isBlack ? "text-cyan-100/42" : "text-slate-400")}>— {quote.source}</p> : null}
      </div>
      {isBlack ? (
        <img src={homeBlackRecentEchoWaveform} alt="" aria-hidden="true" className="absolute bottom-2 right-2 h-16 w-28 object-contain opacity-70" loading="lazy" decoding="async" />
      ) : (
        <UserCutImage src={lightPlaneIcon} className="absolute bottom-2 right-3 h-16 w-16 rounded-full opacity-35" scale={2.2} />
      )}
    </FableSpacePanelShell>
  )
}

function FableSpaceRecentMemoryRow({ memory, variant }: { memory: FableSpaceRecentMemory; variant: Variant }) {
  const isBlack = variant === "black"
  const content = (
    <>
      <img
        data-fable-space-memory-thumb="real-image"
        src={memory.image}
        alt={`${memory.source} 记忆缩略图`}
        className={cx("h-9 w-11 shrink-0 rounded-xl border object-cover", isBlack ? "border-cyan-300/18" : "border-slate-100")}
        loading="lazy"
        decoding="async"
      />
      <span className="min-w-0 flex-1">
        <span data-fable-space-memory-title="real-text" className={cx("block truncate text-[0.72rem] font-black leading-4", isBlack ? "text-cyan-50" : "text-slate-700")}>{memory.title}</span>
        <span data-fable-space-memory-source="real-text" className={cx("mt-0.5 block truncate text-[0.6rem] font-bold", isBlack ? "text-cyan-100/46" : "text-slate-400")}>{memory.source} · {memory.meta}</span>
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

function FableSpaceRecentMemoriesPanel({
  artboard,
  variant,
  memories,
  forceVisible = false,
}: {
  artboard: Artboard
  variant: Variant
  memories: FableSpaceRecentMemory[]
  forceVisible?: boolean
}) {
  const isBlack = variant === "black"
  const visibleMemories = memories.slice(0, 2)
  return (
    <FableSpacePanelShell artboard={artboard} variant={variant} box={HOME_LAYOUT.bottomRail.recentMemories} forceVisible={forceVisible} className="flex flex-col gap-1.5 !p-3">
      <header className="flex items-center justify-between gap-3">
        <h2 className={cx("text-[0.82rem] font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>{isBlack ? "MEMORY STREAM" : "最近的记忆"}</h2>
        <Link to={WEB_PATHS.myHome} onMouseDown={suppressMouseFocus} className={cx("text-[0.62rem] font-black outline-none transition focus:ring-4 focus:ring-violet-400/40", isBlack ? "text-cyan-300" : "text-slate-400")}>查看全部 →</Link>
      </header>
      <div data-fable-space-recent-memories="real-list" className={cx("flex flex-col gap-1.5 overflow-hidden", isBlack ? "divide-y divide-cyan-300/12" : "divide-y divide-slate-200/60")}>
        {visibleMemories.length ? (
          visibleMemories.map((memory) => <FableSpaceRecentMemoryRow key={memory.id} memory={memory} variant={variant} />)
        ) : (
          <p className={cx("py-7 text-center text-sm font-bold", isBlack ? "text-cyan-100/48" : "text-slate-400")}>暂时没有新的记忆</p>
        )}
      </div>
    </FableSpacePanelShell>
  )
}

function guideToneClasses(accent: FableSpaceGuideCard["accent"], variant: Variant) {
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

function FableSpaceGuideGlyph({ accent, variant }: { accent: FableSpaceGuideCard["accent"]; variant: Variant }) {
  const isBlack = variant === "black"
  return (
    <svg
      data-fable-space-guide-image="real-svg"
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

function FableSpaceGuideCardView({ card, variant }: { card: FableSpaceGuideCard; variant: Variant }) {
  const content = (
    <>
      <span data-fable-space-guide-title="real-text" className="relative z-10 block text-[0.68rem] font-black">{card.title}</span>
      <span data-fable-space-guide-text="real-text" className="relative z-10 mt-1.5 block text-[0.72rem] font-black leading-4 opacity-80">{card.text}</span>
      {card.image && variant !== "black" ? (
        <img data-fable-space-guide-image="real-image" src={card.image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full origin-center scale-[1.14] object-cover" loading="lazy" decoding="async" />
      ) : card.image ? (
        <img data-fable-space-guide-image="real-image" src={card.image} alt={`${card.title} 图标`} className="absolute bottom-1.5 right-1.5 h-8 w-8 object-contain opacity-55" loading="lazy" decoding="async" />
      ) : (
        <FableSpaceGuideGlyph accent={card.accent} variant={variant} />
      )}
    </>
  )
  const className = cx("relative h-full min-h-[4.7rem] overflow-hidden rounded-2xl border p-3 text-left outline-none transition focus:ring-4 focus:ring-violet-400/40", guideToneClasses(card.accent, variant))

  if (card.to) {
    return <Link to={card.to} onMouseDown={suppressMouseFocus} className={className}>{content}</Link>
  }

  return <div className={className}>{content}</div>
}

function FableSpaceGuidePanel({ artboard, variant, cards, forceVisible = false }: { artboard: Artboard; variant: Variant; cards: FableSpaceGuideCard[]; forceVisible?: boolean }) {
  const isBlack = variant === "black"
  const visibleCards = cards.slice(0, 3)
  const cardsWithLightBackgrounds = visibleCards.map((card, index) => (
    isBlack ? { ...card, image: card.image || BLACK_GUIDE_ICONS[index] } : { ...card, image: card.image || LIGHT_GUIDE_BACKGROUNDS[index] }
  ))
  return (
    <FableSpacePanelShell artboard={artboard} variant={variant} box={HOME_LAYOUT.bottomRail.guideCards} forceVisible={forceVisible} className="flex flex-col gap-2 !p-3">
      <header className="flex items-center justify-between gap-3">
        <h2 className={cx("text-[0.82rem] font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>{isBlack ? "EXPLORATION GUIDE" : "探索指南"}</h2>
        <Link to={WEB_PATHS.quests} onMouseDown={suppressMouseFocus} className={cx("text-[0.62rem] font-black outline-none transition focus:ring-4 focus:ring-violet-400/40", isBlack ? "text-cyan-300" : "text-slate-400")}>查看全部 →</Link>
      </header>
      <div data-fable-space-guide-panel="real-cards" className="grid flex-1 grid-cols-3 gap-3 overflow-hidden">
        {cardsWithLightBackgrounds.map((card) => <FableSpaceGuideCardView key={card.id} card={card} variant={variant} />)}
      </div>
    </FableSpacePanelShell>
  )
}

function FableSpaceWorldStatsPanel({ artboard, variant, stats, forceVisible = false }: { artboard: Artboard; variant: Variant; stats: FableSpaceWorldStat[]; forceVisible?: boolean }) {
  const isBlack = variant === "black"
  const visibleStats = stats.length ? stats.slice(0, 4) : DEFAULT_WORLD_STATS
  return (
    <FableSpacePanelShell artboard={artboard} variant={variant} box={HOME_LAYOUT.bottomRail.worldStats} forceVisible={forceVisible} className="overflow-hidden p-[1.25%]">
      {!isBlack ? (
        <img data-fable-space-world-stats-deco="real-image" src={lightPaperPlaneSoft} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full origin-center scale-[1.18] object-cover" loading="lazy" decoding="async" />
      ) : null}
      <div data-fable-space-world-stats="real-data" className="relative z-10 flex h-full flex-col">
        <header className="flex items-center gap-1.5">
          <h2 className={cx("text-[0.9rem] font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>{isBlack ? "WORLD STATS" : "今日世界统计"}</h2>
          <Info size={12} strokeWidth={3} className={cx("shrink-0", isBlack ? "text-cyan-100/56" : "text-slate-400")} />
        </header>
        <div className="mt-auto grid grid-cols-4 divide-x divide-slate-200/70">
          {visibleStats.map((stat) => (
            <div key={stat.id} className="px-3 text-center first:pl-0 last:pr-0">
              <p data-fable-space-world-stat-value="real-text" className={cx("text-[clamp(1rem,1.35vw,1.45rem)] font-black leading-tight", isBlack ? "text-cyan-200" : "text-violet-500")}>{stat.value}</p>
              <p data-fable-space-world-stat-label="real-text" className={cx("mt-2 truncate text-[0.72rem] font-black", isBlack ? "text-cyan-100/46" : "text-slate-500")}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
      {isBlack ? (
        <img data-fable-space-world-stats-deco="real-image" src={homeBlackWorldStatsSparkline} alt="" aria-hidden="true" className="absolute bottom-0 right-2 h-20 w-56 object-contain opacity-42" loading="lazy" decoding="async" />
      ) : null}
    </FableSpacePanelShell>
  )
}

function ArtboardShell({ artboard, variant, kind, children }: { artboard: Artboard; variant: Variant; kind: "home" | "discover"; children: ReactNode }) {
  const isHome = kind === "home"
  const isDiscover = kind === "discover"
  const sectionRef = useRef<HTMLElement | null>(null)
  const [desktopScale, setDesktopScale] = useState(1)
  const [isDesktopArtboard, setIsDesktopArtboard] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)")

    function updateScale() {
      const availableWidth = sectionRef.current?.parentElement?.clientWidth || window.innerWidth || artboard.width
      const nextIsDesktop = mediaQuery.matches
      setIsDesktopArtboard(nextIsDesktop)
      // Fill width, scale down only if aspect ratio is taller than artboard
      const widthScale = availableWidth / artboard.width
      const heightScale = (sectionRef.current?.parentElement?.clientHeight || window.innerHeight) / artboard.height
      setDesktopScale(nextIsDesktop ? Math.min(widthScale, heightScale) : 1)
    }

    updateScale()
    mediaQuery.addEventListener("change", updateScale)
    window.addEventListener("resize", updateScale)

    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateScale) : null
    if (observer && sectionRef.current) observer.observe(sectionRef.current)

    return () => {
      mediaQuery.removeEventListener("change", updateScale)
      window.removeEventListener("resize", updateScale)
      observer?.disconnect()
    }
  }, [artboard.width, artboard.height])

  const sectionStyle: CSSProperties = {
    background: artboard.background,
  }

  if (isDesktopArtboard) {
    sectionStyle.width = "100%"
    sectionStyle.maxWidth = `${artboard.width}px`
  }

  const canvasStyle: CSSProperties = isDesktopArtboard
    ? {
        width: `${artboard.width}px`,
        height: `${artboard.height}px`,
        background: artboard.background,
        transform: `scale(${desktopScale})`,
        transformOrigin: "top left",
      }
    : {
        background: artboard.background,
      }

  return (
    <main
      data-fable-space-real-dom="true"
      data-fable-space-variant={variant}
      className="min-h-screen overflow-x-hidden"
      style={{ background: artboard.background }}
    >
      <section
        ref={sectionRef}
        id={isDiscover ? "发现主线" : undefined}
        data-fable-space-reference={artboard.marker}
        data-fable-space-dom={kind}
        data-fable-space-design-lock="owner-reference-1-to-1"
        className={cx(
          "relative mx-auto w-full select-none",
          isDiscover && "scroll-mt-28",
          isHome || isDiscover ? "min-h-screen overflow-auto md:min-h-0" : "overflow-hidden",
        )}
        style={sectionStyle}
      >
        <div
          data-fable-space-artboard-canvas={isDesktopArtboard ? "scaled-desktop" : "mobile-flow"}
          className={cx(
            isDesktopArtboard ? "relative overflow-visible" : "relative min-h-screen w-full",
          )}
          style={canvasStyle}
        >
          {artboard.slices.map((slice) => (
            <img
              key={slice.alt}
              src={slice.src}
              srcSet={`${slice.src} 1x, ${slice.src2x} 2x`}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="absolute hidden h-full w-full object-fill md:block"
              style={boxStyle(artboard, slice.x, slice.y, slice.w, slice.h)}
            />
          ))}
          {children}
        </div>
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
  variant = "black",
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
      data-fable-space-search={onChange ? "real-input" : undefined}
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

function FableSpaceHomeCoordinateCard({
  artboard,
  box,
  slice,
  index,
  variant,
  to,
  isLoading = false,
}: {
  artboard: Artboard
  box: readonly [number, number, number, number]
  slice?: HomeReferenceProps["featuredCitySlices"][number]
  index: number
  variant: Variant
  to?: string
  isLoading?: boolean
}) {
  const isBlack = variant === "black"
  const card = homeCoordinateCardData(slice, index, variant)
  const [x, y, w, h] = box
  const canEnter = Boolean(slice?.id || card.id || isBlack)
  const target = to || targetFor(card)
  const badgeLabel = isBlack ? card.tag : (canEnter ? card.tag : (isLoading ? "加载中" : "待开放"))
  const toneClass =
    card.tone === "unstable"
      ? "border-rose-400/45 bg-rose-500/14 text-rose-300 shadow-[0_0_16px_rgba(244,63,94,0.18)]"
      : card.tone === "low"
        ? "border-amber-300/38 bg-amber-300/12 text-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.14)]"
        : "border-cyan-300/38 bg-cyan-300/18 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.18)]"
  const className = cx(
    "absolute z-20 flex min-h-11 flex-col overflow-hidden rounded-[0.72rem] border outline-none transition",
    canEnter ? "touch-manipulation hover:-translate-y-0.5 focus:ring-4" : "cursor-wait select-none opacity-86",
    isBlack
      ? "border-cyan-300/18 bg-[#06111f]/88 text-cyan-50 shadow-[0_16px_34px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.035)] focus:ring-cyan-300/28"
      : "border-white/90 bg-white text-slate-800 shadow-[0_18px_42px_rgba(108,123,178,0.14)] focus:ring-violet-400/35",
  )
  const content = (
    <>
      <div className="relative h-[47%] shrink-0 overflow-hidden bg-cyan-300/8">
        <img
          data-fable-space-active-node-cover="replaceable-image"
          src={card.image}
          alt={`${card.name} 空间封面`}
          className={cx("h-full w-full object-cover", isBlack ? "opacity-86 saturate-[1.08]" : "")}
          loading="lazy"
          decoding="async"
        />
        {isBlack ? <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#06111f]/72 via-transparent to-transparent" /> : null}
        <span className={cx("absolute left-4 top-3 rounded-md border px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em]", toneClass)}>
          {badgeLabel}
        </span>
      </div>
      <div data-fable-space-active-node-copy="dom-text" className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3">
        <div className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <h3 data-fable-space-home-card-title="real-text" className={cx("truncate text-[18px] font-black leading-none tracking-[0.02em]", isBlack ? "text-cyan-50" : "text-slate-800")}>{card.name}</h3>
            <p className={cx("mt-2 truncate text-[12px] font-black uppercase tracking-[0.12em]", isBlack ? "text-cyan-100/46" : "text-slate-400")}>{card.nodeId}</p>
          </span>
          <span data-fable-space-active-node-star="dom-icon" aria-hidden="true" className={cx("text-[28px] leading-none", isBlack ? "text-cyan-100/42" : "text-slate-300")}>☆</span>
        </div>
        <p className={cx("mt-5 line-clamp-2 text-[13px] font-bold leading-6", isBlack ? "text-cyan-100/48" : "text-slate-400")} title={card.description}>{card.description}</p>
        <div className="mt-auto flex items-center justify-between gap-3">
          <span data-fable-space-active-node-avatars="replaceable-images" className="flex -space-x-1.5">
            {HOME_COORDINATE_CARD_AVATAR_IMAGES.map((image, avatarIndex) => (
              <img key={`${card.name}-node-avatar-${avatarIndex}`} src={image} alt="" aria-hidden="true" className={cx("h-5 w-5 rounded-full border object-cover", isBlack ? "border-[#06111f]" : "border-white")} loading="lazy" decoding="async" />
            ))}
          </span>
          <span className={cx("shrink-0 text-[12px] font-black uppercase tracking-[0.08em]", isBlack ? "text-cyan-300/70" : "text-violet-400")}>
            {card.entityLabel}
          </span>
        </div>
      </div>
    </>
  )

  if (!canEnter) {
    return (
      <div
        data-fable-space-home-card="real-card"
        data-fable-space-home-card-state={isLoading ? "loading" : "placeholder"}
        aria-disabled="true"
        className={className}
        style={boxStyle(artboard, x, y, w, h)}
      >
        {content}
      </div>
    )
  }

  return (
    <Link
      to={target}
      data-fable-space-home-card="real-card"
      data-fable-space-active-node-card="image-and-dom-separated"
      data-fable-space-home-card-state="enterable"
      onMouseDown={suppressMouseFocus}
      className={className}
      style={boxStyle(artboard, x, y, w, h)}
    >
      {content}
    </Link>
  )
}

function FableSpaceDiscoverCard({
  artboard,
  box,
  space,
  index,
  variant,
  isLoading = false,
}: {
  artboard: Artboard
  box: readonly [number, number, number, number]
  space?: Space
  index: number
  variant: Variant
  isLoading?: boolean
}) {
  const [x, y, w, h] = box
  const card = discoverCardData(space, index)
  const isBlack = variant === "black"
  const isEnterable = Boolean(card.id)
  const avatarImages = DISCOVER_CARD_AVATAR_IMAGE_SETS[index % DISCOVER_CARD_AVATAR_IMAGE_SETS.length]
  const className = cx(
    "absolute z-20 flex flex-col overflow-hidden rounded-[1.28rem] border",
    isEnterable
      ? "touch-manipulation outline-none transition duration-300 hover:scale-[1.015] hover:-translate-y-0.5 focus:ring-4"
      : "cursor-wait select-none opacity-86",
    isBlack
      ? "border-cyan-300/14 bg-[#061226]/92 text-cyan-50 shadow-[0_18px_38px_rgba(0,0,0,0.35),0_0_26px_rgba(34,211,238,0.08)]"
      : "border-white/90 bg-white/96 text-slate-800 shadow-[0_12px_32px_rgba(108,123,178,0.12)]",
    isEnterable && (isBlack
      ? "hover:border-cyan-300/26 hover:shadow-[0_22px_46px_rgba(0,0,0,0.42),0_0_40px_rgba(34,211,238,0.18)] focus:ring-cyan-300/35"
      : "hover:shadow-[0_16px_48px_rgba(108,123,178,0.22)] focus:ring-violet-400/35"),
  )
  const content = (
    <>
      {!isEnterable ? (
        <span className={cx("absolute right-3 top-3 z-10 rounded-full px-2.5 py-1 text-[10px] font-black", isBlack ? "bg-cyan-300/12 text-cyan-100/70" : "bg-violet-50 text-violet-400")}>
          {isLoading ? "加载中" : "待开放"}
        </span>
      ) : null}
      <div className={cx("relative h-[43%] w-full shrink-0 overflow-hidden", isBlack ? "bg-cyan-300/8" : "bg-violet-50")}>
        <img data-fable-space-discover-card-cover="real-image" data-fable-space-discover-square-image="512x512" src={card.image} alt={`${card.name} 封面`} className={cx("h-full w-full object-cover", isBlack && "opacity-90 saturate-[1.05]")} loading="lazy" decoding="async" />
        <span className={cx("absolute left-3 top-3 inline-flex max-w-[72%] items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black shadow-[0_8px_18px_rgba(118,91,255,0.22)]", isBlack ? "border border-cyan-200/20 bg-cyan-300/14 text-cyan-50" : "bg-violet-500/82 text-white")}>
          <span aria-hidden="true">★</span>
          {card.tag}
        </span>
      </div>
      <div data-fable-space-discover-card-copy="real-text-layer" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 py-3">
        <h3 data-fable-space-discover-card-title="real-text" className={cx("truncate text-[16px] font-black leading-tight", isBlack ? "text-cyan-50" : "text-slate-800")}>{card.name}</h3>
        <p className={cx("mt-2 line-clamp-2 text-[12px] font-bold leading-5", isBlack ? "text-cyan-100/52" : "text-slate-400")} title={card.description}>{card.description}</p>
        <span data-first-minute-guide="fable-space-discover-card" className="sr-only">
          {card.sceneHint}：{card.tryPrompt}
        </span>
        <div className={cx("mt-auto flex min-w-0 items-center gap-2 text-[11px] font-black", isBlack ? "text-cyan-100/44" : "text-slate-400")}>
          <span className="flex min-w-0 items-center gap-1 truncate">
            <MessageCircle size={13} strokeWidth={2.6} className={cx("shrink-0", isBlack ? "text-cyan-300/70" : "text-violet-300")} />
            {isEnterable ? `${card.timeLabel} · ${card.visitLabel}` : (isLoading ? "正在同步坐标" : "等待真实坐标")}
          </span>
          <span aria-hidden="true" className="ml-auto flex shrink-0 -space-x-1.5">
            {avatarImages.map((image, avatarIndex) => (
              <img key={`${card.name}-avatar-${avatarIndex}`} src={image} alt="" className={cx("h-5 w-5 rounded-full border object-cover", isBlack ? "border-[#061226]" : "border-white")} loading="lazy" decoding="async" />
            ))}
          </span>
          <span className={cx("inline-flex shrink-0 items-center", isBlack ? "text-cyan-300/72" : "text-violet-400")} aria-label={`收藏 ${card.favoriteCount}`}>
            <Heart size={17} strokeWidth={2.6} />
          </span>
        </div>
        <span
          data-fable-space-discover-entry-cta="visitor-primary"
          className={cx(
            "mt-2 inline-flex w-fit items-center rounded-full px-3 py-1 text-[11px] font-black",
            isBlack ? "bg-cyan-300/12 text-cyan-200" : "bg-violet-50 text-violet-500",
          )}
        >
          {isEnterable ? "进入这个空间 →" : "等待空间同步"}
        </span>
      </div>
    </>
  )

  if (!isEnterable) {
    return (
      <div
        data-fable-space-discover-card="real-card"
        data-fable-space-discover-card-layout="image-top"
        data-fable-space-discover-card-state={isLoading ? "loading" : "placeholder"}
        aria-disabled="true"
        className={className}
        style={boxStyle(artboard, x, y, w, h)}
      >
        {content}
      </div>
    )
  }

  return (
    <Link
      to={targetFor(card)}
      data-fable-space-discover-card="real-card"
      data-fable-space-discover-card-layout="image-top"
      data-fable-space-discover-card-state="enterable"
      onMouseDown={suppressMouseFocus}
      className={className}
      style={boxStyle(artboard, x, y, w, h)}
    >
      {content}
    </Link>
  )
}

function HomeCurrentCoordinateBadge({
  artboard,
  variant,
  coordinate,
}: {
  artboard: Artboard
  variant: Variant
  coordinate?: FableSpaceHeroCoordinate
}) {
  const isBlack = variant === "black"
  const box = HOME_LAYOUT.currentCoordinate
  const name = coordinate?.name || (isBlack ? "SPACE_07" : "云上图书馆")
  const coordinateLabel = coordinate?.coordinateLabel || ""
  const timeLabel = coordinate?.timeLabel || ""
  return (
    <div
      data-fable-space-current-coordinate="shared"
      className={cx(
        "absolute z-10 rounded-[1.25rem] border px-5 py-4",
        isBlack
          ? "border-cyan-300/18 bg-[#020710]/78 shadow-[0_0_28px_rgba(34,211,238,0.1)]"
          : "border-white/90 bg-white/88 shadow-[0_18px_42px_rgba(118,133,190,0.16)]",
      )}
      style={boxStyle(artboard, box.x, box.y, box.w, box.h)}
    >
      <p className={cx("text-[clamp(0.44rem,0.62vw,0.66rem)] font-black", isBlack ? "text-cyan-100/48" : "text-slate-400")}>
        {isBlack ? "CURRENT SPACE" : "当前坐标"}{timeLabel ? ` · ${timeLabel}` : ""}
      </p>
      <p className={cx("mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-[clamp(0.66rem,0.9vw,1rem)] font-black leading-tight", isBlack ? "text-cyan-50" : "text-slate-700")}>
        <span data-fable-space-current-coordinate-name="truncate" className="min-w-0 truncate">{name}</span>
        {isBlack ? (
          <MapPin size={18} strokeWidth={2.6} className="shrink-0 text-cyan-300/80" />
        ) : (
          <UserCutImage src={lightPinIcon} className="h-5 w-5 shrink-0 rounded-full" scale={1.7} loading="eager" />
        )}
      </p>
      {coordinateLabel ? (
        <p className={cx("mt-1 truncate text-[clamp(0.5rem,0.68vw,0.72rem)] font-bold", isBlack ? "text-cyan-100/46" : "text-slate-400")}>
          {coordinateLabel}
        </p>
      ) : null}
    </div>
  )
}

function FableSpaceHomeMainSurface({
  artboard,
  featuredCitySlices,
  variant,
  isLoading = false,
  heroCoordinate,
}: {
  artboard: Artboard
  featuredCitySlices: HomeReferenceProps["featuredCitySlices"]
  variant: Variant
  isLoading?: boolean
  heroCoordinate?: FableSpaceHeroCoordinate
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
            ?          </span>
        </>
      )}
      <div className="absolute z-10" style={boxStyle(artboard, titleBox.x, titleBox.y, titleBox.w, titleBox.h)}>
        <h1
          data-fable-space-home-title="real-text"
          className={cx("max-w-[12em] text-[clamp(2.1rem,3.15vw,3.1rem)] font-black leading-[1.18] tracking-[-0.05em]", isBlack ? "text-cyan-50 drop-shadow-[0_0_18px_rgba(255,255,255,0.18)]" : "text-slate-800")}
        >
          {isBlack ? (
            <>
              进入世界的
              <br />
              镜像空间
            </>
          ) : (
            <>
              在每一个坐标里
              <br />
              遇见另一种可能的自己
            </>
          )}
        </h1>
        <p className={cx("mt-5 max-w-[32em] text-[clamp(0.82rem,1.1vw,1rem)] font-bold leading-7", isBlack ? "text-cyan-100/66" : "text-slate-500")}>
          {isBlack ? "在现实地点的另一面，寻找适合你的私密空间。" : "走进仍在回应的空间，探索属于你的故事"}
        </p>
      </div>
      {!isBlack ? <HomeCurrentCoordinateBadge artboard={artboard} variant={variant} coordinate={heroCoordinate} /> : null}
      <div className="absolute z-10 flex items-center justify-between" style={boxStyle(artboard, recommendedHeaderBox.x, recommendedHeaderBox.y, recommendedHeaderBox.w, recommendedHeaderBox.h)}>
        <span className="flex items-center gap-4">
          <span aria-hidden="true" className="h-10 w-[3px] rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.72)]" />
          <span>
            <h2 className={cx("text-[18px] font-black uppercase leading-none tracking-[0.14em]", isBlack ? "text-cyan-300" : "text-slate-800")}>{isBlack ? "MIRROR SPACES" : "为你推荐的空间"}</h2>
            <span className={cx("mt-1 block text-[12px] font-bold", isBlack ? "text-cyan-100/50" : "text-slate-400")}>{isBlack ? "不同类型的 AI 空间" : "基于地理位置的空间"}</span>
          </span>
        </span>
        <span className="flex items-center gap-4">
          {["ALL 全部", "FILTER 筛选"].map((label) => (
            <Link key={label} to={WEB_PATHS.spaces} onMouseDown={suppressMouseFocus} className={cx("inline-flex min-h-9 touch-manipulation items-center gap-2 rounded-md border px-4 text-[12px] font-black uppercase tracking-[0.08em] outline-none transition focus:ring-4", isBlack ? "border-cyan-300/14 bg-[#061226]/72 text-cyan-100/62 hover:text-cyan-100 focus:ring-cyan-300/28" : "border-slate-200 bg-white/70 text-slate-500 focus:ring-violet-400/35")}>
              {label} <ChevronDown size={13} strokeWidth={3} />
            </Link>
          ))}
        </span>
      </div>
      {cardBoxes.map((box, index) => (
        <FableSpaceHomeCoordinateCard
          key={`home-${variant}-real-card-${featuredCitySlices[index]?.id || index}`}
          artboard={artboard}
          box={box}
          slice={featuredCitySlices[index]}
          index={index}
          variant={variant}
          isLoading={isLoading && !featuredCitySlices[index]?.id}
        />
      ))}
    </>
  )
}

function FableSpaceHomeMobile({
  featuredCitySlices,
  onToggleTheme,
  variant,
  isLoading = false,
}: {
  featuredCitySlices: HomeReferenceProps["featuredCitySlices"]
  onToggleTheme: () => void
  variant: Variant
  isLoading?: boolean
}) {
  const isBlack = variant === "black"
  const cards = HOME_LAYOUT.cards.map((_, index) => homeCoordinateCardData(featuredCitySlices[index], index, variant))
  return (
    <div className={cx("relative z-40 min-h-screen px-4 py-5 md:hidden", isBlack ? "bg-[radial-gradient(circle_at_16%_-8%,rgba(14,165,233,0.22),transparent_32%),radial-gradient(circle_at_88%_0%,rgba(217,70,239,0.24),transparent_30%),linear-gradient(180deg,#07162c_0%,#030918_54%,#01030a_100%)]" : "bg-[linear-gradient(180deg,#f4f8ff_0%,#eef4ff_46%,#fff_100%)]")}>
      <header className={cx("flex items-center justify-between rounded-[1.5rem] border p-3", isBlack ? "border-cyan-300/24 bg-[#061126]/88 shadow-[0_0_24px_rgba(14,165,233,0.16),0_0_32px_rgba(168,85,247,0.12),0_18px_42px_rgba(1,3,10,0.38)]" : "border-white/80 bg-white/86 shadow-[0_18px_42px_rgba(108,123,178,0.14)]")}>
        <Link to="/" className="flex min-h-11 touch-manipulation flex-col justify-center rounded-2xl outline-none focus:ring-4 focus:ring-violet-400/35">
          <span className={cx("text-xl font-black leading-none", isBlack ? "text-white" : "text-slate-900")}>FableSpace</span>
          <span className={cx("mt-1 text-xs font-bold", isBlack ? "text-cyan-100/62" : "text-slate-500")}>世界的镜像面</span>
        </Link>
        <button type="button" onClick={onToggleTheme} className={cx("grid h-11 w-11 touch-manipulation place-items-center rounded-2xl border", isBlack ? "border-cyan-300/28 bg-cyan-400/10 text-cyan-100 shadow-[0_0_18px_rgba(14,165,233,0.18)]" : "border-violet-100 bg-violet-50 text-violet-500")} aria-label="切换主题">
          ?        </button>
      </header>
      <section className={cx("relative mt-4 overflow-hidden rounded-[1.5rem] border p-4", isBlack ? "border-cyan-300/24 bg-[#061126]/82 shadow-[0_0_28px_rgba(14,165,233,0.16),0_0_34px_rgba(217,70,239,0.10),0_18px_42px_rgba(1,3,10,0.34)]" : "border-white/80 bg-white/80 shadow-[0_18px_44px_rgba(108,123,178,0.14)]")}>
        {isBlack ? (
          <>
            <div aria-hidden="true" className="absolute inset-0 bg-[#020817]" />
            <img src={homeBlackHeroVisual} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-54 saturate-150" loading="lazy" decoding="async" />
          </>
        ) : (
          <img src={lightSkyCityBalcony} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-34" loading="lazy" decoding="async" />
        )}
        <div aria-hidden="true" className={cx("absolute inset-0", isBlack ? "bg-[linear-gradient(135deg,rgba(3,15,34,0.72),rgba(2,3,12,0.62))]" : "bg-white/78")} />
        <p className={cx("relative z-10 text-[11px] font-black uppercase tracking-[0.22em]", isBlack ? "text-cyan-200" : "text-violet-400")}>Mirror</p>
        <h1
          data-fable-space-home-title-mobile="real-text"
          className={cx("relative z-10 mt-2 text-2xl font-black leading-tight tracking-[-0.03em]", isBlack ? "text-white drop-shadow-[0_0_14px_rgba(14,165,233,0.34)]" : "text-slate-800")}
        >
          {isBlack ? "进入镜像空间" : "找到私密空间"}
        </h1>
        <div className="relative z-10 mt-4 flex gap-3">
          <Link to={WEB_PATHS.spaces} className={cx("inline-flex min-h-11 flex-1 touch-manipulation items-center justify-center rounded-[1.15rem] px-4 text-sm font-black", isBlack ? "bg-[linear-gradient(135deg,#06b6d4_0%,#7c3aed_58%,#d946ef_100%)] text-white shadow-[0_0_24px_rgba(14,165,233,0.28),0_0_28px_rgba(217,70,239,0.22)]" : "bg-violet-500 text-white shadow-[0_14px_28px_rgba(118,91,255,0.22)]")}>发现空间</Link>
          <Link to={WEB_PATHS.myHome} className={cx("inline-flex min-h-11 flex-1 touch-manipulation items-center justify-center rounded-[1.15rem] border px-4 text-sm font-black", isBlack ? "border-cyan-300/26 bg-cyan-400/8 text-cyan-100 shadow-[inset_0_0_16px_rgba(14,165,233,0.08)]" : "border-violet-100 bg-white text-violet-500")}>我的回访</Link>
        </div>
      </section>
      <section className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className={cx("font-black", isBlack ? "text-white" : "text-slate-800")}>推荐</h2>
          <Link to={WEB_PATHS.spaces} className={cx("inline-flex min-h-11 touch-manipulation items-center rounded-xl px-3 text-sm font-black", isBlack ? "text-cyan-200" : "text-violet-400")}>全部</Link>
        </div>
        <div className="grid gap-2.5">
          {cards.map((slice, index) => {
            const isEnterable = Boolean(slice.id)
            const statusLabel = isEnterable ? slice.entityLabel : (isLoading ? "加载中" : "待开放")
            const cardClassName = cx(
              "flex min-h-24 gap-3 rounded-[1.25rem] border p-2.5",
              isEnterable ? "touch-manipulation" : "cursor-wait select-none opacity-86",
              isBlack ? "border-cyan-300/20 bg-[#061126]/84 shadow-[0_0_22px_rgba(14,165,233,0.12),0_0_26px_rgba(168,85,247,0.10),0_14px_30px_rgba(1,3,10,0.3)]" : "border-white/80 bg-white shadow-[0_14px_34px_rgba(108,123,178,0.12)]",
            )
            const content = (
              <>
                <img src={slice.image} alt={`${slice.name} 封面`} className="h-20 w-20 shrink-0 rounded-[1rem] object-cover" loading="lazy" decoding="async" />
                <span className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
                  <span data-fable-space-home-card-title="real-text" className={cx("block truncate font-black", isBlack ? "text-white" : "text-slate-800")}>{slice.name}</span>
                  <span className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
                    <span className={cx("rounded-full px-2.5 py-1 text-[11px] font-black", isBlack ? "bg-cyan-400/12 text-cyan-100" : "bg-violet-50 text-violet-500")}>
                      {slice.tag}
                    </span>
                    <span className={cx("truncate text-xs font-black", isBlack ? "text-violet-200/62" : "text-slate-400")}>
                      {statusLabel}
                    </span>
                  </span>
                </span>
              </>
            )

            if (!isEnterable) {
              return (
                <div
                  key={slice.nodeId}
                  data-fable-space-home-card="real-card"
                  data-fable-space-home-card-state={isLoading ? "loading" : "placeholder"}
                  aria-disabled="true"
                  className={cardClassName}
                >
                  {content}
                </div>
              )
            }

            return (
              <Link
                key={slice.id || slice.nodeId}
                to={targetFor(slice)}
                data-fable-space-home-card="real-card"
                data-fable-space-home-card-state="enterable"
                className={cardClassName}
              >
                {content}
              </Link>
            )
          })}
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
        to={WEB_PATHS.spaces}
        aria-label={isBlack ? "发现空间" : "开始探险"}
        onMouseDown={suppressMouseFocus}
        className={cx(
          "absolute z-20 flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-[1.15rem] border text-sm font-black transition hover:-translate-y-0.5 focus:outline-none focus:ring-4",
          forceVisible ? "opacity-100" : "opacity-0 focus:opacity-100",
          primaryClass,
        )}
        style={boxStyle(artboard, actions.primary.x, actions.primary.y, actions.primary.w, actions.primary.h)}
      >
        <span className="flex flex-col leading-tight"><span>{isBlack ? "发现空间" : "开始探险"}</span><span className={cx("text-[10px] uppercase tracking-[0.12em]", isBlack ? "text-slate-950/70" : "text-white/70")}>{isBlack ? "EXPLORE" : "START"}</span></span>
        {isBlack ? (
          <ArrowUpRight size={16} strokeWidth={3} className="opacity-70" />
        ) : (
          <ArrowRight size={16} strokeWidth={3} className="text-white" />
        )}
      </Link>
      <Link
        to={WEB_PATHS.spaces}
        aria-label={isBlack ? "查看玩法" : "观看世界介绍"}
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
        <span className="flex flex-col leading-tight"><span>{isBlack ? "查看玩法" : "观看世界介绍"}</span><span className={cx("text-[10px] uppercase tracking-[0.12em]", isBlack ? "text-cyan-100/56" : "text-slate-500")}>{isBlack ? "PLAY" : "WATCH"}</span></span>
      </Link>
    </>
  )
}

function DiscoverFilterChip({
  label,
  onClick,
  muted = false,
  variant = "black",
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
      data-fable-space-discover-filter="real-button"
      onClick={onClick}
      onMouseDown={suppressMouseFocus}
      className={cx(
        "inline-flex min-h-11 touch-manipulation items-center justify-center gap-1.5 rounded-xl border px-3 text-[12px] font-black outline-none transition focus:ring-4 focus:ring-violet-400/30",
        isBlack
          ? muted
            ? "border-cyan-300/18 bg-cyan-400/[0.055] text-cyan-100/58 hover:border-cyan-300/32 hover:text-cyan-50"
            : "border-cyan-300/30 bg-cyan-400/[0.095] text-white shadow-[0_0_20px_rgba(14,165,233,0.16),0_0_24px_rgba(168,85,247,0.10),0_10px_26px_rgba(1,3,10,0.24)] hover:-translate-y-0.5 hover:border-cyan-200/52 hover:text-white"
          : muted
            ? "border-slate-200 bg-white/50 text-slate-400 hover:border-violet-100 hover:text-violet-500"
            : "border-white/90 bg-white/84 text-[#66719c] shadow-[0_10px_26px_rgba(92,110,170,0.08)] hover:-translate-y-0.5 hover:text-violet-500",
      )}
    >
      <span aria-hidden="true" className={isBlack ? "text-cyan-200" : "text-violet-400"}>●</span>
      {label}
    </button>
  )
}

function FableSpaceDiscoverFilterPanel({
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
    if (label === "亮灯中") return onOpenOnlyChange(true)
    if (label === "热度增强") return onPublicOnlyChange(true)
    if (label === "已熄灯") return onToggleSpecialType("cultivation-retreat")
    if (label === "城市" || label === "室内") return onTogglePlaceType("bookstore")
    if (label === "自然") return onTogglePlaceType("cafe")
    if (label === "奇幻" || label === "未来" || label === "其他") return onToggleSpecialType("cultivation-retreat")
    return onToggleCategory(label)
  }

  return (
    <>
      <div className="absolute z-20 flex items-center gap-5" style={boxStyle(artboard, 252, 118, 944, 48)}>
        <span className={cx("mr-3 text-[16px] font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>快速探索</span>
        <DiscoverFilterChip variant={variant} label="全部" onClick={onClear} />
        <DiscoverFilterChip variant={variant} label="亮灯中" onClick={() => onOpenOnlyChange(true)} />
        <DiscoverFilterChip variant={variant} label="最近活跃" onClick={() => onPublicOnlyChange(true)} />
        <DiscoverFilterChip variant={variant} label="低频空间" onClick={() => onToggleSpecialType("cultivation-retreat")} />
        <DiscoverFilterChip variant={variant} label="最有故事" onClick={() => onToggleCategory("陪伴树洞")} />
        <DiscoverFilterChip variant={variant} label="更多筛选" onClick={() => onTogglePlaceType("bookstore")} muted />
      </div>
      <section
        data-fable-space-discover-filter-panel="real-dom"
        className={cx(
          "absolute z-20 grid grid-cols-[1.65fr_1.05fr_1fr] gap-5 rounded-[1.45rem] border p-5 shadow-[0_18px_54px_rgba(87,107,166,0.12)] backdrop-blur-xl",
          isBlack ? "border-cyan-300/14 bg-[#061226]/82 text-cyan-100" : "border-white/90 bg-white/86 text-slate-700",
        )}
        style={boxStyle(artboard, 252, 178, 766, 166)}
      >
        {DISCOVER_FILTER_GROUPS.map((group, groupIndex) => (
          <div key={group.title} className={cx("min-w-0", groupIndex > 0 ? (isBlack ? "border-l border-cyan-300/12 pl-6" : "border-l border-slate-200/70 pl-6") : "")}>
            <h2 className={cx("text-[13px] font-black", isBlack ? "text-cyan-50" : "text-slate-700")}>{group.title}</h2>
            <div className={cx(
              "mt-3 grid",
              groupIndex === 0 ? "grid-cols-4 gap-2" : groupIndex === 1 ? "grid-cols-2 gap-x-2 gap-y-1.5" : "grid-cols-2 gap-2.5",
            )}>
              {group.items.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleFilter(label)}
                  onMouseDown={suppressMouseFocus}
                  className={cx(
                    "inline-flex touch-manipulation items-center whitespace-nowrap rounded-xl text-left text-[12px] font-black outline-none transition focus:ring-4 focus:ring-violet-400/30",
                    groupIndex === 1 ? "min-h-6" : "min-h-8",
                    groupIndex === 0 ? "gap-1.5 px-2" : groupIndex === 1 ? "gap-1.5 px-2" : "gap-2 px-3",
                    isBlack ? "bg-cyan-300/[0.045] text-cyan-100/58 hover:bg-cyan-300/10 hover:text-cyan-50" : "bg-white/64 text-[#7f8aa9] hover:bg-violet-50 hover:text-violet-500",
                  )}
                >
                  <span aria-hidden="true" className={cx("grid h-4 w-4 place-items-center rounded-md text-[10px]", groupIndex === 0 ? "text-rose-400" : groupIndex === 1 ? "text-indigo-400" : "text-violet-400")}>
                    {groupIndex === 0 ? "●" : groupIndex === 1 ? "○" : "★"}
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>
      <aside
        data-fable-space-discover-hint-card="background-image"
        className={cx(
          "absolute z-20 overflow-hidden rounded-[1.45rem] border shadow-[0_18px_46px_rgba(99,118,172,0.14)]",
          isBlack ? "border-cyan-300/14 bg-[#061226]/76" : "border-white/90 bg-white/72",
        )}
        style={boxStyle(artboard, 1024, 178, 180, 166)}
      >
        <img
          data-fable-space-discover-hint-bg="real-image"
          data-fable-space-discover-square-image="512x512"
          src={discoverCardSkyCity}
          alt=""
          aria-hidden="true"
          className={cx(
            "absolute inset-0 h-full w-full select-none object-cover",
            isBlack ? "opacity-[.42] mix-blend-screen" : "opacity-[.38]",
          )}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
        <div
          aria-hidden="true"
          className={cx(
            "absolute inset-0",
            isBlack
              ? "bg-[linear-gradient(180deg,rgba(6,18,38,0.14)_0%,rgba(6,18,38,0.52)_100%)]"
              : "bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(248,251,255,0.64)_100%)]",
          )}
        />
        <div className="relative z-10 flex h-full flex-col justify-end p-6">
          <p className={cx("text-[13px] font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>提示</p>
          <p className={cx("mt-2 text-[12px] font-bold leading-5", isBlack ? "text-cyan-100/62" : "text-slate-600")}>试试组合筛选，发现更多有趣的坐标。</p>
        </div>
      </aside>
    </>
  )
}

function DiscoverViewIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      {[5, 10.5, 16].map((x) => (
        [5, 10.5, 16].map((y) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="3" height="3" rx="0.6" fill="currentColor" />
        ))
      ))}
    </svg>
  )
}

function FableSpaceDiscoverSortControls({ variant }: { variant: Variant }) {
  const isBlack = variant === "black"
  const mutedText = isBlack ? "text-cyan-100/48" : "text-[#90a0bb]"
  const activePill = isBlack
    ? "bg-cyan-300/12 text-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.1)]"
    : "bg-[#f0ecff] text-[#a36bff] shadow-[0_8px_22px_rgba(144,113,255,0.1)]"
  return (
    <div data-fable-space-discover-sort-controls="real-dom" className={cx("ml-auto flex items-center justify-end gap-4 text-[13px] font-black leading-none", mutedText)}>
      <button
        type="button"
        data-fable-space-discover-sort-label="real-text"
        onMouseDown={suppressMouseFocus}
        className={cx("inline-flex min-h-8 touch-manipulation items-center gap-1.5 rounded-xl px-1 outline-none transition focus:ring-4", isBlack ? "focus:ring-cyan-300/30" : "focus:ring-violet-400/30")}
        aria-label="排序：推荐"
      >
        <span>排序：推荐</span>
        <ChevronDown size={13} strokeWidth={3} className="mt-0.5 opacity-75" />
      </button>
      <span
        data-fable-space-discover-view-button="grid-active"
        data-fable-space-discover-view-indicator="grid-active"
        className={cx("grid h-9 w-9 shrink-0 place-items-center rounded-full", activePill)}
        role="img"
        aria-label="当前为网格视图"
      >
        <DiscoverViewIcon className="h-4 w-4" />
      </span>
    </div>
  )
}

function FableSpaceDiscoverRightRail({
  artboard,
  spaces,
  variant,
  isLoading = false,
}: {
  artboard: Artboard
  spaces: Space[]
  variant: Variant
  isLoading?: boolean
}) {
  const cards = DISCOVER_LAYOUT.cards.map((_, index) => discoverCardData(spaces[index], index))
  const recommendedQuotes = DISCOVER_RIGHT_QUOTES.slice(0, 3)
  const footprintCards = cards.slice(0, 3)
  const railPanel = DISCOVER_RIGHT_RAIL_PANEL
  const isBlack = variant === "black"
  const isInitialLoading = isLoading && spaces.length === 0
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set()
    try {
      const stored = JSON.parse(window.localStorage.getItem("fable-space-discover-right-rail-favorites") || "[]")
      return new Set(Array.isArray(stored) ? stored.map(String) : [])
    } catch {
      return new Set()
    }
  })
  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem("fable-space-discover-right-rail-favorites", JSON.stringify([...favoriteKeys]))
  }, [favoriteKeys])
  function toggleFavorite(event: MouseEvent<HTMLButtonElement>, key: string, disabled = false) {
    event.preventDefault()
    event.stopPropagation()
    if (disabled) return
    setFavoriteKeys((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }
  const worldStatus = discoverWorldStatusFromSpaces(spaces)
  const worldStatusBg = discoverWorldStatusBgBlack
  const panelClass = isBlack
    ? "border-cyan-300/14 bg-[#061226]/90 text-cyan-50 shadow-[0_18px_50px_rgba(0,0,0,0.34),0_0_28px_rgba(34,211,238,0.07)]"
    : "border-white/90 bg-white/92 text-slate-800 shadow-[0_18px_50px_rgba(86,105,166,0.12)]"
  const subtleLinkClass = isBlack
    ? "text-cyan-300 outline-none focus:ring-4 focus:ring-cyan-300/30"
    : "text-violet-300 outline-none focus:ring-4 focus:ring-violet-400/30"
  return (
    <aside data-fable-space-discover-right-rail="real-dom" className="pointer-events-none absolute z-20" style={boxStyle(artboard, 1220, 0, 316, 1024)}>
      <FableSpaceDiscoverRailUserCard variant={variant} style={panelBoxStyle(railPanel, 12, 28, 286, 64)} />

      <section data-fable-space-world-status-card="dynamic-dom" className={cx("pointer-events-auto absolute overflow-hidden rounded-[1.35rem] border p-6", panelClass)} style={panelBoxStyle(railPanel, 12, 112, 286, 268)}>
        <img
          data-fable-space-world-status-bg="real-image"
          src={worldStatusBg}
          alt=""
          aria-hidden="true"
          draggable={false}
          decoding="async"
          className={cx(
            "pointer-events-none absolute right-[-30px] top-[58px] h-[214px] w-[196px] select-none object-contain",
            isBlack ? "opacity-55 mix-blend-screen" : "opacity-72",
          )}
        />
        <header
          data-fable-space-world-status-header="dynamic-text"
          aria-label={`世界状态 · ${worldStatus.syncLabel} · 实时更新`}
          className="relative z-10 grid grid-cols-[auto_1fr_auto] items-center gap-3"
        >
          <h2 className={cx("whitespace-nowrap text-[16px] font-black leading-none", isBlack ? "text-cyan-50" : "text-slate-800")}>世界状态</h2>
          <span
            data-fable-space-world-status-english="real-text"
            className={cx("min-w-0 truncate text-[10px] font-black uppercase tracking-[0.06em]", isBlack ? "text-cyan-100/44" : "text-[#b8c2d4]")}
          >
            WORLD STATUS
          </span>
          <span
            data-fable-space-world-status-live="real-text"
            className={cx("whitespace-nowrap text-[11px] font-black leading-none", isBlack ? "text-violet-300" : "text-[#c0a8ff]")}
            title={worldStatus.syncLabel}
          >
            实时更新
          </span>
        </header>
        <div className="relative z-10 mt-8 h-24">
          <p data-fable-space-world-status-online="dynamic-text" className={cx("text-3xl font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>{worldStatus.onlineSouls}</p>
          <p className={cx("relative z-10 mt-2 text-[13px] font-bold", isBlack ? "text-cyan-100/48" : "text-slate-400")}>活跃角色</p>
        </div>
        <div className="relative z-10 mt-2 grid grid-cols-2 gap-5">
          <div>
            <p data-fable-space-world-status-resonance="dynamic-text" className={cx("text-xl font-black", isBlack ? "text-cyan-100" : "text-slate-700")}>{worldStatus.resonanceFluctuation}</p>
            <p className={cx("text-[12px] font-bold", isBlack ? "text-cyan-100/48" : "text-slate-400")}>空间热度</p>
          </div>
          <div>
            <p data-fable-space-world-status-anomaly="dynamic-text" className={cx("text-xl font-black", isBlack ? "text-cyan-100" : "text-slate-700")}>{worldStatus.coordinateAnomalies}</p>
            <p className={cx("text-[12px] font-bold", isBlack ? "text-cyan-100/48" : "text-slate-400")}>坐标异常</p>
          </div>
        </div>
      </section>

      <section className={cx("pointer-events-auto absolute overflow-hidden rounded-[1.35rem] border p-[clamp(8px,1.04vw,16px)]", panelClass)} style={panelBoxStyle(railPanel, 12, 396, 286, 210)}>
        <header className="mb-[clamp(6px,0.78vw,12px)] flex items-center justify-between">
          <h2 className={cx("text-[15px] font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>推荐故事</h2>
          <Link to={WEB_PATHS.myHome} onMouseDown={suppressMouseFocus} className={cx("text-[11px] font-black", subtleLinkClass)}>查看全部 →</Link>
        </header>
        <div className="space-y-[clamp(4px,0.65vw,10px)]">
          {recommendedQuotes.map((quote, index) => {
            const card = cards[index]
            const key = discoverFavoriteKey("echo", card?.id, index)
            const isFavorite = favoriteKeys.has(key)
            const canEnter = Boolean(card?.id)
            const favoriteCount = (card?.favoriteCount || 0) + (isFavorite ? 1 : 0)
            const entryCopy = (
              <span className="min-w-0">
                <span className={cx("block truncate text-[clamp(7px,0.78vw,12px)] font-black leading-[1.15]", isBlack ? "text-cyan-100" : "text-slate-600")}>“{isInitialLoading ? "坐标记录同步中" : quote}”</span>
                <span className={cx("mt-0.5 block truncate text-[clamp(6px,0.65vw,10px)] font-bold leading-[1.15]", isBlack ? "text-cyan-100/45" : "text-slate-400")}>来自 {isInitialLoading ? "正在同步坐标" : (card?.name || "某个坐标")} · {isInitialLoading ? "加载中" : `${index * 5 + 2} 分钟前`}</span>
              </span>
            )
            return (
              <div
                key={quote}
                data-fable-space-right-rail-entry="recommended-echo"
                data-fable-space-right-rail-entry-state={canEnter ? "enterable" : "loading"}
                className={cx(
                  "grid min-h-[clamp(22px,2.8vw,44px)] grid-cols-[minmax(0,1fr)_clamp(1.5rem,2.6vw,2.5rem)] items-center gap-[clamp(6px,0.65vw,10px)] rounded-xl",
                  canEnter ? (isBlack ? "hover:bg-cyan-300/8" : "hover:bg-violet-50/60") : "cursor-wait opacity-76",
                )}
              >
                {canEnter ? (
                  <Link
                    to={targetFor(card)}
                    data-fable-space-right-rail-entry-link="recommended-echo"
                    onMouseDown={suppressMouseFocus}
                    className={cx("min-w-0 rounded-xl outline-none transition focus:ring-4", isBlack ? "focus:ring-cyan-300/30" : "focus:ring-violet-400/30")}
                  >
                    {entryCopy}
                  </Link>
                ) : (
                  <span className="min-w-0" aria-disabled="true">{entryCopy}</span>
                )}
                <button
                  type="button"
                  data-fable-space-recommended-echo-favorite="real-dom"
                  data-fable-space-right-rail-favorite-button="recommended-echo"
                  aria-label={isFavorite ? "取消收藏故事" : "收藏故事"}
                  aria-pressed={isFavorite}
                  disabled={!canEnter}
                  onClick={(event) => toggleFavorite(event, key, !canEnter)}
                  onMouseDown={suppressMouseFocus}
                  className={cx(
                    "inline-flex min-h-8 items-center justify-end gap-1 rounded-xl text-[clamp(7px,0.72vw,11px)] font-black outline-none transition focus:ring-4 disabled:cursor-wait disabled:opacity-45",
                    isFavorite ? "text-rose-500" : (isBlack ? "text-cyan-100/58" : "text-slate-400"),
                    isBlack ? "focus:ring-cyan-300/30" : "focus:ring-violet-400/30",
                  )}
                >
                  <Heart strokeWidth={2.6} className={cx("h-[clamp(8px,0.85vw,13px)] w-[clamp(8px,0.85vw,13px)] shrink-0", isFavorite ? "fill-rose-500 text-rose-500" : (isBlack ? "text-cyan-100/56" : "text-slate-400"))} />
                  <span data-fable-space-recommended-echo-favorite-count="real-text">{favoriteCount}</span>
                </button>
              </div>
            )
          })}
        </div>
      </section>

      <section className={cx("pointer-events-auto absolute rounded-[1.35rem] border p-4", panelClass)} style={panelBoxStyle(railPanel, 12, 622, 286, 214)}>
        <header className="mb-3 flex items-center justify-between">
          <h2 className={cx("text-[15px] font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>探索记录</h2>
          <Link to={WEB_PATHS.spaces} onMouseDown={suppressMouseFocus} className={cx("text-[11px] font-black", subtleLinkClass)}>查看全部 →</Link>
        </header>
        <div className="space-y-2">
          {footprintCards.map((card, index) => {
            const key = discoverFavoriteKey("footprint", card.id, index)
            const isFavorite = favoriteKeys.has(key)
            const canEnter = Boolean(card.id)
            const entryCopy = (
              <>
                <img data-fable-space-discover-square-image="512x512" src={card.image} alt={`${card.name} 缩略图`} className="h-9 w-9 rounded-xl object-cover" loading="lazy" decoding="async" />
                <span className="min-w-0 flex-1">
                  <span className={cx("block truncate text-[13px] font-black", isBlack ? "text-cyan-50" : "text-slate-700")}>{isInitialLoading ? "正在同步坐标" : card.name}</span>
                  <span className={cx("mt-1 block text-[11px] font-bold", isBlack ? "text-cyan-100/45" : "text-slate-400")}>{isInitialLoading ? "加载中" : card.timeLabel}</span>
                </span>
              </>
            )
            return (
              <div
                key={`${card.name}-${index}`}
                data-fable-space-right-rail-entry="footprint"
                data-fable-space-right-rail-entry-state={canEnter ? "enterable" : "loading"}
                className={cx(
                  "grid min-h-10 grid-cols-[minmax(0,1fr)_2rem] items-center gap-2 rounded-xl",
                  canEnter ? (isBlack ? "hover:bg-cyan-300/8" : "hover:bg-violet-50/60") : "cursor-wait opacity-76",
                )}
              >
                {canEnter ? (
                  <Link
                    to={targetFor(card)}
                    data-fable-space-right-rail-entry-link="footprint"
                    onMouseDown={suppressMouseFocus}
                    className={cx("flex min-w-0 touch-manipulation items-center gap-2 rounded-xl outline-none transition focus:ring-4", isBlack ? "focus:ring-cyan-300/30" : "focus:ring-violet-400/30")}
                  >
                    {entryCopy}
                  </Link>
                ) : (
                  <span className="flex min-w-0 items-center gap-2" aria-disabled="true">{entryCopy}</span>
                )}
                <button
                  type="button"
                  data-fable-space-right-rail-favorite-button="footprint"
                  aria-label={isFavorite ? "取消收藏记录" : "收藏记录"}
                  aria-pressed={isFavorite}
                  disabled={!canEnter}
                  onClick={(event) => toggleFavorite(event, key, !canEnter)}
                  onMouseDown={suppressMouseFocus}
                  className={cx(
                    "grid h-8 w-8 place-items-center rounded-xl text-sm outline-none transition focus:ring-4 disabled:cursor-wait disabled:opacity-45",
                    isFavorite ? "text-rose-500" : (isBlack ? "text-cyan-300/42" : "text-slate-300"),
                    isBlack ? "focus:ring-cyan-300/30" : "focus:ring-violet-400/30",
                  )}
                >
                  <Heart size={15} strokeWidth={2.6} className={cx(isFavorite && "fill-rose-500 text-rose-500")} />
                </button>
              </div>
            )
          })}
        </div>
      </section>

      <Link
        to={WEB_PATHS.createSpace}
        onMouseDown={suppressMouseFocus}
        className="pointer-events-auto absolute overflow-hidden rounded-[1.35rem] border border-indigo-950/20 bg-indigo-950 p-4 text-white shadow-[0_20px_56px_rgba(26,30,80,0.24)] outline-none transition hover:-translate-y-0.5 focus:ring-4 focus:ring-violet-400/30"
        style={panelBoxStyle(railPanel, 12, 852, 286, 140)}
      >
        <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(141,130,255,0.42),transparent_34%),linear-gradient(135deg,#17204d_0%,#11173b_52%,#29205d_100%)]" />
        <span className="relative z-10 grid h-full grid-cols-[4.75rem_1fr] items-center gap-4">
          <img data-fable-space-discover-square-image="512x512" src={discoverCardTrainPlatform} alt="" aria-hidden="true" className="h-[4.75rem] w-[4.75rem] rounded-[1.1rem] object-cover shadow-[0_16px_32px_rgba(0,0,0,0.22)]" loading="lazy" decoding="async" />
          <span className="min-w-0">
            <span className="block text-[17px] font-black">店主开设空间</span>
            <span className="mt-2 block truncate text-[12px] font-bold text-white/70">配置地理位置背景、NPC 与第一分钟玩法</span>
            <span className="mt-3 inline-flex w-max items-center gap-2 rounded-xl bg-[#8d82ff] px-4 py-1.5 text-[13px] font-black">
              进入店主开设 <ArrowUpRight size={13} strokeWidth={3} />
            </span>
          </span>
        </span>
      </Link>
    </aside>
  )
}

function FableSpaceDiscoverSurface({
  artboard,
  search,
  spaces,
  isLoading = false,
  onSearchChange,
  onClear,
  onTogglePlaceType,
  onToggleSpecialType,
  onToggleCategory,
  onPublicOnlyChange,
  onOpenOnlyChange,
  variant,
  visitorReduced = false,
}: DiscoverReferenceProps & { artboard: Artboard }) {
  const isBlack = variant === "black"
  const resultCountLabel = isLoading && spaces.length === 0
    ? "加载中"
    : visitorReduced
      ? `${Math.min(spaces.length, 3)} 个推荐空间`
      : `${Math.max(spaces.length, DISCOVER_LAYOUT.cards.length)} 个坐标`
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
      <div className="absolute z-10" style={boxStyle(artboard, DISCOVER_LAYOUT.title.x, DISCOVER_LAYOUT.title.y, DISCOVER_LAYOUT.title.w, DISCOVER_LAYOUT.title.h)}>
        <h1 data-fable-space-discover-title="real-text" className={cx("text-[31px] font-black leading-tight tracking-[-0.04em]", isBlack ? "text-cyan-50" : "text-slate-900")}>
          探索 <span className={isBlack ? "text-cyan-300" : "text-violet-500"}>坐标</span>
        </h1>
        <p className={cx("mt-2 text-[13px] font-bold", isBlack ? "text-cyan-100/46" : "text-slate-400")}>在无数坐标中，寻找与你产生共鸣的地方。</p>
      </div>
      <OverlayInput
        artboard={artboard}
        value={search}
        onChange={onSearchChange}
        placeholder="搜索地点、角色、记忆或关键?.."
        variant={variant}
        forceVisible
        {...DISCOVER_LAYOUT.search}
      />
      {visitorReduced ? (
        <div
          data-fable-space-visitor-first-filters="place-type-only"
          className="absolute z-20 flex items-center gap-3"
          style={boxStyle(artboard, 252, 118, 944, 48)}
        >
          <span className={cx("mr-1 text-[16px] font-black", isBlack ? "text-cyan-50" : "text-slate-800")}>先选一个空间</span>
          <DiscoverFilterChip variant={variant} label="全部" onClick={onClear} />
          <DiscoverFilterChip variant={variant} label="亮灯中" onClick={() => onOpenOnlyChange(true)} />
          <DiscoverFilterChip variant={variant} label="咖啡/书店" onClick={() => onTogglePlaceType("bookstore")} />
        </div>
      ) : (
        <FableSpaceDiscoverFilterPanel
          artboard={artboard}
          onClear={onClear}
          onTogglePlaceType={onTogglePlaceType}
          onToggleSpecialType={onToggleSpecialType}
          onToggleCategory={onToggleCategory}
          onPublicOnlyChange={onPublicOnlyChange}
          onOpenOnlyChange={onOpenOnlyChange}
          variant={variant}
        />
      )}
      <div className="absolute z-20 flex items-center justify-between" style={boxStyle(artboard, 252, 372, 954, 38)}>
        <h2 className={cx("text-[20px] font-black", isBlack ? "text-cyan-50" : "text-slate-900")}>
          探索结果 <span className={cx("text-[13px] font-bold", isBlack ? "text-cyan-100/42" : "text-slate-400")}>{resultCountLabel}</span>
        </h2>
        <FableSpaceDiscoverSortControls variant={variant} />
      </div>
    </>
  )
}

function FableSpaceDiscoverMobile({
  search,
  spaces,
  onSearchChange,
  onClear,
  onTogglePlaceType,
  onToggleCategory,
  onToggleTheme,
  visitorReduced = false,
  variant,
}: DiscoverReferenceProps) {
  const cardCount = visitorReduced ? 3 : 8
  const cards = DISCOVER_LAYOUT.cards.map((_, index) => discoverCardData(spaces[index], index)).slice(0, cardCount)
  const isBlack = variant === "black"
  return (
    <div className={cx("relative z-40 min-h-screen px-4 py-5 md:hidden", isBlack ? "bg-[radial-gradient(circle_at_16%_-8%,rgba(14,165,233,0.22),transparent_32%),radial-gradient(circle_at_88%_0%,rgba(217,70,239,0.24),transparent_30%),linear-gradient(180deg,#07162c_0%,#030918_54%,#01030a_100%)]" : "bg-[linear-gradient(180deg,#f4f8ff_0%,#eef4ff_45%,#fff_100%)]")}>
      <header className={cx("flex items-center justify-between rounded-[1.5rem] border p-3", isBlack ? "border-cyan-300/24 bg-[#061126]/88 shadow-[0_0_24px_rgba(14,165,233,0.16),0_0_32px_rgba(168,85,247,0.12),0_18px_42px_rgba(1,3,10,0.38)]" : "border-white/80 bg-white/88 shadow-[0_18px_42px_rgba(108,123,178,0.14)]")}>
        <Link to="/" className="flex min-h-11 touch-manipulation items-center gap-3 rounded-2xl outline-none focus:ring-4 focus:ring-violet-400/35">
          <span className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", isBlack ? "bg-cyan-400/10 text-cyan-100 shadow-[0_0_18px_rgba(14,165,233,0.16)]" : "bg-violet-50 text-violet-500")}>
            <Compass size={22} strokeWidth={2.6} />
          </span>
          <span>
            <span data-fable-space-discover-title="real-text" className={cx("block text-lg font-black", isBlack ? "text-white" : "text-slate-800")}>探索</span>
            <span className={cx("block text-[13px] font-bold", isBlack ? "text-cyan-100/62" : "text-slate-400")}>查找真实坐标里的 AI 空间</span>
          </span>
        </Link>
        <button type="button" onClick={onToggleTheme} className={cx("grid h-11 w-11 touch-manipulation place-items-center rounded-2xl border", isBlack ? "border-cyan-300/28 bg-cyan-400/10 text-cyan-100 shadow-[0_0_18px_rgba(14,165,233,0.18)]" : "border-violet-100 bg-violet-50 text-violet-500")} aria-label="切换主题">
          🌓
        </button>
      </header>
      <label data-fable-space-search={onSearchChange ? "real-input" : undefined} className={cx("relative mt-5 flex min-h-12 items-center rounded-2xl border px-4", isBlack ? "border-cyan-300/22 bg-[#061126]/84 shadow-[0_0_22px_rgba(14,165,233,0.14),0_16px_38px_rgba(1,3,10,0.3)]" : "border-white/80 bg-white shadow-[0_16px_38px_rgba(108,123,178,0.14)]")}>
        <span className="sr-only">搜索地点、角色、记忆或关键字</span>
        <Search size={18} strokeWidth={2.8} className={isBlack ? "text-cyan-200" : "text-violet-400"} />
        <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="搜索地点、角色、记忆或关键字..." className={cx("min-h-12 flex-1 bg-transparent px-3 text-base font-bold outline-none", isBlack ? "text-white placeholder:text-cyan-100/48" : "text-slate-800 placeholder:text-slate-400")} />
      </label>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        <DiscoverFilterChip variant={variant} label="全部" onClick={onClear} />
        <DiscoverFilterChip variant={variant} label="舒适空间" onClick={() => onTogglePlaceType("bookstore")} />
        <DiscoverFilterChip variant={variant} label="最有故事" onClick={() => onToggleCategory("陪伴树洞")} />
      </div>
      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className={cx("text-lg font-black", isBlack ? "text-white" : "text-slate-800")}>探索结果</h2>
          <Link to={WEB_PATHS.createSpace} className={cx("inline-flex min-h-11 touch-manipulation items-center rounded-xl px-2 text-[15px] font-black", isBlack ? "text-cyan-200" : "text-violet-500")}>店主入口 →</Link>
        </div>
        <div className="grid gap-3">
          {cards.map((card) => (
            <Link
              key={card.id || card.name}
              to={targetFor(card)}
              data-fable-space-discover-card="real-card"
              aria-disabled={!card.id}
              onClick={card.id ? undefined : (event) => event.preventDefault()}
              className={cx(
                "flex min-h-32 touch-manipulation gap-3 rounded-[1rem] border p-2.5 outline-none transition focus:ring-4",
                !card.id && "cursor-wait opacity-80",
                isBlack
                  ? "border-cyan-300/20 bg-[#061126]/84 shadow-[0_8px_8px_rgba(1,3,10,0.24)] focus:ring-cyan-300/30"
                  : "border-white/80 bg-white shadow-[0_8px_8px_rgba(108,123,178,0.10)] focus:ring-violet-400/30",
              )}
            >
              <img data-fable-space-discover-square-image="512x512" src={card.image} alt={`${card.name} 封面`} className="h-24 w-24 shrink-0 rounded-[1rem] object-cover" loading="lazy" decoding="async" />
              <span className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
                <span className={cx("block truncate text-[17px] font-black", isBlack ? "text-white" : "text-slate-800")}>{card.name}</span>
                <span className={cx("mt-1 line-clamp-2 text-[13px] font-bold leading-5", isBlack ? "text-cyan-100/62" : "text-slate-500")} title={card.description}>
                  {card.description}
                </span>
                <span className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
                  <span className={cx("rounded-full px-2.5 py-1 text-[11px] font-black", isBlack ? "bg-cyan-400/12 text-cyan-100" : "bg-violet-50 text-violet-500")}>
                    {card.experienceType}
                  </span>
                  <span data-fable-space-discover-entry-cta="visitor-primary" className={cx("inline-flex min-h-7 items-center rounded-full px-3 text-[12px] font-black", isBlack ? "bg-cyan-300 text-slate-950" : "bg-violet-500 text-white")}>
                    {card.id ? "进入 →" : "等待同步"}
                  </span>
                </span>
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
  spaces,
  variant,
  isLoading = false,
  forceVisible = false,
  maxCards,
}: {
  artboard: Artboard
  spaces: Space[]
  variant: Variant
  isLoading?: boolean
  forceVisible?: boolean
  maxCards?: number
}) {
  const cardBoxes = typeof maxCards === "number" ? DISCOVER_LAYOUT.cards.slice(0, maxCards) : DISCOVER_LAYOUT.cards
  return (
    <>
      {cardBoxes.map((box, index) => {
        const [x, y, w, h] = box
        const space = spaces[index]
        const boxKey = `${x}-${y}-${w}-${h}`
        if (forceVisible) {
          return (
            <FableSpaceDiscoverCard
              key={`discover-card-${space?.id || boxKey}`}
              artboard={artboard}
              box={box}
              space={space}
              index={index}
              variant={variant}
              isLoading={isLoading && !space}
            />
          )
        }
        return (
          <OverlayLink
            key={`discover-card-${space?.id || boxKey}`}
            artboard={artboard}
            hotspot={{
              label: `进入探索坐标 ${space?.name || index + 1}`,
              to: targetFor(space),
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


export function FableSpaceHomeReference({
  variant,
  featuredCitySlices,
  isLoading = false,
  heroCoordinate,
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
  const artboard = HOME_BLACK
  const resolvedWorldPulseItems = worldPulseItems?.length ? worldPulseItems : fallbackFeedItemsFromHome(featuredCitySlices)
  const resolvedOnlineEntities = onlineEntities?.length ? onlineEntities : fallbackOnlineEntitiesFromFeed(resolvedWorldPulseItems)
  const resolvedRecentMemories = recentMemories?.length ? recentMemories : fallbackRecentMemoriesFromHome(featuredCitySlices)
  const rightRail = HOME_LAYOUT.rightRail
  const searchBox = HOME_LAYOUT.search
  return (
    <ArtboardShell artboard={artboard} variant={variant} kind="home">
      <FableSpaceHomeMobile featuredCitySlices={featuredCitySlices} isLoading={isLoading} onToggleTheme={onToggleTheme} variant={variant} />
      <div className="relative hidden h-full md:block">
        <FableSpaceHomeMainSurface
          artboard={artboard}
          featuredCitySlices={featuredCitySlices}
          variant={variant}
          isLoading={isLoading}
          heroCoordinate={heroCoordinate}
        />
        <FableSpaceSidebar artboard={artboard} variant={variant} active="home" onToggleTheme={onToggleTheme} />
        <HomeHeroActions artboard={artboard} variant={variant} forceVisible />
        <FableSpaceFeedPanel
          artboard={artboard}
          variant={variant}
          box={rightRail.worldPulse}
          title="空间回声"
          eyebrow="Recent echoes"
          items={resolvedWorldPulseItems}
          actionLabel="查看空间"
          forceVisible
        />
        <FableSpaceDailyQuotePanel artboard={artboard} variant={variant} box={rightRail.dailyQuote} quote={dailyQuote} forceVisible />
        <FableSpaceOnlineEntitiesPanel artboard={artboard} variant={variant} box={rightRail.onlineEntities} entities={resolvedOnlineEntities} forceVisible />
        <FableSpaceRecentMemoriesPanel artboard={artboard} variant={variant} memories={resolvedRecentMemories} forceVisible />
        <FableSpaceGuidePanel artboard={artboard} variant={variant} cards={guideCards} forceVisible />
        <FableSpaceWorldStatsPanel artboard={artboard} variant={variant} stats={worldStats} forceVisible />
      </div>
    </ArtboardShell>
  )
}

export function FableSpaceDiscoverReference(props: DiscoverReferenceProps) {
  const artboard = DISCOVER_BLACK
  const visitorSpaces = props.visitorReduced ? props.spaces.slice(0, 3) : props.spaces
  const displayProps: DiscoverReferenceProps = { ...props, spaces: visitorSpaces }
  const resolvedSideFeedItems = props.visitorReduced ? [] : (props.sideFeedItems?.length ? props.sideFeedItems : fallbackFeedItemsFromSpaces(props.spaces))
  const resolvedOnlineEntities = props.onlineEntities?.length ? props.onlineEntities : fallbackOnlineEntitiesFromFeed(resolvedSideFeedItems)
  const discoverSideFeedItems = withDiscoverSquareFeedImages(resolvedSideFeedItems)
  const discoverOnlineEntities = withDiscoverSquareOnlineImages(resolvedOnlineEntities)
  return (
    <ArtboardShell artboard={artboard} variant={props.variant} kind="discover">
      <FableSpaceDiscoverMobile {...displayProps} />
      <div className="relative hidden h-full md:block">
        <FableSpaceDiscoverSurface artboard={artboard} {...displayProps} />
        <FableSpaceSidebar artboard={artboard} variant={props.variant} active="discover" onToggleTheme={props.onToggleTheme} />
        <>
          <FableSpaceFeedPanel
            artboard={artboard}
            variant={props.variant}
            box={DISCOVER_RIGHT_RAIL.echoFeed}
            title="空间动态"
            eyebrow="Fable Feed"
            items={discoverSideFeedItems}
            actionLabel="查看全部"
          />
          <FableSpaceOnlineEntitiesPanel artboard={artboard} variant={props.variant} box={DISCOVER_RIGHT_RAIL.onlineEntities} entities={discoverOnlineEntities} />
          <FableSpaceDiscoverRightRail artboard={artboard} spaces={props.spaces} variant={props.variant} isLoading={props.isLoading} />
        </>
        <DiscoverCardLinks
          artboard={artboard}
          spaces={displayProps.spaces}
          variant={props.variant}
          isLoading={props.isLoading}
          maxCards={props.visitorReduced ? 3 : undefined}
          forceVisible
        />
      </div>
    </ArtboardShell>
  )
}
