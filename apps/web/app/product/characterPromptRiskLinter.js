const LEVEL_ORDER = {
  blocked: 3,
  warning: 2,
  info: 1,
}

const FIELD_LABELS = {
  name: '角色名称',
  description: '角色描述',
  personality: '性格设定',
  scenario: '角色场景',
  system_prompt: '角色指令',
  first_mes: '开场白',
  mes_example: '示例对话',
  alternate_greetings: '备用开场白',
  alternate_greetings_text: '备用开场白',
  tags: '标签',
  tags_text: '标签',
  world_info: '世界书',
  creator_notes: '创作者备注',
  post_history_instructions: '历史后置指令',
}

const TEXT_FIELD_KEYS = [
  'name',
  'description',
  'personality',
  'scenario',
  'system_prompt',
  'first_mes',
  'mes_example',
  'alternate_greetings',
  'alternate_greetings_text',
  'tags',
  'tags_text',
  'creator_notes',
  'post_history_instructions',
]

const RISK_RULES = [
  {
    id: 'jailbreak.ignore-restrictions',
    level: 'blocked',
    category: 'jailbreak',
    label: '越权 / 绕过限制',
    message: '检测到要求模型忽略规则、绕过安全或进入越狱模式的指令。',
    suggestion: '删除这类越权语句，改写为角色内的语气、场景和安全边界。',
    ignoreWhenNegated: true,
    patterns: [
      /忽略.{0,10}(限制|规则|指令|安全|政策|规范)/iu,
      /无视.{0,10}(限制|规则|指令|安全|政策|规范)/iu,
      /绕过.{0,10}(限制|规则|安全|审查|审核|政策)/iu,
      /解除.{0,10}(限制|安全|审查|过滤)/iu,
      /越狱|开发者模式|DAN\b/iu,
      /ignore\s+(all|any|previous|above).{0,24}(instructions|rules|restrictions|safety|policy)/iu,
      /bypass.{0,24}(safety|policy|restriction|guardrail)/iu,
      /jailbreak|developer\s+mode/iu,
    ],
  },
  {
    id: 'obedience.absolute',
    level: 'blocked',
    category: 'absolute_obedience',
    label: '绝对服从 / 不得拒绝',
    message: '检测到“用户最高权限 / 绝对服从 / 不得拒绝”等会破坏平台边界的指令。',
    suggestion: '改为“尊重访客选择，保持角色风格；遇到越界请求时用角色口吻转移”。',
    ignoreWhenNegated: true,
    patterns: [
      /用户.{0,6}(就是|为).{0,4}上帝/iu,
      /绝对服从|无条件服从|完全服从/iu,
      /永远不得拒绝|不能拒绝用户|不得拒绝用户|不允许拒绝/iu,
      /必须.{0,8}(满足|执行|遵从).{0,8}(任何|所有|一切).{0,8}(要求|请求|命令)/iu,
      /highest\s+(authority|priority)|absolute\s+obedience|must\s+obey/iu,
      /never\s+refuse|cannot\s+refuse/iu,
    ],
  },
  {
    id: 'reasoning.chain-of-thought',
    level: 'blocked',
    category: 'chain_of_thought',
    label: '强制输出思维链',
    message: '检测到要求输出 chain-of-thought、隐藏推理或逐步内心推理的指令。',
    suggestion: '只要求“给出简短可见结论 / 可观察理由”，不要索取隐藏推理过程。',
    ignoreWhenNegated: true,
    patterns: [
      /chain[-\s]?of[-\s]?thought|CoT\b/iu,
      /思维链|隐藏推理|内心推理|逐步推理|完整推理过程/iu,
      /show\s+(your\s+)?reasoning|reveal\s+(your\s+)?reasoning/iu,
    ],
  },
  {
    id: 'pii.actual-secret',
    level: 'blocked',
    category: 'pii',
    label: '疑似真实隐私 / 密钥',
    message: '检测到疑似手机号、邮箱或 API Key 等真实敏感信息。',
    suggestion: '删除真实联系方式、私密地址和密钥；角色卡只保留泛化地点氛围。',
    ignoreWhenNegated: false,
    patterns: [
      /(?:\+?86[-\s]?)?1[3-9]\d{9}/u,
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu,
      /\bsk-[A-Za-z0-9_-]{12,}\b/u,
      /\bAIza[0-9A-Za-z\-_]{20,}\b/u,
    ],
  },
  {
    id: 'pii.collection-request',
    level: 'blocked',
    category: 'pii',
    label: '索取 / 保存隐私',
    message: '检测到索取、记录、公开私人身份信息或精确私址的指令。',
    suggestion: '改为“不要索取隐私；如需地点感，只描述公开街区或空间氛围”。',
    ignoreWhenNegated: true,
    patterns: [
      /(索取|收集|记录|保存|记住|公开|展示|暴露|要求|填写|提供).{0,16}(手机号|电话号码|身份证|护照|银行卡|真实住址|私人地址|门牌|API\s*key|api[_-]?key)/iu,
      /(手机号|电话号码|身份证|护照|银行卡|真实住址|私人地址|门牌|API\s*key|api[_-]?key).{0,16}(索取|收集|记录|保存|记住|公开|展示|暴露|要求|填写|提供)/iu,
      /(ask|collect|store|remember|publish|reveal).{0,24}(phone|email|address|passport|id\s*card|api\s*key)/iu,
    ],
  },
  {
    id: 'adult.force-or-minor',
    level: 'blocked',
    category: 'forced_or_minor_content',
    label: '强制 / 未成年成人内容',
    message: '检测到强制性、不可拒绝或未成年相关成人内容风险。',
    suggestion: '默认 NPC 模板应保持合意、可退出、PG-13；成人治理需另开设计任务。',
    ignoreWhenNegated: true,
    patterns: [
      /(强制|强迫|不可拒绝|不得拒绝).{0,14}(性爱|性行为|亲密|发生关系|调教|服从)/iu,
      /(未成年|幼女|萝莉|正太).{0,16}(性爱|性行为|调教|露骨|色情)/iu,
      /(rape|non[-\s]?consensual|minor).{0,24}(sex|sexual|explicit)/iu,
    ],
  },
  {
    id: 'visitor-agency.impersonation',
    level: 'warning',
    category: 'visitor_agency',
    label: '代替访客行动 / 内心',
    message: '检测到可能替访客说话、决定动作、同意、身份或内心的写法。',
    suggestion: 'NPC 只能描述自己的行动和可观察环境；访客的发言、选择和同意必须留给访客。',
    ignoreWhenNegated: true,
    patterns: [
      /(替|代替).{0,8}(用户|访客|\{\{user\}\}).{0,16}(说话|发言|行动|决定|同意|拒绝|思考|内心|身份)/iu,
      /(控制|决定).{0,8}(用户|访客|\{\{user\}\}).{0,16}(行动|选择|同意|内心|身份)/iu,
      /(impersonate|control|decide).{0,18}(user|visitor)/iu,
    ],
  },
  {
    id: 'visual.real-person',
    level: 'warning',
    category: 'real_person_visual',
    label: '真人照片化形象',
    message: '检测到真人照片、明星脸、写实 cosplay 或摄影棚人像倾向。',
    suggestion: 'NPC 形象应写为 non-photoreal fictional NPC / anime-game illustration，并明确 no real-person portrait。',
    ignoreWhenNegated: true,
    patterns: [
      /真人照片|写实人像|明星脸|真人\s*cosplay|摄影棚人像|网红脸/iu,
      /photorealistic|real[-\s]?person|celebrity\s+likeness|live[-\s]?action\s+cosplay|stock\s+photo|DSLR|skin\s+pores/iu,
    ],
  },
  {
    id: 'model.profile-note',
    level: 'info',
    category: 'model_profile',
    label: '模型 / 预设兼容提示',
    message: '检测到模型、temperature、preset 等运行预设描述；不同模型可能表现不一致。',
    suggestion: '把这类内容当作店主可复核说明，不要把模型兼容假设写死为角色身份。',
    ignoreWhenNegated: false,
    patterns: [
      /\b(gpt-4|gpt-4o|claude|gemini|deepseek|temperature|top_p|preset)\b/iu,
      /模型|预设|运行参数|温度参数/iu,
    ],
  },
]

