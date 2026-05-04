const SHORT_DRAMA_KEYWORDS = [
  '短剧',
  '小剧场',
  '救场',
  '潜台词',
  '深夜',
  '说谎',
  '轻推理',
  '判断',
]

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function cleanText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function truncateText(value, maxLength = 76) {
  const text = cleanText(value)
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
}

function hasChoiceNode(gameplay) {
  return asArray(gameplay?.nodes).some((node) => asArray(node?.choices).length >= 2)
}

function firstChoiceNode(gameplay) {
  return asArray(gameplay?.nodes).find((node) => asArray(node?.choices).length >= 2) || null
}

function publishedGameplay(gameplay) {
  return gameplay?.status === 'published'
}

function candidateText(gameplay) {
  return [
    gameplay?.title,
    gameplay?.summary,
    gameplay?.entry_label,
    gameplay?.owner_brief?.goal,
    gameplay?.owner_brief?.tone,
  ]
    .filter(Boolean)
    .join(' ')
}

export function isShortDramaGameplayCandidate(gameplay) {
  if (!gameplay || typeof gameplay !== 'object') return false
  if (!hasChoiceNode(gameplay)) return false
  const text = candidateText(gameplay)
  return SHORT_DRAMA_KEYWORDS.some((keyword) => text.includes(keyword))
}

export function buildShortDramaTeaser(tavern = {}) {
  const gameplay = asArray(tavern?.gameplay_definitions).find((item) => (
    publishedGameplay(item) && isShortDramaGameplayCandidate(item)
  ))

  if (!gameplay) return null

  const node = firstChoiceNode(gameplay)
  const conflictTitle = cleanText(gameplay.title, '酒馆短剧一幕')
  const sceneHook = truncateText(
    node?.narration || gameplay?.owner_brief?.goal || gameplay.summary,
    84,
  )

  return {
    tavernId: cleanText(tavern.id),
    gameplayId: cleanText(gameplay.id),
    kicker: '短剧入口',
    conflictTitle,
    summary: truncateText(gameplay.summary || gameplay?.owner_brief?.goal || '进入一段店主发布的酒馆短剧玩法。', 72),
    sceneHook,
    ctaLabel: cleanText(gameplay.entry_label, '进入小剧场'),
    guardrail: '店主已发布的玩法承接；不是推荐排行，也不会自动生成或发布内容。',
  }
}

export function getShortDramaTeaserSearchText(tavern = {}) {
  return asArray(tavern?.gameplay_definitions)
    .filter((gameplay) => publishedGameplay(gameplay) && isShortDramaGameplayCandidate(gameplay))
    .flatMap((gameplay) => [
      gameplay.title,
      gameplay.summary,
      gameplay.entry_label,
      gameplay?.owner_brief?.goal,
    ])
    .filter(Boolean)
    .join(' ')
}
