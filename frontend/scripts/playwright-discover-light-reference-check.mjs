import assert from "node:assert/strict"
import { access, mkdir, readFile, writeFile } from "node:fs/promises"
import http from "node:http"
import { dirname, extname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { chromium, expect } from "@playwright/test"

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, "..", "..")
const buildDir = resolve(repoRoot, "frontend", "build", "client")
const artifactDir = resolve(repoRoot, ".trellis", "tasks", "05-09-05-09-discover-light-reference-search-page", "artifacts", "playwright")
const port = Number(process.env.FABLEMAP_DISCOVER_LIGHT_PORT || 4180)
const baseUrl = `http://127.0.0.1:${port}`

const taverns = Array.from({ length: 8 }, (_, index) => ({
  id: `discover_light_${index + 1}`,
  name: ["雨巷书店", "镜海码头", "霓虹花房", "月亮不眠电台", "小灯塔问路铺", "黑锋数据站", "星图观测台", "记忆收纳馆"][index],
  description: "真实坐标上的明亮主题发现入口。",
  lat: 25.04 + index * 0.003,
  lon: 121.50 + index * 0.006,
  address: `城市坐标 ${index + 1}`,
  access: "public",
  status: "open",
  place_type: index % 3 === 0 ? "bookstore" : index % 3 === 1 ? "cafe" : "tavern",
  visit_count: 20 + index,
  characters: [
    { id: `npc_${index}_a`, name: "引路人", tags: ["陪伴"] },
    { id: `npc_${index}_b`, name: "记录员", tags: ["记忆"] },
    { id: `npc_${index}_c`, name: "守夜者", tags: ["深夜"] },
  ],
}))

function contentTypeFor(filePath) {
  switch (extname(filePath).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8"
    case ".js":
      return "application/javascript; charset=utf-8"
    case ".css":
      return "text/css; charset=utf-8"
    case ".json":
      return "application/json; charset=utf-8"
    case ".png":
      return "image/png"
    case ".jpg":
    case ".jpeg":
      return "image/jpeg"
    case ".svg":
      return "image/svg+xml"
    default:
      return "application/octet-stream"
  }
}

async function createSpaServer() {
  await access(join(buildDir, "index.html"))

  const server = http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(req.url || "/", baseUrl)
      let filePath = resolve(buildDir, `.${requestUrl.pathname}`)
      try {
        const data = await readFile(filePath)
        res.writeHead(200, { "content-type": contentTypeFor(filePath) })
        res.end(data)
        return
      } catch {
        filePath = join(buildDir, "index.html")
        const data = await readFile(filePath)
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" })
        res.end(data)
      }
    } catch (error) {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" })
      res.end(String(error))
    }
  })

  await new Promise((resolvePromise) => server.listen(port, "127.0.0.1", resolvePromise))
  return server
}

async function installApiFixtures(page) {
  await page.route("**/api/v1/taverns**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({ taverns, count: taverns.length }),
    })
  })
}

async function checkViewport(browser, viewport, screenshotName) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  await page.addInitScript(() => {
    window.localStorage.setItem("fablemap-theme", "light")
  })
  await installApiFixtures(page)
  await page.goto(`${baseUrl}/discover`, { waitUntil: "networkidle" })

  const shell = page.locator('[data-discover-light-reference="search-light-real-dom"]')
  await expect(shell).toBeVisible()
  await expect(page.locator('[data-discover-light-artboard="search-light-1448x1086"]')).toBeVisible()
  await expect(page.locator('[data-light-reference-top-nav="shared"][data-light-reference-top-nav-variant="discover"]')).toBeVisible()
  await expect(page.locator('[data-discover-light-nav="01a-nav-bar"]')).toBeVisible()
  await expect(page.locator('[data-discover-light-slice]')).toHaveCount(1)
  await expect(page.locator('[data-discover-light-body="complete-dom-replacement"]')).toBeVisible()
  await expect(page.locator('[data-discover-light-body-fragment]')).toHaveCount(0)
  await expect(page.locator('[data-discover-light-section-boundary]')).toHaveCount(6)
  await expect(page.locator('[data-discover-light-section-dom="real-dom-replacement"]')).toHaveCount(5)
  await expect(page.locator('[data-discover-light-nav-control]')).toHaveCount(10)
  await expect(page.locator('[data-discover-light-search="real-input"]')).toBeVisible()
  await expect(page.locator('[data-discover-light-hotspot]')).toHaveCount(41)
  await expect(page.getByRole("link", { name: "进入第一张地点卡" })).toBeVisible()
  await expect(page.getByRole("link", { name: "进入第八张地点卡" })).toBeVisible()
  await expect(page.getByRole("link", { name: "开始探索" })).toBeVisible()

  const searchInput = page.locator('[data-discover-light-search="real-input"] input')
  await searchInput.fill("书店")
  await expect(searchInput).toHaveValue("书店")
  await searchInput.fill("")
  await expect(searchInput).toHaveValue("")

  const overflow = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  assert(overflow.scrollWidth <= overflow.innerWidth + 2, `Unexpected horizontal overflow: ${JSON.stringify(overflow)}`)

  const screenshotPath = resolve(artifactDir, screenshotName)
  await page.screenshot({ path: screenshotPath, fullPage: true })
  await context.close()
  return { screenshotPath, overflow }
}

await mkdir(artifactDir, { recursive: true })

const server = await createSpaServer()
const browser = await chromium.launch()

try {
  const desktop = await checkViewport(browser, { width: 1440, height: 1100 }, "discover-light-reference-desktop.png")
  const mobile = await checkViewport(browser, { width: 390, height: 844 }, "discover-light-reference-mobile.png")
  const reportPath = resolve(artifactDir, "report.md")
  const report = `# Discover Light Reference Playwright Self Acceptance

Date: 2026-05-09
Base URL: ${baseUrl}

## Assertions

- /discover in light theme renders a real-DOM body matched to the search_light layout.
- The top navigation is the shared LightReferenceTopNav component used by light homepage and light discover.
- The body is decomposed into real frontend sections with no body screenshot fragments.
- The main search field is a real controlled input.
- Navigation controls, filters, cards, recommendation rail, and bottom statistic areas expose accessible hotspots.
- Desktop and mobile viewports have no horizontal overflow.

## Screenshots

- \`${desktop.screenshotPath}\`
- \`${mobile.screenshotPath}\`
`
  await writeFile(reportPath, report, "utf8")
  console.log("playwright-discover-light-reference-check: ok")
  console.log(`report: ${reportPath}`)
} finally {
  await browser.close()
  await new Promise((resolvePromise, rejectPromise) => {
    server.close((error) => (error ? rejectPromise(error) : resolvePromise()))
  })
}
