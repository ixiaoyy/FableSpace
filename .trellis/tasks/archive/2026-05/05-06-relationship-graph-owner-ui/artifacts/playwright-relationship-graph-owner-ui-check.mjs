import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium, expect } from '@playwright/test'

const here = dirname(fileURLToPath(import.meta.url))
const artifactDir = resolve(here, 'playwright')
const baseUrl = process.env.FABLEMAP_PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173'

const tavern = {
  id: 'tavern-owner-graph-demo',
  owner_id: 'owner-alpha',
  name: '雾灯档案馆',
  description: '店主治理台用于管理空间关系边与角色立场。',
  lat: 31.2304,
  lon: 121.4737,
  access: 'public',
  status: 'open',
  characters: [
    { id: 'char-archivist', name: '档案员鹿鸣' },
    { id: 'char-guard', name: '夜门卫阿砚' },
  ],
}

let edges = [
  {
    id: 'edge-pending-rival',
    source_owner_id: 'owner-alpha',
    source_tavern_id: tavern.id,
    source_node_type: 'tavern',
    source_node_id: tavern.id,
    target_owner_id: 'owner-beta',
    target_tavern_id: 'tavern-rain-market',
    target_node_type: 'tavern',
    target_node_id: 'tavern-rain-market',
    behavior_type: 'rival',
    display_name: '与雨市互相较劲',
    description: '跨 owner 的单边竞争视角，不代表对方已接受。',
    strength_preset: 'normal',
    status: 'pending',
    governance_mode: 'manual',
    confirmed_by: '',
    confirmed_by_type: '',
    perspective_scope: 'source_owner',
    created_at: '2026-05-07T10:00:00Z',
    updated_at: '2026-05-07T10:00:00Z',
    metadata: {},
  },
  {
    id: 'edge-friendly-character',
    source_owner_id: 'owner-alpha',
    source_tavern_id: tavern.id,
    source_node_type: 'character',
    source_node_id: 'char-archivist',
    target_owner_id: 'owner-alpha',
    target_tavern_id: tavern.id,
    target_node_type: 'character',
    target_node_id: 'char-guard',
    behavior_type: 'friendly',
    display_name: '馆内默契搭档',
    description: '同 owner 的角色关系，可视作本地 canon。',
    strength_preset: 'strong',
    status: 'confirmed',
    governance_mode: 'manual',
    confirmed_by: 'owner-alpha',
    confirmed_by_type: 'owner',
    perspective_scope: 'source_owner',
    created_at: '2026-05-07T09:00:00Z',
    updated_at: '2026-05-07T09:30:00Z',
    metadata: {},
  },
]

function json(payload) {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  }
}

async function installApiFixtures(page) {
  await page.route('**/api/v1/taverns/tavern-owner-graph-demo/roleplay', (route) => route.fulfill(json({
    tavern_id: tavern.id,
    roleplay_mode: 'ai_only',
    claims: [],
    characters: tavern.characters,
  })))

  await page.route('**/api/v1/taverns/tavern-owner-graph-demo/relationship-edges/edge-pending-rival/decision', async (route) => {
    const body = route.request().postDataJSON() || {}
    const status = String(body.status || 'pending')
    edges = edges.map((edge) => edge.id === 'edge-pending-rival' ? { ...edge, status, confirmed_by: status === 'confirmed' ? 'owner-alpha' : '', confirmed_by_type: status === 'confirmed' ? 'owner' : '', updated_at: '2026-05-07T11:00:00Z' } : edge)
    await route.fulfill(json({ ok: true, edge: edges.find((edge) => edge.id === 'edge-pending-rival') }))
  })

  await page.route('**/api/v1/taverns/tavern-owner-graph-demo/relationship-edges', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill(json({ edges, count: edges.length }))
      return
    }
    const body = route.request().postDataJSON() || {}
    const created = {
      id: 'edge-created-friendly',
      source_owner_id: 'owner-alpha',
      source_tavern_id: tavern.id,
      source_node_type: String(body.source_node_type || 'tavern'),
      source_node_id: String(body.source_node_id || tavern.id),
      target_owner_id: 'owner-gamma',
      target_tavern_id: String(body.target_tavern_id || 'tavern-gamma'),
      target_node_type: String(body.target_node_type || 'tavern'),
      target_node_id: String(body.target_node_id || body.target_tavern_id || 'tavern-gamma'),
      behavior_type: String(body.behavior_type || 'friendly'),
      display_name: String(body.display_name || '新建关系边'),
      description: String(body.description || ''),
      strength_preset: String(body.strength_preset || 'normal'),
      status: String(body.status || 'confirmed'),
      governance_mode: String(body.governance_mode || 'manual'),
      confirmed_by: String(body.status || 'confirmed') === 'confirmed' ? 'owner-alpha' : '',
      confirmed_by_type: String(body.confirmed_by_type || 'owner'),
      perspective_scope: 'source_owner',
      created_at: '2026-05-07T11:30:00Z',
      updated_at: '2026-05-07T11:30:00Z',
      metadata: {},
    }
    edges = [created, ...edges.filter((edge) => edge.id !== created.id)]
    await route.fulfill(json({ ok: true, edge: created }))
  })

  await page.route('**/api/v1/taverns/tavern-owner-graph-demo', (route) => route.fulfill(json(tavern)))
}

