import { normalizeGender } from '../lib/gender.js'

export const MAX_NPC_BATCH_IMPORT_SIZE = 12
export const BACKGROUND_NPC_TAG = '背景NPC'

export const NPC_BATCH_IMPORT_EXAMPLE = [
  '夜班灯叔 | 总在角落调暗霓虹灯的背景店员 | 后勤, 低干扰',
  '雨巷信使 | 偶尔送来街区传闻的跑腿人 | 消息, 街区',
  '猫耳清洁工 | 只在需要时插一句吐槽的安静同伴 | 猫系, 氛围',
].join('\n')

function toText(value) {
  return typeof value === 'string' ? value : ''
}

function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => toText(item).trim())
      .filter(Boolean)
  }
  return toText(value)
    .split(/[,，\r\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function unique(items) {
  const seen = new Set()
  return items.filter((item) => {
    const key = String(item || '').trim()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function cleanSpriteMap(sprites) {
  if (!sprites || typeof sprites !== 'object' || Array.isArray(sprites)) return {}
  return Object.fromEntries(
    Object.entries(sprites)
      .map(([key, value]) => [String(key).trim(), String(value || '').trim()])
      .filter(([key, value]) => key && value),
  )
}

function normalizeTalkativeness(value, fallback = 0.35) {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, Math.min(1, parsed))
}

function getCardData(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) return raw.data
  return raw
}

function extractJsonRecords(parsed) {
  if (Array.isArray(parsed)) return parsed
  if (!parsed || typeof parsed !== 'object') return null
  if (Array.isArray(parsed.characters)) return parsed.characters
  if (Array.isArray(parsed.cards)) return parsed.cards
  if (Array.isArray(parsed.character_cards)) return parsed.character_cards
  const data = getCardData(parsed)
  if (data.name || data.description || data.first_mes) return [parsed]
  return null
}

export function createBackgroundNpcDraft({ name, description = '', tags = [] }) {
  const cleanName = toText(name).trim()
  if (!cleanName) {
    throw new Error('背景 NPC 名称不能为空')
  }
  const cleanDescription = toText(description).trim()
  return {
    name: cleanName,
    description: cleanDescription || `${cleanName} 是店主批量添加的背景 NPC，用来补足空间里的日常人声和氛围。`,
    personality: '低干扰、短句回应、只在被点名或适合补充氛围时说话，不抢主角 NPC 的戏份。',
    scenario: '你是这个真实坐标空间里的背景成员，负责让空间更有生活气息；所有内容仍以店主后续确认的设定为准。',
    gender: 'unspecified',
    system_prompt: '你是店主确认加入空间的背景 NPC。保持简短、克制、可被忽略；不要擅自扩写空间正史、替店主发布新设定，或引导访客进入无边界社交/战斗/付费流程。',
    first_mes: `我是${cleanName}，先在旁边照看气氛。需要我搭句话时，叫我就好。`,
    mes_example: '',
    alternate_greetings: [],
    tags: unique([BACKGROUND_NPC_TAG, ...normalizeStringList(tags)]),
    avatar: '',
    appearance: {},
    talkativeness: 0.25,
    sprites: {},
  }
}

export function normalizeNpcBatchCharacter(raw, index = 0) {
  const data = getCardData(raw)
  const name = toText(data.name).trim() || `未命名背景 NPC ${index + 1}`
  return {
    name,
    description: toText(data.description).trim(),
    personality: toText(data.personality).trim(),
    scenario: toText(data.scenario).trim(),
    gender: normalizeGender(data.gender),
    system_prompt: toText(data.system_prompt).trim(),
    first_mes: toText(data.first_mes).trim(),
    mes_example: toText(data.mes_example).trim(),
    alternate_greetings: normalizeStringList(data.alternate_greetings),
    tags: unique(normalizeStringList(data.tags)),
    avatar: toText(data.avatar).trim(),
    appearance: data.appearance && typeof data.appearance === 'object' && !Array.isArray(data.appearance)
      ? data.appearance
      : {},
    talkativeness: normalizeTalkativeness(data.talkativeness, 0.5),
    sprites: cleanSpriteMap(data.sprites),
  }
}

function parseTextLine(line) {
  const cleanLine = toText(line).trim().replace(/^[-*]\s*/, '')
  if (!cleanLine) return null
  const [namePart, descriptionPart = '', tagsPart = ''] = cleanLine
    .split('|')
    .map((part) => part.trim())
  if (!namePart) return null
  return createBackgroundNpcDraft({
    name: namePart,
    description: descriptionPart,
    tags: tagsPart,
  })
}

export function parseNpcBatchInput(input) {
  const text = toText(input).trim()
  if (!text) {
    throw new Error('请先粘贴 JSON 数组，或按“名称 | 描述 | 标签”每行填写背景 NPC。')
  }

  let characters = null
  let source = 'text'

  try {
    const records = extractJsonRecords(JSON.parse(text))
    if (records) {
      characters = records.map((record, index) => normalizeNpcBatchCharacter(record, index))
      source = 'json'
    }
  } catch {
    characters = null
  }

  if (!characters) {
    characters = text
      .split(/\r?\n/)
      .map(parseTextLine)
      .filter(Boolean)
  }

  const cleaned = characters.filter((character) => toText(character.name).trim())
  if (cleaned.length === 0) {
    throw new Error('没有解析到可创建的 NPC。请检查名称字段或每行格式。')
  }
  if (cleaned.length > MAX_NPC_BATCH_IMPORT_SIZE) {
    throw new Error(`一次最多确认创建 ${MAX_NPC_BATCH_IMPORT_SIZE} 个背景 NPC，请拆分后再导入。`)
  }

  return {
    source,
    count: cleaned.length,
    characters: cleaned,
  }
}
