export const PROMPT_STYLE_DIAL_GROUPS = [
  {
    id: 'replyLength',
    label: '回复长度',
    helper: '控制 NPC 每轮回复的压缩程度。',
    options: [
      {
        id: 'short',
        label: '短句',
        detail: '1-3 句，优先让访客继续选择。',
        line: '回复长度：短句、1-3 句，先回应当前输入，再给一个可继续的话头。',
      },
      {
        id: 'balanced',
        label: '均衡',
        detail: '兼顾信息量和节奏。',
        line: '回复长度：保持均衡，避免大段设定倾倒，也不要只给单字反应。',
      },
      {
        id: 'rich',
        label: '细节',
        detail: '适合氛围、线索和解释更多的角色。',
        line: '回复长度：细节更完整，可补充可观察环境、角色动作和一条明确线索。',
      },
    ],
  },
  {
    id: 'density',
    label: '表达重心',
    helper: '让角色偏向对话、氛围或平衡叙述。',
    options: [
      {
        id: 'dialogue',
        label: '对话优先',
        detail: '更像聊天，不抢戏。',
        line: '表达重心：对话优先，动作和环境只做短提示，不长篇替访客推进剧情。',
      },
      {
        id: 'balanced',
        label: '平衡',
        detail: '对话与场景各占一半。',
        line: '表达重心：对话与可观察场景保持平衡，优先服务当前空间互动。',
      },
      {
        id: 'atmospheric',
        label: '氛围',
        detail: '更重环境和情绪，但仍保留选择权。',
        line: '表达重心：可多写氛围和细节，但不要把平台变成自动小说生成器。',
      },
    ],
  },
  {
    id: 'perspective',
    label: '叙述视角',
    helper: '限制 NPC 如何称呼自己和访客。',
    options: [
      {
        id: 'first_person_npc',
        label: 'NPC 第一人称',
        detail: '“我”说话，适合强角色感。',
        line: '叙述视角：使用 NPC 第一人称描述自己的行动和感受。',
      },
      {
        id: 'second_person_address',
        label: '称呼访客',
        detail: '可以用“你”，但不替你决定。',
        line: '叙述视角：可以称呼访客为“你”，但只描述可观察反应，不写访客内心。',
      },
      {
        id: 'scene_host',
        label: '场景主持',
        detail: '适合玩法主持，不冒充访客。',
        line: '叙述视角：用场景主持口吻提示环境变化，但访客发言、选择和同意仍由访客决定。',
      },
    ],
  },
  {
    id: 'emotion',
    label: '情绪强度',
    helper: '限制角色是否过度黏人、绝望或情绪失控。',
    options: [
      {
        id: 'stable',
        label: '稳定',
        detail: '低波动、陪伴感。',
        line: '情绪强度：稳定克制，不突然升级亲密、绝望、暴怒或强依赖。',
      },
      {
        id: 'lively',
        label: '灵动',
        detail: '更有表情，但不过界。',
        line: '情绪强度：可以活泼、有小动作和吐槽，但保持尊重和可退出。',
      },
      {
        id: 'dramatic',
        label: '戏剧',
        detail: '适合短剧/玩法，但不强迫结论。',
        line: '情绪强度：允许戏剧张力和冲突，但不要把访客锁进固定关系或固定结局。',
      },
    ],
  },
  {
    id: 'genre',
    label: '风味',
    helper: '只影响表达，不新增未确认世界观。',
    options: [
      {
        id: 'cyber_space',
        label: '空间',
        detail: '霓虹、吧台、真实坐标。',
        line: '风味：空间感，围绕真实坐标、吧台、灯光、门牌和店主确认设定表达。',
      },
      {
        id: 'light_novel',
        label: '轻小说',
        detail: '轻快、短反差、可爱口吻。',
        line: '风味：轻小说式轻快表达，可有短反差和口癖，但不加入露骨或强制内容。',
      },
      {
        id: 'quiet_prose',
        label: '安静散文',
        detail: '温柔、慢节奏、少插科打诨。',
        line: '风味：安静散文感，使用温柔、慢节奏、低干扰的表达。',
      },
    ],
  },
]

export const DEFAULT_PROMPT_STYLE_DIALS = {
  replyLength: 'balanced',
  density: 'balanced',
  perspective: 'second_person_address',
  emotion: 'stable',
  genre: 'cyber_space',
}

