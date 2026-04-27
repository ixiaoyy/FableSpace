export const AFFINITY_STAGES = [
  {
    stage: 'stranger',
    name_zh: '陌生人',
    name_en: 'Stranger',
    strength_min: 0,
    strength_max: 0.15,
    tone: 'neutral',
  },
  {
    stage: 'acquaintance',
    name_zh: '点头之交',
    name_en: 'Acquaintance',
    strength_min: 0.15,
    strength_max: 0.3,
    tone: 'cyan',
  },
  {
    stage: 'familiar',
    name_zh: '熟面孔',
    name_en: 'Familiar',
    strength_min: 0.3,
    strength_max: 0.5,
    tone: 'blue',
  },
  {
    stage: 'friend',
    name_zh: '朋友',
    name_en: 'Friend',
    strength_min: 0.5,
    strength_max: 0.7,
    tone: 'green',
  },
  {
    stage: 'close_friend',
    name_zh: '挚友',
    name_en: 'Close Friend',
    strength_min: 0.7,
    strength_max: 0.9,
    tone: 'violet',
  },
  {
    stage: 'best_friend',
    name_zh: '知己',
    name_en: 'Best Friend',
    strength_min: 0.9,
    strength_max: 1,
    tone: 'gold',
  },
]

const LEGACY_STAGE_MAP = {
  known: 'familiar',
  regular: 'familiar',
  trusted: 'friend',
  allied: 'close_friend',
  confidant: 'close_friend',
}

export function normalizeAffinityStrength(value) {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.min(1, parsed))
}

export function affinityPercent(value) {
  return Math.max(0, Math.min(100, Math.round(normalizeAffinityStrength(value) * 100)))
}

export function getAffinityStageMeta(stage, strength = 0) {
  const normalizedStage = LEGACY_STAGE_MAP[String(stage || '').trim()] || String(stage || '').trim()
  const direct = AFFINITY_STAGES.find((item) => item.stage === normalizedStage)
  if (direct) return direct

  const normalizedStrength = normalizeAffinityStrength(strength)
  return [...AFFINITY_STAGES]
    .reverse()
    .find((item) => normalizedStrength >= item.strength_min) || AFFINITY_STAGES[0]
}

export function getNextAffinityStage(stage, strength = 0) {
  const current = getAffinityStageMeta(stage, strength)
  const index = AFFINITY_STAGES.findIndex((item) => item.stage === current.stage)
  return index >= 0 && index < AFFINITY_STAGES.length - 1
    ? AFFINITY_STAGES[index + 1]
    : null
}

export function stageProgressWithinRange(stage, strength = 0) {
  const current = getAffinityStageMeta(stage, strength)
  const value = normalizeAffinityStrength(strength)
  const span = Math.max(0.01, current.strength_max - current.strength_min)
  return Math.max(0, Math.min(100, Math.round(((value - current.strength_min) / span) * 100)))
}
