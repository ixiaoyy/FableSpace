/**
 * FableMap Character Engine — 角色引擎 MVP
 *
 * 定义角色(persona)的前端数据结构和服务函数。
 * 角色可以是：
 * - 势力代表（从 world.factions 派生）
 * - 历史回声中的角色
 * - 精灵/都市生物
 *
 * 数据来源优先级：
 * 1. world.factions — 势力/组织
 * 2. world.historical_echoes — 历史角色
 * 3. world.sprites — 都市精灵
 * 4. writeback history — 玩家互动中产生的角色痕迹
 */

// ─────────────────────────────────────────────
// 类型定义
// ─────────────────────────────────────────────

/**
 * 角色身份信息
 * @typedef {Object} CharacterIdentity
 * @property {string} id - 唯一标识
 * @property {string} name - 显示名称
 * @property {string} source - 数据来源: 'faction' | 'echo' | 'sprite' | 'memory'
 * @property {string} archetype - 原型: 'merchant' | 'scholar' | 'healer' | 'guardian' | 'wanderer' | 'spirit' | 'unknown'
 */

/**
 * 角色当前情绪
 * @typedef {Object} CharacterMood
 * @property {string} tone - 情绪色调: 'warm' | 'curious' | 'wary' | 'neutral' | 'hostile' | 'reverent'
 * @property {number} intensity - 强度 0.0–1.0
 * @property {string} description - 情绪描述
 */

/**
 * 角色议程
 * @typedef {Object} CharacterAgenda
 * @property {string} type - 议程类型: 'trade' | 'guard' | 'teach' | 'heal' | 'witness' | 'wander' | 'none'
 * @property {string} description - 议程描述
 * @property {number} urgency - 紧急程度 0.0–1.0
 * @property {string} trigger_hint - 触发提示
 */

/**
 * 玩家与角色的关系状态
 * @typedef {Object} CharacterRelationship
 * @property {number} strength - 关系强度 0.0–1.0
 * @property {string} stage - 关系阶段: 'stranger' | 'acquaintance' | 'known' | 'trusted' | 'allied'
 * @property {number} encounter_count - 遭遇次数
 * @property {string} last_encounter - 最近互动摘要
 * @property {number} trust_delta - 信任变化 (+/-)
 */

/**
 * 角色记忆（跨玩家共享）
 * @typedef {Object} CharacterMemory
 * @property {string} character_id
 * @property {number} total_observers - 见过此角色的总人数
 * @property {number} resident_visits - 驻足次数总计
 * @property {string} dominant_interaction - 主导互动类型
 */

/**
 * 完整角色对象
 * @typedef {Object} Character
 * @property {string} id
 * @property {string} name
 * @property {string} source
 * @property {string} archetype
 * @property {CharacterMood} mood
 * @property {CharacterAgenda} agenda
 * @property {CharacterRelationship} relationship
 * @property {CharacterMemory} memory
 * @property {string|null} faction_id - 所属势力 ID
 * @property {string} faction_name - 所属势力名称
 * @property {string} description - 角色描述（来自势力 doctrine 或 echo summary）
 * @property {string[]} tags - 角色标签
 */

// ─────────────────────────────────────────────
// 常量映射
// ─────────────────────────────────────────────

const FACTION_ARCHETYPE_MAP = {
  trade_guild: 'merchant',
  order_bureau: 'guardian',
  clinic_circle: 'healer',
  memory_collective: 'scholar',
  night_bloom: 'wanderer',
  neutral: 'unknown',
}

const MOOD_TONE_MAP = {
  warm: { tone: 'warm', intensity: 0.8, description: '热情友善' },
  curious: { tone: 'curious', intensity: 0.6, description: '好奇观望' },
  respectful: { tone: 'warm', intensity: 0.7, description: '敬重有礼' },
  wary: { tone: 'wary', intensity: 0.5, description: '谨慎保留' },
  silent: { tone: 'neutral', intensity: 0.3, description: '沉默疏离' },
  hostile: { tone: 'hostile', intensity: 0.9, description: '敌对警惕' },
  reverent: { tone: 'reverent', intensity: 0.75, description: '敬畏虔诚' },
}