async function checkViewport(browser, config) {
  const context = await browser.newContext({
    viewport: config.viewport,
    deviceScaleFactor: 1,
    isMobile: config.isMobile || false,
  })
  const page = await context.newPage()
  await installApiFixtures(page)

  await page.goto(`${baseUrl}/tavern/${tavern.id}/manage?owner_id=owner-alpha`, { waitUntil: 'networkidle' })
  await expect(page.getByText('关系图谱治理台')).toBeVisible()
  await expect(page.getByText('与雨市互相较劲')).toBeVisible()
  await expect(page.getByText('单边 perspective')).toBeVisible()

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  if (overflow > 4) throw new Error(`Unexpected horizontal overflow: ${overflow}`)

  const initialPath = resolve(artifactDir, `${config.name}-relationship-graph-owner-ui.png`)
  await page.screenshot({ path: initialPath, fullPage: true })

  if (!config.isMobile) {
    await page.getByLabel('目标 Tavern ID').fill('tavern-gamma')
    await page.getByLabel('展示名').fill('夜市互助观察')
    await page.getByRole('button', { name: '创建关系边' }).click()
    await expect(page.getByText('关系边已创建。')).toBeVisible()
    await expect(page.getByText('夜市互助观察')).toBeVisible()

    await page.getByRole('button', { name: '批准' }).click()
    await expect(page.getByText('待确认关系已批准。')).toBeVisible()

    const afterPath = resolve(artifactDir, `${config.name}-relationship-graph-owner-ui-after-actions.png`)
    await page.screenshot({ path: afterPath, fullPage: true })
    await context.close()
    return [initialPath, afterPath]
  }

  await context.close()
  return [initialPath]
}

await mkdir(artifactDir, { recursive: true })

const browser = await chromium.launch()
const screenshots = []
try {
  screenshots.push(...await checkViewport(browser, {
    name: 'desktop',
    viewport: { width: 1440, height: 1200 },
  }))
  screenshots.push(...await checkViewport(browser, {
    name: 'mobile',
    viewport: { width: 390, height: 920 },
    isMobile: true,
  }))
} finally {
  await browser.close()
}

const reportPath = resolve(artifactDir, 'report.md')
const report = `# Relationship Graph Owner UI Playwright Self Acceptance

Date: 2026-05-07

Base URL: ${baseUrl}
Route: /tavern/${tavern.id}/manage?owner_id=owner-alpha

## Assertions

- Owner management route renders the relationship graph panel on desktop and mobile viewports.
- Existing pending cross-owner edge is visibly labeled as a one-sided perspective.
- Desktop flow can create a new edge and approve a pending edge through mocked owner APIs.
- Narrow/mobile viewport has no obvious horizontal overflow.

## Screenshots

${screenshots.map((item) => `- \`${item}\``).join('\n')}

## Limits

- Playwright uses mocked API fixtures; it validates frontend behavior, not backend persistence.
- Chromium only.
`
await writeFile(reportPath, report, 'utf8')
console.log(`relationship-graph-owner-ui-playwright-check: ok`)
console.log(`report: ${reportPath}`)
