/**
 * Space Capability Hub
 *
 * Maps place_type + layout_style to optional visitor action cards in SpaceChatWorkbench.
 *
 * 4 layers:
 * 1. 聊天核心 (Chat Core)       — invite/revisit feedback, always shown
 * 2. 互动玩法 (Interactive)    — existing gameplay_definitions
 * 3. 工作助手 (Work Assistant) — demand organization, process guide, info tips
 * 4. 小游戏工坊 (Mini-game)     — whitelisted OSS mini-games
 *
 * Each card: "一键开始" + "完成后回到聊天" + "可给店主复核摘要"
 */

import type { Space, SpaceCharacter } from "./spaces"
import { deriveSpecialSpaceType } from "./special-space-types"

export type CapabilityCard = {
  id: string
  category: "chat_core" | "interactive" | "work_assistant" | "mini_game"
  label: string
  description: string
  icon: string
  badge?: string
  action?: string
  enabled?: boolean
  href?: string
  onClick?: () => void
}

export type CapabilityProfile = {
  placeType: string
  layoutStyle: string
  cards: CapabilityCard[]
  sortOrder: CapabilityCard["category"][]
}

// ─── place_type → work_assistant capabilities ─────────────────────────────────

const WORK_ASSISTANT_BY_PLACE_TYPE: Record<string, CapabilityCard[]> = {
  school: [
    {
      id: "school-process-assist",
      category: "work_assistant",
      label: "流程协助",
      description: "帮你梳理选课、作业、答辩等学业流程节点",
      icon: "📋",
      enabled: true,
    },
    {
      id: "school-material-sort",
      category: "work_assistant",
      label: "材料分诊",
      description: "帮你整理课程资料、笔记和复习清单",
      icon: "📚",
      enabled: true,
    },
    {
      id: "school-demand-bar",
      category: "work_assistant",
      label: "需求吧台",
      description: "把你的困惑整理成清晰的问题清单",
      icon: "🍵",
      enabled: true,
    },
  ],
  hospital: [
    {
      id: "hospital-companion-list",
      category: "work_assistant",
      label: "陪伴清单",
      description: "帮你整理探视要点、护理注意事项和常见问题",
      icon: "🏥",
      enabled: true,
    },
    {
      id: "hospital-risk-hint",
      category: "work_assistant",
      label: "风险边界提示",
      description: "提醒你医疗场景的边界与求助渠道（不做诊断）",
      icon: "⚠️",
      enabled: true,
    },
    {
      id: "hospital-revisit-note",
      category: "work_assistant",
      label: "回访便签",
      description: "帮你记录下次复诊要点和医生建议",
      icon: "📝",
      enabled: true,
    },
  ],
  bookstore: [
    {
      id: "bookstore-info-search",
      category: "work_assistant",
      label: "资料查找",
      description: "帮你整理书单、作者信息和阅读顺序建议",
      icon: "🔍",
      enabled: true,
    },
    {
      id: "bookstore-creation-workshop",
      category: "work_assistant",
      label: "创作工坊",
      description: "帮你梳理写作思路、人物设定和情节线索",
      icon: "✍️",
      enabled: true,
    },
    {
      id: "bookstore-revisit-letter",
      category: "work_assistant",
      label: "回访信笺",
      description: "帮你整理阅读笔记和心得摘要",
      icon: "💌",
      enabled: true,
    },
  ],
  cafe: [
    {
      id: "cafe-demand-clarify",
      category: "work_assistant",
      label: "需求澄清",
      description: "帮你整理思路，把模糊想法变成清晰的问题",
      icon: "☕",
      enabled: true,
    },
    {
      id: "cafe-revisit-note",
      category: "work_assistant",
      label: "回访便签",
      description: "帮你记录本次讨论要点和下一步行动",
      icon: "📝",
      enabled: true,
    },
  ],
  "milk-tea-shop": [
    {
      id: "milktea-demand-clarify",
      category: "work_assistant",
      label: "需求澄清",
      description: "帮你整理校园/生活/情感相关的困惑",
      icon: "🧋",
      enabled: true,
    },
    {
      id: "milktea-revisit-note",
      category: "work_assistant",
      label: "回访便签",
      description: "帮你记录本次讨论要点和后续跟进",
      icon: "📝",
      enabled: true,
    },
  ],
  restaurant: [
    {
      id: "restaurant-companion-list",
      category: "work_assistant",
      label: "陪伴清单",
      description: "帮你整理约会/聚餐的要点和话题建议",
      icon: "🍽️",
      enabled: true,
    },
    {
      id: "restaurant-demand-clarify",
      category: "work_assistant",
      label: "需求澄清",
      description: "帮你整理选择餐厅、点菜等决策纠结",
      icon: "🍴",
      enabled: true,
    },
    {
      id: "restaurant-revisit-note",
      category: "work_assistant",
      label: "回访便签",
      description: "帮你记录本次用餐体验和建议",
      icon: "📝",
      enabled: true,
    },
  ],
  "convenience-store": [
    {
      id: "convenience-demand-clarify",
      category: "work_assistant",
      label: "需求澄清",
      description: "帮你整理夜间值班、便利店运营等困惑",
      icon: "🏪",
      enabled: true,
    },
    {
      id: "convenience-revisit-note",
      category: "work_assistant",
      label: "回访便签",
      description: "帮你记录本次讨论要点和后续行动",
      icon: "📝",
      enabled: true,
    },
  ],
  "cultivation-retreat": [
    {
      id: "cultivation-meditation-assist",
      category: "work_assistant",
      label: "闭关引导",
      description: "帮你梳理静修要点、呼吸法与境界关隘",
      icon: "🧘",
      enabled: true,
    },
    {
      id: "cultivation-breakthrough-note",
      category: "work_assistant",
      label: "突破札记",
      description: "记录修行感悟，为下次突破做准备",
      icon: "📜",
      enabled: true,
    },
  ],
  "digital-human-studio": [
    {
      id: "digital-persona-check",
      category: "work_assistant",
      label: "档案核验",
      description: "帮你核对数字人设定中的冲突、空洞与版权风险",
      icon: "🔬",
      enabled: true,
    },
    {
      id: "digital-persona-export",
      category: "work_assistant",
      label: "档案导出",
      description: "整理成可迁移的文本、JSON 或提示词列表",
      icon: "💾",
      enabled: true,
    },
  ],
  space: [
    {
      id: "space-demand-clarify",
      category: "work_assistant",
      label: "需求整理",
      description: "帮你把模糊想法整理成清晰的问题清单",
      icon: "🍻",
      enabled: true,
    },
    {
      id: "space-revisit-note",
      category: "work_assistant",
      label: "回访便签",
      description: "帮你记录本次空间体验和后续计划",
      icon: "📝",
      enabled: true,
    },
  ],
  home: [
    {
      id: "home-private-todo",
      category: "work_assistant",
      label: "私密待办",
      description: "帮你整理家庭事务、私人物品和待办事项",
      icon: "🏠",
      enabled: true,
    },
    {
      id: "home-revisit-summary",
      category: "work_assistant",
      label: "回访摘要",
      description: "帮你整理本次居家体验和待改善项",
      icon: "📋",
      enabled: true,
    },
    {
      id: "home-next-reminder",
      category: "work_assistant",
      label: "下次提醒",
      description: "帮你设置下次回家的关注点和计划",
      icon: "⏰",
      enabled: true,
    },
  ],
}

