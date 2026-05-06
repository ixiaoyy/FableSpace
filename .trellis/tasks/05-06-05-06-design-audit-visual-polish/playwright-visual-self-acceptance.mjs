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
const demoTavernId = 'visual-audit-demo'
const ownerId = 'owner-visual'

const demoTavern = {
  id: demoTavernId,
  owner_id: ownerId,
  name: '第三货架后面的观测吧台',
  description: '便利店第三排货架后的赛博酒馆，外星社团正在研究人类的马上到、随便和第二件半价。',
  address: '上海市 · 便利店第三货架',
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
      first_mes: '欢迎进入第三货架后面。请解释一种地球异常现象。',
      avatar: '/assets/npcs/public-welfare/char_pw_9_delta/neutral.png',
      tags: ['公益', '外星人', '便利店'],
    },
    {
      id: 'char_pw_pi_pi',
      name: '地球礼仪实习生 Pi-Pi',
      description: '短触角会暴露困惑的外星礼仪实习生。',
      personality: '好奇、积极、容易被带偏。',
      first_mes: '请问“下次一定”是预约、拒绝，还是一种文明谜语？',
      avatar: '/assets/npcs/public-welfare/char_pw_pi_pi/neutral.png',
      tags: ['公益', '外星人', '礼仪'],
    },
  ],
}

const roleplayState = {
  tavern_id: demoTavernId,
  roleplay_mode: 'hybrid',
  characters: demoTavern.characters.map((character) => ({ id: character.id, name: character.name })),
  claims: [
    {
      id: 'claim-visual-1',
      tavern_id: demoTavernId,
      character_id: 'char_pw_pi_pi',
      player_id: 'visitor-visual',
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

    if (path === '/api/v1/taverns') {
      await route.fulfill(json({ taverns: [demoTavern], count: 1 }))
      return
    }

    if (path === `/api/v1/taverns/${demoTavernId}`) {
      await route.fulfill(json(demoTavern))
      return
    }

    if (path === `/api/v1/taverns/${demoTavernId}/roleplay`) {
      await route.fulfill(json(roleplayState))
      return
    }

    if (path === `/api/v1/taverns/${demoTavernId}/roleplay/claims`) {
      await route.fulfill(json(roleplayState))
      return
    }

    if (path.startsWith(`/api/v1/taverns/${demoTavernId}/roleplay/claims/`)) {
      await route.fulfill(json({ ...roleplayState, claims: [] }))
      return
    }

    if (path === `/api/v1/taverns/${demoTavernId}/share`) {
      await route.fulfill(json({
        tavern_id: demoTavernId,
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
      if (request.method() === 'GET') {
        await route.fulfill(json({ messages: [] }))
      } else {
        await route.fulfill(json({ reply: '记录修正：人类把视觉验收称为“看一眼再相信”。', history_written: true }))
      }
      return
    }

    if (path.startsWith('/api/v1/rumors')) {
      await route.fulfill(json({ rumors: [], count: 0 }))
      return
    }

    if (path === '/api/v1/owners/me/default-llm') {
      await route.fulfill(json({ configured: false, config: null }))
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

  await page.goto(`${baseUrl}/discover`, { waitUntil: 'networkidle' })
  await expect(page.getByPlaceholder(/搜索坐标/)).toBeVisible()
  await expect(page.getByText('第三货架后面的观测吧台').first()).toBeVisible()

  if (config.isMobile) {
    await expect(page.locator('[data-discover-filter-shell="mobile-lifted"]')).toBeVisible()
    await expect(page.getByRole('button', { name: /展开调谐/ })).toBeVisible()
    await expect(page.getByText(/移动端默认保留搜索入口/)).toBeVisible()
    screenshots.push(await screenshot(page, config.name, 'discover-collapsed-filters'))
    await page.getByRole('button', { name: /展开调谐/ }).click()
    await expect(page.getByText('场所类型')).toBeVisible()
    await expect(page.getByText('内容标签')).toBeVisible()
    screenshots.push(await screenshot(page, config.name, 'discover-expanded-filters'))
  } else {
    await expect(page.getByText('场所类型')).toBeVisible()
    await expect(page.getByText('内容标签')).toBeVisible()
    screenshots.push(await screenshot(page, config.name, 'discover-filters'))
  }

  await page.goto(`${baseUrl}/create?place_type=tavern&lat=31.2304&lon=121.4737&address=%E4%B8%89%E8%B4%A7%E6%9E%B6`, { waitUntil: 'networkidle' })
  await expect(page.getByText('当前筑梦步骤')).toBeVisible()
  await expect(page.getByText(/Step 01 · 真实坐标/)).toBeVisible()
  await expect(page.getByText(/下一步：/)).toBeVisible()
  screenshots.push(await screenshot(page, config.name, 'create-step-01'))
  await page.getByRole('button', { name: /Step 02/ }).click()
  await expect(page.getByText(/Step 02 · 酒馆内容/)).toBeVisible()
  screenshots.push(await screenshot(page, config.name, 'create-step-02'))

  await page.goto(`${baseUrl}/tavern/${demoTavernId}?owner_id=${ownerId}`, { waitUntil: 'networkidle' })
  await expect(page.locator('[data-chat-workbench="sillytavern-style"]')).toBeVisible()
  await expect(page.locator('[data-secondary-tools="visitor-folded"]')).toBeVisible()
  await expect(page.locator('[data-owner-only-panel]')).toBeVisible()
  await page.locator('[data-owner-only-panel] > summary').click()
  await expect(page.locator('[data-owner-panel-drawer="floating"]')).toBeVisible()
  await expect(page.locator('[data-owner-panel-scroll="bounded"]')).toBeVisible()
  await expect(page.getByText('店主角色控制台')).toBeVisible()
  await expect(page.getByText('扮演模式信号')).toBeVisible()
  await expect(page.getByText('NPC 认领队列')).toBeVisible()
  await expect(page.locator('[data-roleplay-claims="compact"]')).toBeVisible()
  screenshots.push(await screenshot(page, config.name, 'tavern-owner-console'))

  await context.close()
  return { screenshots, consoleErrors }
}

await mkdir(artifactDir, { recursive: true })

const browser = await chromium.launch()
const results = []
try {
  results.push(await checkViewport(browser, {
    name: 'desktop',
    viewport: { width: 1440, height: 1100 },
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
const report = `# Design Audit Visual Polish Playwright Self Acceptance

Date: 2026-05-06

Base URL: ${baseUrl}

## Viewports

- Desktop: 1440 x 1100
- Mobile/narrow: 390 x 920

## Assertions

- Discover renders with fixture tavern data.
- Desktop Discover keeps advanced filters visible.
- Mobile Discover starts with a lifted/brighter filter shell, search + filter summary, and exposes advanced filters after tapping \`展开调谐\`.
- Create page shows the current-step status band and updates it after selecting Step 02.
- Tavern view keeps secondary public tools folded under the chat mainline instead of a permanent right rail.
- Tavern owner view renders the owner-only folded management entry.
- Opening the owner entry reveals a floating bounded drawer with \`店主角色控制台\`, \`扮演模式信号\`, and compact \`NPC 认领队列\`, without stretching the whole page/grid.

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
console.log('design-audit-visual-polish-playwright: ok')
console.log(`report: ${reportPath}`)
screenshots.forEach((item) => console.log(`screenshot: ${item}`))
if (consoleErrors.length) {
  console.log(`console-errors: ${consoleErrors.length}`)
}
