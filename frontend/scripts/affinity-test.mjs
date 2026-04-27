import {
  AFFINITY_STAGES,
  affinityPercent,
  getAffinityStageMeta,
  getNextAffinityStage,
  normalizeAffinityStrength,
  stageProgressWithinRange,
} from '../app/lib/affinity.js'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

assert(AFFINITY_STAGES.length === 6, 'affinity stage list should expose six positive MVP stages')
assert(getAffinityStageMeta('regular', 0.4).stage === 'familiar', 'legacy regular stage should display as familiar')
assert(getAffinityStageMeta('', 0.72).stage === 'close_friend', 'strength should infer the stage when stage is missing')
assert(getNextAffinityStage('friend', 0.55).stage === 'close_friend', 'friend should advance toward close_friend')
assert(getNextAffinityStage('best_friend', 0.96) === null, 'best_friend should be the final positive stage')
assert(normalizeAffinityStrength(-5) === 0, 'negative strength should clamp to 0')
assert(normalizeAffinityStrength(5) === 1, 'large strength should clamp to 1')
assert(affinityPercent(0.615) === 62, 'affinity percent should round display values')
assert(stageProgressWithinRange('friend', 0.6) === 50, 'stage-local progress should be calculated within its range')

console.log('Affinity helpers ok')
