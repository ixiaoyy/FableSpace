import {
  affinityPercent,
  getAffinityStageMeta,
  getNextAffinityStage,
  normalizeAffinityStrength,
  stageProgressWithinRange,
} from "../lib/affinity.js"

type AffinityProgressProps = {
  stage?: string
  strength?: number
  compact?: boolean
}

export function AffinityProgress({ stage = "", strength = 0, compact = false }: AffinityProgressProps) {
  const normalizedStrength = normalizeAffinityStrength(strength)
  const percent = affinityPercent(normalizedStrength)
  const meta = getAffinityStageMeta(stage, normalizedStrength)
  const next = getNextAffinityStage(meta.stage, normalizedStrength)
  const stageProgress = stageProgressWithinRange(meta.stage, normalizedStrength)

  return (
    <div className={`affinity-progress ${compact ? "compact" : ""}`}>
      <div className="affinity-progress-heading">
        <span>{percent}%</span>
        {next ? <small>下一阶段：{next.name_zh}</small> : <small>已达最高羁绊</small>}
      </div>
      <div className="affinity-progress-bar" aria-label={`好感度 ${percent}%`}>
        <span style={{ width: `${percent}%` }} />
      </div>
      {!compact ? (
        <div className="affinity-progress-stage" aria-label={`当前阶段进度 ${stageProgress}%`}>
          <span style={{ width: `${stageProgress}%` }} />
        </div>
      ) : null}
    </div>
  )
}
