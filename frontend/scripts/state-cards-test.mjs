import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { createTavernService } from '../app/product/services/tavernService.js'

let captured = []
globalThis.fetch = async (url, options = {}) => {
  captured.push({ url: String(url), options })
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    text: async () => '{"ok":true,"state_cards":[]}',
  }
}

const service = createTavernService(() => 'http://unit.test')
await service.listStateCards('tavern one', { status: 'pending', visitorId: 'visitor_a' }, 'visitor_a')
await service.decideStateCard('tavern one', 'card one', { status: 'confirmed', note: '加入正史' }, 'visitor_a')

assert.equal(captured.length, 2)
assert.ok(captured[0].url.includes('/api/v1/taverns/tavern%20one/state-cards'))
assert.ok(captured[0].url.includes('status=pending'))
assert.ok(captured[0].url.includes('visitor_id=visitor_a'))
assert.equal(captured[1].options.method, 'PUT')
assert.ok(captured[1].url.includes('/state-cards/card%20one/decision'))
assert.equal(JSON.parse(captured[1].options.body).status, 'confirmed')

const here = dirname(fileURLToPath(import.meta.url))
const tavernsSource = readFileSync(join(here, '../app/lib/taverns.ts'), 'utf8')
assert.ok(tavernsSource.includes('export type StateCard'))
assert.ok(tavernsSource.includes('state_card_candidates?: StateCard[]'))
assert.ok(tavernsSource.includes('listStateCards'))
assert.ok(tavernsSource.includes('decideStateCard'))

const chatRoomSource = readFileSync(join(here, '../app/product/TavernChatRoom.jsx'), 'utf8')
assert.ok(chatRoomSource.includes('StateCardReviewPanel'))
assert.ok(chatRoomSource.includes('loadStateCards'))
assert.ok(chatRoomSource.includes('handleStateCardDecision'))

const panelSource = readFileSync(join(here, '../app/product/StateCardReviewPanel.jsx'), 'utf8')
assert.ok(panelSource.includes('加入正史'))
assert.ok(panelSource.includes('忽略本次'))
assert.ok(panelSource.includes('contradiction_candidate'))

const ownerManagementSource = readFileSync(join(here, '../app/features/tavern-owner-management/index.tsx'), 'utf8')
assert.ok(ownerManagementSource.includes('OwnerStateCardPanel'))
assert.ok(ownerManagementSource.includes('data-owner-state-card-entry="management-route"'))
assert.ok(ownerManagementSource.includes('店主确认后才会写入结构化正史'))
assert.ok(ownerManagementSource.includes('onClose={() => setOpen(false)}'))

const styleSource = readFileSync(join(here, '../app/product/styles.css'), 'utf8')
assert.ok(styleSource.includes('.state-card-review-panel'))

console.log('state-cards-test: ok')
