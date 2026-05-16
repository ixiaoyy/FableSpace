import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '@playwright/test'

const baseURL = process.env.FABLEMAP_PLAYWRIGHT_BASE_URL || ''
const outputDir = path.resolve('artifacts/playwright/npc-duel-rps')

if (!baseURL) {
  console.log('playwright-npc-rps-check: skipped (set FABLEMAP_PLAYWRIGHT_BASE_URL to run browser self-acceptance)')
  process.exit(0)
}

await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch()

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await page.goto(`${baseURL.replace(/\/$/, '')}/tavern/pw_lantern_helpdesk`, { waitUntil: 'domcontentloaded' })
  await page.getByText('桌边小玩法 · 不挡聊天输入').click()
  await page.getByRole('button', { name: /NPC 猜拳心理战/ }).click()
  await page.getByRole('button', { name: /石头/ }).click()
  await page.locator('.tavern-rps-duel').screenshot({ path: path.join(outputDir, 'desktop-1440.png') })
  await page.getByText(/你出|三手小局开始/).first().waitFor({ state: 'visible' })

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true })
  await mobile.goto(`${baseURL.replace(/\/$/, '')}/tavern/pw_lantern_helpdesk`, { waitUntil: 'domcontentloaded' })
  await mobile.getByText('桌边小玩法 · 不挡聊天输入').click()
  await mobile.getByRole('button', { name: /NPC 猜拳心理战/ }).click()
  await mobile.locator('.tavern-rps-duel').screenshot({ path: path.join(outputDir, 'mobile-390.png') })

  console.log('playwright-npc-rps-check: ok')
} finally {
  await browser.close()
}
