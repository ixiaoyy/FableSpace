import assert from "node:assert/strict"
import { access, mkdir, readFile, writeFile } from "node:fs/promises"
import http from "node:http"
import { dirname, extname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { chromium, expect } from "@playwright/test"

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, "..", "..")
const buildDir = resolve(repoRoot, "frontend", "build", "client")
const artifactDir = resolve(repoRoot, ".trellis", "tasks", "05-10-05-10-ui-ux-design-audit-and-polish", "artifacts", "playwright")
const port = Number(process.env.FABLEMAP_SOUL_LINK_PORT || 4188)
const baseUrl = `http://127.0.0.1:${port}`

const taverns = [
  {
    id: "rain-bookshop",
    name: "雨巷书店",
    description: "雨声里仍有人回应的书店坐标。",
    lat: 31.2304,
    lon: 121.4737,
    address: "上海 · 雨巷 17 号",
    access: "public",
    status: "open",
    place_type: "bookstore",
    visit_count: 42,
    characters: [{ id: "keeper", name: "旧书守夜人", tags: ["书店", "陪伴"] }],
  },
  {
    id: "sea-end",
    name: "海街的尽头",
    description: "海风、灯塔和一只会记住回访的猫。",
    lat: 35.6895,
    lon: 139.6917,
    address: "东京 · 海街边界",
    access: "public",
    status: "open",
    place_type: "cafe",
    visit_count: 18,
    characters: [{ id: "cat", name: "潮汐猫", tags: ["咖啡", "树洞"] }],
  },
  {
    id: "time-cafe",
    name: "时光咖啡馆",
    description: "适合低声交谈和写下回访记忆。",
    lat: 22.3193,
    lon: 114.1694,
    address: "香港 · 夜间街角",
    access: "public",
    status: "open",
    place_type: "cafe",
    visit_count: 64,
    characters: [{ id: "barista", name: "记忆咖啡师", tags: ["陪伴", "咖啡"] }],
  },
  {
    id: "old-platform",
    name: "旧车站月台",
    description: "最后一班车离开后，月台广播仍在轻轻闪烁。",
    lat: 34.6937,
    lon: 135.5023,
    address: "大阪 · 旧站台",
    access: "public",
    status: "open",
    place_type: "tavern",
    visit_count: 7,
    characters: [{ id: "announcer", name: "月台播报员", tags: ["委托板"] }],
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

async function checkNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  assert.ok(overflow.scrollWidth <= overflow.innerWidth + 2, `Unexpected horizontal overflow: ${JSON.stringify(overflow)}`)
}

async function checkCase(browser, testCase) {
  const context = await browser.newContext({ viewport: testCase.viewport })
  const page = await context.newPage()
  const pageErrors = []
  page.on("pageerror", (error) => pageErrors.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") pageErrors.push(message.text())
  })

  await page.addInitScript((theme) => {
    window.localStorage.setItem("fablemap-theme", theme)
  }, testCase.theme)
  await installApiFixtures(page)
  await page.goto(`${baseUrl}${testCase.path}`, { waitUntil: "networkidle" })

  const surface = page.locator(`[data-soul-link-reference="${testCase.marker}"]`)
  await expect(surface).toBeVisible()
  await expect(page.locator('[data-soul-link-real-dom="true"]')).toHaveAttribute("data-soul-link-variant", testCase.variant)
  await expect(surface).toHaveAttribute("data-soul-link-dom", testCase.kind)

  const sidebar = surface.locator('[data-soul-link-sidebar="shared"]')
  await expect(sidebar).toBeAttached()
  await expect(sidebar).toHaveAttribute("data-soul-link-sidebar-active", testCase.kind)
  await expect(sidebar.locator('a[aria-label="首页"]')).toBeAttached()
  await expect(sidebar.locator('a[aria-label="探索"]')).toBeAttached()
  await expect(sidebar.locator(`a[aria-label="${testCase.kind === "home" ? "首页" : "探索"}"]`)).toHaveAttribute("aria-current", "page")

  const userCluster = surface.locator('[data-soul-link-user-cluster="shared"]')
  await expect(userCluster).toBeAttached()
  await expect(userCluster.locator('[data-soul-link-notification="real-button"]')).toBeAttached()
  const expectedUserName = testCase.variant === "black" ? "USER_07" : "星野奈奈"
  await expect(userCluster.locator('[data-soul-link-user-avatar="real-image"] img')).toHaveAttribute("alt", new RegExp(`${expectedUserName} 头像`))
  await expect(userCluster.locator('[data-soul-link-user-name="real-text"]')).toContainText(expectedUserName)
  await expect(surface.locator('[data-soul-link-feed-thumb="real-image"]').first()).toHaveAttribute("alt", /缩略图/)
  await expect(surface.locator('[data-soul-link-feed-title="real-text"]').first()).not.toHaveText("")
  await expect(surface.locator('[data-soul-link-online-panel="real-list"]').first()).toBeAttached()
  await expect(surface.locator('[data-soul-link-online-avatar="real-image"]').first()).toHaveAttribute("alt", /头像/)
  await expect(surface.locator('[data-soul-link-online-name="real-text"]').first()).not.toHaveText("")
  await expect(surface.locator('[data-soul-link-online-status="real-text"]').first()).not.toHaveText("")

  if (testCase.kind === "home") {
    await expect(surface.getByRole("link", { name: testCase.variant === "black" ? /连接网络/ : /开始探索/ })).toBeAttached()
    await expect(surface.locator('[data-soul-link-daily-quote="real-text"]')).toContainText("世界很大")
    const recentMemories = surface.locator('[data-soul-link-recent-memories="real-list"]')
    const guidePanel = surface.locator('[data-soul-link-guide-panel="real-cards"]')
    const worldStats = surface.locator('[data-soul-link-world-stats="real-data"]')
    await expect(recentMemories).toBeAttached()
    await expect(guidePanel).toBeAttached()
    await expect(worldStats).toBeAttached()
    if (testCase.viewport.width >= 768) {
      await expect(recentMemories).toBeAttached()
      await expect(guidePanel).toBeAttached()
      await expect(worldStats).toBeAttached()
    }
    await expect(surface.locator('[data-soul-link-memory-thumb="real-image"]').first()).toHaveAttribute("alt", /记忆缩略图/)
    await expect(surface.locator('[data-soul-link-memory-title="real-text"]').first()).not.toHaveText("")
    await expect(surface.locator('[data-soul-link-guide-title="real-text"]').first()).not.toHaveText("")
    await expect(surface.locator('[data-soul-link-guide-text="real-text"]').first()).not.toHaveText("")
    await expect(surface.locator('[data-soul-link-world-stat-value="real-text"]').first()).not.toHaveText("")
    await expect(surface.locator('[data-soul-link-world-stat-label="real-text"]').first()).not.toHaveText("")
  } else {
    await expect(surface.locator('[data-soul-link-search="real-input"] input').last()).toBeVisible()
  }

  let homeSearch = null
  if (testCase.kind === "home") {
    homeSearch = page.locator('[data-soul-link-search="real-input"] input').last()
    await expect(homeSearch).toBeAttached()
  }

  if (testCase.path === "/discover") {
    const search = page.locator('[data-soul-link-search="real-input"] input').last()
    await expect(search).toBeAttached()
    await search.fill("月亮", { force: true })
    await expect(search).toHaveValue("月亮")
  }

  await checkNoHorizontalOverflow(page)
  assert.deepEqual(pageErrors, [], `No browser console/page errors expected for ${testCase.name}`)

  const screenshotPath = resolve(artifactDir, testCase.screenshot)
  await page.screenshot({ path: screenshotPath, fullPage: true })

  if (testCase.checkHomeEnterSearch && homeSearch) {
    await homeSearch.press("Enter")
    await expect(page).toHaveURL(/\/discover\?search=%E9%9B%A8%E5%B7%B7$/)
  }

  await context.close()
  return screenshotPath
}

