import { spawn, spawnSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium, expect } from '@playwright/test'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..', '..')
const frontendRoot = resolve(repoRoot, 'frontend')
const artifactDir = resolve(repoRoot, 'artifacts/playwright/revisit-care-notifications')
const baseUrl = process.env.FABLEMAP_PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173'

async function waitForServer(url, timeoutMs = 30000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok || response.status < 500) return
    } catch {
      // Keep waiting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500))
  }
  throw new Error(`Timed out waiting for ${url}`)
}

function startDevServer() {
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const child = spawn(command, ['run', 'dev'], {
    cwd: frontendRoot,
    env: { ...process.env, BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  })
  child.stdout.on('data', () => {})
  child.stderr.on('data', () => {})
  return child
}

function stopDevServer(child) {
  if (!child || child.exitCode !== null) return
  if (process.platform === 'win32' && child.pid) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' })
  }
  child.kill()
}

async function checkViewport(browser, config) {
  const context = await browser.newContext({
    viewport: config.viewport,
    deviceScaleFactor: 1,
    isMobile: config.isMobile || false,
  })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto(`${baseUrl}/notifications?user_id=owner-demo`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('主动回访关怀边界')).toBeVisible()
  await expect(page.getByText('revisit-care · 未启用设计预览')).toBeVisible()
  await expect(page.getByText('不会发送通知')).toBeVisible()
  await expect(page.getByText('默认关闭，必须由访客主动订阅')).toBeVisible()
  await expect(page.getByText('当前不会触达').first()).toBeVisible()

  await page.getByRole('button', { name: /默认未订阅/ }).click()
  await expect(page.getByText('仅可排队站内通知预览')).toBeVisible()

  await page.getByRole('button', { name: /模拟可触达时段/ }).click()
  await expect(page.getByText('当前处于安静时段', { exact: true })).toBeVisible()

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  if (scrollWidth > config.viewport.width + 2) {
    throw new Error(`${config.name} viewport has horizontal overflow: scrollWidth=${scrollWidth}, viewport=${config.viewport.width}`)
  }
  if (pageErrors.length) {
    throw new Error(`${config.name} page errors:\n${pageErrors.join('\n')}`)
  }

  const screenshotPath = resolve(artifactDir, `${config.name}-revisit-care-notifications.png`)
  await page.screenshot({ path: screenshotPath, fullPage: true })
  await context.close()
  return screenshotPath
}

await mkdir(artifactDir, { recursive: true })

const server = startDevServer()
const screenshots = []
try {
  await waitForServer(baseUrl)
  const browser = await chromium.launch()
  try {
    screenshots.push(...[
      await checkViewport(browser, { name: 'desktop', viewport: { width: 1280, height: 1100 } }),
      await checkViewport(browser, { name: 'mobile', viewport: { width: 390, height: 1000 }, isMobile: true }),
    ])
  } finally {
    await browser.close()
  }
} finally {
  stopDevServer(server)
}

const reportPath = resolve(artifactDir, 'report.md')
await writeFile(reportPath, `# Revisit-care Notifications Playwright Check

Date: 2026-05-04

## Assertions

- Notifications route renders the revisit-care policy preview.
- Preview clearly states it is not enabled and does not send notifications.
- Default state blocks touch because opt-in is missing.
- Opt-in preview allows only an in-app notification preview.
- Quiet-hours preview blocks touch again.
- Desktop and mobile/narrow screenshots were captured.

## Screenshots

${screenshots.map((item) => `- \`${item}\``).join('\n')}

## Limits

- This check does not require a backend notification WebSocket.
- No proactive notification scheduling, schema persistence, push, email, SMS, or marketing delivery is enabled.
`, 'utf8')

console.log('revisit-care-playwright-check: ok')
console.log(`report: ${reportPath}`)
