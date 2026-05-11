import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const taskRoot = here
const repoRoot = resolve(taskRoot, '../../..')
const require = createRequire(resolve(repoRoot, 'frontend/package.json'))
const { chromium, expect } = require('@playwright/test')
const artifactDir = resolve(taskRoot, 'artifacts/playwright')
const baseUrl = process.env.FABLEMAP_PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173'
const demoTavernId = 'owner-visitor-split-demo'
const ownerId = 'owner-split'
const visitorId = 'visitor-split'

const demoTavern = {
  id: demoTavernId,
  owner_id: ownerId,
  name: '第三货架后面的观测吧台',
  description: '便利店第三排货架后的空间，外星社团正在研究人类的马上到、随便和第二件半价。',
  address: '上海市 · 便利店第三货架',
  lat: 31.2304,
  lon: 121.4737,
  latitude: 31.2304,
  longitude: 121.4737,
  place_type: 'tavern',
  status: 'open',
  access: 'public',
  is_open: true,
  local_time_display: '22:18',
  roleplay_mode: 'hybrid',
  visit_count: 42,
  scene_prompt: '冷白货架灯、关东煮蒸汽、收据扫描线和一张坐标门牌。',
  characters: [
    {
      id: 'char_pw_9_delta',
      name: '社长 9-Delta',
      description: '严肃礼貌的外星人类行为学研究负责人。',
      personality: '严谨、客气、求知欲极强。',
      gender: 'unspecified',
      first_mes: '欢迎进入第三货架后面。请解释一种地球异常现象。',
      avatar: '/assets/npcs/public-welfare/char_pw_9_delta/neutral.png',
      tags: ['公益', '外星人', '便利店'],
    },
    {
      id: 'char_pw_pi_pi',
      name: '地球礼仪实习生 Pi-Pi',
      description: '短触角会暴露困惑的外星礼仪实习生。',
      personality: '好奇、积极、容易被带偏。',
      gender: 'unspecified',
      first_mes: '请问“下次一定”是预约、拒绝，还是一种文明谜语？',
      avatar: '/assets/npcs/public-welfare/char_pw_pi_pi/neutral.png',
      tags: ['公益', '外星人', '礼仪'],
    },
  ],
}

const roleplayState = {
  tavern_id: demoTavernId,
  roleplay_mode: 'hybrid',
  characters: demoTavern.characters.map((character) => ({ id: character.id, name: character.name, avatar: character.avatar })),
  claims: [
    {
      id: 'claim-split-1',
      tavern_id: demoTavernId,
      character_id: 'char_pw_pi_pi',
      player_id: visitorId,
      player_name: '灯牌访客',
      status: 'pending',
    },
  ],
}

function json(payload) {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  }
}

async function installApiFixtures(page) {
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname

    if (path === `/api/v1/taverns/${demoTavernId}`) {
      await route.fulfill(json(demoTavern))
      return
    }

    if (path === `/api/v1/taverns/${demoTavernId}/roleplay`) {
      await route.fulfill(json(roleplayState))
      return
    }

    if (path === `/api/v1/taverns/${demoTavernId}/share`) {
      await route.fulfill(json({
        tavern_id: demoTavernId,
        title: demoTavern.name,
        description: demoTavern.description,
        short_description: demoTavern.description,
        cover: '',
        location: { lat: demoTavern.lat, lon: demoTavern.lon, address: demoTavern.address },
        status: demoTavern.status,
        access: demoTavern.access,
        tags: ['公益', '便利店'],
        characters: demoTavern.characters.map((character) => ({ id: character.id, name: character.name, avatar: character.avatar })),
        character_count: demoTavern.characters.length,
        share_url: `/tavern/${demoTavernId}`,
        share_title: demoTavern.name,
        share_text: `${demoTavern.name}：${demoTavern.description}`,
      }))
      return
    }

    if (path === `/api/v1/taverns/${demoTavernId}/enter`) {
      await route.fulfill(json({ ok: true, first_mes: demoTavern.characters[0].first_mes, visitor_state: null }))
      return
    }

    if (path === `/api/v1/taverns/${demoTavernId}/chat`) {
      await route.fulfill(json({ messages: [] }))
      return
    }

    if (path.startsWith('/api/v1/rumors')) {
      await route.fulfill(json({ rumors: [], count: 0 }))
      return
    }

    await route.fulfill(json({ ok: true }))
  })
}

async function screenshot(page, viewportName, name) {
  const path = resolve(artifactDir, `${viewportName}-${name}.png`)
  await page.screenshot({ path, fullPage: true })
  return path
}

