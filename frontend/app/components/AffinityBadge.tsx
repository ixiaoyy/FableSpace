import { getAffinityStageMeta, normalizeAffinityStrength } from "../lib/affinity.js"

type AffinityBadgeProps = {
  stage?: string
  strength?: number
  showEnglish?: boolean
}

export function AffinityBadge({ stage = "", strength = 0, showEnglish = false }: AffinityBadgeProps) {
  const meta = getAffinityStageMeta(stage, normalizeAffinityStrength(strength))

  return (
    <span className={`affinity-badge affinity-tone-${meta.tone}`} title={`${meta.name_en} ${Math.round(meta.strength_min * 100)}%-${Math.round(meta.strength_max * 100)}%`}>
      <span className="affinity-badge-dot" aria-hidden="true" />
      <span>{meta.name_zh}</span>
      {showEnglish ? <small>{meta.name_en}</small> : null}
    </span>
  )
}
