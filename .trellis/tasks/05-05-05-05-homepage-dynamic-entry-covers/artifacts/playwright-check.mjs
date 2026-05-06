import { chromium } from "../../../../frontend/node_modules/@playwright/test/index.mjs"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const artifactDir = __dirname
const baseUrl = process.env.FABLEMAP_FRONTEND_URL || "http://127.0.0.1:4173/"

const fixture = {
  taverns: [
    {
      id: "pw_test_healing",
      name: "灯下护理站",
      description: "一个锚定真实坐标的安全护理入口。",
      lat: 31.2304,
      lon: 121.4737,
      address: "上海 · 街角门牌 12 号",
      status: "open",
      access: "public",
      fantasy_type: "judgement",
      place_type: "hospital",
      layout_style: "npc-chat",
      visit_count: 12,
      characters: [{ id: "n1", name: "米卡" }, { id: "n2", name: "南星" }],
    },
    {
      id: "pw_test_market",
      name: "旧市集夜摊",
      description: "市场门口的小酒馆。",
      lat: 30.5728,
      lon: 104.0668,
      address: "成都 · 夜市入口",
      status: "open",
      access: "public",
      fantasy_type: "judgement",
      place_type: "restaurant",
      layout_style: "lobby",
      visit_count: 5,
      characters: [{ id: "n3", name: "阿槐" }],
    },
    {
      id: "pw_test_archive",
      name: "城市档案亭",
      description: "存放失物线索的安静入口。",
      lat: 23.1291,
      lon: 113.2644,
      address: "广州 · 老街档案口",
      status: "open",
      access: "public",
      place_type: "bookstore",
      layout_style: "npc-chat",
      visit_count: 2,
      characters: [{ id: "n4", name: "闻笺" }],
    },
  ],
  count: 3,
}

await mkdir(artifactDir, { recursive: true })

const browser = await chromium.launch()
const report = {
  baseUrl,
  checks: [],
  screenshots: {},
}

async function checkViewport(name, viewport) {
  const page = await browser.newPage({ viewport })
  const consoleErrors = []
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  })
  await page.route("**/api/v1/taverns*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(fixture),
    })
  })

  await page.goto(baseUrl, { waitUntil: "networkidle" })

  const expectedTexts = ["灯下护理站", "旧市集夜摊", "城市档案亭", "3", "4", "19"]
  for (const text of expectedTexts) {
    const count = await page.getByText(text, { exact: false }).count()
    report.checks.push({ viewport: name, text, visible: count > 0 })
    if (count === 0) throw new Error(`${name}: expected visible text ${text}`)
  }

  const forbiddenTexts = ["1,248+", "356+", "28,690+", "成都 · 宽窄巷子"]
  for (const text of forbiddenTexts) {
    const count = await page.getByText(text, { exact: false }).count()
    report.checks.push({ viewport: name, text, absent: count === 0 })
    if (count !== 0) throw new Error(`${name}: forbidden hardcoded text remained ${text}`)
  }

  const cardImages = await page.locator("a[href^='/tavern/'] img").evaluateAll((imgs) =>
    imgs.slice(0, 3).map((img) => img.getAttribute("src")),
  )
  const uniqueImages = new Set(cardImages)
  report.checks.push({ viewport: name, cardImages, uniqueImageCount: uniqueImages.size })
  if (uniqueImages.size < 2) throw new Error(`${name}: expected varied entry images`)

  const screenshot = resolve(artifactDir, `${name}.png`)
  await page.screenshot({ path: screenshot, fullPage: true })
  report.screenshots[name] = screenshot
  report.checks.push({ viewport: name, consoleErrorCount: consoleErrors.length })
  if (consoleErrors.length) {
    throw new Error(`${name}: console errors detected: ${consoleErrors.slice(0, 2).join(" | ")}`)
  }
  await page.close()
}

try {
  await checkViewport("desktop", { width: 1440, height: 1100 })
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
