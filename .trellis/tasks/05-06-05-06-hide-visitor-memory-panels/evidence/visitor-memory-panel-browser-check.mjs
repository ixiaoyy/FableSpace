import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { pathToFileURL } from "node:url"
import { writeFile } from "node:fs/promises"
import { resolve } from "node:path"

const require = createRequire(pathToFileURL(resolve("frontend/package.json")))
const { chromium } = require("playwright")

const baseUrl = "http://127.0.0.1:5173/tavern/pw_third_shelf_observatory?visitor_id=privacy_ui_check"
const evidenceDir = resolve(".trellis/tasks/05-06-05-06-hide-visitor-memory-panels/evidence")
const hiddenCopy = [
  "对话记忆",
  "当前访客的身份与回访状态",
  "本次会话尚未写入回访状态",
  "对话记录会持续写回记忆",
  "聊天历史暂时不可用",
]
const report = { url: baseUrl, screenshots: [], checks: [], pageErrors: [] }

async function checkViewport(browser, name, viewport) {
  const page = await browser.newPage({ viewport })
  page.on("pageerror", (error) => report.pageErrors.push(`${name}: ${error.message}`))
  page.on("console", (message) => {
    if (message.type() === "error") report.pageErrors.push(`${name} console: ${message.text()}`)
  })

  await page.goto(baseUrl, { waitUntil: "networkidle" })
  await page.getByText(/社长 9-Delta|公益·第三货架观测站|第三货架/).first().waitFor({ timeout: 15_000 })
  await page.getByText("聊天辅助").waitFor({ timeout: 10_000 })
  await page.getByText("更多酒馆功能").waitFor({ timeout: 10_000 })

  const pageText = await page.locator("body").innerText()
  for (const snippet of hiddenCopy) {
    assert.ok(!pageText.includes(snippet), `${name}: visitor-facing UI should hide internal memory/status copy: ${snippet}`)
  }
  assert.ok(pageText.includes("可以这样开口"), `${name}: chat helper prompts should remain visible`)
  assert.ok(pageText.includes("我第一次来这里，最适合先观察什么？"), `${name}: starter copy should avoid memory writeback wording`)

  const sidecarSectionCount = await page.locator('aside[data-chat-sidecar="conversation-context"] details').count()
  assert.ok(sidecarSectionCount >= 2, `${name}: sidecar should keep chat helper and public function sections`)

  const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  assert.equal(hasHorizontalOverflow, false, `${name}: viewport should not have horizontal overflow`)

  const screenshotPath = resolve(evidenceDir, `visitor-memory-panel-${name}.png`)
  await page.screenshot({ path: screenshotPath, fullPage: true })
  report.screenshots.push(screenshotPath)
  report.checks.push(`${name}: tavern loaded, memory/status panel copy hidden, chat helper remains, no horizontal overflow`)
  await page.close()
}

const browser = await chromium.launch()
try {
  await checkViewport(browser, "desktop", { width: 1440, height: 1000 })
  await checkViewport(browser, "mobile", { width: 390, height: 900 })
  assert.deepEqual(report.pageErrors, [], "tavern chat page should not emit page errors")
} finally {
  await browser.close()
}

await writeFile(resolve(evidenceDir, "visitor-memory-panel-browser-check.json"), JSON.stringify(report, null, 2), "utf8")
console.log("visitor-memory-panel-browser-check: ok")
console.log(JSON.stringify(report, null, 2))
