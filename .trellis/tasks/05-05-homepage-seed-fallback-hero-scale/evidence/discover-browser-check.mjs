import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { pathToFileURL } from "node:url"
import { writeFile } from "node:fs/promises"
import { resolve } from "node:path"

const require = createRequire(pathToFileURL(resolve("frontend/package.json")))
const { chromium } = require("playwright")

const baseUrl = "http://127.0.0.1:5173/discover"
const evidenceDir = resolve(".trellis/tasks/05-05-homepage-seed-fallback-hero-scale/evidence")
const report = { url: baseUrl, screenshots: [], checks: [], pageErrors: [] }

async function checkViewport(browser, name, viewport) {
  const page = await browser.newPage({ viewport })
  page.on("pageerror", (error) => report.pageErrors.push(`${name}: ${error.message}`))
  page.on("console", (message) => {
    if (message.type() === "error") report.pageErrors.push(`${name} console: ${message.text()}`)
  })

  await page.goto(baseUrl, { waitUntil: "networkidle" })
  await page.getByText(/个坐标.*接入发现流|个坐标.*符合查找/).first().waitFor({ timeout: 10_000 })

  const pageText = await page.locator("body").innerText()
  assert.ok(!pageText.includes("暂时没有亮起的区域"), `${name}: discover should not show empty state`)
  assert.ok(pageText.includes("公益·第三货架观测站") || pageText.includes("公益·灯塔问讯台"), `${name}: discover should show public-welfare taverns`)
  assert.ok(/\b10\s*个坐标/.test(pageText) || /\b9\s*个坐标/.test(pageText), `${name}: discover should show non-zero coordinate count`)

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  assert.equal(hasHorizontalOverflow, false, `${name}: viewport should not have horizontal overflow`)

  const screenshotPath = resolve(evidenceDir, `discover-${name}.png`)
  await page.screenshot({ path: screenshotPath, fullPage: true })
  report.screenshots.push(screenshotPath)
  report.checks.push(`${name}: loaded, public-welfare taverns visible, non-zero coordinate count, no horizontal overflow`)
  await page.close()
}

const browser = await chromium.launch()
try {
  await checkViewport(browser, "desktop", { width: 1440, height: 1000 })
  await checkViewport(browser, "mobile", { width: 390, height: 900 })
  assert.deepEqual(report.pageErrors, [], "discover should not emit page errors")
} finally {
  await browser.close()
}

await writeFile(resolve(evidenceDir, "discover-browser-check.json"), JSON.stringify(report, null, 2), "utf8")
console.log("discover-browser-check: ok")
console.log(JSON.stringify(report, null, 2))
