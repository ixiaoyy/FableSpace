export const SPACE_ACTIVITY_GUARDRAILS = [
  '无访客好友 / 私信',
  '无公开访客墙',
  '无全局社交图谱',
  '反馈只给店主治理',
]

export const SPACE_ACTIVITY_FORBIDDEN_COPY = [
  '好友',
  '私信',
  '公开访客墙',
  '全局社交图谱',
  '排行榜',
]

function countItems(value) {
  return Array.isArray(value) ? value.length : 0
}

function safeNumber(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0
}

function hasLocalRumorPack(space = {}) {
  return (Array.isArray(space.skill_packs) ? space.skill_packs : []).some((pack) => {
    const packId = typeof pack?.id === 'string' ? pack.id : ''
    return packId === 'local-rumor' && pack.enabled !== false
  })
}

function activityLevel(visitCount, characterCount, hasRumor) {
  const score = Math.min(3, Math.floor(visitCount / 8)) + Math.min(2, characterCount) + (hasRumor ? 1 : 0)
  if (score >= 5) return { label: '很有活性', helper: '已有到访、角色和环境传闻共同支撑氛围。' }
  if (score >= 3) return { label: '正在变热', helper: '有可感知活动，但仍保持单空间边界。' }
  if (score >= 1) return { label: '初现活性', helper: '可展示入口氛围，不制造公开社交压力。' }
  return { label: '等待第一束灯', helper: '还没有足够活动记录，先鼓励进入和反馈。' }
}

export function buildSpaceActivityEchoes(space = {}) {
  const visitCount = safeNumber(space.visit_count)
  const characterCount = countItems(space.characters)
  const gameplayCount = countItems(space.gameplay_definitions)
  const hasRumor = hasLocalRumorPack(space)
  const level = activityLevel(visitCount, characterCount, hasRumor)

  return {
    level,
    echoes: [
      {
        id: 'visits',
        label: '入口热度',
        value: visitCount ? `${visitCount.toLocaleString('zh-CN')} 次` : '暂无记录',
        helper: '只显示聚合次数，不展示个人身份或聊天记录。',
      },
      {
        id: 'cast',
        label: 'NPC 驻场',
        value: characterCount ? `${characterCount} 位` : '待配置',
        helper: '店主配置的角色带来活性，不生成访客社交关系。',
      },
      {
        id: 'rumor',
        label: '环境传闻',
        value: hasRumor ? '可用' : '未启用',
        helper: '只作为附近空间线索，不是公开动态流。',
      },
      {
        id: 'feedback',
        label: '店主反馈',
        value: '私下可见',
        helper: '反馈只给店主治理，不提供点赞、回复或私信。',
      },
      {
        id: 'gameplay',
        label: '玩法线索',
        value: gameplayCount ? `${gameplayCount} 个` : '可后续添加',
        helper: '玩法属于空间内体验，不做跨空间竞争榜单。',
      },
    ],
  }
}
