import playwright from "file:///D:/work/ai-/frontend/node_modules/@playwright/test/index.js";
const { chromium } = playwright;
import { writeFile } from "node:fs/promises";

const baseUrl = "http://127.0.0.1:5173/tavern/pw_third_shelf_observatory?visitor_id=visual-npc-stage";
const artifactDir = ".trellis/tasks/05-05-05-05-npc-stage-card-chat/evidence";
const viewports = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.locator("[data-current-npc-stage-card]").waitFor({ state: "visible", timeout: 10000 });
    await page.locator("[data-npc-seat-gallery]").waitFor({ state: "visible", timeout: 10000 });
    await page.locator("[data-current-npc-profile]").waitFor({ state: "visible", timeout: 10000 });
    await page.locator('[aria-label="聊天记录"]').waitFor({ state: "visible", timeout: 10000 });
    const stageText = (await page.locator("[data-current-npc-stage-card]").innerText()).replace(/\s+/g, " ").trim();
    if (!stageText.includes("正在接待你")) {
      throw new Error(`${viewport.name}: stage card missing active hosting status`);
    }
    const galleryText = (await page.locator("[data-npc-seat-gallery]").innerText()).replace(/\s+/g, " ").trim();
    if (!galleryText.includes("今晚在场")) {
      throw new Error(`${viewport.name}: NPC seat gallery missing tonight label`);
    }
    const profileText = (await page.locator("[data-current-npc-profile]").innerText()).replace(/\s+/g, " ").trim();
    if (!profileText.includes("表情缩略")) {
      throw new Error(`${viewport.name}: current NPC profile missing expression preview`);
    }
    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    if (horizontalOverflow) {
      throw new Error(`${viewport.name}: document has horizontal overflow`);
    }
    const screenshot = `${artifactDir}/npc-stage-${viewport.name}.png`;
    await page.screenshot({ path: screenshot, fullPage: true });
    results.push({ ...viewport, screenshot, stageText, errors });
    await page.close();
  }
  if (results.some((result) => result.errors.length)) {
    throw new Error(`Page console errors: ${JSON.stringify(results)}`);
  }
  await writeFile(`${artifactDir}/playwright-report.json`, JSON.stringify({ baseUrl, results }, null, 2));
  console.log(JSON.stringify({ ok: true, baseUrl, results }, null, 2));
} finally {
  await browser.close();
}



