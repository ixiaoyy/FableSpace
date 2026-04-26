import assert from 'node:assert/strict'

import {
  NPC_PERSONALITY_TEMPLATES,
  applyNpcPersonalityTemplateToDraft,
  filterNpcPersonalityTemplates,
  recommendNpcPersonalityTemplates,
} from '../app/product/personalityTemplates.js'

assert.ok(NPC_PERSONALITY_TEMPLATES.length >= 15)

const warmGuide = NPC_PERSONALITY_TEMPLATES.find((template) => template.id === 'warm-guide')
assert.ok(warmGuide)

// ── 反面人设 ──────────────────────────────────────────────────────────────────
const snarkyBartender = NPC_PERSONALITY_TEMPLATES.find((template) => template.id === 'snarky-bartender')
assert.ok(snarkyBartender, 'snarky-bartender should be in templates')
assert.equal(snarkyBartender.category, '反面人设')

const smarmyDating = NPC_PERSONALITY_TEMPLATES.find((template) => template.id === 'smarmy-dating-sim')
assert.ok(smarmyDating, 'smarmy-dating-sim should be in templates')
assert.equal(smarmyDating.category, '反面人设')

const coldDealer = NPC_PERSONALITY_TEMPLATES.find((template) => template.id === 'cold-dealer')
assert.ok(coldDealer, 'cold-dealer should be in templates')
assert.equal(coldDealer.category, '反面人设')

const filteredNegativeArchetypes = filterNpcPersonalityTemplates({
  category: '反面人设',
  query: '',
  draft: {},
  limit: 10,
})
assert.ok(filteredNegativeArchetypes.length >= 3)
assert.ok(filteredNegativeArchetypes.every((template) => template.category === '反面人设'))
assert.ok(filteredNegativeArchetypes.some((template) => template.id === 'snarky-bartender'))
assert.ok(filteredNegativeArchetypes.some((template) => template.id === 'smarmy-dating-sim'))
assert.ok(filteredNegativeArchetypes.some((template) => template.id === 'cold-dealer'))

// ── 古装宫廷 ─────────────────────────────────────────────────────────────────
const coldEmperor = NPC_PERSONALITY_TEMPLATES.find((template) => template.id === 'cold-emperor')
assert.ok(coldEmperor, 'cold-emperor should be in templates')
assert.equal(coldEmperor.category, '古装宫廷')

const schemingConsort = NPC_PERSONALITY_TEMPLATES.find((template) => template.id === 'scheming-consort')
assert.ok(schemingConsort, 'scheming-consort should be in templates')
assert.equal(schemingConsort.category, '古装宫廷')

const outspokenNoblewoman = NPC_PERSONALITY_TEMPLATES.find((template) => template.id === 'outspoken-noblewoman')
assert.ok(outspokenNoblewoman, 'outspoken-noblewoman should be in templates')
assert.equal(outspokenNoblewoman.category, '古装宫廷')

const infoBroker = NPC_PERSONALITY_TEMPLATES.find((template) => template.id === 'info-broker')
assert.ok(infoBroker, 'info-broker should be in templates')
assert.equal(infoBroker.category, '古装宫廷')

const loyalAttendant = NPC_PERSONALITY_TEMPLATES.find((template) => template.id === 'loyal-attendant')
assert.ok(loyalAttendant, 'loyal-attendant should be in templates')
assert.equal(loyalAttendant.category, '古装宫廷')

const filteredCourtArchetypes = filterNpcPersonalityTemplates({
  category: '古装宫廷',
  query: '',
  draft: {},
  limit: 10,
})
assert.ok(filteredCourtArchetypes.length >= 5)
assert.ok(filteredCourtArchetypes.every((template) => template.category === '古装宫廷'))
assert.ok(filteredCourtArchetypes.some((template) => template.id === 'cold-emperor'))
assert.ok(filteredCourtArchetypes.some((template) => template.id === 'scheming-consort'))
assert.ok(filteredCourtArchetypes.some((template) => template.id === 'outspoken-noblewoman'))
assert.ok(filteredCourtArchetypes.some((template) => template.id === 'info-broker'))
assert.ok(filteredCourtArchetypes.some((template) => template.id === 'loyal-attendant'))

const filledDraft = applyNpcPersonalityTemplateToDraft({
  name: '门口向导',
  description: '',
  personality: '',
  scenario: '',
  system_prompt: '',
  first_mes: '',
  mes_example: '',
  alternate_greetings_text: '欢迎回来',
  tags_text: '已有标签, 温柔',
  talkativeness: null,
}, warmGuide, { mode: 'fill' })
assert.equal(filledDraft.description, warmGuide.description)
assert.equal(filledDraft.personality, warmGuide.personality)
assert.ok(filledDraft.tags_text.includes('已有标签'))
assert.equal((filledDraft.tags_text.match(/温柔/g) || []).length, 1)
assert.ok(filledDraft.alternate_greetings_text.includes('欢迎回来'))
assert.ok(filledDraft.alternate_greetings_text.includes(warmGuide.alternate_greetings[0]))
assert.equal(filledDraft.talkativeness, warmGuide.talkativeness)

const overwrittenDraft = applyNpcPersonalityTemplateToDraft({
  description: '旧描述',
  personality: '旧性格',
  scenario: '旧场景',
  system_prompt: '旧指令',
  first_mes: '旧开场',
  mes_example: '旧示例',
  alternate_greetings_text: '旧备用',
  tags_text: '旧标签',
  talkativeness: 0.99,
}, warmGuide, { mode: 'overwrite' })
assert.equal(overwrittenDraft.description, warmGuide.description)
assert.equal(overwrittenDraft.personality, warmGuide.personality)
assert.equal(overwrittenDraft.alternate_greetings_text, warmGuide.alternate_greetings.join('\n'))
assert.equal(overwrittenDraft.tags_text, warmGuide.tags.join(', '))
assert.equal(overwrittenDraft.talkativeness, warmGuide.talkativeness)

// ── apply snarky bartender ─────────────────────────────────────────────────────
const snarkyDraft = applyNpcPersonalityTemplateToDraft({
  name: '深夜酒客',
  description: '',
  personality: '',
  scenario: '',
  system_prompt: '',
  first_mes: '',
  mes_example: '',
  alternate_greetings_text: '',
  tags_text: '',
  talkativeness: null,
}, snarkyBartender, { mode: 'fill' })
assert.equal(snarkyDraft.personality, snarkyBartender.personality)
assert.ok(snarkyDraft.first_mes.includes('借口') || snarkyDraft.first_mes.includes('拆穿'))
assert.ok(snarkyDraft.tags_text.includes('毒舌'))

const recommended = recommendNpcPersonalityTemplates({
  name: '雨夜档案亭',
  tags_text: '失物, 档案, 线索',
}, 3)
assert.ok(recommended.some((template) => template.id === 'evidence-archivist'))

const filteredByCategory = filterNpcPersonalityTemplates({
  category: '线索推理',
  query: '档案',
  draft: {},
  limit: 4,
})
assert.ok(filteredByCategory.length > 0)
assert.ok(filteredByCategory.every((template) => template.category === '线索推理'))
assert.ok(filteredByCategory.some((template) => template.id === 'evidence-archivist'))

const filteredRecommended = filterNpcPersonalityTemplates({
  category: '推荐',
  query: '社区',
  draft: { name: '路口服务站', tags_text: '社区, 问路' },
  limit: 4,
})
assert.ok(filteredRecommended.some((template) => template.id === 'street-guardian'))

console.log('personality-templates-test: ok')
