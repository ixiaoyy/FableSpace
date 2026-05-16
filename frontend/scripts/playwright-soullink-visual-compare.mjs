import { chromium } from "playwright";
import { readFile, stat, mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const repoRoot = path.resolve(fileURLToPath(import.meta.url), "../../..");
const frontendRoot = path.join(repoRoot, "frontend");
const buildRoot = path.join(frontendRoot, "build", "client");
const evidenceDir = path.join(repoRoot, ".trellis", "tasks", "05-16-soullink-1to1-visual", "evidence");
const designPath = path.join(repoRoot, "设计问题", "index.png");
const screenshotPath = path.join(evidenceDir, "current-home-1536x1024.png");
const mobileScreenshotPath = path.join(evidenceDir, "current-home-mobile-390x844.png");
const diffPath = path.join(evidenceDir, "diff-home-1536x1024.png");
const htmlPath = path.join(buildRoot, "index.html");
const execFileAsync = promisify(execFile);
const minSimilarity = 0.95;

const mimeByExt = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".json", "application/json; charset=utf-8"],
]);

async function fileExists(filePath) {
  try {
    const s = await stat(filePath);
    return s.isFile();
  } catch {
    return false;
  }
}

async function compareWithDesign() {
  const python = String.raw`
from PIL import Image, ImageChops, ImageStat, ImageEnhance
import json
import sys

design_path, current_path, diff_path = sys.argv[1:4]
design = Image.open(design_path).convert("RGB")
current = Image.open(current_path).convert("RGB")
same_size = design.size == current.size
if not same_size:
    result = {
        "designPath": design_path,
        "currentPath": current_path,
        "diffPath": None,
        "sameSize": False,
        "designSize": list(design.size),
        "currentSize": list(current.size),
        "mae": None,
        "rms": None,
        "mismatchPixels": None,
        "mismatchRatio": None,
        "similarity": 0,
        "similarityPercent": 0,
    }
else:
    diff = ImageChops.difference(design, current)
    ImageEnhance.Brightness(diff).enhance(8).save(diff_path)
    stat = ImageStat.Stat(diff)
    total = design.size[0] * design.size[1]
    mismatch = 0
    for pixel in diff.getdata():
        if pixel[0] > 2 or pixel[1] > 2 or pixel[2] > 2:
            mismatch += 1
    mismatch_ratio = mismatch / total
    similarity = 1 - mismatch_ratio
    result = {
        "designPath": design_path,
        "currentPath": current_path,
        "diffPath": diff_path,
        "sameSize": True,
        "designSize": list(design.size),
        "currentSize": list(current.size),
        "mae": round(sum(stat.mean) / 3, 6),
        "rms": round((sum(v * v for v in stat.rms) / 3) ** 0.5, 6),
        "mismatchPixels": mismatch,
        "mismatchRatio": round(mismatch_ratio, 8),
        "similarity": round(similarity, 8),
        "similarityPercent": round(similarity * 100, 4),
    }
print(json.dumps(result, ensure_ascii=False))
`;
  const { stdout } = await execFileAsync("py", ["-3", "-c", python, designPath, screenshotPath, diffPath], {
    cwd: repoRoot,
    maxBuffer: 1024 * 1024,
  });
  return JSON.parse(stdout);
}

await mkdir(evidenceDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1536, height: 1024 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) errors.push(`${message.type()}: ${message.text()}`);
});
await page.route("http://soullink.local/**", async (route) => {
  const url = new URL(route.request().url());
  const cleanPath = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  let filePath = cleanPath ? path.join(buildRoot, cleanPath) : htmlPath;
  if (!filePath.startsWith(buildRoot) || !(await fileExists(filePath))) filePath = htmlPath;
  const ext = path.extname(filePath).toLowerCase();
  const body = await readFile(filePath);
  await route.fulfill({ status: 200, contentType: mimeByExt.get(ext) || "application/octet-stream", body });
});
await page.goto("http://soullink.local/", { waitUntil: "networkidle", timeout: 30000 });
await page.screenshot({ path: screenshotPath, fullPage: false, animations: "disabled" });
const summary = await page.evaluate(() => ({
  title: document.title,
  url: location.href,
  viewport: [innerWidth, innerHeight],
  hasSoulLinkBrand: Boolean(document.querySelector('[data-soullink-brand-slice]')),
  bodyTextStart: document.body.innerText.slice(0, 240),
  scrollWidth: document.documentElement.scrollWidth,
  scrollHeight: document.documentElement.scrollHeight,
}));
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://soullink.local/", { waitUntil: "networkidle", timeout: 30000 });
await page.screenshot({ path: mobileScreenshotPath, fullPage: false, animations: "disabled" });
const mobileSummary = await page.evaluate(() => ({
  viewport: [innerWidth, innerHeight],
  scrollWidth: document.documentElement.scrollWidth,
  scrollHeight: document.documentElement.scrollHeight,
  hasHorizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
  bodyTextStart: document.body.innerText.slice(0, 160),
}));
await browser.close();
const diffSummary = await compareWithDesign();
const similarityPass = Boolean(diffSummary.sameSize && diffSummary.similarity >= minSimilarity);
const result = {
  screenshotPath,
  mobileScreenshotPath,
  diffPath,
  minSimilarity,
  similarityPass,
  errors: errors.slice(0, 20),
  summary,
  mobileSummary,
  diffSummary,
};
console.log(JSON.stringify(result, null, 2));
if (!similarityPass || errors.length) {
  process.exitCode = 1;
}
