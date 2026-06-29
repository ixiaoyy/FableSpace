import { derivePlaceTypeDisplay } from "./place-types.js"
import { deriveSpecialTavernTypeDisplay } from "./special-tavern-types.js"
import { type Tavern, type TavernCharacter } from "./taverns"
import { formatTavernAnchorLocation } from "../product/mapAnchorCopy.js"

export type TavernFirstMinuteGuide = {
  anchorLine: string
  sceneHint: string
  experienceType: string
  experienceHelper: string
  hostRole: string
  playObjective: string
  startLabel: string
  tryThisFirst: string[]
  quickActions: TavernFirstMinuteAction[]
}

export type TavernFirstMinuteAction = {
  id: string
  label: string
  helper: string
  prompt: string
}

const EXPERIENCE_BY_PLACE_TYPE: Record<string, { label: string; helper: string }> = {
  cafe: { label: "安静陪伴", helper: "气味 / 座位 / 店员" },
  "milk-tea-shop": { label: "轻快打卡", helper: "甜味 / 今日推荐 / 街角小事" },
  restaurant: { label: "主厨故事", helper: "菜单 / 熟客 / 厨房传闻" },
  "convenience-store": { label: "夜班街角", helper: "夜班 / 避雨 / 货架" },
  bookstore: { label: "旧书资料馆", helper: "书架 / 便签 / 低声交谈" },
  school: { label: "校园旧事", helper: "校门 / 铃声 / 往事" },
  hospital: { label: "照护陪伴", helper: "温和陪伴 / 分诊便签" },
  home: { label: "私域回访", helper: "熟人邀请 / 家中物件" },
  tavern: { label: "地点叙事", helper: "门牌 / NPC / 闲聊" },
}

const EXPLANATORY_SEED_COPY_PATTERN = /demo seed|AI 草稿|边界批准|默认示例空间|不代表平台|未经店主确认/i

function compactText(value: unknown, fallback: string, maxLength = 46) {
  const text = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : ""
  const result = text || fallback
  return result.length > maxLength ? `${result.slice(0, maxLength)}…` : result
}

function firstCharacter(characters: TavernCharacter[]) {
  return characters.find((character) => character?.name?.trim()) || characters[0]
}

function uniqueList(values: string[], max = 3) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const text = value.trim()
    if (!text || seen.has(text)) continue
    seen.add(text)
    result.push(text)
    if (result.length >= max) break
  }
  return result
}

/**
 * Builds visitor-facing play copy from the existing tavern category without
 * inventing new schema fields or publishing platform-authored story content.
 */
function buildPlayableEntryCopy(placeId: string, experienceType: string, contentText = "") {
  const normalized = `${placeId} ${experienceType} ${contentText}`.toLowerCase()
  if (normalized.includes("花圃") || normalized.includes("菜园") || normalized.includes("种植") || normalized.includes("浇水") || normalized.includes("收获")) {
    return {
      hostRole: "花圃园丁",
      playObjective: "花圃已开",
      startLabel: "进入花圃",
    }
  }
  if (normalized.includes("home") || normalized.includes("陪伴") || normalized.includes("照护") || normalized.includes("私域")) {
    return {
      hostRole: "陪伴接待",
      playObjective: "回访记得",
      startLabel: "开始回访",
    }
  }
  if (normalized.includes("创作") || normalized.includes("bookstore")) {
    return {
      hostRole: "创作引导",
      playObjective: "创作从这里开始",
      startLabel: "开始创作",
    }
  }
  return {
    hostRole: "空间主持",
    playObjective: "开放中",
    startLabel: "开始游玩",
  }
}

/**
 * Generates three natural conversation-starting prompts.
 * The label is what the user sees on the button (short, action-oriented).
 * The helper is the category tag shown below (地点锚点 / NPC 主持 / 马上行动).
 * The prompt is what gets sent to the composer (full question).
 */
