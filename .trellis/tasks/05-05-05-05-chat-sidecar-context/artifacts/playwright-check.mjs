import { chromium } from "../../../../frontend/node_modules/@playwright/test/index.mjs"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const artifactDir = __dirname
const tavernId = "chat_sidecar_context"
const baseUrl = process.env.FABLEMAP_FRONTEND_URL || `http://127.0.0.1:4178/tavern/${tavernId}`

const tavern = {
  id: tavernId,
  name: "公益·夜间护理站",
  description: "夜间护理站，帮助访客把身体不适、焦虑和等待先放慢。",
  lat: 31.2304,
  lon: 121.4737,
  address: "上海 · 街角门牌",
  status: "open",
  access: "public",
  roleplay_mode: "ai_only",
  owner_id: "owner-demo",
  scene_prompt: "夜间护理站是一间安静、明亮、低压力的公益医院示例地点。",
  characters: [
    {
      id: "char_mika",
      name: "弥夏",
      gender: "female",
      description: "一位夜间护理站的白护师，负责陪访客把当下问题拆成可做的小事。",
      first_mes: "我听见了——你好。这里的气味和灯光让我想到：夜间护理站是一间安静、明亮、低压力的公益医院示例地点。",
    },
  ],
  visit_count: 8,
}

const roleplay = {
  tavern_id: tavernId,
  roleplay_mode: "ai_only",
  claims: [],
  characters: [{ id: "char_mika", name: "弥夏", avatar: "" }],
}

const history = {
  messages: [
    {
      id: "greeting-1",
      role: "assistant",
      content: "我听见了——你好。这里的气味和灯光让我想到：夜间护理站是一间安静、明亮、低压力的公益医院示例地点。",
      character_id: "char_mika",
      timestamp: "2026-05-05T12:32:00.000Z",
    },
  ],
}

await mkdir(artifactDir, { recursive: true })
const browser = await chromium.launch()
const report = { baseUrl, checks: [], screenshots: {} }

async function installRoutes(page) {
  await page.route("**/favicon.ico", async (route) => {
    await route.fulfill({ status: 204, body: "" })
  })
  await page.route("**/api/v1/taverns/chat_sidecar_context/visitor-notes**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ notes: [], count: 0 }) })
  })
  await page.route("**/api/v1/taverns/chat_sidecar_context/enter", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, first_mes: "", visitor_state: null }) })
  })
  await page.route("**/api/v1/taverns/chat_sidecar_context/roleplay", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(roleplay) })
  })
  await page.route("**/api/v1/taverns/chat_sidecar_context/chat**", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ reply: "收到，我们先从一个很小的动作开始。", visitor_state: null }) })
      return
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(history) })
  })
  await page.route("**/api/v1/taverns/chat_sidecar_context/share", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ tavern_id: tavernId, title: tavern.name, description: tavern.description, short_description: tavern.description, cover: "", location: { lat: tavern.lat, lon: tavern.lon, address: tavern.address }, status: tavern.status, access: tavern.access, tags: [], characters: [], character_count: 1, share_url: "", share_title: tavern.name, share_text: tavern.description }) })
  })
  await page.route("**/api/v1/taverns/chat_sidecar_context", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(tavern) })
  })
  await page.route("**/api/v1/rumors**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ rumors: [], count: 0 }) })
  })
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

  const chatMessage = page.getByLabel("聊天记录").getByText("我听见了", { exact: false })
  await chatMessage.waitFor({ state: "visible", timeout: 10000 })
  const textarea = page.locator("textarea[placeholder^='Type a message']")
  await textarea.waitFor({ state: "visible", timeout: 10000 })

  const messageBox = await chatMessage.boundingBox()
  const textareaBox = await textarea.boundingBox()
  if (!messageBox || !textareaBox) throw new Error(`${name}: could not measure message/composer gap`)
  const messageToComposerGap = textareaBox.y - (messageBox.y + messageBox.height)
  report.checks.push({ viewport: name, messageToComposerGap })
  if (messageToComposerGap > (viewport.width < 600 ? 520 : 320)) {
    throw new Error(`${name}: composer is too far from current message: ${messageToComposerGap}px`)
  }
  const sidecarText = await page.locator('[data-chat-sidecar="conversation-context"]').innerText()
  for (const required of ["聊天辅助", "当前场景", "可以这样开口", "你正在和"]) {
    if (!sidecarText.includes(required)) throw new Error(`${name}: conversation sidecar missing ${required}`)
  }
  const bodyText = await page.locator('body').innerText()
  for (const forbidden of ["当前 NPC 资料", "表情缩略", "First message", "Current NPC", "酒馆信息", "真实地图锚点与公开说明", "管理入口仅酒馆所有人可见"]) {
    if (bodyText.includes(forbidden)) throw new Error(`${name}: project-like sidebar copy is still visible: ${forbidden}`)
  }

  const identityInputVisible = await page.locator("[data-visitor-identity-settings] input").isVisible().catch(() => false)
  report.checks.push({ viewport: name, identityInputVisible })
  if (identityInputVisible) throw new Error(`${name}: visitor identity fields should be folded by default`)

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
  if (consoleErrors.length) throw new Error(`${name}: console errors: ${consoleErrors.slice(0, 2).join(" | ")}; 404: ${notFoundUrls.slice(0, 4).join(" | ")}`)
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

