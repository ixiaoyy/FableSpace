export const DEFAULT_AI_DRAFT_STYLE_TAGS = ['空间 NPC', '招待员', '温暖']
export const DEFAULT_AI_DRAFT_FORBIDDEN = ['不要露骨', '不要现实名人', '不要真实私人地址']

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

export function splitDraftItems(value, fallback = []) {
  const source = Array.isArray(value)
    ? value
    : cleanText(value).split(/[,，\r\n]+/)
  const items = source
    .map((item) => cleanText(String(item || '')))
    .filter(Boolean)
  const unique = []
  items.forEach((item) => {
    if (!unique.includes(item)) unique.push(item)
  })
  return unique.length ? unique : [...fallback]
}

export function createAiCharacterDraftRequest({
  styleTagsText = '',
  forbiddenText = '',
  tone = '',
  defaultStyleTags = DEFAULT_AI_DRAFT_STYLE_TAGS,
  defaultForbidden = DEFAULT_AI_DRAFT_FORBIDDEN,
} = {}) {
  return {
    style_tags: splitDraftItems(styleTagsText, defaultStyleTags),
    forbidden: splitDraftItems(forbiddenText, defaultForbidden),
    tone: cleanText(tone),
  }
}

export function describeCharacterDraftSource(response = {}) {
  const source = cleanText(response.source)
  const label = cleanText(response.source_label)
  const reason = cleanText(response.source_reason)
  if (source === 'owner_llm') {
    return `${label || '店主默认 LLM 草稿'}已放入编辑器；保存前仍需店主审核。`
  }
  if (source === 'local_template_fallback') {
    if (reason === 'owner_llm_failed') {
      return `${label || '本地模板草稿'}已放入编辑器；店主默认 LLM 调用失败，这不是真实 AI 生成，请审核或稍后重试。`
    }
    return `${label || '本地模板草稿'}已放入编辑器；当前没有可用店主默认 LLM，这不是真实 AI 生成，请配置后重试或只当占位。`
  }
  return '草稿已放入编辑器；保存前请店主审核。'
}

export function draftResponseToEditorDraft(response, baseDraft = {}) {
  const draft = response?.draft
  if (!draft || typeof draft !== 'object') {
    throw new Error('AI 草稿返回为空')
  }
  const tags = Array.isArray(draft.tags) ? draft.tags.filter(Boolean) : []
  return {
    ...baseDraft,
    ...draft,
    id: '',
    space_id: '',
    tags_text: tags.join(', '),
    alternate_greetings_text: Array.isArray(draft.alternate_greetings)
      ? draft.alternate_greetings.filter(Boolean).join('\n')
      : cleanText(draft.alternate_greetings),
    avatar: cleanText(draft.avatar) || cleanText(baseDraft.avatar),
    sprites: {
      ...(baseDraft.sprites || {}),
      ...(draft.sprites || {}),
    },
  }
}
