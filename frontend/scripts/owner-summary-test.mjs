import { buildOwnerOperatingSummary } from '../app/lib/owner-summary.js'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`)
  }
}

function testSummaryMetricsAndHighlights() {
  const taverns = [
    { id: 'tavern_a', name: '夜雨柜台', status: 'open', characters: [{ id: 'char_a', name: '阿柜' }] },
    { id: 'tavern_b', name: '晨光邮局', status: 'closed', characters: [{ id: 'char_b', name: '邮差' }] },
  ]
  const visitors = [
    {
      tavern_id: 'tavern_a',
      tavern_name: '夜雨柜台',
      visitor_id: 'visitor_alpha',
      visitor_name: 'Alpha',
      visit_count: 3,
      message_count: 12,
      last_visit: '2026-04-27T08:30:00Z',
      relationship: { stage: 'regular', strength: 0.74 },
    },
    {
      tavern_id: 'tavern_a',
      tavern_name: '夜雨柜台',
      visitor_id: 'visitor_beta',
      visitor_name: 'Beta',
      visit_count: 1,
      message_count: 2,
      last_visit: '2026-04-26T18:10:00Z',
      relationship: { stage: 'stranger', strength: 0.2 },
    },
    {
      tavern_id: 'tavern_b',
      tavern_name: '晨光邮局',
      visitor_id: 'visitor_gamma',
      visitor_name: '',
      visit_count: 2,
      message_count: 0,
      last_visit: '2026-04-25T12:00:00Z',
      relationship: { stage: 'acquaintance', strength: 0.42 },
    },
  ]
  const sessions = [
    {
      tavern_id: 'tavern_a',
      tavern_name: '夜雨柜台',
      visitor_id: 'visitor_alpha',
      visitor_name: 'Alpha',
      character_id: 'char_a',
      character_name: '阿柜',
      message_count: 8,
      last_message: '还记得我上次说的蓝莓派吗？',
      last_role: 'user',
      updated_at: '2026-04-27T09:00:00Z',
    },
    {
      tavern_id: 'tavern_b',
      tavern_name: '晨光邮局',
      visitor_id: 'visitor_gamma',
      visitor_name: '',
      character_id: 'char_b',
      character_name: '邮差',
      message_count: 3,
      last_message: '欢迎下次再来。',
      last_role: 'assistant',
      updated_at: '2026-04-26T10:00:00Z',
    },
  ]

  const summary = buildOwnerOperatingSummary({ taverns, visitors, sessions })

  assertEqual(summary.metrics.taverns, 2, 'counts taverns')
  assertEqual(summary.metrics.openTaverns, 1, 'counts open taverns')
  assertEqual(summary.metrics.visitors, 3, 'counts unique visitors')
  assertEqual(summary.metrics.returningVisitors, 2, 'counts returning visitors')
  assertEqual(summary.metrics.engagedVisitors, 2, 'counts engaged visitors')
  assertEqual(summary.metrics.sessions, 2, 'counts chat sessions')
  assertEqual(summary.metrics.messages, 11, 'sums session messages')

  assertEqual(summary.returningHighlights[0].visitorLabel, 'Alpha', 'sorts strongest returning visitor first')
  assertEqual(summary.tavernHighlights[0].tavernName, '夜雨柜台', 'sorts tavern with most owner feedback first')
  assert(summary.recentSessions[0].lastMessage.includes('蓝莓派'), 'keeps recent visible session message')
  assert(summary.nextActions.some((item) => item.kind === 'follow_up_returning'), 'suggests following up with returning visitors')
  assert(summary.nextActions.some((item) => item.kind === 'reopen_closed'), 'suggests reopening closed taverns')
}

function testEmptySummaryHasOnboardingAction() {
  const summary = buildOwnerOperatingSummary({ taverns: [], visitors: [], sessions: [] })
  assertEqual(summary.metrics.taverns, 0, 'empty tavern count')
  assertEqual(summary.returningHighlights.length, 0, 'empty returning highlights')
  assert(summary.nextActions.some((item) => item.kind === 'create_first_tavern'), 'suggests first tavern creation')
}

testSummaryMetricsAndHighlights()
testEmptySummaryHasOnboardingAction()

console.log('owner-summary-test: ok')
