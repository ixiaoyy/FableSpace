import {
  SPACE_ACTIVITY_FORBIDDEN_COPY,
  buildSpaceActivityEchoes,
} from './space-activity-echoes.js'

export const DISCOVERY_LIVELINESS_FORBIDDEN_COPY = SPACE_ACTIVITY_FORBIDDEN_COPY

function findEcho(view, id) {
  return (Array.isArray(view?.echoes) ? view.echoes : []).find((echo) => echo?.id === id) || null
}

function toPositiveNumber(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0
}

function formatCount(value, suffix) {
  const count = toPositiveNumber(value)
  return count ? `${count.toLocaleString('zh-CN')} ${suffix}` : `暂无${suffix}`
}

export function buildDiscoveryLiveliness(space = {}) {
  const view = buildSpaceActivityEchoes(space)
  const visitCount = toPositiveNumber(space?.visit_count)
  const rumorEcho = findEcho(view, 'rumor')
  const gameplayEcho = findEcho(view, 'gameplay')
  const hasRumor = rumorEcho?.value === '可用'
  const levelLabel = view.level?.label || '等待第一束灯'
  const isQuiet = levelLabel === '等待第一束灯'
  const headline = isQuiet ? '等待第一束灯' : '附近有人经营'
  const rumorValue = hasRumor ? '环境传闻可用' : '传闻待点亮'
  const feedbackValue = '回访反馈给店主'
  const summary = isQuiet
    ? '等待第一束灯：先进入空间完成对话，或留下只给店主看的回访反馈。'
    : `附近有人经营：${levelLabel}，${rumorValue}，${feedbackValue}。`

  const chips = [
    {
      id: 'activity',
      label: '经营活性',
      value: levelLabel,
      helper: view.level?.helper || '只展示聚合热度，不展示访客身份。',
      className: isQuiet
        ? 'border-white/12 bg-white/[0.04] text-violet-100/58'
        : 'border-emerald-300/24 bg-emerald-300/10 text-emerald-50',
    },
    {
      id: 'rumor',
      label: '传闻线索',
      value: rumorValue,
      helper: hasRumor ? '作为附近入口线索，不展示访客身份。' : '店主启用后会成为附近入口线索。',
      className: hasRumor
        ? 'border-amber-300/24 bg-amber-300/10 text-amber-50'
        : 'border-white/12 bg-white/[0.04] text-violet-100/58',
    },
    {
      id: 'feedback',
      label: '回访反馈',
      value: feedbackValue,
      helper: '只提示店主治理回路，不展示具体内容。',
      className: 'border-cyan-300/22 bg-cyan-300/10 text-cyan-50',
    },
    {
      id: 'visits',
      label: '到访聚合',
      value: formatCount(visitCount, '次到访'),
      helper: '只显示聚合次数，不公开访客列表。',
      className: visitCount
        ? 'border-fuchsia-300/22 bg-fuchsia-300/10 text-fuchsia-50'
        : 'border-white/12 bg-white/[0.04] text-violet-100/58',
    },
  ]

  if (gameplayEcho?.value && gameplayEcho.value !== '可后续添加') {
    chips.push({
      id: 'gameplay',
      label: '店内玩法',
      value: gameplayEcho.value,
      helper: '只作为入店体验线索，不做跨空间竞争。',
      className: 'border-violet-300/24 bg-violet-300/10 text-violet-50',
    })
  }

  const searchText = [
    headline,
    levelLabel,
    summary,
    '有人经营',
    '环境传闻',
    '回访反馈',
    '店主可见',
    '聚合到访',
    ...chips.flatMap((chip) => [chip.label, chip.value, chip.helper]),
  ].join(' ')

  return {
    headline,
    levelLabel,
    summary,
    chips,
    searchText,
  }
}

export function getDiscoveryLivelinessSearchText(viewOrSpace = {}) {
  const view = Array.isArray(viewOrSpace?.chips)
    ? viewOrSpace
    : buildDiscoveryLiveliness(viewOrSpace)
  return String(view?.searchText || '').trim().toLowerCase()
}