function buildQuickActions(
  prompts: string[],
  characterName: string,
  anchorText: string
): TavernFirstMinuteAction[] {
  // Action categories based on position
  const categoryLabels = ["地点锚点", "NPC 主持", "马上行动"]

  // Fallback action labels — short, direct, immersive
  const fallbackActions = [
    `问 ${anchorText || "这里"} 是什么地方`,
    `找 ${characterName || "驻场 NPC"} 聊聊`,
    "看看这里有什么",
  ]

  const combined = [
    ...prompts.map((p, i) => ({ label: p, category: categoryLabels[i] || categoryLabels[categoryLabels.length - 1] })),
    ...fallbackActions.map((label, i) => ({ label, category: categoryLabels[i] || categoryLabels[categoryLabels.length - 1] })),
  ]

  const seen = new Set<string>()
  const result: Array<{ label: string; category: string }> = []
  for (const item of combined) {
    if (!item.label?.trim() || seen.has(item.label)) continue
    seen.add(item.label)
    result.push(item)
    if (result.length >= 3) break
  }

  return result.map((item, index) => ({
    id: `first-minute-action-${index + 1}`,
    label: item.label,
    helper: item.category,
    prompt: item.label,
  }))
}

export function buildTavernFirstMinuteGuide(tavern: Tavern): TavernFirstMinuteGuide {
  const anchor = formatTavernAnchorLocation(tavern)
  const placeType = derivePlaceTypeDisplay(tavern)
  const specialType = deriveSpecialTavernTypeDisplay(tavern)
  const characters = Array.isArray(tavern.characters) ? tavern.characters : []
  const leadCharacter = firstCharacter(characters)
  const placeExperience = EXPERIENCE_BY_PLACE_TYPE[String(placeType?.id || "tavern")] || EXPERIENCE_BY_PLACE_TYPE.tavern
  const gameplaySearchText = [
    tavern.name,
    tavern.description,
    tavern.scene_prompt,
    characters.flatMap((character) => character.tags || []).join(" "),
  ].join(" ")
  const isPlantingExperience = /花圃|菜园|种植|浇水|收获/.test(gameplaySearchText)
  const experienceType = isPlantingExperience ? "种植照看" : specialType?.shortLabel || specialType?.label || placeExperience.label
  const experienceHelper = isPlantingExperience
    ? "领种子 / 清草 / 浇水 / 收获兑换"
    : specialType?.summary || placeExperience.helper
  const playableCopy = buildPlayableEntryCopy(
    String(placeType?.id || tavern.layout_style || "tavern"),
    experienceType,
    gameplaySearchText,
  )
  const scenePrompt = typeof tavern.scene_prompt === "string" ? tavern.scene_prompt : ""
  const visitorSceneSource = EXPLANATORY_SEED_COPY_PATTERN.test(scenePrompt) ? tavern.description : tavern.scene_prompt
  const sceneHint = compactText(visitorSceneSource, tavern.description || placeType?.tone || "门口等着你", 34)
  const characterName = leadCharacter?.name?.trim() || "驻场 NPC"
  const anchorText = anchor.text !== "坐标待确认" ? anchor.text : `${Number(tavern.lat).toFixed(4)}, ${Number(tavern.lon).toFixed(4)}`
  const tryThisFirst = uniqueList([
    `这里 ${anchorText}，为什么偏偏开在这里？`,
    characters.length
      ? `跟 ${characterName} 打个招呼，问问他在这里做什么。`
      : `第一眼看去，这地方最值得关注的是什么？`,
    visitorSceneSource
      ? `先带我看看这里：${compactText(visitorSceneSource, "从门口开始", 28)}`
      : `进门之后，最适合先聊什么？`,
  ])

  return {
    anchorLine: anchor.line,
    sceneHint,
    experienceType,
    experienceHelper,
    hostRole: playableCopy.hostRole,
    playObjective: playableCopy.playObjective,
    startLabel: playableCopy.startLabel,
    tryThisFirst,
    quickActions: buildQuickActions(tryThisFirst, characterName, anchorText),
  }
}

export function getTavernFirstMinuteSearchText(tavern: Tavern) {
  const guide = buildTavernFirstMinuteGuide(tavern)
  return [
    guide.anchorLine,
    guide.sceneHint,
    guide.experienceType,
    guide.experienceHelper,
    ...guide.tryThisFirst,
  ].join(" ")
}
