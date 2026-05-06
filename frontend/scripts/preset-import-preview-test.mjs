import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import { createTavernService } from '../app/product/services/tavernService.js'

const captured = []
globalThis.fetch = async (url, options = {}) => {
  captured.push({ url: String(url), options })
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    text: async () => JSON.stringify({
      ok: true,
      preview_only: true,
      applied: false,
      summary: { supported: 1, warning: 1, blocked: 1 },
      supported: [],
      warnings: [],
      blocked: [],
    }),
  }
}

const service = createTavernService(() => 'http://unit.test')
assert.equal(typeof service.previewPresetImport, 'function')
assert.equal(typeof service.applyPresetImport, 'function')
await service.previewPresetImport('tavern one', { preset_json: '{"name":"demo"}' }, 'owner_a')
await service.applyPresetImport(
  'tavern one',
  {
    preset_json: '{"name":"demo"}',
    selected_ids: ['module_1'],
    target_map: { module_1: 'prompt_blocks' },
    include_runtime_parameters: true,
    confirm: false,
  },
  'owner_a',
)

assert.equal(captured.length, 2)
assert.ok(captured[0].url.includes('/api/v1/taverns/tavern%20one/preset-import/preview'))
assert.equal(captured[0].options.method, 'POST')
assert.equal(captured[0].options.headers['X-User-Id'], 'owner_a')
assert.equal(JSON.parse(captured[0].options.body).preset_json, '{"name":"demo"}')
assert.ok(captured[1].url.includes('/api/v1/taverns/tavern%20one/preset-import/apply'))
assert.equal(captured[1].options.method, 'POST')
assert.deepEqual(JSON.parse(captured[1].options.body).selected_ids, ['module_1'])
assert.equal(JSON.parse(captured[1].options.body).confirm, false)

const here = dirname(fileURLToPath(import.meta.url))
const tavernsSource = readFileSync(join(here, '../app/lib/taverns.ts'), 'utf8')
assert.ok(tavernsSource.includes('export type PresetImportPreviewItem'))
assert.ok(tavernsSource.includes('export type PresetImportPreviewResponse'))
assert.ok(tavernsSource.includes('export type PresetImportApplyResponse'))
assert.ok(tavernsSource.includes('previewPresetImport'))
assert.ok(tavernsSource.includes('applyPresetImport'))
assert.ok(tavernsSource.includes('/preset-import/preview'))
assert.ok(tavernsSource.includes('/preset-import/apply'))

const ownerPanelSource = readFileSync(join(here, '../app/product/TavernOwnerPanel.jsx'), 'utf8')
assert.ok(ownerPanelSource.includes('PresetImportPreviewModal'))
assert.ok(ownerPanelSource.includes('setPresetImportTavern'))
assert.ok(ownerPanelSource.includes('预览导入'))

const modalSource = readFileSync(join(here, '../app/product/PresetImportPreviewModal.jsx'), 'utf8')
assert.ok(modalSource.includes('previewPresetImport'))
assert.ok(modalSource.includes('applyPresetImport'))
assert.ok(modalSource.includes('确认应用所选 supported'))
assert.ok(modalSource.includes('预览应用 diff'))
assert.ok(modalSource.includes('owner confirmed apply'))
assert.ok(modalSource.includes('blocked') || modalSource.includes('blockedItems'))

const sectionsSource = readFileSync(join(here, '../app/product/OwnerConsoleSections.jsx'), 'utf8')
assert.ok(sectionsSource.includes('onPreviewPresetImport'))

const styleSource = readFileSync(join(here, '../app/product/styles.css'), 'utf8')
assert.ok(styleSource.includes('.preset-import-preview'))

console.log('preset-import-preview-test: ok')
