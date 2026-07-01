import { formatSpaceAnchorLocation } from '../product/mapAnchorCopy.js'

export const SPACE_LAYOUTS = [
  {
    id: "lobby",
    title: "空间大厅型",
    navLabel: "大厅",
    eyebrow: "Lobby layout",
    icon: "home",
    description: "把地图位置、今日公告、房间入口和店内行动放在同一个沉浸式大厅里。",
    accent: "amber",
    actions: [
      { title: "吧台", text: "点单 · 喝一杯", icon: "martini", targetLayout: "npc-chat" },
      { title: "故事墙", text: "浏览 · 写故事", icon: "book", targetLayout: "quest-play" },
      { title: "NPC 角落", text: "组织 · 聊天", icon: "users", targetLayout: "npc-chat" },
      { title: "访客簿", text: "写下足迹", icon: "pen", targetLayout: "hybrid-room" },
      { title: "记忆柜", text: "碎片 · 回溯", icon: "archive" },
      { title: "店规", text: "守则 · 约定", icon: "scroll" },
    ],
  },
  {
    id: "npc-chat",
    title: "NPC 会话型",
    navLabel: "NPC",
    eyebrow: "NPC conversation layout",
    icon: "user",
    description: "左侧是可筛选 NPC 名单，右侧给当前角色和对话区最大空间。",
    accent: "cyan",
    actions: [
      { title: "点一杯酒", text: "放松一下", icon: "martini" },
      { title: "询问传闻", text: "打听消息", icon: "message" },
      { title: "留下记忆", text: "记录此刻", icon: "pen", targetLayout: "hybrid-room" },
    ],
  },
  {
    id: "quest-play",
    title: "探索 / 玩法型",
    navLabel: "指南",
    eyebrow: "Exploration checklist layout",
    icon: "clipboard",
    description: "突出探索指南、线索、推理分支和下一步行动，适合轻文字玩法。",
    accent: "violet",
    actions: [
      { title: "询问老板", text: "了解更多情况", icon: "message", targetLayout: "npc-chat" },
      { title: "检查后门", text: "后巷通向何处？", icon: "door" },
      { title: "查看地图", text: "定位关键地点", icon: "map", targetLayout: "lobby" },
      { title: "记录推理", text: "整合线索推断", icon: "network" },
    ],
  },
  {
    id: "hybrid-room",
    title: "混合房间型",
    navLabel: "店内事件",
    eyebrow: "Hybrid room layout",
    icon: "bell",
    description: "用室内热点、事件流、清单/记忆入口组合出可探索房间。",
    accent: "emerald",
    actions: [
      { title: "切到聊天", text: "回到 NPC 对话", icon: "message", targetLayout: "npc-chat" },
      { title: "查看指南", text: "检查线索方向", icon: "clipboard", targetLayout: "quest-play" },
      { title: "写入记忆", text: "保存当前发现", icon: "pen" },
    ],
  },
]

const CLAIM_STATUSES = ["approved", "pending", "rejected", "revoked"]

export function normalizeSpaceLayoutStyle(value) {
  const layoutStyle = typeof value === "string" ? value.trim() : ""
  return SPACE_LAYOUTS.some((layout) => layout.id === layoutStyle) ? layoutStyle : "lobby"
}

function finiteNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatCoordinate(value, suffix) {
  const parsed = finiteNumber(value)
  if (parsed === null) return ""
  return `${parsed.toFixed(5)}°${suffix}`
}

export function countClaimsByStatus(claims = []) {
  const counts = { approved: 0, pending: 0, rejected: 0, revoked: 0 }
  if (!Array.isArray(claims)) return counts

  claims.forEach((claim) => {
    const status = typeof claim?.status === "string" ? claim.status : ""
    if (CLAIM_STATUSES.includes(status)) {
      counts[status] += 1
    }
  })
  return counts
}

function extractTimeStatus(space) {
  // Extract time_status from space (API returns this field)
  const timeStatus = space?.time_status
  if (!timeStatus) return undefined

  return {
    timezone: timeStatus.timezone || "",
    localTimeDisplay: timeStatus.local_time_display || timeStatus.local_time || "--:--",
    isOpen: Boolean(timeStatus.is_open),
    localDate: timeStatus.local_date,
    localSeason: timeStatus.local_season,
    localDayOfWeek: timeStatus.local_day_of_week,
    // Extract hour for day/night icon logic
    localHour: (() => {
      const match = (timeStatus.local_time_display || "").match(/(\d{1,2}):(\d{2})/)
      return match ? parseInt(match[1], 10) : undefined
    })(),
  }
}

export function buildSpaceLayoutStats(space, characters = [], claims = []) {
  const spaceCharacters = Array.isArray(space?.characters) ? space.characters : []
  const safeCharacters = Array.isArray(characters) ? characters : []

  // Use emotional location copy instead of raw coordinates
  const anchor = formatSpaceAnchorLocation(space)
  const locationLabel = anchor.line || '坐标未设置'

  return {
    location: locationLabel,
    accessStatus: `${space?.status || "unknown"} · ${space?.access || "public"}`,
    characterCount: safeCharacters.length || spaceCharacters.length,
    worldInfoCount: Array.isArray(space?.world_info) ? space.world_info.length : 0,
    gameplayCount: Array.isArray(space?.gameplay_definitions) ? space.gameplay_definitions.length : 0,
    visitCount: Number.isFinite(Number(space?.visit_count)) ? Number(space.visit_count) : 0,
    claims: countClaimsByStatus(claims),
    timeStatus: extractTimeStatus(space),
  }
}
