const INTENT_TAGS = [
  { id: 'workflow-clinic', label: '流程诊所', keywords: ['流程', 'workflow-clinic', '流程问诊', 'SOP'] },
  { id: 'industry-desk', label: '行业工位', keywords: ['行业', 'industry', '招聘', '教培', '房产', '跨境'] },
  { id: 'needs-counter', label: '需求吧台', keywords: ['需求', 'needs-counter', '咨询', '前台'] },
  { id: 'archive-study', label: '档案书房', keywords: ['档案', 'archive', '知识库', '资料', 'SOP'] },
  { id: 'creation-workshop', label: '创作工坊', keywords: ['创作', 'creation', 'brief', '方案', '短剧'] },
  { id: 'companion-beacon', label: '陪伴灯塔', keywords: ['陪伴', 'companion', '援助', '回访', '医院'] },
  { id: 'gossip-lounge', label: '闲谈八卦', keywords: ['八卦', 'gossip', '新闻', '吃瓜', '聊天', '闲谈'] },
]

function collectPublicText(space = {}) {
  return [
    space.name,
    space.description,
    space.scene_prompt,
    ...(space.characters || []).flatMap((character) => [character.name, character.description, ...(character.tags || [])]),
    ...(space.gameplay_definitions || []).flatMap((gameplay) => [gameplay.id, gameplay.title, gameplay.summary, gameplay.entry_label]),
    ...(space.skill_packs || []).flatMap((pack) => [pack.id, pack.title, pack.summary]),
  ].filter((value) => typeof value === 'string').join(' ').toLowerCase()
}

export function buildSpaceIntentTags(space = {}) {
  const text = collectPublicText(space)
  if (!text) return []
  return INTENT_TAGS.filter((tag) => tag.keywords.some((keyword) => text.includes(keyword.toLowerCase())))
    .slice(0, 2)
    .map((tag) => ({ ...tag, helper: '店主确认的帮助意图' }))
}

export function getSpaceIntentTagsSearchText(tags = []) {
  return tags.map((tag) => `${tag.label} ${tag.helper}`).join(' ')
}
