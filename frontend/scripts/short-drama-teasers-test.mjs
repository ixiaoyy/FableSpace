import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildShortDramaTeaser,
  getShortDramaTeaserSearchText,
  isShortDramaGameplayCandidate,
} from '../app/lib/short-drama-teasers.js'

const publishedShortDrama = {
  id: 'gp_truth',
  title: '判断谁在说谎',
  status: 'published',
  summary: '用酒馆线索做轻推理，不做人身指控。',
  entry_label: '开始轻推理',
  owner_brief: {
    goal: '通过 3 个安全线索判断哪句话前后矛盾，只给出酒馆内结论。',
    forbidden: ['不绕过店主确认自动发布剧情、NPC 或酒馆内容'],
  },
  nodes: [
    {
      id: 'opening',
      narration: '两位客人都说自己先到，但登记册只剩一行模糊时间。',
      choices: [
        { id: 'check-register', label: '看登记册', next_node_id: 'complete' },
        { id: 'ask-rule', label: '请 NPC 复述规则', next_node_id: 'complete' },
      ],
    },
  ],
}

const draftShortDrama = {
  ...publishedShortDrama,
  id: 'gp_draft',
  title: '帮店主救场 4 次',
  status: 'draft',
}

assert.equal(isShortDramaGameplayCandidate(publishedShortDrama), true)
assert.equal(isShortDramaGameplayCandidate({ ...publishedShortDrama, nodes: [] }), false)

const teaser = buildShortDramaTeaser({
  id: 'tavern_a',
  name: '第三中学传达室',
  gameplay_definitions: [draftShortDrama, publishedShortDrama],
})

assert.ok(teaser, 'published short-drama gameplay should produce a teaser')
assert.equal(teaser.gameplayId, 'gp_truth')
assert.equal(teaser.kicker, '短剧入口')
assert.equal(teaser.conflictTitle, '判断谁在说谎')
assert.equal(teaser.ctaLabel, '开始轻推理')
assert.match(teaser.summary, /轻推理/)
assert.match(teaser.guardrail, /店主已发布的玩法承接/)
assert.match(teaser.guardrail, /不是推荐排行/)
assert.match(getShortDramaTeaserSearchText({ gameplay_definitions: [publishedShortDrama] }), /判断谁在说谎/)
assert.equal(buildShortDramaTeaser({ gameplay_definitions: [draftShortDrama] }), null)
assert.equal(buildShortDramaTeaser({ gameplay_definitions: [] }), null)

const here = dirname(fileURLToPath(import.meta.url))
const discoverRoute = readFileSync(join(here, '../app/routes/discover.tsx'), 'utf8')
const productLane = readFileSync(join(here, '../app/product/WorldStageTavernDiscoveryLane.jsx'), 'utf8')
const entryPanel = readFileSync(join(here, '../app/product/TavernEntryPanel.jsx'), 'utf8')
const packageSource = readFileSync(join(here, '../package.json'), 'utf8')

assert.ok(discoverRoute.includes('ShortDramaTeaserCard'), 'discover route should render short-drama teaser cards')
assert.ok(discoverRoute.includes('buildShortDramaTeaser'), 'discover route should derive teaser from tavern gameplay_definitions')
assert.ok(productLane.includes('tavern-short-drama-teaser'), 'legacy discovery lane should show teaser card')
assert.ok(entryPanel.includes('tavern-entry-short-drama'), 'tavern entry should show short-drama handoff before entering')
assert.ok(packageSource.includes('short-drama-teasers-test.mjs'), 'frontend test script should include short-drama teaser test')

console.log('short-drama-teasers-test: ok')
