/**
 * FableMap Place Protocol — 定义地点的前后端数据结构
 *
 * 地点协议将一个 POI 分解为四层视图：
 * - PlaceSummary:      地图列表/摘要视图使用的最小信息
 * - PlaceDetail:       地点详情面板使用的完整静态信息
 * - PlaceState:        当前玩家与地点的互动状态（动态）
 * - PlaceMemory:       地点累积记忆（跨玩家）
 *
 * 字段命名规则：
 * - 以 "real_" 为前缀的字段：来自真实世界数据（OSM）
 * - 以 "fantasy_" 为前缀的字段：幻想语义转换结果
 * - 以 "player_" 为前缀的字段：玩家个人状态
 * - 无前缀的字段：跨玩家共享的派生数据
 */

/**
 * @typedef {Object} PlacePosition
 * @property {number} lat
 * @property {number} lon
 */

/**
 * @typedef {Object} PlaceSummary
 * @property {string} id - 稳定标识
 * @property {string} fantasy_name - 幻想名称
 * @property {string} fantasy_type - 幻想类型，如 healing_sanctum
 * @property {string} faction_alignment - 阵营倾向
 * @property {PlacePosition} position - 经纬度
 * @property {string} satire_hook - 讽刺钩子（一句话）
 * @property {string} emotion_hook - 情绪钩子（一句话）
 */

/**
 * @typedef {Object} PlaceDetail
 * @property {string} id
 * @property {string} osm_type - 原始 OSM 类别
 * @property {string} real_name - 真实地点名称
 * @property {string} fantasy_name - 幻想名称
 * @property {string} fantasy_type - 幻想类型
 * @property {string} description - 叙事描述
 * @property {string} satire_hook - 现实讽刺钩子
 * @property {string} emotion_hook - 情绪触发点
 * @property {string} faction_alignment - 阵营
 * @property {PlacePosition} position
 * @property {string[]} tags - 扩展标签
 * @property {boolean} secret_slot - 是否支持私密留痕
 * @property {boolean} sprite_spawn_hint - 是否可能产出精灵
 */

/**
 * @typedef {Object} PlaceState
 * 玩家与地点的当前互动状态
 * @property {string} poi_id
 * @property {number} visit_count - 玩家访问次数
 * @property {number} dwell_seconds - 累计驻足时长（秒）
 * @property {number} familiarity - 熟悉度 0.0–1.0
 * @property {number} mark_count - 玩家留下的标记数
 * @property {number} echo_count - 地点回声数
 * @property {number} relationship_strength - 关系强度 0.0–1.0
 * @property {'unexplored'|'observed'|'dwelling'|'marked'|'familiar'|'home'} relationship_stage
 */

/**
 * @typedef {Object} PlaceStats
 * 地点统计（按类型/阵营聚合）
 * @property {number} total
 * @property {Object.<string, number>} by_type
 * @property {Object.<string, number>} by_faction
 */

/**
 * @typedef {Object} PlaceMemory
 * 地点累积记忆（跨玩家）
 * @property {string} poi_id
 * @property {number} total_observers - 总观察者数
 * @property {number} unique_visitors - 独立访客数
 * @property {string|null} dominant_emotion - 主导情绪
 * @property {number} world_density - 世界密度
 */

// ─────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────

/**
 * 计算地点关系阶段标签
 * @param {number} familiarity
 * @param {number} visit_count
 * @returns {string}
 */
export function getRelationshipStage(familiarity, visit_count) {
  if (visit_count === 0) return 'unexplored'
  if (familiarity >= 0.8) return 'home'
  if (familiarity >= 0.5) return 'familiar'
  if (familiarity >= 0.2) return 'marked'
  if (visit_count >= 1) return 'observed'
  return 'dwelling'
}

/**
 * 格式化熟悉度为可读标签
 * @param {number} familiarity
 * @returns {string}
 */
export function formatFamiliarity(familiarity) {
  if (familiarity >= 0.8) return '家'
  if (familiarity >= 0.5) return '熟悉'
  if (familiarity >= 0.2) return '有痕'
  if (familiarity > 0) return '来过'
  return '新到'
}

/**
 * 格式化驻足时长
 * @param {number} seconds
 * @returns {string}
 */
export function formatDwellTime(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}秒`
  if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`
  return `${(seconds / 3600).toFixed(1)}小时`
}

/**
 * 计算地点统计（按类型和阵营聚合）
 * @param {PlaceDetail[]} pois
 * @returns {PlaceStats}
 */
export function computePlaceStats(pois) {
  const by_type = {}
  const by_faction = {}

  for (const poi of pois) {
    const type = poi.fantasy_type || 'unknown'
    const faction = poi.faction_alignment || 'neutral'
    by_type[type] = (by_type[type] || 0) + 1
    by_faction[faction] = (by_faction[faction] || 0) + 1
  }

  return {
    total: pois.length,
    by_type,
    by_faction,
  }
}

/**
 * 将 POI 静态数据与地点状态合并为 PlaceDetail
 * @param {Object} poi - world.pois 中的 POI 对象
 * @param {Object} poi_state - poi_states 中对应的状态对象（可选）
 * @param {number} player_familiarity - 玩家熟悉度（可选）
 * @returns {PlaceDetail}
 */
export function enrichPlaceDetail(poi, poi_state, player_familiarity) {
  return {
    ...poi,
    // 动态状态（如果有）
    visit_count: poi_state?.visit_count ?? 0,
    dwell_seconds: poi_state?.dwell_seconds ?? 0,
    familiarity: player_familiarity ?? poi_state?.familiarity ?? 0,
    mark_count: poi_state?.mark_count ?? 0,
    echo_count: poi_state?.echo_count ?? 0,
    relationship_strength: poi_state?.relationship_strength ?? 0,
    relationship_stage: poi_state
      ? getRelationshipStage(poi_state.familiarity ?? 0, poi_state.visit_count ?? 0)
      : 'unexplored',
  }
}

/**
 * 获取地点类型的 emoji 映射
 * @param {string} fantasy_type
 * @returns {string}
 */
export function getPlaceTypeEmoji(fantasy_type) {
  const map = {
    healing_sanctum: '🏥',
    supply_outpost: '🏪',
    judgement_tower: '🏛️',
    ember_parlor: '☕',
    lore_academy: '🏫',
    whispering_grove: '🌳',
    spirit_anchor: '⚡',
    forgotten_shrine: '🗿',
    market_hall: '🏬',
    transit_node: '🚉',
    default: '📍',
  }
  return map[fantasy_type] || map.default
}

/**
 * 获取地点关系阶段的描述
 * @param {string} stage
 * @returns {string}
 */
export function getRelationshipStageLabel(stage) {
  const map = {
    unexplored: '新到',
    observed: '已观察',
    dwelling: '驻足中',
    marked: '有痕迹',
    familiar: '熟悉',
    home: '归属',
  }
  return map[stage] || stage
}

/**
 * 获取关系强度的颜色
 * @param {number} strength - 0.0 to 1.0
 * @returns {string} CSS color
 */
export function getRelationshipColor(strength) {
  if (strength >= 0.7) return '#22c55e' // green
  if (strength >= 0.4) return '#f59e0b' // amber
  if (strength > 0) return '#3b82f6' // blue
  return '#94a3b8' // gray
}
