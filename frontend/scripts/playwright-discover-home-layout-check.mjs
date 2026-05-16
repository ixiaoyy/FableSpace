import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const baseUrl = process.env.FABLEMAP_PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174'
const outDir = resolve(process.cwd(), 'artifacts/playwright/discover-home-layout-overlap-fix')
await mkdir(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const report = []

async function checkExpandedDiscover() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1 })
  await page.goto(`${baseUrl}/discover?view=expanded`, { waitUntil: 'networkidle' })
  const userCard = page.locator('[data-fable-map-discover-user-card="right-rail"]').first()
  const worldCard = page.locator('[data-fable-map-world-status-card]').first()
  await userCard.waitFor({ state: 'visible', timeout: 10000 })
  await worldCard.waitFor({ state: 'visible', timeout: 10000 })
  const userBox = await userCard.boundingBox()
  const worldBox = await worldCard.boundingBox()
  if (!userBox || !worldBox) throw new Error('discover expanded right rail boxes unavailable')
  if (userBox.y + userBox.height > worldBox.y - 4) {
    throw new Error(`discover right rail overlap: user bottom ${userBox.y + userBox.height}, world top ${worldBox.y}`)
  }
  await page.screenshot({ path: resolve(outDir, 'discover-expanded-1440.png'), fullPage: true })
  report.push(`PASS discover expanded right rail: user bottom ${Math.round(userBox.y + userBox.height)} < world top ${Math.round(worldBox.y)}`)
  await page.close()
}

async function checkVisitorDiscoverMobile() {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true })
  await page.goto(`${baseUrl}/discover`, { waitUntil: 'networkidle' })
  await page.locator('[data-fable-map-visitor-first-discovery="top-three"]').first().waitFor({ state: 'visible', timeout: 10000 })
  const cardCount = await page.locator('[data-fable-map-discover-card="real-card"]').evaluateAll((els) => els.filter((el) => { const style = getComputedStyle(el); const box = el.getBoundingClientRect(); return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0; }).length)
  if (cardCount > 3) throw new Error(`visitor mobile discover expected <=3 cards, got ${cardCount}`)
  await page.screenshot({ path: resolve(outDir, 'discover-visitor-mobile-390.png'), fullPage: true })
  report.push(`PASS visitor mobile discover: ${cardCount} cards and reduced marker visible`)
  await page.close()
}

async function checkHomeBadge() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1 })
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' })
  const badge = page.locator('[data-fable-map-current-coordinate="shared"]').first()
  const name = page.locator('[data-fable-map-current-coordinate-name="truncate"]').first()
  await badge.waitFor({ state: 'visible', timeout: 10000 })
  await name.waitFor({ state: 'visible', timeout: 10000 })
  const lineHeight = await name.evaluate((el) => Number.parseFloat(getComputedStyle(el).lineHeight || '0'))
  const height = await name.evaluate((el) => el.getBoundingClientRect().height)
  if (lineHeight && height > lineHeight * 1.45) {
    throw new Error(`home coordinate name appears wrapped: height ${height}, line-height ${lineHeight}`)
  }
  await page.screenshot({ path: resolve(outDir, 'home-1440.png'), fullPage: true })
  report.push(`PASS home coordinate badge: title one-line height ${height.toFixed(1)}px`)
  await page.close()
}

try {
  await checkExpandedDiscover()
  await checkVisitorDiscoverMobile()
  await checkHomeBadge()
  await writeFile(resolve(outDir, 'report.md'), `# Discover/Home Layout Overlap Check\n\nBase URL: ${baseUrl}\n\n${report.map((line) => `- ${line}`).join('\n')}\n`, 'utf8')
  console.log(report.join('\n'))
} finally {
  await browser.close()
}
