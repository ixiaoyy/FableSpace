export const DEFAULT_OWNER_PREVIEW_MESSAGE = '如果我是第一次进店的访客，你会怎么打招呼？'

function toText(value) {
  return typeof value === 'string' ? value : ''
}

function firstSegment(value, fallback = '') {
  return toText(value)
    .split(/[。！？!?；;\n]/)
    .map((item) => item.trim())
    .find(Boolean) || fallback
}

function clampText(value, maxLength = 80) {
  const text = toText(value).trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}…`
}

export function redactSensitivePreviewText(value) {
  return toText(value)
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, '[已隐藏 API Key]')
    .replace(/(api[_-]?key\s*[:=]\s*)[^\s,;，；]+/gi, '$1[已隐藏]')
    .replace(/(authorization\s*[:=]\s*bearer\s+)[^\s,;，；]+/gi, '$1[已隐藏]')
}

export function summarizePreviewCharacter(character = {}) {
  const name = toText(character.name).trim() || '未命名 NPC'
  const tags = Array.isArray(character.tags) ? character.tags.filter(Boolean).slice(0, 4) : []
  const fieldCoverage = [
    ['描述', character.description],
    ['性格', character.personality],
    ['场景', character.scenario],
    ['开场白', character.first_mes],
    ['边界指令', character.system_prompt],
  ].map(([label, value]) => ({ label, done: Boolean(toText(value).trim()) }))

  return {
    name,
    tags,
    tone: clampText(firstSegment(character.personality, '暂未填写性格，建议先补充口吻。'), 80),
    setting: clampText(firstSegment(character.scenario, '暂未填写场景，模拟会更偏通用。'), 80),
    hasBoundaryInstruction: Boolean(toText(character.system_prompt).trim()),
    fieldCoverage,
  }
}

export function buildOwnerDialoguePreview({ tavern = {}, character = {}, visitorMessage = '' } = {}) {
  const summary = summarizePreviewCharacter(character)
  const message = redactSensitivePreviewText(visitorMessage).trim() || DEFAULT_OWNER_PREVIEW_MESSAGE
  const tavernName = toText(tavern.name).trim() || '当前酒馆'
  const firstGreeting = clampText(firstSegment(character.first_mes, `欢迎来到${tavernName}`), 72)
  const tone = clampText(firstSegment(character.personality, '保持简短、克制、贴合店主已写设定'), 72)
  const setting = clampText(firstSegment(character.scenario, `${tavernName}的日常场景`), 72)
  const messageEcho = clampText(message, 52)
  const boundaryLine = summary.hasBoundaryInstruction
    ? '会遵守已配置的边界指令，但本预览不会展开隐藏 prompt。'
    : '尚未配置边界指令，建议保存前补充 system_prompt。'

  return {
    ok: Boolean(summary.name),
    preview_only: true,
    persisted: false,
    llm_called: false,
    history_written: false,
    writeback_written: false,
    provider_cost: 'none',
    tavern_name: tavernName,
    character_name: summary.name,
    visitor_message: message,
    assistant_message: `${summary.name}会先接住“${messageEcho}”，用「${tone}」的口吻回应，并把语境落在「${setting}」。可参考开场气质：“${firstGreeting}”。`,
    prompt_summary: {
      character_name: summary.name,
      tone: summary.tone,
      setting: summary.setting,
      has_boundary_instruction: summary.hasBoundaryInstruction,
      tags: summary.tags,
    },
    notes: [
      '本地模拟：不调用 LLM，不消耗店主 provider token。',
      '不会写入 chat history、访客记忆、writeback 或公开 Tavern payload。',
      boundaryLine,
    ],
  }
}

export function normalizeOwnerDialogueDryRunPreview(payload = {}, fallback = null) {
  const dryRun = Boolean(payload.dry_run)
  const persisted = Boolean(payload.persisted)
  const assistant = toText(payload.assistant_message).trim()
  const fallbackPreview = fallback || {}
  const notes = Array.isArray(payload.notes) && payload.notes.length
    ? payload.notes
    : [
        '后端 dry-run：已组装真实 Tavern / NPC / WorldInfo prompt。',
        'persisted=false：不会写入 chat history、记忆、visitor state 或 writeback。',
      ]

  return {
    ...fallbackPreview,
    ok: payload.ok !== false,
    preview_only: true,
    dry_run: dryRun,
    persisted,
    llm_called: Boolean(payload.model_called),
    model_called: Boolean(payload.model_called),
    model_requested: Boolean(payload.model_requested),
    history_written: Boolean(payload.history_written),
    memory_written: Boolean(payload.memory_written),
    writeback_written: Boolean(payload.writeback_written),
    visitor_state_written: Boolean(payload.visitor_state_written),
    provider_cost: Number(payload.token_estimate || 0) > 0 ? `token_estimate:${payload.token_estimate}` : 'none',
    token_estimate: Number(payload.token_estimate || 0),
    model_status: toText(payload.model_status) || (payload.model_called ? 'called' : 'not_requested'),
    model_error: toText(payload.model_error),
    tavern_name: fallbackPreview.tavern_name,
    character_name: toText(payload.character_name) || fallbackPreview.character_name,
    visitor_message: toText(payload.message) || fallbackPreview.visitor_message || DEFAULT_OWNER_PREVIEW_MESSAGE,
    assistant_message: assistant || '已完成后端 prompt dry-run；本次未调用模型，因此没有真实模型回复。',
    messages: Array.isArray(payload.messages) ? payload.messages : [],
    message_count: Number(payload.message_count || 0),
    matched_world_info_count: Number(payload.matched_world_info_count || 0),
    matched_world_info: Array.isArray(payload.matched_world_info) ? payload.matched_world_info : [],
    prompt_summary: {
      ...(fallbackPreview.prompt_summary || {}),
      ...(payload.prompt_summary || {}),
    },
    notes,
  }
}