// ─── layout_style → sort order ────────────────────────────────────────────────

const SORT_ORDER_BY_LAYOUT_STYLE: Record<string, CapabilityCard["category"][]> = {
  "quest-play": ["interactive", "mini_game", "chat_core", "work_assistant"],
  "hybrid-room": ["chat_core", "interactive", "mini_game", "work_assistant"],
  "npc-chat": ["chat_core", "work_assistant", "interactive", "mini_game"],
  lobby: ["chat_core", "work_assistant", "interactive", "mini_game"],
}

const DEFAULT_SORT_ORDER: CapabilityCard["category"][] = [
  "chat_core",
  "interactive",
  "work_assistant",
  "mini_game",
]

// ─── Chat Core capabilities (always present) ─────────────────────────────────

function buildChatCoreCards(space: Space, characters: SpaceCharacter[]): CapabilityCard[] {
  const cards: CapabilityCard[] = [
    {
      id: "chat-core-invite",
      category: "chat_core",
      label: "邀请回访",
      description: "把空间分享给朋友，一起探索",
      icon: "🔗",
      enabled: true,
    },
    {
      id: "chat-core-feedback",
      category: "chat_core",
      label: "回访反馈",
      description: "记录本次体验感想，帮助店主改进",
      icon: "💬",
      enabled: true,
    },
    {
      id: "chat-core-relationships",
      category: "chat_core",
      label: "关系图谱",
      description: "查看与 NPC 及其他空间建立的羁绊网络",
      icon: "🕸️",
      enabled: true,
    },
  ]

  if (characters.length > 1) {
    cards.push({
      id: "chat-core-group-chat",
      category: "chat_core",
      label: "群聊模式",
      description: "开启 NPC 群聊，让多个角色同时参与对话",
      icon: "👥",
      enabled: true,
    })
  }

  return cards
}

// ─── Interactive gameplay (from gameplay_definitions) ────────────────────────

