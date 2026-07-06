const ASSISTANT_FORBIDDEN = [
  '不索取真实身份信息、手机号、住址或证件',
  '不要求访客执行真实危险行动',
  '不使用广告复活、内购、排行、战斗、等级或装备系统',
  '不绕过店主确认自动发布剧情、NPC 或空间内容',
  '不引用外部影视、名人或版权素材作为剧情前提',
  '不在草稿阶段调用外部模型或产生 Token 成本承诺',
]

function cleanText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function safeId(value) {
  return String(value || 'space')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'space'
}

function shortText(value, maxLength = 42) {
  const text = cleanText(value)
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
}

function unique(items) {
  const next = []
  for (const item of items) {
    const text = cleanText(item)
    if (text && !next.includes(text)) next.push(text)
  }
  return next
}

function characterMaterials(space = {}) {
  const characters = Array.isArray(space.characters) ? space.characters : []
  return characters.slice(0, 3).map((character) => {
    const role = cleanText(character.archetype || character.personality, '驻店 NPC')
    return `${cleanText(character.name, '未命名 NPC')}（${shortText(role, 18)}）`
  })
}

function spaceMaterials(space = {}) {
  return unique([
    cleanText(space.name) ? `空间名：${cleanText(space.name)}` : '',
    cleanText(space.description) ? `公开简介：${shortText(space.description, 52)}` : '',
    cleanText(space.scene_prompt) ? `场景素材：${shortText(space.scene_prompt, 60)}` : '',
    ...characterMaterials(space),
  ]).slice(0, 8)
}

function fallback(text, nextNodeId) {
  return [{ id: `${nextNodeId || 'stay'}-fallback`, text, next_node_id: nextNodeId }]
}

export function createShortDramaDraftFromSpace(space = {}, options = {}, index = 1) {
  const spaceName = cleanText(space.name, '这间空间')
  const spaceSlug = safeId(space.id || spaceName)
  const conflictHook = cleanText(options.conflictHook, '有客人误会了店主确认的规则，需要有人把场面稳住')
  const tone = cleanText(options.tone, '短剧主持感、节奏清楚、克制、不羞辱任何人')
  const materials = spaceMaterials(space)
  const sceneSeed = materials.find((item) => item.startsWith('场景素材：')) || materials[0] || '空间里的一个可确认物件'

  return {
    id: `gp_ai_short_${spaceSlug}_${Date.now().toString(36)}_${index}`,
    title: `${shortText(spaceName, 12)} · 登记册短剧`,
    status: 'draft',
    summary: `基于${spaceName}设定生成的未发布草稿；店主编辑并保存/发布后访客才可见。`,
    entry_label: '进入短剧小剧场',
    mode: 'ai_directed_branch',
    owner_brief: {
      goal: `围绕「${spaceName}」里的冲突钩子「${conflictHook}」，完成一段 3-4 步的安全短剧选择体验。`,
      tone,
      materials,
      forbidden: [...ASSISTANT_FORBIDDEN],
    },
    nodes: [
      {
        id: 'opening',
        kind: 'scene',
        narration: `【未发布草稿】${spaceName}里出现了一个短剧冲突：${conflictHook}。先用空间内可确认的信息稳住场面。`,
        choices: [
          { id: 'ask-npc', label: '请 NPC 复述店主确认的规则', next_node_id: 'second-beat' },
          { id: 'use-prop', label: '拿出一个空间内物件做解释', next_node_id: 'second-beat' },
          { id: 'overpromise', label: '替店主立刻承诺解决一切', next_node_id: 'boundary' },
        ],
        fallback_events: fallback('主持人把冲突收束到店主已确认的规则和空间内素材。', 'second-beat'),
      },
      {
        id: 'boundary',
        kind: 'scene',
        narration: '这一步差点替店主做决定。短剧草稿只能提出选择，不替访客发言，也不替店主发布承诺。',
        choices: [
          { id: 'repair-owner-rule', label: '改为请店主/NPC确认边界', next_node_id: 'second-beat' },
          { id: 'repair-symbol', label: '改成象征性、非现实承诺的回应', next_node_id: 'second-beat' },
        ],
        fallback_events: fallback('主持人撤回越界承诺，回到可编辑的安全剧情。', 'second-beat'),
      },
      {
        id: 'second-beat',
        kind: 'scene',
        narration: `第二幕：${sceneSeed}成为关键线索。你需要让冲突更有戏剧性，但不能引用外部影视、名人或版权素材。`,
        choices: [
          { id: 'local-clue', label: '只使用空间内线索推进', next_node_id: 'third-beat' },
          { id: 'ask-consent', label: '请 NPC 确认哪些内容能公开说', next_node_id: 'third-beat' },
          { id: 'borrow-famous', label: '套用知名影视桥段', next_node_id: 'boundary' },
        ],
        fallback_events: fallback('主持人把素材改回店主自有设定和安全线索。', 'third-beat'),
      },
      {
        id: 'third-beat',
        kind: 'scene',
        narration: '最后一幕：给访客一个体面选择，让误会变成可确认的小结论。',
        choices: [
          { id: 'soft-close', label: '给出克制结论，请 NPC 点头确认', next_node_id: 'complete', completes: true },
          { id: 'owner-note', label: '把结果写成店主可编辑的便签', next_node_id: 'complete', completes: true },
          { id: 'public-shame', label: '把某个人公开羞辱成反派', next_node_id: 'boundary' },
        ],
        fallback_events: fallback('主持人选择一个不羞辱、不越界、可由店主确认的结尾。', 'complete'),
      },
      {
        id: 'complete',
        kind: 'complete',
        narration: '结算：这只是短剧草稿。店主可以继续编辑节点、删除草稿，或保存后再决定是否发布。',
        choices: [],
        fallback_events: fallback('这段未发布短剧草稿已经走到结尾。', 'complete'),
      },
    ],
    completion: {
      complete_node_ids: ['complete'],
      reward_text: '你把这段空间冲突处理成了可确认的小剧场结尾。',
      memory_atom: { enabled: false },
    },
  }
}
