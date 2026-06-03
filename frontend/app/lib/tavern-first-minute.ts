import { derivePlaceTypeDisplay } from "./place-types.js"
import { deriveSpecialTavernTypeDisplay } from "./special-tavern-types.js"
import { type Tavern, type TavernCharacter } from "./taverns"
import { formatTavernAnchorLocation } from "../product/mapAnchorCopy.js"

export type TavernFirstMinuteGuide = {
  anchorLine: string
  experienceType: string
  experienceHelper: string
  hostRole: string
  playObjective: string
  startLabel: string
  whyHere: string
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
  cafe: { label: "安静陪伴", helper: "适合从气味、座位、店员和回访记忆开始聊。" },
  "milk-tea-shop": { label: "轻快打卡", helper: "适合校园、甜味、今日推荐和街角小事件。" },
  restaurant: { label: "主厨故事", helper: "适合从菜单、纪念日、熟客和厨房传闻进入。" },
  "convenience-store": { label: "夜班街角", helper: "适合从夜班、避雨、货架和路过的人开始。" },
  bookstore: { label: "旧书资料馆", helper: "适合从书架、纸页气味、隐藏便签和低声交谈进入。" },
  school: { label: "校园旧事", helper: "适合从门卫、铃声、校门口记忆和安全边界进入。" },
  hospital: { label: "照护陪伴", helper: "适合温和陪伴与分诊便签；不替代现实医疗建议。" },
  home: { label: "私域回访", helper: "适合熟人邀请、家庭物件和长期关系回访。" },
  tavern: { label: "地点叙事", helper: "适合从门牌、吧台、驻场 NPC 和第一段传闻进入。" },
}

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
      playObjective: "先领一包种子，清开一小垄地，再完成播种、浇水、施肥、成熟、收获和 NPC 小摊兑换。",
      startLabel: "进入花圃",
    }
  }
  if (normalized.includes("quest") || normalized.includes("探索") || normalized.includes("旧书") || normalized.includes("校园")) {
    return {
      hostRole: "线索主持",
      playObjective: "先找到这处真实地点背后的第一条线索，再决定下一步问谁、看哪里。",
      startLabel: "开始调查",
    }
  }
  if (normalized.includes("home") || normalized.includes("陪伴") || normalized.includes("照护") || normalized.includes("私域")) {
    return {
      hostRole: "陪伴接待",
      playObjective: "先把此刻的状态交给 NPC，让空间记住你这次回来想整理什么。",
      startLabel: "开始回访",
    }
  }
  if (normalized.includes("创作") || normalized.includes("bookstore")) {
    return {
      hostRole: "创作引导",
      playObjective: "先让 NPC 帮你选一个切入口，把想法整理成能继续推进的一小步。",
      startLabel: "开始创作",
    }
  }
  return {
    hostRole: "空间主持",
    playObjective: "先确认这个空间为什么开在这里，再由 NPC 带你完成第一步互动。",
    startLabel: "开始游玩",
  }
}

/**
 * Converts first-minute prompts into three explicit buttons; clicking them is
 * handled by the UI as composer prefill only, so it has no network side effect.
 */
function buildQuickActions(prompts: string[], characterName: string, anchorShort: string): TavernFirstMinuteAction[] {
  const fallbackPrompts = [
    `请先告诉我：这里为什么必须开在 ${anchorShort}？`,
    `请作为主持 NPC，给我一个现在能做的第一步。`,
    `我想从入口开始观察，请带我看第一条线索。`,
  ]
  const normalizedPrompts = uniqueList([...prompts, ...fallbackPrompts], 3)
  const labels = ["问为什么在这里", characterName ? `找 ${characterName}` : "找主持 NPC", "观察第一条线索"]
  const helpers = ["地点锚点", "NPC 主持", "马上行动"]
  return normalizedPrompts.map((prompt, index) => ({
    id: `first-minute-action-${index + 1}`,
    label: labels[index] || "开始一步",
    helper: helpers[index] || "可执行动作",
    prompt,
  }))
}

function buildAnchorShortName(tavern: Tavern) {
  const anchor = formatTavernAnchorLocation(tavern)
  if (anchor.text && anchor.text !== "坐标待确认") return compactText(anchor.text, "这个坐标", 18)
  if (Number.isFinite(Number(tavern.lat)) && Number.isFinite(Number(tavern.lon))) {
    return `${Number(tavern.lat).toFixed(4)}, ${Number(tavern.lon).toFixed(4)}`
  }
  return "这个坐标"
}

export function buildTavernFirstMinuteGuide(tavern: Tavern): TavernFirstMinuteGuide {
  const anchor = formatTavernAnchorLocation(tavern)
  const anchorShort = buildAnchorShortName(tavern)
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
    ? "适合从一垄地开始：领种子、清草、浇水、施肥、等待成熟、收获兑换。"
    : specialType?.summary || placeExperience.helper
  const playableCopy = buildPlayableEntryCopy(
    String(placeType?.id || tavern.layout_style || "tavern"),
    experienceType,
    gameplaySearchText,
  )
  const sceneHint = compactText(tavern.scene_prompt, tavern.description || placeType?.tone || "店主还没有写下地点线索", 52)
  const whyHere = `${anchor.label}把入口带到 ${anchorShort}；进门先留意「${sceneHint}」，再让 NPC 带你看这处真实坐标的第一条线索。`
  const characterName = leadCharacter?.name?.trim() || "驻场 NPC"
  const placeLabel = placeType?.shortLabel || placeType?.label || "空间"
  const tryThisFirst = uniqueList([
    `这里为什么必须开在 ${anchorShort}？`,
    characters.length
      ? `问 ${characterName}：你和这个${placeLabel}有什么关系？`
      : `先问：这个${placeLabel}第一眼最值得注意的是什么？`,
    tavern.scene_prompt
      ? `请带我看一眼这里：${compactText(tavern.scene_prompt, "从门口开始", 28)}`
      : `今天进门，最适合先聊哪条线索？`,
  ])

  return {
    anchorLine: anchor.line,
    experienceType,
    experienceHelper,
    hostRole: playableCopy.hostRole,
    playObjective: playableCopy.playObjective,
    startLabel: playableCopy.startLabel,
    whyHere,
    tryThisFirst,
    quickActions: buildQuickActions(tryThisFirst, characterName, anchorShort),
  }
}

export function getTavernFirstMinuteSearchText(tavern: Tavern) {
  const guide = buildTavernFirstMinuteGuide(tavern)
  return [
    guide.anchorLine,
    guide.experienceType,
    guide.experienceHelper,
    guide.whyHere,
    ...guide.tryThisFirst,
  ].join(" ")
}
