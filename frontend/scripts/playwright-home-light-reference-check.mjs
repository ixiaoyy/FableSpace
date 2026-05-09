import assert from "node:assert/strict"
import { access, mkdir, readFile, writeFile } from "node:fs/promises"
import http from "node:http"
import { dirname, extname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { chromium, expect } from "@playwright/test"

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, "..", "..")
const buildDir = resolve(repoRoot, "frontend", "build", "client")
const artifactDir = resolve(repoRoot, ".trellis", "tasks", "05-09-05-09-home-light-component-decomposition", "artifacts", "playwright")
const port = Number(process.env.FABLEMAP_PLAYWRIGHT_PORT || 4178)
const baseUrl = `http://127.0.0.1:${port}`

const taverns = [
  {
    id: "home_light_third_shelf",
    name: "第三货架秘密社",
    description: "FableMap 锚点 · 24h Convenience Corner",
    lat: 31.2304,
    lon: 121.4737,
    address: "上海 · 街角门牌",
    access: "public",
    status: "open",
    place_type: "convenience_store",
    visit_count: 3,
    characters: [
      { id: "delta", name: "社长-9-Delta", tags: ["便利店"] },
      { id: "mumu", name: "临时店员 Mu-Mu", tags: ["外星人"] },
      { id: "reader", name: "货架读者", tags: ["记忆"] },
      { id: "guard", name: "夜巡员", tags: ["街角"] },
    ],
  },
  {
    id: "home_light_lamp_shop",
    name: "小灯塔问路铺",
    description: "FableMap 锚点 · Shibuya Crossing",
    lat: 35.6987,
    lon: 139.7713,
    address: "涩谷交叉口",
    access: "public",
    status: "open",
    place_type: "tavern",
    visit_count: 24,
    characters: [
      { id: "lamp", name: "灯塔引航员", tags: ["问路"] },
      { id: "bird", name: "蓝鸟", tags: ["记忆"] },
      { id: "host", name: "值守人", tags: ["陪伴"] },
    ],
  },
  {
    id: "home_light_moon_radio",
    name: "月亮不睡电台",
    description: "FableMap 锚点 · Night Radio Booth",
    lat: 35.7,
    lon: 139.78,
    address: "夜间电台",
    access: "public",
    status: "open",
    place_type: "cafe",
    visit_count: 2,
    characters: [
      { id: "radio", name: "月台 DJ", tags: ["电台"] },
      { id: "listener", name: "夜听人", tags: ["陪伴"] },
      { id: "runner", name: "送信员", tags: ["记忆"] },
    ],
  },
]

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
  await page.goto(baseUrl, { waitUntil: "networkidle" })

  const shell = page.locator('[data-home-light-reference="index-light-hybrid-dom"]')
  await expect(shell).toBeVisible()
  const artboard = page.locator('[data-home-light-artboard="index-light-958x1642"]')
  await expect(artboard).toBeVisible()
  await expect(artboard).toHaveAttribute("data-home-light-slice-count", "2")
  await expect(artboard).toHaveAttribute("data-home-light-section-count", "7")
  await expect(artboard).toHaveAttribute("data-home-light-dom-complete", "hybrid-hero-backed")
  await expect(page.locator('[data-home-light-body="hero-image-backed-real-dom-sections"]')).toBeVisible()
  await expect(page.locator('[data-home-light-slice]')).toHaveCount(2)
  await expect(page.locator('[data-home-light-fragment]')).toHaveCount(0)
  await expect(page.locator('[data-home-light-section-boundary="real-page-section"]')).toHaveCount(7)
  await expect(page.locator('[data-home-light-section-dom="image-backed-reference"]')).toHaveCount(1)
  await expect(page.locator('[data-home-light-section-dom="real-dom-replacement"]')).toHaveCount(5)
  await expect(page.locator('[data-home-light-section-hotspots="owned"]')).toHaveCount(6)
  for (const id of ["nav", "hero", "featured-regions", "ai-roles", "memory-echoes", "recommended-coordinates", "cta-footer"]) {
    await expect(page.locator(`[data-home-light-section="${id}"]`)).toBeVisible()
  }
  await expect(page.locator('[data-home-light-nav="01a-nav-bar"]')).toBeVisible()
  await expect(page.locator('[data-home-light-nav-text-layer="real-dom-text"]')).toBeVisible()
  await expect(page.locator('[data-home-light-nav-text="探索"]')).toBeVisible()
  await expect(page.locator('[data-home-light-nav-text="开始探索"]')).toBeVisible()
  await expect(page.locator('[data-home-light-nav-controls="real-links"]')).toBeVisible()
  await expect(page.locator('[data-home-light-nav-control]')).toHaveCount(10)
  await expect(page.locator('[data-home-light-nav-chrome="real-css"]')).toBeVisible()
  await expect(page.locator('[data-home-light-nav-search="real-css"]')).toBeVisible()
  await expect(page.locator('[data-home-light-nav-theme-toggle="real-css"]')).toBeVisible()
  await expect(page.locator('[data-home-light-nav-manager="real-css"]')).toBeVisible()
  await expect(page.locator('[data-home-light-nav-cta="real-css"]')).toBeVisible()
  const artboardBox = await artboard.boundingBox()
  assert(artboardBox && artboardBox.height > artboardBox.width * 1.6, `Expected the real-DOM full-page artboard ratio, got ${JSON.stringify(artboardBox)}`)
  await expect(page.getByRole("link", { name: "开始探索真实坐标" })).toBeVisible()
  await expect(page.getByRole("link", { name: "创建我的空间", exact: true })).toBeVisible()
  await expect(page.getByRole("link", { name: "进入第一个发光区域" })).toBeVisible()
  await expect(page.getByRole("link", { name: "查看全部角色" })).toBeVisible()
  await expect(page.getByRole("link", { name: "查看更多记忆" })).toBeVisible()
  await expect(page.getByRole("link", { name: "进入推荐坐标云湖图书馆" })).toBeVisible()
  await expect(page.getByRole("link", { name: "创建我的空间并邀请角色与记忆" })).toBeVisible()

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
  const desktop = await checkViewport(browser, { width: 1440, height: 1120 }, "home-light-real-dom-desktop.png")
  const mobile = await checkViewport(browser, { width: 390, height: 844 }, "home-light-real-dom-mobile.png")
  const reportPath = resolve(artifactDir, "report.md")
  const report = `# Home Light Real-DOM Playwright Self Acceptance

Date: 2026-05-09
Base URL: ${baseUrl}

## Assertions

- Light theme homepage uses the real-DOM replacement contract: \`data-home-light-reference="index-light-hybrid-dom"\`.
- Runtime slice count is 2: the shared nav backing and full Hero backing remain to avoid stitched visual seams; lower body screenshot fragments are gone.
- Body exposes a full-image-backed Hero plus five lower real-DOM sections with owned hotspots: featured regions, AI roles, memory echoes, recommended coordinates, and CTA/footer.
- Primary CTA, featured-entry, AI role, memory, recommended-coordinate, final CTA, and theme-toggle controls remain accessible.
- Desktop and mobile viewports have no horizontal overflow.

## Screenshots

- \`${desktop.screenshotPath}\`
- \`${mobile.screenshotPath}\`
`
  await writeFile(reportPath, report, "utf8")
  console.log("playwright-home-light-reference-check: ok")
  console.log(`report: ${reportPath}`)
} finally {
  await browser.close()
  await new Promise((resolvePromise, rejectPromise) => {
    server.close((error) => (error ? rejectPromise(error) : resolvePromise()))
  })
}
