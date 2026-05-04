import { strict as assert } from 'node:assert'
import { readFile } from 'node:fs/promises'

import { analyzeCharacterPromptRisk } from '../app/product/characterPromptRiskLinter.js'
import {
  DEFAULT_PROMPT_STYLE_DIALS,
  applyPromptStyleDialsToDraft,
  buildPromptLayerPreview,
  compilePromptStyleDialLines,
  normalizePromptStyleDials,
} from '../app/product/promptStyleDials.js'

const customDials = normalizePromptStyleDials({
  replyLength: 'short',
  density: 'dialogue',
  perspective: 'first_person_npc',
  emotion: 'stable',
  genre: 'cyber_tavern',
})

assert.equal(customDials.replyLength, 'short')
assert.equal(customDials.density, 'dialogue')
assert.equal(normalizePromptStyleDials({ replyLength: 'unknown' }).replyLength, DEFAULT_PROMPT_STYLE_DIALS.replyLength)

const lines = compilePromptStyleDialLines(customDials)
assert.ok(lines.some((line) => line.includes('短句')))
assert.ok(lines.some((line) => line.includes('对话优先')))
assert.ok(lines.some((line) => line.includes('NPC 第一人称')))
assert.ok(lines.some((line) => line.includes('不要替访客说话')))
assert.ok(!lines.join('\n').includes('api_key'))

const draft = {
  name: '灯叔',
  description: '深夜便利店柜台旁的赛博酒馆店员。',
  personality: '慢热，短句，愿意解释规则。',
  scenario: '雨夜，门口有人误会了登记册规则。',
  system_prompt: '保持店主确认的边界。',
  first_mes: '伞放这边，别挡门。',
  mes_example: '<START>\n{{char}}: 我先看登记册。',
  tags_text: '便利店, 深夜',
  api_key: 'sk-should-not-leak-1234567890',
}

const applied = applyPromptStyleDialsToDraft(draft, customDials)
assert.match(applied.system_prompt, /FableMap 风格拨盘/)
assert.match(applied.system_prompt, /短句/)
assert.match(applied.system_prompt, /不要替访客说话/)
assert.ok(applied.system_prompt.startsWith('保持店主确认的边界。'))
assert.ok(!applied.system_prompt.includes('sk-should-not-leak'))

const appliedTwice = applyPromptStyleDialsToDraft(applied, { ...customDials, replyLength: 'rich' })
assert.equal((appliedTwice.system_prompt.match(/【FableMap 风格拨盘】/g) || []).length, 1)
assert.match(appliedTwice.system_prompt, /细节更完整/)
assert.ok(!appliedTwice.system_prompt.includes('短句、1-3 句'))

const riskReport = analyzeCharacterPromptRisk(appliedTwice)
assert.equal(riskReport.canSave, true)
assert.equal(riskReport.summary.blocked, 0)

const layers = buildPromptLayerPreview(draft, customDials)
assert.ok(layers.find((layer) => layer.id === 'platform_boundary'))
assert.ok(layers.find((layer) => layer.id === 'character_card'))
assert.ok(layers.find((layer) => layer.id === 'style_dials'))
assert.ok(layers.find((layer) => layer.id === 'world_info'))
assert.ok(layers.find((layer) => layer.id === 'visitor_state'))
assert.ok(layers.every((layer) => !String(layer.body).includes('sk-should-not-leak')))

const editorSource = await readFile(new URL('../app/product/CharacterEditor.jsx', import.meta.url), 'utf8')
assert.ok(editorSource.includes('promptStyleDials'))
assert.ok(editorSource.includes('character-prompt-composer'))
assert.ok(editorSource.includes('应用到角色指令'))
assert.ok(editorSource.includes('Prompt Layer Preview'))

const packageSource = await readFile(new URL('../package.json', import.meta.url), 'utf8')
assert.ok(packageSource.includes('prompt-composer-style-dials-test.mjs'))

console.log('prompt-composer-style-dials-test: ok')
