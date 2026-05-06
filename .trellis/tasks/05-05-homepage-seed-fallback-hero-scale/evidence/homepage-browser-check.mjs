import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { pathToFileURL } from "node:url"
import { writeFile } from "node:fs/promises"
import { resolve } from "node:path"

const require = createRequire(pathToFileURL(resolve("frontend/package.json")))
const { chromium } = require("playwright")

const baseUrl = "http://127.0.0.1:5173/"
const evidenceDir = resolve(".trellis/tasks/05-05-homepage-seed-fallback-hero-scale/evidence")
const report = {
  url: baseUrl,
  screenshots: [],
  checks: [],
  pageErrors: [],
}

async function checkViewport(browser, name, viewport) {
  const page = await browser.newPage({ viewport })
  page.on("pageerror", (error) => report.pageErrors.push(`${name}: ${error.message}`))
  page.on("console", (message) => {
    if (message.type() === "error") report.pageErrors.push(`${name} console: ${message.text()}`)
  })

  await page.goto(baseUrl, { waitUntil: "networkidle" })
  await page.getByRole("heading", { name: /真实坐标/ }).waitFor({ timeout: 10_000 })
  await page.getByText(/公益·灯塔问讯台|公益·第三货架观测站/).first().waitFor({ timeout: 10_000 })

  const pageText = await page.locator("body").innerText()
  assert.ok(!pageText.includes("暂时没有可展示的真实坐标入口"), `${name}: homepage should not show the empty real-coordinate state`)
  assert.ok(pageText.includes("公益·灯塔问讯台") || pageText.includes("公益·第三货架观测站"), `${name}: public-welfare tavern cards should be visible`)
  assert.ok(/9\s*真实坐标/.test(pageText) || /真实坐标[\s\S]*9/.test(pageText), `${name}: coordinate metric should be non-zero`)
  assert.ok(/AI 角色/.test(pageText) && !/0\s*AI 角色/.test(pageText), `${name}: character metric should be non-zero`)

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  assert.equal(hasHorizontalOverflow, false, `${name}: viewport should not have horizontal overflow`)

  const screenshotPath = resolve(evidenceDir, `homepage-${name}.png`)
  await page.screenshot({ path: screenshotPath, fullPage: true })
  report.screenshots.push(screenshotPath)
  report.checks.push(`${name}: loaded, seed cards visible, non-zero metrics, no horizontal overflow`)
  await page.close()
}

const browser = await chromium.launch()
try {
  await checkViewport(browser, "desktop", { width: 1440, height: 1000 })
  await checkViewport(browser, "mobile", { width: 390, height: 900 })
  assert.deepEqual(report.pageErrors, [], "homepage should not emit page errors")
} finally {
  await browser.close()
}

await writeFile(resolve(evidenceDir, "homepage-browser-check.json"), JSON.stringify(report, null, 2), "utf8")
console.log("homepage-browser-check: ok")
console.log(JSON.stringify(report, null, 2))
