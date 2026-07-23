import { type Space, type SpaceCharacter } from "./spaces"

export type SpaceFirstMinuteGuide = {
  anchorLine: string
  sceneHint: string
  experienceType: string
  experienceHelper: string
  hostRole: string
  playObjective: string
  startLabel: string
  tryThisFirst: string[]
  quickActions: SpaceFirstMinuteAction[]
}

export type SpaceFirstMinuteAction = {
  id: string
  label: string
  helper: string
  prompt: string
}

function compactText(value: unknown, fallback: string, maxLength = 46) {
  const text = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : ""
  const result = text || fallback
  return result.length > maxLength ? `${result.slice(0, maxLength)}…` : result
}

function firstCharacter(characters: SpaceCharacter[]) {
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

function buildQuickActions(
  prompts: string[],
  characterName: string,
  storyName: string,
): SpaceFirstMinuteAction[] {
  const categories = ["故事背景", "角色回应", "下一步"]
  const fallbacks = [
    `问问 ${storyName || "这个故事"} 里发生了什么`,
    `和 ${characterName || "眼前的角色"} 打个招呼`,
    "看看眼前最值得注意的线索",
  ]
  const seen = new Set<string>()
  const labels = [...prompts, ...fallbacks].filter((label) => {
    if (!label?.trim() || seen.has(label)) return false
    seen.add(label)
    return true
  }).slice(0, 3)

  return labels.map((label, index) => ({
    id: `story-opening-action-${index + 1}`,
    label,
    helper: categories[index] || categories[categories.length - 1],
    prompt: label,
  }))
}

export function buildSpaceFirstMinuteGuide(space: Space): SpaceFirstMinuteGuide {
  const characters = Array.isArray(space.characters) ? space.characters : []
  const leadCharacter = firstCharacter(characters)
  const storyName = String(space.name || "这个故事").trim()
  const sceneSource = String(space.scene_prompt || space.description || "").trim()
  const searchText = [
    storyName,
    space.description,
    space.scene_prompt,
    characters.flatMap((character) => character.tags || []).join(" "),
  ].join(" ")
  const isInvestigation = /调查|委托|线索|谜|证据|追查/.test(searchText)
  const isCompanionStory = /陪伴|治愈|日常|回访/.test(searchText)
  const experienceType = isInvestigation
    ? "调查故事"
    : isCompanionStory
      ? "陪伴故事"
      : "角色故事"
  const characterName = leadCharacter?.name?.trim() || "眼前的角色"
  const tryThisFirst = uniqueList([
    `${storyName}里现在发生了什么？`,
    `跟 ${characterName} 打个招呼，问问他正在面对什么。`,
    sceneSource
      ? `先看看眼前这一幕：${compactText(sceneSource, "从开场开始", 28)}`
      : "这一幕最值得先注意什么？",
  ])

  return {
    anchorLine: storyName,
    sceneHint: compactText(sceneSource, space.description || "故事正等待你的回应", 34),
    experienceType,
    experienceHelper: isInvestigation ? "线索 / 选择 / 后果" : "角色 / 对话 / 关系",
    hostRole: "故事角色",
    playObjective: "回应眼前这一幕",
    startLabel: "进入故事",
    tryThisFirst,
    quickActions: buildQuickActions(tryThisFirst, characterName, storyName),
  }
}

export function getSpaceFirstMinuteSearchText(space: Space) {
  const guide = buildSpaceFirstMinuteGuide(space)
  return [
    guide.anchorLine,
    guide.sceneHint,
    guide.experienceType,
    guide.experienceHelper,
    ...guide.tryThisFirst,
  ].join(" ")
}