await mkdir(artifactDir, { recursive: true })

const server = await createSpaServer()
const browser = await chromium.launch()

const cases = [
  {
    name: "home-light-desktop",
    path: "/",
    theme: "light",
    variant: "light",
    marker: "home-light-real-dom-1536x1024",
    kind: "home",
    expectedText: "在每一个坐标里",
    viewport: { width: 1536, height: 1024 },
    screenshot: "home-light-desktop.png",
  },
  {
    name: "home-black-desktop",
    path: "/",
    theme: "dark",
    variant: "black",
    marker: "home-black-real-dom-1536x1024",
    kind: "home",
    expectedText: "接入仍在回应的数字坐标网络",
    viewport: { width: 1536, height: 1024 },
    screenshot: "home-black-desktop.png",
  },
  {
    name: "discover-light-desktop",
    path: "/discover",
    theme: "light",
    variant: "light",
    marker: "discover-light-real-dom-1536x1024",
    kind: "discover",
    expectedText: "探索",
    viewport: { width: 1536, height: 1024 },
    screenshot: "discover-light-desktop.png",
  },
  {
    name: "discover-black-desktop",
    path: "/discover",
    theme: "dark",
    variant: "black",
    marker: "discover-black-real-dom-1536x1024",
    kind: "discover",
    expectedText: "探索",
    viewport: { width: 1536, height: 1024 },
    screenshot: "discover-black-desktop.png",
  },
  {
    name: "home-light-mobile",
    path: "/",
    theme: "light",
    variant: "light",
    marker: "home-light-real-dom-1536x1024",
    kind: "home",
    expectedText: "在每一个坐标里",
    viewport: { width: 390, height: 844 },
    screenshot: "home-light-mobile.png",
  },
  {
    name: "discover-black-mobile",
    path: "/discover",
    theme: "dark",
    variant: "black",
    marker: "discover-black-real-dom-1536x1024",
    kind: "discover",
    expectedText: "探索",
    viewport: { width: 390, height: 844 },
    screenshot: "discover-black-mobile.png",
  },
]

try {
  const rows = []
  for (const testCase of cases) {
    const screenshotPath = await checkCase(browser, testCase)
    rows.push(`| ${testCase.name} | ${testCase.theme} | ${testCase.viewport.width}x${testCase.viewport.height} | \`${screenshotPath}\` | none |`)
  }

  const reportPath = resolve(artifactDir, "soul-link-reference-check.md")
  const report = `# SoulLink real-DOM reference Playwright check

Base URL: ${baseUrl}

| Case | Theme | Viewport | Screenshot | Errors |
| --- | --- | --- | --- | --- |
${rows.join("\n")}
`
  await writeFile(reportPath, report, "utf8")
  console.log("playwright-soul-link-reference-check: ok")
  console.log(`report: ${reportPath}`)
} finally {
  await browser.close()
  await new Promise((resolvePromise, rejectPromise) => {
    server.close((error) => (error ? rejectPromise(error) : resolvePromise()))
  })
}
