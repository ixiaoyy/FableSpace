import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  REVISIT_CARE_GUARDRAILS,
  buildRevisitCarePolicyChecklist,
  evaluateRevisitCareCandidate,
  normalizeRevisitCarePolicy,
} from '../app/lib/revisit-care-notification-policy.js'

const defaultPolicy = normalizeRevisitCarePolicy()
assert.equal(defaultPolicy.optIn, false)
assert.equal(defaultPolicy.quietHours.enabled, true)
assert.equal(defaultPolicy.quietHours.start, '22:00')
assert.equal(defaultPolicy.quietHours.end, '08:00')
assert.equal(defaultPolicy.rateLimit.maxPerWeek, 1)
assert.equal(defaultPolicy.rateLimit.minHoursBetween, 72)
assert.equal(defaultPolicy.unsubscribeAvailable, true)
assert.deepEqual(defaultPolicy.channels, ['in_app'])

const missingOptIn = evaluateRevisitCareCandidate(
  {
    trigger: 'owner_replied_feedback',
    channel: 'in_app',
    now: '2026-05-04T21:00:00+08:00',
  },
  defaultPolicy,
)
assert.equal(missingOptIn.allowed, false)
assert(missingOptIn.blockers.some((item) => item.id === 'opt_in_required'))
assert(missingOptIn.summary.includes('不会触达'))

const safePolicy = normalizeRevisitCarePolicy({ optIn: true })
const allowed = evaluateRevisitCareCandidate(
  {
    trigger: 'owner_replied_feedback',
    channel: 'in_app',
    now: '2026-05-04T21:00:00+08:00',
    sentThisWeek: 0,
  },
  safePolicy,
)
assert.equal(allowed.allowed, true)
assert.equal(allowed.blockers.length, 0)
assert(allowed.summary.includes('站内通知'))

const quietHours = evaluateRevisitCareCandidate(
  {
    trigger: 'owner_replied_feedback',
    channel: 'in_app',
    now: '2026-05-04T23:30:00+08:00',
  },
  safePolicy,
)
assert.equal(quietHours.allowed, false)
assert(quietHours.blockers.some((item) => item.id === 'quiet_hours'))

const unsubscribed = evaluateRevisitCareCandidate(
  {
    trigger: 'owner_replied_feedback',
    channel: 'in_app',
    now: '2026-05-04T21:00:00+08:00',
    unsubscribed: true,
  },
  safePolicy,
)
assert.equal(unsubscribed.allowed, false)
assert(unsubscribed.blockers.some((item) => item.id === 'unsubscribed'))

const tooSoon = evaluateRevisitCareCandidate(
  {
    trigger: 'owner_replied_feedback',
    channel: 'in_app',
    now: '2026-05-04T21:00:00+08:00',
    lastSentAt: '2026-05-03T21:30:00+08:00',
  },
  safePolicy,
)
assert.equal(tooSoon.allowed, false)
assert(tooSoon.blockers.some((item) => item.id === 'min_interval'))

const weeklyCap = evaluateRevisitCareCandidate(
  {
    trigger: 'owner_replied_feedback',
    channel: 'in_app',
    now: '2026-05-04T21:00:00+08:00',
    sentThisWeek: 1,
  },
  safePolicy,
)
assert.equal(weeklyCap.allowed, false)
assert(weeklyCap.blockers.some((item) => item.id === 'weekly_rate_limit'))

for (const candidate of [
  { trigger: 'marketing_campaign', channel: 'in_app' },
  { trigger: 'friend_online', channel: 'in_app' },
  { trigger: 'owner_replied_feedback', channel: 'push' },
  { trigger: 'owner_replied_feedback', channel: 'in_app', containsGeneratedContent: true },
]) {
  const result = evaluateRevisitCareCandidate({ ...candidate, now: '2026-05-04T21:00:00+08:00' }, safePolicy)
  assert.equal(result.allowed, false)
}

const checklist = buildRevisitCarePolicyChecklist(safePolicy)
assert(checklist.some((item) => item.id === 'opt_in' && item.status === 'ready'))
assert(checklist.some((item) => item.id === 'quiet_hours' && item.status === 'ready'))
assert(checklist.some((item) => item.id === 'rate_limit' && item.status === 'ready'))
assert(checklist.some((item) => item.id === 'unsubscribe' && item.status === 'ready'))

assert(REVISIT_CARE_GUARDRAILS.includes('默认关闭，必须由访客主动订阅'))
assert(REVISIT_CARE_GUARDRAILS.includes('必须提供取消订阅'))
assert(REVISIT_CARE_GUARDRAILS.includes('不做营销推送、广告复活或公开社交流'))

const panelSource = readFileSync(new URL('../app/components/RevisitCarePolicyPanel.tsx', import.meta.url), 'utf8')
assert(panelSource.includes('RevisitCarePolicyPanel'))
assert(panelSource.includes('未启用设计预览'))
assert(panelSource.includes('不会发送'))
assert(panelSource.includes('主动订阅'))
assert(panelSource.includes('取消订阅'))
assert(panelSource.includes('aria-pressed'))

const routeSource = readFileSync(new URL('../app/routes/notifications.tsx', import.meta.url), 'utf8')
assert(routeSource.includes('RevisitCarePolicyPanel'))
assert(routeSource.includes('revisit-care'))

const packageSource = readFileSync(new URL('../package.json', import.meta.url), 'utf8')
assert(packageSource.includes('revisit-care-notification-policy-test.mjs'))

console.log('revisit-care-notification-policy-test: ok')