export const STYLE_DIALS_START = '【FableSpace 风格拨盘】'
export const STYLE_DIALS_END = '【/FableSpace 风格拨盘】'

function toText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function optionFor(groupId, optionId) {
  const group = PROMPT_STYLE_DIAL_GROUPS.find((item) => item.id === groupId)
  if (!group) return null
  return group.options.find((item) => item.id === optionId) || group.options.find((item) => item.id === DEFAULT_PROMPT_STYLE_DIALS[groupId])
}

export function normalizePromptStyleDials(value = {}) {
  return PROMPT_STYLE_DIAL_GROUPS.reduce((next, group) => {
    const candidate = toText(value[group.id])
    next[group.id] = optionFor(group.id, candidate)?.id || DEFAULT_PROMPT_STYLE_DIALS[group.id]
    return next
  }, {})
}

export function getPromptStyleDialOption(groupId, optionId) {
  return optionFor(groupId, optionId)
}

export function compilePromptStyleDialLines(value = {}) {
  const dials = normalizePromptStyleDials(value)
  const selectedLines = PROMPT_STYLE_DIAL_GROUPS
    .map((group) => optionFor(group.id, dials[group.id])?.line)
    .filter(Boolean)

  return [
    ...selectedLines,
    '访客主权：不要替访客说话、行动、同意、拒绝、定义身份或描述内心。',
    '主人主权：只使用店主确认的角色卡、空间设定和公开上下文；不自动发布或覆盖内容。',
    '安全边界：遇到越界、隐私、真实危险或不确定请求时，用角色口吻转回安全空间互动。',
  ]
}

function managedBlock(lines) {
  return [
    STYLE_DIALS_START,
    ...lines.map((line) => `- ${line}`),
    STYLE_DIALS_END,
  ].join('\n')
}

function stripManagedBlock(value) {
  const text = toText(value)
  if (!text) return ''
  const pattern = new RegExp(`${STYLE_DIALS_START}[\\s\\S]*?${STYLE_DIALS_END}`, 'u')
  return text.replace(pattern, '').trim()
}

export function applyPromptStyleDialsToDraft(draft = {}, value = {}) {
  const lines = compilePromptStyleDialLines(value)
  const existing = stripManagedBlock(draft.system_prompt)
  const nextPrompt = [existing, managedBlock(lines)].filter(Boolean).join('\n\n')
  return {
    ...draft,
    system_prompt: nextPrompt,
  }
}

function compact(value, fallback) {
  const text = toText(value)
  if (!text) return fallback
  return text.length > 140 ? `${text.slice(0, 140)}…` : text
}

export function buildPromptLayerPreview(draft = {}, value = {}) {
  const lines = compilePromptStyleDialLines(value)
  return [
    {
      id: 'platform_boundary',
      label: 'Platform Boundary',
      helper: '平台固定边界，不展示 API Key、隐藏安全指令或访客私密记忆。',
      body: '主人确认内容优先；AI 只能按已保存角色卡、空间设定、世界书和本轮访客输入进行对话。',
    },
    {
      id: 'character_card',
      label: 'SpaceCharacter',
      helper: '来自当前编辑中的角色卡字段。',
      body: [
        `name: ${compact(draft.name, '未命名 NPC')}`,
        `description: ${compact(draft.description, '未填写描述')}`,
        `personality: ${compact(draft.personality, '未填写性格')}`,
        `scenario: ${compact(draft.scenario, '未填写场景')}`,
        `first_mes: ${compact(draft.first_mes, '未填写开场白')}`,
      ].join('\n'),
    },
    {
      id: 'style_dials',
      label: 'Style Dials',
      helper: '本地风格拨盘，保存前只影响编辑器草稿。',
      body: lines.join('\n'),
    },
    {
      id: 'world_info',
      label: 'WorldInfo',
      helper: '运行时由命中的世界书条目动态注入。',
      body: '示例：命中关键词后注入店主确认的地点、传闻、背景或玩法线索。',
    },
    {
      id: 'visitor_state',
      label: 'Visitor State',
      helper: '运行时只注入当前访客授权/可见的关系和记忆摘要。',
      body: '示例：回访次数、已确认记忆、当前 gameplay/session 状态；不公开其他访客私密内容。',
    },
  ]
}
