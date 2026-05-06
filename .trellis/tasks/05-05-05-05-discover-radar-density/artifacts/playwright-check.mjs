import { chromium } from "../../../../frontend/node_modules/@playwright/test/index.mjs"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const artifactDir = __dirname
const baseUrl = process.env.FABLEMAP_FRONTEND_URL || "http://127.0.0.1:4173/discover"

const fixture = {
  taverns: [
    {
      id: "pw_test_hero",
      name: "放学后英雄补给站",
      description: "旧玩具店 / 模型店，把旧英雄卡和普通人的小勇气重新摆回柜台。",
      lat: 35.6987,
      lon: 139.7713,
      address: "秋叶原模型店街角",
      status: "open",
      access: "public",
      place_type: "bookstore",
      visit_count: 13,
      local_time_display: "12:24",
      characters: [
        { id: "aheng", name: "阿衡", avatar: "/assets/missing-avatar-for-fallback.png" },
        { id: "zhijian", name: "纸剑", sprites: { neutral: "" } },
        { id: "empty", name: "小纸片" },
      ],
    },
    {
      id: "pw_test_repair",
      name: "社区修补铺",
      description: "修伞、补包、调旧收音机，也帮人把琐碎问题拆成可做的小事。",
      lat: 35.6563,
      lon: 139.704,
      address: "Community Repair Corner",
      status: "open",
      access: "public",
      place_type: "restaurant",
      visit_count: 5,
      local_time_display: "12:24",
      characters: [
        { id: "ahuai", name: "阿槐", avatar: "" },
        { id: "heguang", name: "和光", image_url: "/assets/also-missing-avatar.png" },
      ],
    },
    {
      id: "pw_test_hospital",
      name: "公益·夜间护理站",
      description: "夜间护理站，帮助访客把身体不适、焦虑和等待先放慢。",
      lat: 31.2304,
      lon: 121.4737,
      address: "上海 · 街角门牌",
      status: "open",
      access: "public",
      place_type: "hospital",
      visit_count: 8,
      local_time_display: "12:24",
      characters: [{ id: "mika", name: "米卡" }],
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
  await page.getByText("放学后英雄补给站", { exact: false }).waitFor({ state: "visible", timeout: 10000 })

  const cardNames = ["放学后英雄补给站", "社区修补铺", "公益·夜间护理站"]
  for (const text of cardNames) {
    const count = await page.getByText(text, { exact: false }).count()
    report.checks.push({ viewport: name, text, visible: count > 0 })
    if (count === 0) throw new Error(`${name}: expected visible text ${text}`)
  }

  const missingAvatarImgCount = await page.locator("img[src*='missing-avatar'], img[src*='also-missing-avatar']").count()
  report.checks.push({ viewport: name, missingAvatarImgCount })
  if (missingAvatarImgCount !== 0) throw new Error(`${name}: broken avatar image nodes should fall back to initials`)

  const brokenImages = await page.locator("img").evaluateAll((imgs) =>
    imgs
      .filter((img) => img instanceof HTMLImageElement && img.complete && img.naturalWidth === 0)
      .map((img) => img.getAttribute("src")),
  )
  report.checks.push({ viewport: name, brokenImages })
  if (brokenImages.length) throw new Error(`${name}: broken image elements remained: ${brokenImages.join(", ")}`)

  const firstCard = page.getByText("放学后英雄补给站", { exact: false }).locator("xpath=ancestor::article[1]")
  const secondCard = page.getByText("社区修补铺", { exact: false }).locator("xpath=ancestor::article[1]")
  const firstBox = await firstCard.boundingBox()
  const secondBox = await secondCard.boundingBox()
  if (!firstBox || !secondBox) throw new Error(`${name}: could not measure radar card layout`)
  const stackedVertically = secondBox.y > firstBox.y + firstBox.height * 0.72
  report.checks.push({ viewport: name, firstBox, secondBox, stackedVertically })
  if (!stackedVertically) throw new Error(`${name}: radar cards should scan as a single vertical column`)

  const overflow = await page.locator("body").evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  report.checks.push({ viewport: name, overflow })
  if (overflow.scrollWidth > overflow.clientWidth + 2) {
    throw new Error(`${name}: horizontal overflow ${overflow.scrollWidth} > ${overflow.clientWidth}`)
  }

  const screenshot = resolve(artifactDir, `${name}.png`)
  await page.screenshot({ path: screenshot, fullPage: true })
  report.screenshots[name] = screenshot
  report.checks.push({ viewport: name, consoleErrorCount: consoleErrors.length })
  if (consoleErrors.length) throw new Error(`${name}: console errors detected: ${consoleErrors.slice(0, 2).join(" | ")}`)
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
