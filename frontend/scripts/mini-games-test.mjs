import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import {
  MINI_GAME_TEMPLATES,
  buildMiniGameStartPrompt,
  getMiniGameTemplates,
} from '../app/product/tavernMiniGames.js'

const ids = MINI_GAME_TEMPLATES.map((template) => template.id)
assert.equal(new Set(ids).size, ids.length)

for (const template of MINI_GAME_TEMPLATES) {
  assert.ok(template.id)
  assert.ok(template.title)
  assert.ok(template.icon)
  assert.ok(template.duration)
  assert.ok(template.summary)
  assert.ok(template.tags.includes('family-friendly'))
}

assert.deepEqual(ids, [
  'clue-trail',
  'riddle-quiz',
  'story-relay',
  'card-reading',
  'twenty-questions',
  'tiny-quest',
  'signal-decoder',
  'spectral-scanner',
  'constellation-map',
])
assert.equal(MINI_GAME_TEMPLATES.length, ids.length)

const clueFirst = getMiniGameTemplates({ playModeId: 'clue_game' }).map((template) => template.id)
assert.deepEqual(clueFirst.slice(0, 2), ['signal-decoder', 'clue-trail'])
assert.equal(clueFirst.length, ids.length)

const questFirst = getMiniGameTemplates({ playModeId: 'guild' }).map((template) => template.id)
assert.equal(questFirst[0], 'tiny-quest')
assert.equal(questFirst.length, ids.length)

const textGameFirst = getMiniGameTemplates({ playModeId: 'text_game' }).map((template) => template.id)
assert.deepEqual(textGameFirst.slice(0, 3), ['spectral-scanner', 'signal-decoder', 'tiny-quest'])
assert.equal(textGameFirst.length, ids.length)

const divinationFirst = getMiniGameTemplates({ playModeId: 'divination' }).map((template) => template.id)
assert.deepEqual(divinationFirst.slice(0, 2), ['constellation-map', 'card-reading'])
assert.equal(divinationFirst.length, ids.length)

const defaultOrder = getMiniGameTemplates({ playModeId: 'chat' }).map((template) => template.id)
assert.deepEqual(defaultOrder, ids)

assert.equal(buildMiniGameStartPrompt(null), '')

const riddleTemplate = MINI_GAME_TEMPLATES.find((template) => template.id === 'riddle-quiz')
const riddlePrompt = buildMiniGameStartPrompt(riddleTemplate, {
  tavernName: '第三中学传达室',
  characterName: '刘大爷',
})
assert.ok(riddlePrompt.includes('《猜谜问答》'))
assert.ok(riddlePrompt.includes('刘大爷'))
assert.ok(riddlePrompt.includes('第三中学传达室'))
assert.ok(riddlePrompt.includes('老少皆宜'))
assert.ok(riddlePrompt.includes('不要涉及血腥、成人、真实危险行动'))
assert.ok(riddlePrompt.includes('不索取隐私'))
assert.ok(riddlePrompt.includes('不给医疗、法律或金融结论'))

const cardTemplate = MINI_GAME_TEMPLATES.find((template) => template.id === 'card-reading')
const cardPrompt = buildMiniGameStartPrompt(cardTemplate, {
  characterName: '占卜摊主',
})
assert.ok(cardPrompt.includes('《抽卡占卜》'))
assert.ok(cardPrompt.includes('象征'))
assert.ok(cardPrompt.includes('不做命运断言'))

const constellationTemplate = MINI_GAME_TEMPLATES.find((template) => template.id === 'constellation-map')
const constellationPrompt = buildMiniGameStartPrompt(constellationTemplate, {
  tavernName: '星桥书店',
  characterName: '星图店员',
})
assert.ok(constellationPrompt.includes('《星图测绘》'))
assert.ok(constellationPrompt.includes('真实经纬度坐标'))
assert.ok(constellationPrompt.includes('不做命运断言'))
assert.ok(constellationPrompt.includes('不给医疗、法律或金融结论'))

const here = dirname(fileURLToPath(import.meta.url))
const panelSource = readFileSync(join(here, '../app/product/TavernMiniGamePanel.jsx'), 'utf8')
assert.ok(panelSource.includes('return null'))
assert.ok(panelSource.includes('templates.map'))
assert.ok(panelSource.includes('onStart?.(template)'))
assert.ok(panelSource.includes('disabled || sending'))

const styleSource = readFileSync(join(here, '../app/product/tavernMiniGames.css'), 'utf8')
assert.ok(styleSource.includes('.tavern-mini-game-panel'))
assert.ok(styleSource.includes('.tavern-mini-game-grid'))
assert.ok(styleSource.includes('.tavern-mini-game-card'))

const chatRoomSource = readFileSync(join(here, '../app/product/TavernChatRoom.jsx'), 'utf8')
assert.ok(chatRoomSource.includes("from './tavernMiniGames'"))
assert.ok(chatRoomSource.includes("from './TavernMiniGamePanel'"))
assert.ok(chatRoomSource.includes('getMiniGameTemplates'))
assert.ok(chatRoomSource.includes('buildMiniGameStartPrompt'))
assert.ok(chatRoomSource.includes('handleMiniGameStart'))
assert.ok(chatRoomSource.includes('<TavernMiniGamePanel'))

console.log('mini-games-test: ok')
