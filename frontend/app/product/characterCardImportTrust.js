const SAVED_FIELD_DEFINITIONS = [
  { id: 'name', label: '名称' },
  { id: 'description', label: '角色描述' },
  { id: 'personality', label: '性格设定' },
  { id: 'scenario', label: '场景设定' },
  { id: 'system_prompt', label: '角色指令' },
  { id: 'first_mes', label: '开场白' },
  { id: 'mes_example', label: '示例对话' },
  { id: 'alternate_greetings', label: '备用开场白', kind: 'list' },
  { id: 'tags', label: '标签', kind: 'list' },
  { id: 'avatar', label: '头像/立绘' },
  { id: 'sprites', label: '表情立绘', kind: 'object' },
  { id: 'appearance', label: '外貌参数', kind: 'object' },
  { id: 'talkativeness', label: '群聊活跃度', kind: 'number' },
  { id: 'gender', label: '性别枚举' },
]

const REVIEW_FIELD_DEFINITIONS = [
  { id: 'creator_notes', label: '创作者备注', detail: '仅用于人工核对；当前不会作为角色字段自动保存。' },
  { id: 'post_history_instructions', label: '历史后置指令', detail: 'FableSpace 当前没有独立字段承载它；请手动并入角色指令或提示词块。' },
  { id: 'creator', label: '创作者署名', detail: '可人工保留在描述/备注中；当前不会影响 NPC 运行。' },
  { id: 'character_version', label: '角色版本', detail: '可人工记录；当前不会创建版本历史。' },
  { id: 'extensions', label: '扩展字段', detail: '第三方扩展不会自动执行，避免把未知脚本/预设当作平台能力。', kind: 'object' },
]

const EXTRA_WORLD_INFO_FIELDS = [
  'probability',
  'disable',
  'keys_secondary',
  'comment',
  'case_sensitive',
  'position',
  'extensions',
]

/**
 * Returns the SillyTavern `data` object when present, otherwise the payload itself.
 * @param {object} rawCard - Raw JSON extracted from a SillyTavern card.
 * @returns {object} Card data object used for compatibility inspection.
 */
function getCardData(rawCard) {
  if (!rawCard || typeof rawCard !== 'object') return {}
  const data = rawCard.data
  return data && typeof data === 'object' ? data : rawCard
}

/**
 * Checks whether a field carries a meaningful value for owner-facing summaries.
 * @param {unknown} value - Candidate field value.
 * @param {string} kind - Optional value kind hint.
 * @returns {boolean} True when the field should be shown as mapped/reviewable.
 */
function hasMeaningfulValue(value, kind = '') {
  if (Array.isArray(value)) return value.length > 0
  if (kind === 'object') return value && typeof value === 'object' && Object.keys(value).length > 0
  if (kind === 'number') return Number.isFinite(Number(value))
  if (value && typeof value === 'object') return Object.keys(value).length > 0
  return String(value ?? '').trim().length > 0
}

/**
 * Produces a short non-secret detail string for a mapped field.
 * @param {unknown} value - Field value.
 * @param {string} kind - Optional value kind hint.
 * @returns {string} Count/status text safe for UI display.
 */
function describeMappedValue(value, kind = '') {
  if (Array.isArray(value)) return `${value.length} 项`
  if (kind === 'object' && value && typeof value === 'object') return `${Object.keys(value).length} 个键`
  if (kind === 'number') return `值 ${Number(value).toFixed(2).replace(/\.00$/, '')}`
  return '已识别'
}

/**
 * Reads world-info entries from raw SillyTavern data or normalized FableSpace card data.
 * @param {object} rawCard - Raw card payload.
 * @param {object} normalizedCard - Frontend-normalized character payload.
 * @returns {Array<object>} Candidate world-info entries.
 */
function collectWorldInfoEntries(rawCard, normalizedCard) {
  const data = getCardData(rawCard)
  if (Array.isArray(data.character_book?.entries)) return data.character_book.entries
  if (Array.isArray(data.world_info)) return data.world_info
  if (Array.isArray(normalizedCard?.world_info)) return normalizedCard.world_info
  return []
}

