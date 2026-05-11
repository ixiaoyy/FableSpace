import assert from "node:assert/strict"
import { access, mkdir, readFile } from "node:fs/promises"
import http from "node:http"
import { extname, resolve, join } from "node:path"
import playwrightTest from "file:///D:/work/ai-/frontend/node_modules/@playwright/test/index.js"
const { chromium, expect } = playwrightTest

const repoRoot = resolve(".")
const buildDir = resolve(repoRoot, "frontend", "build", "client")
const artifactDir = resolve(repoRoot, ".trellis", "workspace", "lijin", "light-layout-fix")
const port = 4191
const baseUrl = `http://127.0.0.1:${port}`
const taverns = [
  { id: "rain-bookshop", name: "雨巷书店", description: "雨声里仍有人回应的书店坐标。", visit_count: 42, characters: [{ avatar: "/place-atmosphere-hd/atmosphere-lore.png" }] },
  { id: "sea-end", name: "海街的尽头", description: "海风、灯塔和一只会记住回访的猫。", visit_count: 18, characters: [{ avatar: "/place-atmosphere-hd/atmosphere-lore.png" }] },
  { id: "time-cafe", name: "时光咖啡馆", description: "适合低声交谈和写下回访记忆。", visit_count: 64, characters: [{ avatar: "/place-atmosphere-hd/atmosphere-lore.png" }] },
  { id: "old-platform", name: "旧车站月台", description: "最后一班车离开后，月台广播仍在轻轻闪烁。", visit_count: 7, characters: [{ avatar: "/place-atmosphere-hd/atmosphere-lore.png" }] },
]
function contentTypeFor(filePath) {
  switch (extname(filePath).toLowerCase()) {
    case ".html": return "text/html; charset=utf-8"
    case ".js": return "application/javascript; charset=utf-8"
    case ".css": return "text/css; charset=utf-8"
    case ".png": return "image/png"
    default: return "application/octet-stream"
  }
}
async function createServer() {
  await access(join(buildDir, "index.html"))
  const server = http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url || "/", baseUrl)
    let filePath = resolve(buildDir, `.${requestUrl.pathname}`)
    try {
      const data = await readFile(filePath)
      res.writeHead(200, { "content-type": contentTypeFor(filePath) })
      res.end(data)
    } catch {
      const data = await readFile(join(buildDir, "index.html"))
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" })
      res.end(data)
    }
  })
  await new Promise((resolvePromise) => server.listen(port, "127.0.0.1", resolvePromise))
  return server
}
await mkdir(artifactDir, { recursive: true })
const server = await createServer()
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1536, height: 1024 } })
  const errors = []
  page.on("pageerror", (e) => errors.push(e.message))
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()) })
  await page.addInitScript(() => window.localStorage.setItem("fablemap-theme", "dark"))
  await page.route("**/api/v1/taverns**", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ taverns, count: taverns.length }) }))
  await page.goto(baseUrl + "/", { waitUntil: "networkidle" })
  const surface = page.locator('[data-soul-link-reference="home-black-real-dom-1536x1024"]')
  await expect(surface).toBeVisible()
  await expect(surface.locator('[data-soul-link-sidebar="shared"]')).toBeVisible()
  await expect(surface.locator('[data-soul-link-daily-quote="real-text"]')).toContainText("世界很大")
  assert.deepEqual(errors, [])
  await page.screenshot({ path: resolve(artifactDir, "home-black-after-fix.png"), fullPage: true })
  console.log(`ok ${resolve(artifactDir, "home-black-after-fix.png")}`)
} finally {
  await browser.close()
  await new Promise((resolvePromise) => server.close(resolvePromise))
}




