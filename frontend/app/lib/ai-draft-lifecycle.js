export const AI_DRAFT_LIFECYCLE_STEPS = [
  {
    id: 'draft',
    label: 'AI 草稿',
    helper: '只是一份未发布建议。',
  },
  {
    id: 'review',
    label: '店主待确认',
    helper: '店主可编辑、丢弃或重新生成。',
  },
  {
    id: 'published',
    label: '已发布内容',
    helper: '只有店主提交保存后才进入空间。',
  },
]

const CONTEXT_COPY = {
  space: {
    title: '空间草稿确认流程',
    summary: 'AI 草稿只填入可编辑表单；店主检查并点击「创建空间」后，才会保存为正式空间和首个 NPC。',
    guardrails: [
      '确认前不会对外展示',
      '不自动创建空间或 NPC',
      '不替店主承担最终创作责任',
    ],
  },
  character: {
    title: 'NPC 草稿确认流程',
    summary: '生成结果只进入右侧编辑器；店主可改写、丢弃或点击「保存角色」后再正式出现。',
    guardrails: [
      '确认前不覆盖已有 NPC',
      '确认前不随空间包导出',
      '不绕过店主保存动作',
    ],
  },
  gameplay: {
    title: '玩法草稿确认流程',
    summary: '玩法模板会先作为草稿等待确认；店主检查、保存或发布后访客才可见。',
    guardrails: [
      '不含战斗、等级、装备、排行',
      '草稿不是已发布玩法',
      '停用后会从访客入口隐藏',
    ],
  },
}

export function buildAiDraftLifecycle(context = 'space') {
  const copy = CONTEXT_COPY[context] || CONTEXT_COPY.space
  return {
    context,
    steps: AI_DRAFT_LIFECYCLE_STEPS.map((step) => ({ ...step })),
    title: copy.title,
    summary: copy.summary,
    guardrails: [...copy.guardrails],
  }
}
