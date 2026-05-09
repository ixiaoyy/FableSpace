import assert from "node:assert/strict"
import { access, mkdir, readFile, writeFile } from "node:fs/promises"
import http from "node:http"
import { dirname, extname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { chromium, expect } from "@playwright/test"

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, "..", "..")
const buildDir = resolve(repoRoot, "frontend", "build", "client")
const artifactDir = resolve(repoRoot, ".trellis", "tasks", "05-09-05-09-black-theme-home-search-reference-alignment", "artifacts", "playwright")
const port = Number(process.env.FABLEMAP_PLAYWRIGHT_PORT || 4180)
const baseUrl = `http://127.0.0.1:${port}`

const taverns = Array.from({ length: 8 }, (_, index) => ({
  id: `black_reference_tavern_${index + 1}`,
  name: ["夜幕酒馆", "镜海码头", "霓虹花房", "月亮不睡电台", "小灯塔问路铺", "黑塔数据站", "星图观测台", "记忆收纳馆"][index],
  description: "FableMap 黑色赛博主题验收数据",
  lat: 25.04 + index * 0.003,
  lon: 121.51 + index * 0.004,
  address: "黑色主题验收坐标",
  access: "public",
  status: "open",
  place_type: index % 2 ? "cafe" : "tavern",
  visit_count: 12 + index,
  characters: [
    { id: `npc_${index}_a`, name: "星海旅人", tags: ["信号"] },
    { id: `npc_${index}_b`, name: "灯塔引航员", tags: ["记忆"] },
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

async function checkNoOverflow(page) {
  const overflow = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  assert(overflow.scrollWidth <= overflow.innerWidth + 2, `Unexpected horizontal overflow: ${JSON.stringify(overflow)}`)
  return overflow
}

async function checkHome(browser, viewport, screenshotName) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  await page.addInitScript(() => window.localStorage.setItem("fablemap-theme", "dark"))
  await installApiFixtures(page)
  await page.goto(baseUrl, { waitUntil: "networkidle" })

  await expect(page.locator('[data-home-black-reference="index-black-real-dom"]')).toBeVisible()
  await expect(page.locator('[data-home-reference-template="home-light-compatible"]')).toBeVisible()
  await expect(page.locator('[data-home-black-artboard="index-black-1024x1536"]')).toBeVisible()
  await expect(page.locator('[data-reference-artboard-reuse="shared-layout-shell"]')).toHaveCount(0)
  await expect(page.locator('[data-home-black-section-boundary="real-page-section"]')).toHaveCount(7)
  await expect(page.locator('[data-home-black-section-dom="image-backed-reference"]')).toHaveCount(1)
  await expect(page.locator('[data-home-black-section-dom="real-dom-replacement"]')).toHaveCount(5)
  await expect(page.getByRole("button", { name: "切换到明亮主题" })).toBeVisible()
  await expect(page.getByRole("link", { name: "进入第一个发光区域" })).toHaveAttribute("href", /black_reference_tavern_/)
  await expect(page.getByRole("link", { name: "开始探索真实坐标" })).toBeVisible()
  const overflow = await checkNoOverflow(page)
  const screenshotPath = resolve(artifactDir, screenshotName)
  await page.screenshot({ path: screenshotPath, fullPage: true })
  await context.close()
  return { screenshotPath, overflow }
}

async function checkDiscover(browser, viewport, screenshotName) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  await page.addInitScript(() => window.localStorage.setItem("fablemap-theme", "dark"))
  await installApiFixtures(page)
  await page.goto(`${baseUrl}/discover`, { waitUntil: "networkidle" })

  await expect(page.locator('[data-discover-black-reference="search-black-real-dom"]')).toBeVisible()
  await expect(page.locator('[data-discover-reference-template="search-light-compatible"]')).toBeVisible()
  await expect(page.locator('[data-discover-black-artboard="search-black-1448x1086"]')).toBeVisible()
  await expect(page.locator('[data-reference-artboard-reuse="shared-layout-shell"]')).toHaveCount(0)
  await expect(page.locator('[data-discover-black-section-boundary="real-page-section"]')).toHaveCount(6)
  await expect(page.locator('[data-discover-black-section-dom="real-dom-replacement"]')).toHaveCount(5)
  await expect(page.getByRole("button", { name: "切换到明亮主题" })).toBeVisible()
  await expect(page.locator('[data-discover-black-search="real-input"] input')).toBeVisible()
  await page.locator('[data-discover-black-search="real-input"] input').fill("月亮")
  await expect(page.locator('[data-discover-black-search="real-input"] input')).toHaveValue("月亮")
  await expect(page.getByRole("link", { name: "进入第一个搜索结果" })).toHaveAttribute("href", /black_reference_tavern_/)
  const overflow = await checkNoOverflow(page)
  const screenshotPath = resolve(artifactDir, screenshotName)
  await page.screenshot({ path: screenshotPath, fullPage: true })
  await context.close()
  return { screenshotPath, overflow }
}

await mkdir(artifactDir, { recursive: true })

const server = await createSpaServer()
const browser = await chromium.launch()

try {
  const homeDesktop = await checkHome(browser, { width: 1440, height: 1120 }, "home-black-reference-desktop.png")
  const homeMobile = await checkHome(browser, { width: 390, height: 844 }, "home-black-reference-mobile.png")
  const discoverDesktop = await checkDiscover(browser, { width: 1440, height: 960 }, "discover-black-reference-desktop.png")
  const discoverMobile = await checkDiscover(browser, { width: 390, height: 844 }, "discover-black-reference-mobile.png")
  const reportPath = resolve(artifactDir, "black-reference-report.md")
  const report = `# Black Theme Home/Search Reference Self Acceptance

Date: 2026-05-09
Base URL: ${baseUrl}

## Assertions

- Dark homepage uses \`data-home-black-reference="index-black-real-dom"\`.
- Dark discover/search uses \`data-discover-black-reference="search-black-real-dom"\`.
- Both pages do **not** use the former full-artboard hotspot shell.
- Home declares \`data-home-reference-template="home-light-compatible"\`; discover declares \`data-discover-reference-template="search-light-compatible"\`.
- Home has 7 real page boundaries (nav + 6 body sections), with the hero image-backed and the lower 5 sections rendered as DOM.
- Discover has 6 real page boundaries (nav + 5 body sections), all body sections rendered as DOM.
- Home card hotspots and discover result hotspots derive links from real tavern IDs.
- Discover keeps a real search input overlay.
- Desktop and mobile viewports have no horizontal overflow.

## Screenshots

- \`${homeDesktop.screenshotPath}\`
- \`${homeMobile.screenshotPath}\`
- \`${discoverDesktop.screenshotPath}\`
- \`${discoverMobile.screenshotPath}\`
`
  await writeFile(reportPath, report, "utf8")
  console.log("playwright-black-reference-check: ok")
  console.log(`report: ${reportPath}`)
} finally {
  await browser.close()
  await new Promise((resolvePromise, rejectPromise) => {
    server.close((error) => (error ? rejectPromise(error) : resolvePromise()))
  })
}
