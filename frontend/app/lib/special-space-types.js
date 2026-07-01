import {
  DIGITAL_HUMAN_DRAFT_FORBIDDEN,
  DIGITAL_HUMAN_DRAFT_STYLE_TAGS,
  DIGITAL_HUMAN_STUDIO_TYPE_ID,
} from "./digital-human-studio.js"

function normalizeText(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

function toText(value) {
  return typeof value === "string" ? value.trim() : ""
}

function worldInfoSearchText(worldInfo) {
  if (!Array.isArray(worldInfo)) return []
  return worldInfo.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return []
    return [entry.title, entry.keyword, entry.keywords, entry.content, entry.value]
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .map(toText)
      .filter(Boolean)
  })
}

function hasEnabledSkillPack(space, expectedPackIds = []) {
  const activeIds = new Set(expectedPackIds.map((id) => normalizeText(id)))
  if (!activeIds.size || !Array.isArray(space?.skill_packs)) return false
  return space.skill_packs.some((pack) => {
    if (!pack || typeof pack !== "object") return false
    if (pack.enabled === false) return false
    return activeIds.has(normalizeText(pack.id))
  })
}

function buildSpaceSearchText(space = {}) {
  return [
    space.name,
    space.description,
    space.scene_prompt,
    space.address,
    ...worldInfoSearchText(space.world_info),
    ...(Array.isArray(space.characters)
      ? space.characters.flatMap((character) => [character?.name, character?.description, ...(character?.tags || [])])
      : []),
  ]
    .map(toText)
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

export const SPECIAL_SPACE_TYPES = [
  {
    id: DIGITAL_HUMAN_STUDIO_TYPE_ID,
    label: "数字人工作室",
    shortLabel: "数字人",
    icon: "🧬",
    summary: "在 NPC 档案师辅助下，把自己整理成可迁移数字人档案与视频出镜 prompt。",
    description: "薄层只负责识别、展示和模板初始化；数字人档案仍需用户确认，可适配 FableSpace / SillyTavern，也可复制到视频或短剧工具。",
    badgeClass: "border-cyan-300/26 bg-cyan-300/10 text-cyan-50",
    filterClass: "border-cyan-300/30 bg-cyan-300/12 text-cyan-50",
    layoutStyle: "npc-chat",
    place_type: "space",
    keywords: ["数字人", "数字分身", "虚拟人", "视频出镜", "短剧", "口播", "身份档案", "persona", "digital human"],
    skillPackIds: ["digital-human-studio", "digital-persona-workshop", "video-avatar-pack"],
    draftSeed: {
      place_type: "space",
      layout_style: "npc-chat",
      summary: "真实坐标上的数字人工作室：来客可以在 NPC 档案师辅助下整理身份、口吻、边界、外观风格与视频出镜 prompt。",
      scene_prompt: "真实坐标上的数字人制作酒馆：档案桌、镜前试演、角色卡工位和视频脚本板；AI 只生成待确认数字人档案，不直接生成视频、语音克隆或真人影像。",
      tone: "访谈式、清晰、尊重授权、适合视频出镜",
      forbidden: DIGITAL_HUMAN_DRAFT_FORBIDDEN.join(", "),
      style_tags: DIGITAL_HUMAN_DRAFT_STYLE_TAGS,
      character_name: "数字人档案师",
      character_description: "通过提问帮助用户整理身份定位、口吻、边界、外观风格、角色卡字段和视频/短剧出镜 prompt 的 NPC。",
      first_mes: "欢迎来到数字人制作酒馆。我们先确认：这个数字人是你本人、虚构角色，还是某个已授权品牌人格？确认边界后，我会帮你整理成可迁移档案。",
    },
  },
  {
    id: "cultivation-retreat",
    label: "修行空间",
    shortLabel: "修行",
    icon: "🪷",
    summary: "适合问道、闭关札记、心境回访和轻量剧情修行。",
    description: "薄层只负责识别、展示和模板初始化；NPC、世界书、玩法与图片仍由店主确认。",
    badgeClass: "border-amber-300/24 bg-amber-300/10 text-amber-50",
    filterClass: "border-amber-300/26 bg-amber-300/10 text-amber-50",
    layoutStyle: "quest-play",
    place_type: "space",
    keywords: ["修行", "问道", "洞府", "山门", "闭关", "心法", "灵台", "飞升", "仙门", "道友"],
    skillPackIds: ["cultivation-play-pack", "cultivation-retreat", "xiuxian-play-pack"],
    playPackId: "cultivation-play-pack",
    draftSeed: {
      place_type: "space",
      layout_style: "quest-play",
      summary: "真实坐标上的修行空间：允许来客问道、留心境纪要与回访札记。",
      scene_prompt: "真实坐标上的修行空间：青灯、洞府、问道茶席、心境札记与回访纪要；不做战斗、等级、装备或排行。",
      tone: "角色扮演",
      forbidden: "战斗, 等级, 装备, 排行榜, 充值, 跨空间社交",
    },
  },
]

const SPECIAL_SPACE_TYPE_BY_ID = new Map(SPECIAL_SPACE_TYPES.map((type) => [type.id, type]))

export function normalizeSpecialSpaceTypeId(value) {
  const normalized = normalizeText(value).replace(/_/g, "-")
  return SPECIAL_SPACE_TYPE_BY_ID.has(normalized) ? normalized : ""
}

export function buildSpecialSpaceTypeDraftSeed(value) {
  const specialType = SPECIAL_SPACE_TYPE_BY_ID.get(normalizeSpecialSpaceTypeId(value))
  return specialType ? { ...specialType.draftSeed } : null
}

export function deriveSpecialSpaceType(space = {}) {
  if (typeof space === "string") {
    const id = normalizeSpecialSpaceTypeId(space)
    return id || null
  }

  const layoutStyle = toText(space.layout_style).toLowerCase() || "lobby"
  const text = buildSpaceSearchText(space)

  for (const specialType of SPECIAL_SPACE_TYPES) {
    if (hasEnabledSkillPack(space, specialType.skillPackIds)) return specialType.id
    if (layoutStyle !== specialType.layoutStyle) continue
    if (specialType.keywords.some((keyword) => text.includes(normalizeText(keyword)))) {
      return specialType.id
    }
  }

  return null
}

export function specialSpaceTypeMatchesSpace(space, specialSpaceTypeId) {
  const expected = normalizeSpecialSpaceTypeId(specialSpaceTypeId)
  if (!expected) return false
  return deriveSpecialSpaceType(space) === expected
}

export function deriveSpecialSpaceTypeDisplay(spaceOrType = {}) {
  const id = typeof spaceOrType === "string"
    ? normalizeSpecialSpaceTypeId(spaceOrType)
    : deriveSpecialSpaceType(spaceOrType)
  return id ? SPECIAL_SPACE_TYPE_BY_ID.get(id) || null : null
}