async function expectNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow, `${label} should not have obvious horizontal overflow`).toBeLessThanOrEqual(2)
}

async function checkViewport(browser, config) {
  const context = await browser.newContext({
    viewport: config.viewport,
    deviceScaleFactor: 1,
    isMobile: Boolean(config.isMobile),
  })
  const page = await context.newPage()
  await installApiFixtures(page)

  const consoleErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))

  const screenshots = []

  await page.goto(`${baseUrl}/tavern/${demoTavernId}?visitor_id=${visitorId}`, { waitUntil: 'networkidle' })
  await expect(page.locator('[data-chat-workbench="sillytavern-style"]')).toBeVisible()
  await expect(page.locator('[data-chat-composer="fast-entry"]')).toBeVisible()
  await expect(page.locator('[data-secondary-tools="visitor-folded"]')).toBeVisible()
  await expect(page.locator('[data-owner-only-panel]')).toHaveCount(0)
  await expect(page.getByText('店主角色控制台')).toHaveCount(0)
  await expect(page.getByText('店主管理')).toHaveCount(0)
  await expectNoHorizontalOverflow(page, `${config.name} visitor route`)
  screenshots.push(await screenshot(page, config.name, 'visitor-chat-only'))

  await page.goto(`${baseUrl}/tavern/${demoTavernId}/manage?owner_id=${ownerId}`, { waitUntil: 'networkidle' })
  await expect(page.locator('[data-tavern-owner-management="dedicated-route"]')).toBeVisible()
  await expect(page.locator('[data-owner-only-panel]')).toBeVisible()
  await expect(page.getByText('只处理管理，不默认聊天').first()).toBeVisible()
  await expect(page.getByText('店主角色控制台')).toBeVisible()
  await expect(page.getByText('扮演模式信号')).toBeVisible()
  await expect(page.locator('[data-chat-workbench="sillytavern-style"]')).toHaveCount(0)
  await expect(page.locator('[data-chat-composer="fast-entry"]')).toHaveCount(0)
  await expect(page.getByText('预览访客视角')).toBeVisible()
  await expectNoHorizontalOverflow(page, `${config.name} owner manage route`)
  screenshots.push(await screenshot(page, config.name, 'owner-management-only'))

  await context.close()
  return { screenshots, consoleErrors }
}

await mkdir(artifactDir, { recursive: true })

const browser = await chromium.launch()
const results = []
try {
  results.push(await checkViewport(browser, {
    name: 'desktop',
    viewport: { width: 1440, height: 1000 },
  }))
  results.push(await checkViewport(browser, {
    name: 'mobile',
    viewport: { width: 390, height: 920 },
    isMobile: true,
  }))
} finally {
  await browser.close()
}

const screenshots = results.flatMap((result) => result.screenshots)
const consoleErrors = results.flatMap((result) => result.consoleErrors)
const reportPath = resolve(artifactDir, 'report.md')
const report = `# Tavern Owner/Visitor View Separation Playwright Self Acceptance

Date: 2026-05-06

Base URL: ${baseUrl}

## Viewports

- Desktop: 1440 x 1000
- Mobile/narrow: 390 x 920

## Assertions

- Visitor route \`/tavern/:id\` loads the SillyTavern-style chat workbench.
- Visitor route shows the chat composer and folded public tools.
- Visitor route has no \`data-owner-only-panel\`, no \`店主角色控制台\`, and no \`店主管理\` entry.
- Owner route \`/tavern/:id/manage?owner_id=<owner>\` loads \`data-tavern-owner-management="dedicated-route"\`.
- Owner route renders owner management panels and does not render the chat workbench or composer.
- Desktop and mobile routes have no obvious horizontal overflow.

## Screenshots

${screenshots.map((item) => `- \`${item}\``).join('\n')}

## Console errors

${consoleErrors.length ? consoleErrors.map((item) => `- ${item}`).join('\n') : '- None captured during checked pages.'}

## Limits

- Chromium only.
- API calls are fulfilled with Playwright route fixtures; this is a frontend visual self-acceptance pass and does not exercise the backend.
- Screenshots are saved as task artifacts, not product image assets.
`

await writeFile(reportPath, report, 'utf8')
console.log('tavern-owner-visitor-view-separation-playwright: ok')
console.log(`report: ${reportPath}`)
screenshots.forEach((item) => console.log(`screenshot: ${item}`))
if (consoleErrors.length) {
  console.log(`console-errors: ${consoleErrors.length}`)
}