/**
 * Detects whether imported lorebook entries contain fields outside the current save mapping.
 * @param {Array<object>} entries - Candidate world-info entries.
 * @returns {boolean} True when manual compatibility review is useful.
 */
function hasExtraWorldInfoFields(entries) {
  return entries.some((entry) => (
    entry && typeof entry === 'object' && EXTRA_WORLD_INFO_FIELDS.some((field) => field in entry)
  ))
}

/**
 * Builds an owner-facing compatibility report for a pending character card import.
 * @param {object} params
 * @param {object} params.rawCard - Raw JSON extracted from JSON/PNG card.
 * @param {object} params.normalizedCard - FableSpace-normalized character data.
 * @param {string} params.sourceName - Uploaded source filename.
 * @returns {object} Report with mapped fields, review notes, counts and source summary.
 */
export function buildCharacterCardImportTrustReport({ rawCard, normalizedCard, sourceName = '' }) {
  const data = getCardData(rawCard)
  const worldInfoEntries = collectWorldInfoEntries(rawCard, normalizedCard)
  const mappedItems = SAVED_FIELD_DEFINITIONS
    .filter((field) => hasMeaningfulValue(normalizedCard?.[field.id], field.kind))
    .map((field) => ({
      id: field.id,
      label: field.label,
      detail: describeMappedValue(normalizedCard?.[field.id], field.kind),
    }))

  const reviewItems = REVIEW_FIELD_DEFINITIONS
    .filter((field) => hasMeaningfulValue(data[field.id], field.kind))
    .map((field) => ({
      id: field.id,
      label: field.label,
      detail: field.detail,
      level: 'warning',
    }))

  if (worldInfoEntries.length > 0) {
    reviewItems.unshift({
      id: 'world_info',
      label: '世界书 / Character Book',
      detail: `${worldInfoEntries.length} 条会随角色导入到空间 WorldInfo；导入后请核对关键词、触发深度与公开边界。`,
      level: 'info',
    })
  }

  if (hasExtraWorldInfoFields(worldInfoEntries)) {
    reviewItems.push({
      id: 'world_info_extra_fields',
      label: '世界书扩展字段',
      detail: '检测到 probability / disable / extensions 等扩展；当前只保证基础字段映射，扩展语义需人工复核。',
      level: 'warning',
    })
  }

  if (!hasMeaningfulValue(normalizedCard?.first_mes)) {
    reviewItems.push({
      id: 'missing_first_mes',
      label: '缺少开场白',
      detail: '角色仍可导入，但访客进入后可能不知道如何开局；建议补一段场景化 first_mes。',
      level: 'warning',
    })
  }

  return {
    sourceName,
    sourceFormat: String(rawCard?.spec || rawCard?.spec_version || 'SillyTavern / JSON').trim(),
    characterName: normalizedCard?.name || data.name || '未命名角色',
    mappedItems,
    reviewItems,
    counts: {
      mapped: mappedItems.length,
      review: reviewItems.length,
      worldInfo: worldInfoEntries.length,
      alternateGreetings: Array.isArray(normalizedCard?.alternate_greetings)
        ? normalizedCard.alternate_greetings.length
        : 0,
    },
  }
}

/**
 * Creates the payload sent to the existing import endpoint without discarding raw card metadata.
 * @param {object} rawCard - Original card JSON when available.
 * @param {object} normalizedCard - Parsed FableSpace character data fallback.
 * @returns {object} Import payload accepted by the backend.
 */
export function buildCharacterCardImportPayload(rawCard, normalizedCard) {
  if (rawCard && typeof rawCard === 'object' && Object.keys(rawCard).length > 0) {
    return rawCard
  }
  const fallback = { ...(normalizedCard || {}) }
  if (Array.isArray(fallback.world_info) && fallback.world_info.length > 0 && !fallback.character_book) {
    fallback.character_book = { entries: fallback.world_info }
  }
  return fallback
}

/**
 * Produces a filesystem-safe filename for downloaded character-card JSON.
 * @param {object} character - Saved character object.
 * @returns {string} Suggested `.json` filename.
 */
export function createCharacterCardExportFilename(character = {}) {
  const base = String(character.name || character.id || 'fablespace-character')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'fablespace-character'
  return `${base}.sillytavern-card.json`
}
