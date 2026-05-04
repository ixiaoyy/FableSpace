import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createShortDramaDraftFromTavern } from '../app/product/shortDramaDraftAssistant.js'

const tavern = {
  id: 'tavern_school_gate',
  name: '第三中学传达室',
  description: '校门口的夜间传达室，NPC 会帮访客把误会说清楚。',
  scene_prompt: '门铃、登记册、旧热水壶和一张失物招领便签。',
  characters: [
    { id: 'char_guard', name: '老周', archetype: '门卫' },
    { id: 'char_student', name: '小林', personality: '急性子但愿意解释' },
  ],
}

const draft = createShortDramaDraftFromTavern(tavern, {
  conflictHook: '有人说登记册上的名字不是自己写的',
  tone: '轻推理、克制、像竖屏短剧但不羞辱任何人',
}, 3)

assert.ok(draft.id.startsWith('gp_ai_short_tavern-school-gate_'))
assert.equal(draft.status, 'draft')
assert.equal(draft.mode, 'ai_directed_branch')
assert.match(draft.title, /传达室|登记册|短剧/)
assert.match(draft.summary, /未发布草稿/)
assert.match(draft.entry_label, /小剧场|短剧/)
assert.equal(draft.completion.memory_atom.enabled, false)
assert.match(draft.owner_brief.goal, /第三中学传达室/)
assert.match(draft.owner_brief.goal, /有人说登记册上的名字不是自己写的/)
assert.ok(draft.owner_brief.materials.some((item) => item.includes('老周')))
assert.ok(draft.owner_brief.materials.some((item) => item.includes('门铃')))
assert.ok(draft.owner_brief.forbidden.some((item) => item.includes('不绕过店主确认自动发布')))
assert.ok(draft.owner_brief.forbidden.some((item) => item.includes('影视、名人或版权素材')))
assert.ok(draft.owner_brief.forbidden.some((item) => item.includes('Token 成本')))
assert.ok(Array.isArray(draft.nodes) && draft.nodes.length >= 4)
assert.ok(draft.nodes.some((node) => Array.isArray(node.choices) && node.choices.length >= 2))

const nodeIds = new Set(draft.nodes.map((node) => node.id))
for (const node of draft.nodes) {
  for (const choice of node.choices || []) {
    if (choice.next_node_id) assert.ok(nodeIds.has(choice.next_node_id), `${choice.id} points to ${choice.next_node_id}`)
  }
  for (const event of node.fallback_events || []) {
    if (event.next_node_id) assert.ok(nodeIds.has(event.next_node_id), `${event.id} points to ${event.next_node_id}`)
  }
}

const secondDraft = createShortDramaDraftFromTavern({ name: '无名酒馆', gameplay_definitions: [{ id: 'existing' }] }, {}, 1)
assert.equal(secondDraft.status, 'draft')
assert.equal(secondDraft.id.includes('existing'), false, 'assistant should not overwrite existing gameplay ids')

const here = dirname(fileURLToPath(import.meta.url))
const managerSource = readFileSync(join(here, '../app/product/GameplayManager.jsx'), 'utf8')
const packageSource = readFileSync(join(here, '../package.json'), 'utf8')

assert.ok(managerSource.includes('AI 短剧草稿助手'), 'GameplayManager should expose owner AI short-drama draft assistant')
assert.ok(managerSource.includes('createShortDramaDraftFromTavern'), 'GameplayManager should use tavern-aware draft generator')
assert.ok(managerSource.includes('短剧草稿是本地未发布建议'), 'assistant UI should say drafts are unpublished local suggestions')
assert.ok(managerSource.includes('版权素材'), 'assistant UI should surface copyright/material risk')
assert.ok(managerSource.includes('Token 成本'), 'assistant UI should surface cost risk')
assert.ok(managerSource.includes('setAssistantConflictHook'), 'assistant should let owner steer conflict hook before generation')
assert.ok(packageSource.includes('short-drama-draft-assistant-test.mjs'), 'frontend test script should include short-drama draft assistant test')

console.log('short-drama-draft-assistant-test: ok')
