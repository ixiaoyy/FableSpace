import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { chromium, expect } from "@playwright/test"

const here = dirname(fileURLToPath(import.meta.url))
const frontendRoot = resolve(here, "..")
const repoRoot = resolve(frontendRoot, "..")
const artifactDir = resolve(repoRoot, "artifacts/playwright/tavern-doorway-ritual")
const baseUrl = process.env.FABLEMAP_PLAYWRIGHT_BASE_URL || "http://127.0.0.1:5173"
const tavernId = "demo-doorway"

const mockTavern = {
  id: tavernId,
  owner_id: "system_public_welfare",
  name: "雨巷灯牌酒馆",
  description: "雨夜街角的一间小酒馆，吧台灯牌还亮着，适合先和驻场调酒师打招呼。",
  scene_prompt: "门口有霓虹雨棚、半开的木门和一只躲雨的黑猫。",
  status: "open",
  access: "public",
  is_open: true,
  lat: 31.2304,
  lon: 121.4737,
  address: "上海市黄浦区雨巷 17 号",
  place_type: "tavern",
  roleplay_mode: "ai_only",
  llm_config: { backend: "public_welfare" },
  gameplay_definitions: [],
  characters: [
    {
      id: "bartender-lan",
      name: "澜",
      gender: "female",
      description: "记得每位陌生人第一杯酒的驻场调酒师。",
      personality: "温和、敏锐、会用短句引导访客开口。",
      scenario: "她站在吧台后，擦着一只带雨痕的玻璃杯。",
      first_mes: "欢迎推门进来。雨还没停，先坐吧，你想从哪条传闻听起？",
      tags: ["shopkeeper", "店长"],
    },
    {
      id: "cat-scout",
      name: "檐下猫",
      gender: "other",
      description: "总在门口听见附近传闻的黑猫。",
      first_mes: "喵。门口的水洼刚映出一个陌生影子。",
    },
  ],
}

function json(payload) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(payload),
  }
}

async function installApiFixtures(page) {
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname

    if (path === `/api/v1/taverns/${tavernId}`) {
      return route.fulfill(json(mockTavern))
    }
    if (path === `/api/v1/taverns/${tavernId}/roleplay`) {
      return route.fulfill(json({ tavern_id: tavernId, roleplay_mode: "ai_only", claims: [] }))
    }
    if (path === `/api/v1/taverns/${tavernId}/enter`) {
      return route.fulfill(json({ ok: true, visitor_state: { visitor_id: "playwright-visitor" } }))
    }
    if (path === `/api/v1/taverns/${tavernId}/gameplays`) {
      return route.fulfill(json({ gameplay_definitions: [] }))
    }
    if (path === `/api/v1/taverns/${tavernId}/gameplay-sessions`) {
      return route.fulfill(json({ sessions: [], count: 0 }))
    }
    if (path === `/api/v1/taverns/${tavernId}/share`) {
      return route.fulfill(json({
        tavern_id: tavernId,
        share_url: `${baseUrl}/tavern/${tavernId}`,
        share_title: "邀请你进入雨巷灯牌酒馆",
        share_text: "推门进来，和澜听一条雨夜传闻。",
      }))
    }
    if (path === `/api/v1/taverns/${tavernId}/engagement/config`) {
      return route.fulfill(json({
        coin_label: "纪念币",
        gift_catalog: [],
        bonus_draw: { enabled: false, voucher_price: 30, daily_limit: 1 },
      }))
    }
    if (path === `/api/v1/taverns/${tavernId}/engagement/me`) {
      return route.fulfill(json({
        coin_label: "纪念币",
        wallet: { balance: 0, lifetime_earned: 0, lifetime_spent: 0 },
        vouchers_available: 0,
        daily_earned: 0,
      }))
    }
    if (path === "/api/v1/rumors") {
      return route.fulfill(json({ rumors: [], count: 0 }))
    }

    return route.fulfill(json({ ok: true }))
  })
}

async function auditViewport(browser, label, viewport) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  await installApiFixtures(page)
  await page.goto(`${baseUrl}/tavern/${tavernId}?visitor_id=playwright-visitor`, { waitUntil: "networkidle" })

  const workbench = page.locator('[data-chat-workbench="sillytavern-style"]')
  const doorway = page.locator("[data-tavern-doorway-ritual]")
  await expect(workbench).toBeVisible({ timeout: 15000 })
  await expect(doorway).toBeVisible()
  await expect(doorway).toContainText("推门进店")
  await expect(doorway).toContainText("真实坐标门牌")
  await expect(doorway.locator("[data-doorway-host-greeting]")).toContainText("欢迎推门进来")
  await expect(doorway.locator("[data-doorway-host-status]")).toContainText("正在接待你")
  await expect(page.locator('[aria-label="NPC 角色列表"]')).toBeVisible()
  await expect(page.locator('[aria-label="聊天记录"]')).toBeVisible()

  if (label.includes("desktop")) {
    await doorway.locator("[data-doorway-start-chat]").click()
    await expect(workbench).toHaveAttribute("data-active-chat-channel", "private")
    await expect(page.locator('[data-chat-composer="fast-entry"] textarea')).toHaveValue(/刚推门进来/)
  }

  const screenshotPath = resolve(artifactDir, `${label}.png`)
  await page.screenshot({ path: screenshotPath, fullPage: true })
  await context.close()
  return screenshotPath
}

async function run() {
  await mkdir(artifactDir, { recursive: true })
  const browser = await chromium.launch()
  const reports = []
  try {
    reports.push({ label: "desktop-1440", path: await auditViewport(browser, "desktop-1440", { width: 1440, height: 960 }) })
    reports.push({ label: "mobile-390", path: await auditViewport(browser, "mobile-390", { width: 390, height: 844 }) })
  } finally {
    await browser.close()
  }

  const reportPath = resolve(artifactDir, "report.md")
  const rows = reports.map((item) => `| ${item.label} | ${item.path} |`).join("\n")
  await writeFile(
    reportPath,
    `# Tavern Doorway Ritual Playwright Report\n\n- Generated: ${new Date().toISOString()}\n- URL: ${baseUrl}/tavern/${tavernId}?visitor_id=playwright-visitor\n- Checks: doorway visible, real-coordinate doorway copy visible, host greeting visible, NPC roster/chat log visible, desktop CTA switches to private NPC channel and fills composer without sending.\n\n| Viewport | Screenshot |\n| --- | --- |\n${rows}\n`,
    "utf8",
  )
  console.log(`tavern-doorway-playwright-check: ok (${reportPath})`)
}

run()
