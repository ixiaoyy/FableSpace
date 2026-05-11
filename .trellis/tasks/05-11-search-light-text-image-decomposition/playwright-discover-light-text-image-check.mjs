import assert from "node:assert/strict"
import { access, mkdir, readFile, writeFile } from "node:fs/promises"
import http from "node:http"
import { createRequire } from "node:module"
import { dirname, extname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"


const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, "..", "..", "..")
const require = createRequire(resolve(repoRoot, "frontend", "package.json"))
const { chromium, expect } = require("@playwright/test")
const buildDir = resolve(repoRoot, "frontend", "build", "client")
const evidenceDir = resolve(here, "evidence")
const port = Number(process.env.FABLEMAP_DISCOVER_LIGHT_PORT || 4197)
const baseUrl = `http://127.0.0.1:${port}`

const taverns = [
  { id: "rain-bookshop", name: "雨巷书店", description: "有猫、有书，还有等你翻开的故事。", lat: 31.2304, lon: 121.4737, access: "public", status: "open", place_type: "bookstore", visit_count: 128, characters: [{ id: "keeper", name: "雨声书童", tags: ["治愈", "书店"] }] },
  { id: "sea-end", name: "海街的尽头", description: "通往大海的小路，藏着夏天的味道。", lat: 35.6895, lon: 139.6917, access: "public", status: "open", place_type: "cafe", visit_count: 93, characters: [{ id: "cat", name: "潮汐猫", tags: ["温暖"] }] },
  { id: "time-cafe", name: "时光咖啡馆", description: "时间在这里慢下来，你也可以。", lat: 22.3193, lon: 114.1694, access: "public", status: "open", place_type: "cafe", visit_count: 76, characters: [{ id: "barista", name: "记忆咖啡师", tags: ["治愈"] }] },
  { id: "old-platform", name: "旧车站月台", description: "夜晚的最后一班列车，会带你去哪里？", lat: 34.6937, lon: 135.5023, access: "public", status: "open", place_type: "tavern", visit_count: 55, characters: [{ id: "announcer", name: "月台播报员", tags: ["怀旧"] }] },
  { id: "lantern-coast", name: "灯塔与海风", description: "风会记得每一个在灯塔下许愿的人。", lat: 24.0, lon: 121.0, access: "public", status: "open", place_type: "home", visit_count: 38, characters: [{ id: "keeper", name: "灯塔守望者", tags: ["希望"] }] },
  { id: "cloud-island", name: "云中浮岛", description: "漂浮在云层之间的岛屿，只有心灵能抵达。", lat: 23.5, lon: 120.9, access: "public", status: "open", place_type: "school", visit_count: 31, characters: [{ id: "guide", name: "云层向导", tags: ["幻想"] }] },
]

function contentTypeFor(filePath) {
  switch (extname(filePath).toLowerCase()) {
    case ".html": return "text/html; charset=utf-8"
    case ".js": return "application/javascript; charset=utf-8"
    case ".css": return "text/css; charset=utf-8"
    case ".json": return "application/json; charset=utf-8"
    case ".png": return "image/png"
    case ".jpg":
    case ".jpeg": return "image/jpeg"
    case ".svg": return "image/svg+xml"
    default: return "application/octet-stream"
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
        const data = await readFile(join(buildDir, "index.html"))
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
    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify({ taverns, count: taverns.length }) })
  })
}

async function checkNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => ({ innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }))
  assert.ok(overflow.scrollWidth <= overflow.innerWidth + 2, `Unexpected horizontal overflow: ${JSON.stringify(overflow)}`)
}

async function checkCase(browser, testCase) {
  const context = await browser.newContext({ viewport: testCase.viewport })
  const page = await context.newPage()
  const pageErrors = []
  page.on("pageerror", (error) => pageErrors.push(error.message))
  page.on("console", (message) => { if (message.type() === "error") pageErrors.push(message.text()) })
  await page.addInitScript(() => window.localStorage.setItem("fablemap-theme", "light"))
  await installApiFixtures(page)
  await page.goto(`${baseUrl}/discover`, { waitUntil: "networkidle" })

  const surface = page.locator('[data-soul-link-reference="discover-light-real-dom-1536x1024"]')
  await expect(surface).toBeVisible()
  await expect(surface).toHaveAttribute("data-soul-link-dom", "discover")
  const searchInput = page.locator('[data-soul-link-search="real-input"] input').filter({ visible: true }).first()
  await expect(searchInput).toBeVisible()
  await searchInput.fill("雨巷")
  await expect(searchInput).toHaveValue("雨巷")

  if (testCase.viewport.width >= 768) {
    await expect(surface.locator('[data-soul-link-discover-filter-panel="real-dom"]')).toBeVisible()
    await expect(surface.locator('[data-soul-link-discover-timeline="real-dom"]')).toBeVisible()
    await expect(surface.locator('[data-soul-link-discover-right-rail="real-dom"]')).toBeVisible()
    await expect(surface.locator('[data-soul-link-discover-card-cover="real-image"]').first()).toBeVisible()
    await expect(surface.locator('[data-soul-link-discover-card-title="real-text"]').first()).toContainText("雨巷")
  } else {
    await expect(surface.getByText("探索结果").first()).toBeVisible()
    await expect(surface.getByText("雨巷书店").first()).toBeVisible()
  }

  const fullLightSliceImages = await page.evaluate(() => Array.from(document.images)
    .filter((img) => (img.naturalWidth === 1018 && img.naturalHeight === 1024) || (img.naturalWidth === 318 && img.naturalHeight === 1024))
    .map((img) => img.currentSrc || img.src))
  assert.deepEqual(fullLightSliceImages, [], "light discover should not render the old main/right-rail full screenshot slices")

  await checkNoHorizontalOverflow(page)
  assert.deepEqual(pageErrors, [], `No console/page errors expected for ${testCase.name}`)
  const screenshotPath = resolve(evidenceDir, testCase.screenshot)
  await page.screenshot({ path: screenshotPath, fullPage: true })
  await context.close()
  return screenshotPath
}

await mkdir(evidenceDir, { recursive: true })
const server = await createSpaServer()
const browser = await chromium.launch()
try {
  const cases = [
    { name: "desktop", viewport: { width: 1536, height: 1024 }, screenshot: "discover-light-text-image-desktop.png" },
    { name: "mobile", viewport: { width: 390, height: 844 }, screenshot: "discover-light-text-image-mobile.png" },
  ]
  const rows = []
  for (const testCase of cases) {
    const screenshotPath = await checkCase(browser, testCase)
    rows.push(`| ${testCase.name} | ${testCase.viewport.width}x${testCase.viewport.height} | \`${screenshotPath}\` | pass |`)
  }
  const reportPath = resolve(evidenceDir, "discover-light-text-image-check.md")
  await writeFile(reportPath, `# Discover light text+image decomposition check\n\nBase URL: ${baseUrl}\n\n| Case | Viewport | Screenshot | Result |\n| --- | --- | --- | --- |\n${rows.join("\n")}\n`, "utf8")
  console.log("playwright-discover-light-text-image-check: ok")
  console.log(`report: ${reportPath}`)
} finally {
  await browser.close()
  await new Promise((resolvePromise, rejectPromise) => server.close((error) => error ? rejectPromise(error) : resolvePromise()))
}


