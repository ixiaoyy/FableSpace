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
    json: async () => ({ ok: true, url: String(url) }),
    text: async () => '{"ok":true}',
  }
}

const service = createTavernService(() => 'http://unit.test')
await service.getGameplays('tavern one', 'visitor_a')
await service.saveGameplays('tavern one', [{ id: 'gp_one' }], 'owner_a')
await service.startGameplaySession('tavern one', { gameplayId: 'gp_one', characterId: 'char_one' }, 'visitor_a')
await service.advanceGameplaySession('tavern one', 'gps_one', { choiceId: 'go' }, 'visitor_a')
await service.listGameplaySessions('tavern one', { state: 'active' }, 'visitor_a')
await service.abandonGameplaySession('tavern one', 'gps_one', 'visitor_a')

assert.equal(captured.length, 6)
assert.ok(captured[0].url.includes('/api/v1/taverns/tavern%20one/gameplays'))
assert.equal(captured[1].options.method, 'PUT')
assert.ok(captured[2].url.includes('/gameplay-sessions'))
assert.equal(captured[3].options.method, 'POST')
assert.ok(captured[3].url.includes('/gameplay-sessions/gps_one/advance'))
assert.ok(captured[4].url.includes('state=active'))
assert.ok(captured[5].url.includes('/abandon'))

const here = dirname(fileURLToPath(import.meta.url))
const managerSource = readFileSync(join(here, '../app/product/GameplayManager.jsx'), 'utf8')
assert.ok(managerSource.includes('GameplayDefinitionEditor'))
assert.ok(managerSource.includes('saveGameplays'))
assert.ok(managerSource.includes('published'))
assert.ok(managerSource.includes('disabled'))

const editorSource = readFileSync(join(here, '../app/product/GameplayDefinitionEditor.jsx'), 'utf8')
assert.ok(editorSource.includes('玩法名称'))
assert.ok(editorSource.includes('玩法目标'))
assert.ok(editorSource.includes('fallback_events'))
assert.ok(editorSource.includes('高级节点'))

const launcherSource = readFileSync(join(here, '../app/product/TavernGameplayLauncher.jsx'), 'utf8')
assert.ok(launcherSource.includes('onStart?.(gameplay)'))
assert.ok(launcherSource.includes('onResume?.(session)'))
assert.ok(launcherSource.includes('继续'))

const sessionPanelSource = readFileSync(join(here, '../app/product/GameplaySessionPanel.jsx'), 'utf8')
assert.ok(sessionPanelSource.includes('onChoice?.(choice)'))
assert.ok(sessionPanelSource.includes('onSubmit'))
assert.ok(sessionPanelSource.includes('onAbandon'))
assert.ok(sessionPanelSource.includes('completion'))

const chatRoomSource = readFileSync(join(here, '../app/product/TavernChatRoom.jsx'), 'utf8')
assert.ok(chatRoomSource.includes('TavernGameplayLauncher'))
assert.ok(chatRoomSource.includes('GameplaySessionPanel'))
assert.ok(chatRoomSource.includes('startGameplaySession'))
assert.ok(chatRoomSource.includes('advanceGameplaySession'))

const ownerSource = readFileSync(join(here, '../app/product/TavernOwnerPanel.jsx'), 'utf8')
assert.ok(ownerSource.includes('GameplayManager'))

const styleSource = readFileSync(join(here, '../app/product/tavernGameplay.css'), 'utf8')
assert.ok(styleSource.includes('.tavern-gameplay-launcher'))
assert.ok(styleSource.includes('.gameplay-session-panel'))

console.log('gameplay-test: ok')
