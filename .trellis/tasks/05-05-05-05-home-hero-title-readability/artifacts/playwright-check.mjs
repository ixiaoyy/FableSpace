import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

const require = createRequire(pathToFileURL(resolve("frontend/package.json")).href)
const { chromium } = require("playwright")

const baseUrl = process.env.FABLEMAP_URL || "http://127.0.0.1:8950/"
const artifactDir = resolve(".trellis/tasks/05-05-05-05-home-hero-title-readability/artifacts")
const results = []

async function checkViewport(page, viewport, name) {
  await page.setViewportSize(viewport)
  await page.goto(baseUrl, { waitUntil: "networkidle" })
  const title = page.getByRole("heading", { name: /真实坐标/ }).first()
  await title.waitFor({ state: "visible", timeout: 15000 })
  const metrics = await title.evaluate((node) => {
    const style = window.getComputedStyle(node)
    return {
      text: node.textContent || "",
      fontSize: Number.parseFloat(style.fontSize),
      lineHeight: Number.parseFloat(style.lineHeight),
      fontWeight: style.fontWeight,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }
  })
  assert.ok(metrics.text.includes("会回应的世界"), `${name}: title should use concise revised copy`)
  assert.ok(metrics.fontSize <= (name === "desktop" ? 42 : 34), `${name}: title font should not be oversized (${metrics.fontSize}px)`)
  assert.ok(metrics.lineHeight / metrics.fontSize >= 1.12, `${name}: title line-height should be breathable`)
  assert.ok(Number(metrics.fontWeight) <= 800, `${name}: title should avoid font-black weight`)
  assert.ok(metrics.scrollWidth <= metrics.innerWidth + 1, `${name}: page should not horizontally overflow`)
  const screenshot = resolve(artifactDir, `${name}.png`)
  await page.screenshot({ path: screenshot, fullPage: true })
  results.push({ name, screenshot, metrics })
}

const browser = await chromium.launch()
const page = await browser.newPage()
const pageErrors = []
page.on("pageerror", (error) => pageErrors.push(error.message))
page.on("console", (message) => {
  if (message.type() === "error") pageErrors.push(message.text())
})

await checkViewport(page, { width: 1440, height: 900 }, "desktop")
await checkViewport(page, { width: 390, height: 844 }, "mobile")
await browser.close()

assert.deepEqual(pageErrors, [], "homepage should not emit uncaught browser errors")
writeFileSync(resolve(artifactDir, "playwright-report.json"), JSON.stringify({ ok: true, baseUrl, results }, null, 2), "utf8")
console.log(JSON.stringify({ ok: true, results }, null, 2))