const RELATIONSHIP_STAGES = [
  { threshold: 0.8, stage: 'allied' },
  { threshold: 0.5, stage: 'trusted' },
  { threshold: 0.2, stage: 'known' },
  { threshold: 0.05, stage: 'acquaintance' },
  { threshold: 0, stage: 'stranger' },
]

const AGENDA_TYPE_MAP = {
  merchant: { type: 'trade', description: '在此地进行交易与议价' },
  guardian: { type: 'guard', description: '守护此地免受侵扰' },
  healer: { type: 'heal', description: '疗愈与照护来者' },
  scholar: { type: 'teach', description: '记录与传播此地知识' },
  wanderer: { type: 'wander', description: '在此游荡，见证变迁' },
  spirit: { type: 'witness', description: '以精灵之躯守护此地记忆' },
  unknown: { type: 'none', description: '尚未显现实体' },
}

// ─────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────

/**
 * 从 faction archetype 推导角色原型
 * @param {string} archetype
 * @returns {string}
 */
export function getCharacterArchetype(archetype) {
  return FACTION_ARCHETYPE_MAP[archetype] || 'unknown'
}

/**
 * 从情绪标识获取完整的 Mood 对象
 * @param {string} tone
 * @returns {CharacterMood}
 */
export function getMoodFromTone(tone) {
  return MOOD_TONE_MAP[tone] || MOOD_TONE_MAP.curious
}

/**
 * 计算关系阶段
 * @param {number} strength
 * @returns {string}
 */
export function getRelationshipStage(strength) {
  for (const { threshold, stage } of RELATIONSHIP_STAGES) {
    if (strength >= threshold) return stage
  }
  return 'stranger'
}

/**
 * 获取关系阶段的中文标签
 * @param {string} stage
 * @returns {string}
 */
export function getRelationshipStageLabel(stage) {
  const map = {
    stranger: '陌生',
    acquaintance: '初识',
    known: '相识',
    trusted: '信任',
    allied: '同盟',
  }
  return map[stage] || stage
}

/**
 * 获取关系强度的颜色
 * @param {number} strength
 * @returns {string} CSS color
 */
export function getRelationshipColor(strength) {
  if (strength >= 0.7) return '#22c55e'
  if (strength >= 0.4) return '#f59e0b'
  if (strength > 0) return '#3b82f6'
  return '#94a3b8'
}

/**
 * 从势力派生一个角色
 * @param {Object} faction - world.factions 中的势力对象
 * @param {Object} poi - 当前 POI（可选）
 * @returns {Character}
 */
export function deriveFactionCharacter(faction, poi = null) {
  if (!faction) return null

  const archetype = getCharacterArchetype(faction.archetype || faction.id || 'unknown')
  const agenda = AGENDA_TYPE_MAP[archetype] || AGENDA_TYPE_MAP.unknown
  const mood = getMoodFromTone(faction.emotional_tone || 'curious')

  return {
    id: `faction-${faction.id || 'unknown'}`,
    name: faction.name || '未知势力',
    source: 'faction',
    archetype,
    faction_id: faction.id || null,
    faction_name: faction.name || '',
    description: faction.doctrine || '',
    mood,
    agenda: {
      type: agenda.type,
      description: agenda.description,
      urgency: faction.influence || 0.5,
      trigger_hint: '',
    },
    relationship: {
      strength: 0,
      stage: 'stranger',
      encounter_count: 0,
      last_encounter: '',
      trust_delta: 0,
    },
    memory: {
      character_id: `faction-${faction.id || 'unknown'}`,
      total_observers: 0,
      resident_visits: 0,
      dominant_interaction: 'observation',
    },
    tags: faction.persona_tags || [],
  }
}

/**
 * 计算玩家与某个势力的关系
 * @param {string} faction_alignment - POI 所属势力 ID
 * @param {number} familiarity - 玩家对该地点的熟悉度
 * @param {Object} writebackResult - 写回结果
 * @returns {CharacterRelationship}
 */
