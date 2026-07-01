export const DIGITAL_HUMAN_STUDIO_TYPE_ID = "digital-human-studio"

export const DIGITAL_HUMAN_DRAFT_STYLE_TAGS = [
  "数字人档案",
  "视频出镜",
  "短剧角色",
  "口播",
  "可迁移身份",
]

export const DIGITAL_HUMAN_DRAFT_FORBIDDEN = [
  "不要现实名人或他人肖像复刻",
  "不要声称未经确认的本人授权",
  "不要索取手机号、身份证、私人地址或服务密钥",
  "不要直接生成真人视频、语音克隆或深度伪造",
]

function toText(value) {
  return typeof value === "string" ? value.trim() : ""
}

function splitTextItems(value) {
  if (Array.isArray(value)) return value.map((item) => toText(String(item || ""))).filter(Boolean)
  return toText(value)
    .split(/[,，\r\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function firstSentence(value) {
  return toText(value).split(/[。；;\n]/).map((item) => item.trim()).find(Boolean) || ""
}

function firstFilled(values, fallback) {
  return values.map(firstSentence).find(Boolean) || fallback
}

export function isDigitalHumanStudioType(value) {
  return toText(value).toLowerCase().replace(/_/g, "-") === DIGITAL_HUMAN_STUDIO_TYPE_ID
}

export function normalizeDigitalHumanTags(character = {}) {
  const tags = splitTextItems(character.tags)
  const textTags = splitTextItems(character.tags_text)
  const unique = []
  ;[...tags, ...textTags].forEach((tag) => {
    if (tag && !unique.includes(tag)) unique.push(tag)
  })
  return unique
}

export function buildDigitalHumanIdentityPack(character = {}) {
  const name = toText(character.name) || "未命名数字人"
  const tags = normalizeDigitalHumanTags(character)
  const appearance = character.appearance && typeof character.appearance === "object" ? character.appearance : {}
  const description = toText(character.description)
  const personality = toText(character.personality)
  const scenario = toText(character.scenario)
  const systemPrompt = toText(character.system_prompt)
  const firstMes = toText(character.first_mes)
  const mesExample = toText(character.mes_example)
  const appearanceNote = toText(appearance.note)
  const activeLook = toText(appearance.active_preset_id)

  const oneLine = `${name}｜${firstFilled(
    [description, personality, scenario],
    "一个待完善的可迁移数字人档案。",
  )}`
  const role = firstFilled(
    [description, scenario],
    `以「${name}」身份出镜、对话或进入角色卡场景的数字分身。`,
  )
  const visualStyle = firstFilled(
    [
      appearanceNote,
      activeLook ? `外观预设：${activeLook}` : "",
      description,
    ],
    "统一头像、服化道和镜头风格；避免复刻未授权真人或现实名人。",
  )
  const voiceStyle = firstFilled(
    [personality, firstMes, mesExample],
    "自然短句、稳定口吻、先确认边界再进入表演。",
  )
  const sceneHook = firstFilled(
    [scenario],
    "数字人制作酒馆中的访谈桌：先整理身份、用途、口吻和禁忌，再迁移到视频或角色卡。",
  )
  const boundary = firstFilled(
    [systemPrompt],
    "尊重授权和隐私；不冒充未授权真人；不索取手机号、私人地址、身份证或服务密钥。",
  )
  const opening = firstMes || `大家好，我是${name}。今天我会用一个清晰、可复用的身份和你见面。`
  const tagsLine = tags.length ? tags.join(" / ") : "数字人 / 可迁移档案 / 视频出镜"
  const fableSpaceAdapter = [
    `角色名：${name}`,
    `简介：${description || role}`,
    `性格 / 口吻：${personality || voiceStyle}`,
    `场景：${scenario || sceneHook}`,
    `边界：${systemPrompt || boundary}`,
    `开场白：${opening}`,
  ].join("\n")
  const videoPrompt = [
    "# 数字人视频 / 短剧出镜 Prompt",
    "",
    `角色名称：${name}`,
    `一句话定位：${oneLine}`,
    `出镜身份：${role}`,
    `外观 / 服化道风格：${visualStyle}`,
    `口吻 / 节奏：${voiceStyle}`,
    `短视频场景建议：${sceneHook}`,
    `标签：${tagsLine}`,
    "",
    "示例口播 / 对白：",
    opening,
    "",
    "禁忌与授权边界：",
    boundary,
    "",
    "使用方式：把这段作为视频脚本、口播、短剧角色或外部生成工具的人设说明；FableSpace 只生成文本档案，不直接生成视频、语音克隆或真人影像。",
  ].join("\n")

  return {
    name,
    tags,
    oneLine,
    role,
    visualStyle,
    voiceStyle,
    sceneHook,
    boundary,
    opening,
    fableSpaceAdapter,
    videoPrompt,
  }
}

export function buildDigitalHumanVideoPrompt(character = {}) {
  return buildDigitalHumanIdentityPack(character).videoPrompt
}
