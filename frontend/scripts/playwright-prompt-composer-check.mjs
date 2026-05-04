import { spawn, spawnSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium, expect } from '@playwright/test'

const here = dirname(fileURLToPath(import.meta.url))
const frontendRoot = resolve(here, '..')
const repoRoot = resolve(frontendRoot, '..')
const artifactDir = resolve(repoRoot, 'artifacts/playwright/prompt-composer-style-dials')
const harnessPath = resolve(frontendRoot, 'build/playwright-harness/prompt-composer-harness.jsx')
const harnessHtmlPath = resolve(frontendRoot, 'build/playwright-harness/prompt-composer-harness.html')
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

async function writeHarness() {
  await mkdir(artifactDir, { recursive: true })
  await mkdir(dirname(harnessPath), { recursive: true })
  const harness = `
import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../app/product/styles.css'
import CharacterEditor from '../../app/product/CharacterEditor.jsx'

const initialCharacter = {
  name: '灯叔',
  description: '深夜便利店柜台旁的赛博酒馆店员。',
  personality: '慢热，短句，愿意解释规则。',
  scenario: '雨夜，门口有人误会了登记册规则。',
  system_prompt: '保持店主确认的边界。',
  first_mes: '伞放这边，别挡门。',
  mes_example: '<START>\\n{{char}}: 我先看登记册。',
  tags: ['便利店', '深夜'],
}

function App() {
  const [saved, setSaved] = useState(null)
  return (
    <main className="app-shell">
      <div className="modal-content panel" style={{ maxWidth: 980, margin: '24px auto' }}>
        <CharacterEditor
          value={initialCharacter}
          onSave={setSaved}
          title="Prompt Composer Harness"
          submitLabel="保存测试角色"
        />
        <pre data-testid="saved-payload">{saved ? JSON.stringify(saved, null, 2) : ''}</pre>
      </div>
    </main>
  )
}

createRoot(document.getElementById('root')).render(<App />)
`
  await writeFile(harnessPath, harness, 'utf8')
  await writeFile(harnessHtmlPath, `<!doctype html>
<html lang="zh-CN">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
  <body>
    <div id="root"></div>
    <script type="module">
      import '/@id/__x00__virtual:react-router/inject-hmr-runtime'
    </script>
    <script type="module" src="/@vite/client"></script>
    <script type="module" src="./prompt-composer-harness.jsx"></script>
  </body>
</html>
`, 'utf8')
}

async function checkViewport(browser, config) {
  const context = await browser.newContext({
    viewport: config.viewport,
    deviceScaleFactor: 1,
    isMobile: config.isMobile || false,
  })
  const page = await context.newPage()
  const diagnostics = []
  page.on('console', (message) => {
    diagnostics.push(`[console:${message.type()}] ${message.text()}`)
  })
  page.on('pageerror', (error) => {
    diagnostics.push(`[pageerror] ${error.message}`)
  })
  const harnessUrl = `${baseUrl}/@fs/${harnessHtmlPath.replace(/\\/g, '/')}`
  const harnessResponse = await page.request.get(harnessUrl)
  diagnostics.push(`[harness] ${harnessResponse.status()} ${harnessUrl}`)
  await page.goto(harnessUrl, { waitUntil: 'domcontentloaded' })
  try {
    await expect(page.getByText('Prompt Composer Harness')).toBeVisible()
  } catch (error) {
    diagnostics.push(`[body] ${(await page.locator('body').innerText()).slice(0, 600)}`)
    throw new Error(`${config.name} harness did not render:\n${diagnostics.join('\n')}\n${error.message}`)
  }
  await page.getByText('Prompt Composer / Style Dials').click()
  await expect(page.getByLabel('Prompt Layer Preview')).toBeVisible()

  await page.getByRole('button', { name: /短句/ }).click()
  await page.getByRole('button', { name: /对话优先/ }).click()
  await page.getByRole('button', { name: /NPC 第一人称/ }).click()
  await page.getByRole('button', { name: /应用到角色指令/ }).click()

  const systemPrompt = page.locator('label', { hasText: '角色指令（高级）' }).locator('textarea')
  await expect(systemPrompt).toContainText('FableMap 风格拨盘')
  await expect(systemPrompt).toContainText('短句')
  await expect(systemPrompt).toContainText('不要替访客说话')
  await expect(page.getByLabel('角色 Prompt 风险检查')).toBeVisible()

  const screenshotPath = resolve(artifactDir, `${config.name}-prompt-composer.png`)
  await page.screenshot({ path: screenshotPath, fullPage: true })
  await context.close()
  return screenshotPath
}

await writeHarness()

const server = startDevServer()
const screenshots = []
try {
  await waitForServer(baseUrl)
  const browser = await chromium.launch()
  try {
    screenshots.push(...[
      await checkViewport(browser, { name: 'desktop', viewport: { width: 1280, height: 1100 } }),
      await checkViewport(browser, { name: 'mobile', viewport: { width: 390, height: 920 }, isMobile: true }),
    ])
  } finally {
    await browser.close()
  }
} finally {
  stopDevServer(server)
}

const reportPath = resolve(artifactDir, 'report.md')
await writeFile(reportPath, `# Prompt Composer Style Dials Playwright Check

Date: 2026-05-04

## Assertions

- CharacterEditor renders a Prompt Composer / Style Dials panel.
- Desktop and mobile/narrow viewport can expand the panel.
- Style dial buttons update the local draft.
- Applying dials writes a managed FableMap style block into the existing \`system_prompt\` field.
- Prompt risk panel remains visible after applying style dials.

## Screenshots

${screenshots.map((item) => `- \`${item}\``).join('\n')}

## Limits

- Harness renders CharacterEditor through Vite/Playwright without backend calls.
- No Tavern schema/API/storage behavior changed.
`, 'utf8')

console.log('prompt-composer-playwright-check: ok')
console.log(`report: ${reportPath}`)
