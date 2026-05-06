import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  TAVERN_ACTIVITY_FORBIDDEN_COPY,
  TAVERN_ACTIVITY_GUARDRAILS,
  buildTavernActivitySignals,
} from '../app/lib/tavern-activity-signals.js'

const tavern = {
  id: 'tavern_activity',
  name: '月台茶室',
  visit_count: 24,
  characters: [{ id: 'npc_1' }, { id: 'npc_2' }],
  gameplay_definitions: [{ id: 'gp_1' }],
  skill_packs: [{ id: 'local-rumor', enabled: true, config: { limit: 3 } }],
}

const view = buildTavernActivitySignals(tavern)
assert.equal(view.level.label, '很有活性')
assert.deepEqual(view.signals.map((signal) => signal.id), ['visits', 'cast', 'rumor', 'feedback', 'gameplay'])
assert.equal(view.signals.find((signal) => signal.id === 'visits').value, '24 次')
assert.equal(view.signals.find((signal) => signal.id === 'visits').label, '入口热度')
assert.equal(view.signals.find((signal) => signal.id === 'cast').value, '2 位')
assert.equal(view.signals.find((signal) => signal.id === 'rumor').value, '可用')
assert.equal(view.signals.find((signal) => signal.id === 'feedback').label, '店主反馈')
assert.equal(view.signals.find((signal) => signal.id === 'feedback').value, '私下可见')
assert.equal(view.signals.find((signal) => signal.id === 'gameplay').value, '1 个')

const quiet = buildTavernActivitySignals({ id: 'quiet', characters: [], skill_packs: [] })
assert.equal(quiet.level.label, '等待第一束灯')
assert.equal(quiet.signals.find((signal) => signal.id === 'visits').value, '暂无记录')
assert.equal(quiet.signals.find((signal) => signal.id === 'rumor').value, '未启用')

assert(TAVERN_ACTIVITY_GUARDRAILS.includes('无访客好友 / 私信'))
assert(TAVERN_ACTIVITY_GUARDRAILS.includes('无公开访客墙'))
assert(TAVERN_ACTIVITY_GUARDRAILS.includes('无全局社交图谱'))
assert(TAVERN_ACTIVITY_GUARDRAILS.includes('反馈只给店主治理'))
assert(TAVERN_ACTIVITY_FORBIDDEN_COPY.includes('排行榜'))

const componentSource = readFileSync(new URL('../app/components/TavernActivitySignalsCard.tsx', import.meta.url), 'utf8')
assert(componentSource.includes('酒馆活性信号'))
assert(componentSource.includes('Activity without social graph'))
assert(componentSource.includes('不展示访客身份、聊天记录或公开社交关系'))
assert(componentSource.includes('aria-label="酒馆活性边界"'))
assert(componentSource.includes('grid gap-3 sm:grid-cols-2 xl:grid-cols-5'))

const tavernRouteSource = readFileSync(new URL('../app/routes/tavern.tsx', import.meta.url), 'utf8')
const ownerManagementSource = readFileSync(new URL('../app/features/tavern-owner-management/index.tsx', import.meta.url), 'utf8')
assert(!tavernRouteSource.includes('TavernActivitySignalsCard'), 'visitor tavern route should not mount activity analytics in the public sidecar')
assert(tavernRouteSource.includes('NeighborhoodRumorBubble'), 'route should keep ambient rumor surface')
assert(ownerManagementSource.includes('这不是公开留言墙'), 'owner management should keep owner-visible feedback boundary')

const combined = `${componentSource}\n${tavernRouteSource}\n${ownerManagementSource}\n${TAVERN_ACTIVITY_GUARDRAILS.join('\n')}`
for (const forbidden of ['关注按钮', '加好友', '发送私信', '排行榜']) {
  assert(!combined.includes(forbidden), `activity signals should not introduce forbidden social UI: ${forbidden}`)
}
for (const forbidden of ['回访反馈']) {
  assert(!componentSource.includes(forbidden), `activity signal card should avoid surveillance-like visitor copy: ${forbidden}`)
}
assert(combined.includes('无公开访客墙') || combined.includes('不做访客好友、私信、公开访客墙'), 'public visitor wall may only appear as a negated boundary')
assert(combined.includes('无全局社交图谱') || combined.includes('公开社交关系'), 'global social graph may only appear as a negated boundary')

console.log('tavern-activity-signals-test: ok')
