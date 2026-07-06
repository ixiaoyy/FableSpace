export const SPACE_INTENT_FORBIDDEN_COPY = [
  '平台自动发布',
  '自动生成并上线',
  '充值',
  '结算',
  '排行榜',
  '等级',
  '装备',
  '群发营销',
  '访客社交',
]

export const SPACE_INTENT_TEMPLATES = [
  {
    id: 'workflow-clinic',
    title: '流程诊所',
    badge: '理清流程',
    summary: '帮访客把重复流程拆成现状、卡点和下一步清单。',
    primaryNpcRole: '流程诊断师',
    tone: '务实、追问关键事实、不替访客做最终业务决策。',
    visitorInputs: ['现在谁处理', '用什么表或工具', '哪里最容易出错'],
    ownerConfigFocus: ['流程提问脚本', '输出清单格式', '不接真实业务系统'],
    verifiableOutputs: ['现状流程摘要', '卡点列表', '下一步小清单'],
    guardrails: ['只做整理和建议', '不承诺节省成本', '不连接 CRM/表格自动执行'],
    keywords: ['流程', '自动化', '卡点', 'SOP'],
  },
  {
    id: 'industry-desk',
    title: '行业工位',
    badge: '垂直助手',
    summary: '给招聘、教培、房产、跨境等场景一个熟悉材料的 NPC 助手。',
    primaryNpcRole: '行业资料整理员',
    tone: '熟悉业务语境、标出风险、需要人工复核。',
    visitorInputs: ['岗位/JD/房源/课程信息', '目标对象', '需要整理的材料片段'],
    ownerConfigFocus: ['行业 WorldInfo', '风险提示', '人工转接话术'],
    verifiableOutputs: ['材料目录', '风险清单', '跟进草稿'],
    guardrails: ['不做医疗/法律/投资结论', '不做招聘录拒决定', '不索取敏感证件'],
    keywords: ['行业', '招聘', '教培', '房产', '跨境'],
  },
  {
    id: 'needs-counter',
    title: '需求吧台',
    badge: '表达需求',
    summary: '帮访客把模糊请求说清楚，让店主获得可处理摘要。',
    primaryNpcRole: '需求采集员',
    tone: '温和、结构化、尊重隐私，不做骚扰推广。',
    visitorInputs: ['想解决什么', '时间/预算/限制', '希望店主如何回应'],
    ownerConfigFocus: ['需求摘要格式', '隐私边界', '店主可见记录说明'],
    verifiableOutputs: ['需求摘要', '下一步建议', '人工跟进便签'],
    guardrails: ['不公开访客记录', '不做无同意推广', '不买卖线索'],
    keywords: ['需求', '咨询', '吧台', '前台'],
  },
  {
    id: 'archive-study',
    title: '档案书房',
    badge: '找资料',
    summary: '用 owner-confirmed 知识帮助访客找到、理解和复用资料。',
    primaryNpcRole: '档案管理员',
    tone: '引用清楚、边界清楚、不泄露私有资料。',
    visitorInputs: ['想找的资料', '遇到的流程问题', '需要复核的条款/段落'],
    ownerConfigFocus: ['WorldInfo 条目', '引用规则', '不可见资料边界'],
    verifiableOutputs: ['引用式回答', '资料位置', '待人工复核项'],
    guardrails: ['不泄露 owner 私有资料', '不编造引用', '不替代专业审查'],
    keywords: ['档案', '知识库', 'SOP', '资料'],
  },
  {
    id: 'creation-workshop',
    title: '创作/交付工坊',
    badge: '整理草稿',
    summary: '把 brief、素材或想法整理成大纲、清单和可审稿草稿。',
    primaryNpcRole: '方案架构师',
    tone: '鼓励创作、保留店主审核、不自动发布。',
    visitorInputs: ['创作主题', '素材/会议纪要', '目标格式'],
    ownerConfigFocus: ['输出模板', '审稿清单', '发布前确认'],
    verifiableOutputs: ['提案大纲', '分镜/清单', '审稿问题'],
    guardrails: ['只生成草稿', '不自动公开', '不冒充客户最终交付'],
    keywords: ['创作', '交付', 'brief', '方案', '短剧'],
  },
  {
    id: 'companion-beacon',
    title: '陪伴灯塔',
    badge: '低风险陪伴',
    summary: '面向夜归、援助/社区和医院陪伴场景，提供善意清单与现实求助边界。',
    primaryNpcRole: '值班陪伴员',
    tone: '温柔、克制、低风险、明确现实求助边界。',
    visitorInputs: ['现在的压力', '想留给下次自己的话', '今天能做的一件小事'],
    ownerConfigFocus: ['现实求助边界', '回访规则', '不追问隐私'],
    verifiableOutputs: ['善意清单', '回访便签', '现实求助提醒'],
    guardrails: ['不替代医疗心理服务', '不追问敏感隐私', '紧急情况指向现实支持'],
    keywords: ['陪伴', '援助/社区', '夜归', '医院', '回访'],
  },
]

const INTENT_BY_ID = new Map(SPACE_INTENT_TEMPLATES.map((intent) => [intent.id, intent]))

export function deriveSpaceIntent(value = 'companion-beacon') {
  const id = String(value || '').trim()
  return INTENT_BY_ID.get(id) || INTENT_BY_ID.get('companion-beacon')
}

export function getSpaceIntentSearchText(intent) {
  if (!intent) return ''
  return [
    intent.title,
    intent.badge,
    intent.summary,
    intent.primaryNpcRole,
    intent.tone,
    ...(intent.visitorInputs || []),
    ...(intent.ownerConfigFocus || []),
    ...(intent.verifiableOutputs || []),
    ...(intent.guardrails || []),
    ...(intent.keywords || []),
  ].filter(Boolean).join(' ')
}
