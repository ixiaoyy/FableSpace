import { derivePlaceTypeDisplay } from "./place-types.js"
import { deriveSpecialTavernTypeDisplay } from "./special-tavern-types.js"
import { type Tavern, type TavernCharacter } from "./taverns"
import { formatTavernAnchorLocation } from "../product/mapAnchorCopy.js"

export type TavernFirstMinuteGuide = {
  anchorLine: string
  experienceType: string
  experienceHelper: string
  whyHere: string
  tryThisFirst: string[]
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
  const experienceType = specialType?.shortLabel || specialType?.label || placeExperience.label
  const experienceHelper = specialType?.summary || placeExperience.helper
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
    whyHere,
    tryThisFirst,
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
