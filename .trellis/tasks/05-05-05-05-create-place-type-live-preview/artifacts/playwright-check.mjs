import { chromium } from "../../../../frontend/node_modules/@playwright/test/index.mjs"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const artifactDir = __dirname
const baseUrl = process.env.FABLEMAP_FRONTEND_URL || "http://127.0.0.1:4179/create"

await mkdir(artifactDir, { recursive: true })
const browser = await chromium.launch()
const report = { baseUrl, checks: [], screenshots: {} }

async function installRoutes(page) {
  await page.route("**/favicon.ico", async (route) => {
    await route.fulfill({ status: 204, body: "" })
  })
  await page.route("**/api/v1/owners/me/default-llm", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ configured: false, llm_config: { backend: "", model: "", api_key_configured: false, base_url: "", temperature: 0.7, max_tokens: 1000, top_p: 1 } }),
    })
  })
}

async function expectPreview(page, expected) {
  const preview = page.locator("[data-create-live-preview]")
  await preview.waitFor({ state: "visible", timeout: 10000 })
  const text = await preview.innerText()
  for (const item of expected) {
    if (!text.includes(item)) throw new Error(`preview missing ${item}; got ${text.slice(0, 240)}`)
  }
}

async function checkViewport(name, viewport) {
  const page = await browser.newPage({ viewport })
  const consoleErrors = []
  const notFoundUrls = []
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })
  page.on("response", (response) => {
    if (response.status() === 404) notFoundUrls.push(response.url())
  })
  await installRoutes(page)
  await page.goto(baseUrl, { waitUntil: "networkidle" })

  await expectPreview(page, ["酒馆 空间预览", "夜色、霓虹", "首个 酒馆 NPC"])
  await page.getByRole("button", { name: /餐馆/ }).click()
  await expectPreview(page, ["餐馆 空间预览", "正餐、仪式感", "首个 餐馆 NPC", "餐馆开店检查"])
  await page.getByRole("button", { name: /医院/ }).click()
  await expectPreview(page, ["医院 空间预览", "夜间分诊", "首个 医院 NPC", "医院开店检查"])
  await page.getByRole("button", { name: /Home/ }).click()
  await expectPreview(page, ["Home 空间预览", "默认私密", "首个 Home NPC", "Home开店检查"])
  await page.getByRole("button", { name: /餐馆/ }).click()
  await expectPreview(page, ["餐馆 空间预览", "正餐、仪式感", "首个 餐馆 NPC", "餐馆开店检查"])

  const overflow = await page.locator("body").evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  report.checks.push({ viewport: name, overflow })
  if (overflow.scrollWidth > overflow.clientWidth + 2) throw new Error(`${name}: horizontal overflow`)

  const screenshot = resolve(artifactDir, `${name}.png`)
  await page.screenshot({ path: screenshot, fullPage: true })
  report.screenshots[name] = screenshot
  report.checks.push({ viewport: name, consoleErrorCount: consoleErrors.length, notFoundUrls })
  if (consoleErrors.length || notFoundUrls.length) throw new Error(`${name}: console errors: ${consoleErrors.slice(0, 2).join(" | ")}; 404: ${notFoundUrls.slice(0, 4).join(" | ")}`)
  await page.close()
}

try {
  await checkViewport("desktop", { width: 1440, height: 1200 })
  await checkViewport("mobile", { width: 390, height: 1100 })
  report.ok = true
} catch (error) {
  report.ok = false
  report.error = error instanceof Error ? error.message : String(error)
  throw error
} finally {
  await writeFile(resolve(artifactDir, "playwright-report.json"), JSON.stringify(report, null, 2), "utf8")
  await browser.close()
}