export function computeRelationship(faction_alignment, familiarity = 0, writebackResult = null) {
  const baseStrength = familiarity * 0.8
  const writebackBoost = writebackResult ? 0.15 : 0
  const strength = Math.min(1, baseStrength + writebackBoost)
  const stage = getRelationshipStage(strength)
  const encounter_count = writebackResult?.place_state?.visit_count ?? 0

  let trust_delta = 0
  if (writebackResult) {
    const prev = writebackResult?.place_state?.familiarity ?? 0
    trust_delta = familiarity - prev
  }

  let last_encounter = ''
  if (writebackResult?.event?.action) {
    last_encounter = writebackResult.event.action
  } else if (encounter_count > 0) {
    last_encounter = '已观察'
  }

  return {
    strength: Math.round(strength * 1000) / 1000,
    stage,
    encounter_count,
    last_encounter,
    trust_delta: Math.round(trust_delta * 1000) / 1000,
  }
}

/**
 * 为 POI 推导势力角色
 * @param {Object} poi - 当前 POI
 * @param {Object} world - world 对象
 * @param {number} familiarity - 熟悉度
 * @param {Object} writebackResult - 写回结果
 * @returns {Character|null}
 */
export function deriveCharacterForPoi(poi, world = {}, familiarity = 0, writebackResult = null) {
  if (!poi) return null

  const factions = world.factions || []
  const faction = factions.find((f) => f.id === poi.faction_alignment)

  if (!faction) return null

  const character = deriveFactionCharacter(faction, poi)
  character.relationship = computeRelationship(poi.faction_alignment, familiarity, writebackResult)

  return character
}

/**
 * 获取地点关联的角色列表
 * @param {Object} poi - 当前 POI
 * @param {Object} world - world 对象
 * @param {number} familiarity - 熟悉度
 * @param {Object} writebackResult - 写回结果
 * @returns {Character[]}
 */
export function getCharactersForPoi(poi, world = {}, familiarity = 0, writebackResult = null) {
  if (!poi || !world) return []

  const characters = []
  const factions = world.factions || []
  const historicalEchoes = world.historical_echoes || []
  const sprites = world.sprites || []

  // 1. 势力角色
  const faction = factions.find((f) => f.id === poi.faction_alignment)
  if (faction) {
    const character = deriveCharacterForPoi(poi, world, familiarity, writebackResult)
    if (character) characters.push(character)
  }

  // 2. 历史回声中的角色（如果有 linked_pois 关联）
  const linkedEchoes = historicalEchoes.filter(
    (e) => (e.linked_pois || []).includes(poi.id)
  )
  for (const echo of linkedEchoes) {
    characters.push({
      id: `echo-${echo.id}`,
      name: echo.source_type || '历史回声',
      source: 'echo',
      archetype: 'wanderer',
      faction_id: null,
      faction_name: '',
      description: echo.summary || '',
      mood: { tone: 'reverent', intensity: 0.5, description: '历史的回响' },
      agenda: {
        type: 'witness',
        description: echo.trigger_hint || '此地埋藏的历史碎片',
        urgency: echo.severity || 0.3,
        trigger_hint: echo.trigger_hint || '',
      },
      relationship: {
        strength: 0,
        stage: 'stranger',
        encounter_count: 0,
        last_encounter: '',
        trust_delta: 0,
      },
      memory: {
        character_id: `echo-${echo.id}`,
        total_observers: 0,
        resident_visits: 0,
        dominant_interaction: 'observation',
      },
      tags: [echo.source_type || 'history'].filter(Boolean),
    })
  }

  // 3. 精灵角色
  const linkedSprites = sprites.filter(
    (s) => (s.linked_poi || s.linked_pois || []).includes(poi.id)
  )
  for (const sprite of linkedSprites) {
    characters.push({
      id: `sprite-${sprite.id}`,
      name: sprite.species || '都市精灵',
      source: 'sprite',
      archetype: 'spirit',
      faction_id: null,
      faction_name: '',
      description: sprite.drop_tags?.join(' · ') || '',
      mood: { tone: 'curious', intensity: 0.4, description: '灵动的气息' },
      agenda: {
        type: 'none',
        description: `可能产出 ${sprite.rarity || '普通'} 精灵`,
        urgency: 0.2,
        trigger_hint: sprite.spawn_conditions || '',
      },
      relationship: {
        strength: 0,
        stage: 'stranger',
        encounter_count: 0,
        last_encounter: '',
        trust_delta: 0,
      },
      memory: {
        character_id: `sprite-${sprite.id}`,
        total_observers: 0,
        resident_visits: 0,
        dominant_interaction: 'observation',
      },
      tags: [sprite.species, sprite.rarity].filter(Boolean),
    })
  }

  return characters
}