function buildInteractiveCards(space: Space): CapabilityCard[] {
  const specialType = deriveSpecialSpaceType(space)
  const cards: CapabilityCard[] = []

  // Specialized interactive cards
  if (specialType === "cultivation-retreat") {
    cards.push({
      id: "interactive-cultivation-progress",
      category: "interactive",
      label: "修为进度",
      description: "查看当前的境界进度与突破要求",
      icon: "🪷",
      enabled: true,
      badge: "修仙",
    })
  } else if (specialType === "digital-human-studio") {
    cards.push({
      id: "interactive-digital-studio",
      category: "interactive",
      label: "数字人档案",
      description: "查看已整理的身份、口吻与出镜提示词",
      icon: "🧬",
      enabled: true,
      badge: "档案",
    })
  }

  const gameplays = Array.isArray(space.gameplay_definitions) ? space.gameplay_definitions : []
  if (!gameplays.length && !cards.length) return []

  const gameplayCards = gameplays.slice(0, 3).map((gp: unknown) => {
    const g = gp as { id?: string; name?: string; description?: string }
    return {
      id: `interactive-${g.id || "default"}`,
      category: "interactive" as const,
      label: String(g.name || "互动玩法"),
      description: String(g.description || "点击开始一段剧情玩法"),
      icon: "🎭",
      enabled: true,
    }
  })

  return [...cards, ...gameplayCards]
}

// ─── Mini-game workshop (whitelist) ─────────────────────────────────────────

export const MINI_GAME_WHITELIST: CapabilityCard[] = [
  {
    id: "mini-game-guess-number",
    category: "mini_game",
    label: "猜数字",
    description: "我在 1-100 之间想了一个数字，7 次机会猜中它。",
    icon: "🎯",
    enabled: true,
  },
  {
    id: "mini-game-memory-cards",
    category: "mini_game",
    label: "记忆翻牌",
    description: "翻开牌面，找出 8 对相同的 emoji 符号。",
    icon: "🧠",
    enabled: true,
  },
  {
    id: "mini-game-meditation",
    category: "mini_game",
    label: "打坐静修",
    description: "跟随光芒呼吸，洗练心境，累计修行时长。",
    icon: "🧘",
    enabled: true,
  },
]

// ─── Main export: derive capability profile ──────────────────────────────────

export function deriveCapabilityProfile(space: Space): CapabilityProfile {
  const placeType = String(space.place_type || "space")
  const layoutStyle = String(space.layout_style || "npc-chat")
  const characters = Array.isArray(space.characters) ? space.characters : []

  const chatCoreCards = buildChatCoreCards(space, characters)
  const interactiveCards = buildInteractiveCards(space)
  
  const specialType = deriveSpecialSpaceType(space)
  const workAssistantCards = (specialType && WORK_ASSISTANT_BY_PLACE_TYPE[specialType]) 
    ? WORK_ASSISTANT_BY_PLACE_TYPE[specialType] 
    : (WORK_ASSISTANT_BY_PLACE_TYPE[placeType] || WORK_ASSISTANT_BY_PLACE_TYPE.space)
    
  const miniGameCards = MINI_GAME_WHITELIST

  const sortOrder = SORT_ORDER_BY_LAYOUT_STYLE[layoutStyle] || DEFAULT_SORT_ORDER

  const allCards = [
    ...chatCoreCards,
    ...interactiveCards,
    ...workAssistantCards,
    ...miniGameCards,
  ]

  return {
    placeType,
    layoutStyle,
    cards: allCards,
    sortOrder,
  }
}

// ─── Sort cards by profile ────────────────────────────────────────────────────

export function sortCapabilityCards(profile: CapabilityProfile): CapabilityCard[] {
  const { cards, sortOrder } = profile
  const categoryOrder = new Map(sortOrder.map((cat, index) => [cat, index]))

  return [...cards].sort((a, b) => {
    const orderA = categoryOrder.get(a.category) ?? 99
    const orderB = categoryOrder.get(b.category) ?? 99
    if (orderA !== orderB) return orderA - orderB
    return a.label.localeCompare(b.label, "zh-CN")
  })
}

// ─── Group cards by category ─────────────────────────────────────────────────

export type CapabilityGroup = {
  category: CapabilityCard["category"]
  label: string
  icon: string
  cards: CapabilityCard[]
}

const CATEGORY_META: Record<CapabilityCard["category"], { label: string; icon: string }> = {
  chat_core: { label: "聊天核心", icon: "💬" },
  interactive: { label: "互动玩法", icon: "🎮" },
  work_assistant: { label: "工作助手", icon: "🛠️" },
  mini_game: { label: "小游戏工坊", icon: "🎯" },
}

export function groupCapabilityCards(sortedCards: CapabilityCard[]): CapabilityGroup[] {
  const groups = new Map<CapabilityCard["category"], CapabilityGroup>()

  for (const card of sortedCards) {
    if (!groups.has(card.category)) {
      const meta = CATEGORY_META[card.category]
      groups.set(card.category, { category: card.category, label: meta.label, icon: meta.icon, cards: [] })
    }
    groups.get(card.category)!.cards.push(card)
  }

  // Return in sort order
  const profile = { sortOrder: Object.keys(CATEGORY_META) as CapabilityCard["category"][] } as CapabilityProfile
  const sortedGroups = [...groups.values()].sort((a, b) => {
    const orderA = profile.sortOrder.indexOf(a.category)
    const orderB = profile.sortOrder.indexOf(b.category)
    return orderA - orderB
  })

  return sortedGroups
}