function toText(value) {
  if (Array.isArray(value)) {
    return value.map((item) => toText(item)).filter(Boolean).join('\n')
  }
  if (value && typeof value === 'object') {
    return ''
  }
  return typeof value === 'string' ? value : ''
}

function normalizeFieldEntry(key, value) {
  return {
    key,
    label: FIELD_LABELS[key] || key,
    text: toText(value),
  }
}

function collectWorldInfoFields(worldInfo) {
  if (!Array.isArray(worldInfo)) return []
  return worldInfo
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null
      const parts = [
        toText(entry.content),
        toText(entry.keys),
        toText(entry.keys_secondary),
      ].filter(Boolean)
      if (!parts.length) return null
      return {
        key: `world_info.${index}`,
        label: `世界书 #${index + 1}`,
        text: parts.join('\n'),
      }
    })
    .filter(Boolean)
}

export function collectCharacterPromptRiskFields(character = {}) {
  if (!character || typeof character !== 'object') return []
  const fields = TEXT_FIELD_KEYS
    .map((key) => normalizeFieldEntry(key, character[key]))
    .filter((entry) => entry.text.trim())
  return [...fields, ...collectWorldInfoFields(character.world_info)]
}

function isNegatedMatch(text, index) {
  const prefix = text.slice(Math.max(0, index - 24), index)
  return /(不要|不得|不能|禁止|避免|请勿|拒绝|不应|不允许|无需|无须|not|never|no|do\s+not|don't|without)[^，。；;,.!?！？\n]{0,12}$/iu.test(prefix)
}

function findRuleMatch(text, rule) {
  for (const pattern of rule.patterns) {
    const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
    const matcher = new RegExp(pattern.source, flags)
    for (const match of text.matchAll(matcher)) {
      const index = match.index ?? 0
      if (rule.ignoreWhenNegated && isNegatedMatch(text, index)) continue
      return true
    }
  }
  return false
}

function summarizeItems(items) {
  return items.reduce((summary, item) => {
    summary.total += 1
    summary[item.level] = (summary[item.level] || 0) + 1
    return summary
  }, { blocked: 0, warning: 0, info: 0, total: 0 })
}

function highestLevel(items) {
  return items.reduce((current, item) => (
    LEVEL_ORDER[item.level] > LEVEL_ORDER[current] ? item.level : current
  ), 'info')
}

export function analyzeCharacterPromptRisk(character = {}) {
  const fields = collectCharacterPromptRiskFields(character)
  const items = []

  fields.forEach((field) => {
    RISK_RULES.forEach((rule) => {
      if (!findRuleMatch(field.text, rule)) return
      items.push({
        id: `${rule.id}:${field.key}`,
        rule_id: rule.id,
        level: rule.level,
        category: rule.category,
        label: rule.label,
        field: field.key,
        field_label: field.label,
        message: rule.message,
        suggestion: rule.suggestion,
      })
    })
  })

  const summary = summarizeItems(items)
  return {
    canSave: summary.blocked === 0,
    highestLevel: summary.total ? highestLevel(items) : 'info',
    summary,
    items,
  }
}

export function formatPromptRiskBlockMessage(report) {
  const blocked = report?.items?.filter((item) => item.level === 'blocked') || []
  if (!blocked.length) return ''
  const categories = [...new Set(blocked.map((item) => item.label))].slice(0, 3)
  const suffix = categories.length ? `：${categories.join('、')}` : ''
  return `角色指令存在 ${blocked.length} 个阻断风险${suffix}。请先按风险提示清理后再保存。`
}

export function assertCharacterPromptRiskCanSave(character) {
  const report = analyzeCharacterPromptRisk(character)
  if (!report.canSave) {
    const error = new Error(formatPromptRiskBlockMessage(report))
    error.report = report
    throw error
  }
  return report
}
