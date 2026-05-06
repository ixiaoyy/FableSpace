import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const homeSource = readFileSync(resolve(__dirname, "../app/routes/home.tsx"), "utf8")
const discoverSource = readFileSync(resolve(__dirname, "../app/routes/discover.tsx"), "utf8")
const atmosphereSource = readFileSync(resolve(__dirname, "../app/product/services/atmosphereAssets.js"), "utf8")
const runtimeConfigSource = readFileSync(resolve(__dirname, "../app/lib/tavern-runtime-config.js"), "utf8")
const helperPath = resolve(__dirname, "../app/lib/homepage-taverns.ts")
const helperSource = existsSync(helperPath) ? readFileSync(helperPath, "utf8") : ""

assert.ok(
  homeSource.includes("listTaverns"),
  "home route should load the real tavern list instead of only static homepage data",
)
assert.match(
  homeSource,
  /export\s+async\s+function\s+clientLoader/,
  "home route should expose a clientLoader for tavern-derived homepage data",
)
assert.ok(
  !/const\s+metrics\s*:\s*Metric\[\]\s*=\s*\[/.test(homeSource),
  "home route should not keep fixed live-looking metrics as the source of truth",
)
assert.ok(
  !/const\s+citySlices\s*:\s*CitySlicePreview\[\]\s*=\s*\[/.test(homeSource),
  "home route should not keep fixed featured entry cards as the source of truth",
)
assert.ok(
  homeSource.includes("text-[1.72rem]") && homeSource.includes("lg:text-[2.4rem]"),
  "home hero title should use a compact editorial scale instead of a poster-sized text block",
)
assert.ok(
  !homeSource.includes("lg:text-[2.75rem]") && !homeSource.includes("lg:text-[3.2rem]") && !homeSource.includes("lg:text-[4rem]"),
  "home hero title should not use oversized desktop text",
)
assert.ok(
  homeSource.includes("font-bold") && homeSource.includes("leading-[1.24]") && !homeSource.includes("tracking-[-0.045em]"),
  "home hero title should use lighter weight, roomier line-height, and avoid tight Chinese letter spacing",
)
assert.ok(
  homeSource.includes("真实坐标，") && homeSource.includes("藏着会回应的世界") && !homeSource.includes("都可能藏着"),
  "home hero title should use a shorter two-line headline instead of a dense three-line stack",
)

assert.ok(helperSource.includes("export function buildHomepageView"), "homepage helper should export buildHomepageView")
assert.ok(
  helperSource.includes("export function resolveHomepageTavernCover"),
  "homepage helper should export the shared cover resolver",
)
assert.ok(
  runtimeConfigSource.includes("/place-atmosphere/"),
  "homepage cover resolver should use project-local place atmosphere assets from runtime config",
)
assert.ok(helperSource.includes("visit_count"), "homepage metrics should derive from tavern visit_count when present")
assert.ok(
  helperSource.includes("usedCovers"),
  "homepage featured card builder should track used covers so one screen does not repeat the same entry image",
)
assert.ok(
  helperSource.includes("findUnusedHomepageCover"),
  "homepage helper should pick a fallback cover when multiple featured taverns resolve to the same image",
)
assert.ok(atmosphereSource.includes("TAVERN_ATMOSPHERE_CONFIG"), "atmosphere resolver should read canonical place_type mappings from runtime config")
assert.ok(runtimeConfigSource.includes("hospital"), "runtime config should map canonical hospital place_type")
assert.ok(runtimeConfigSource.includes("convenience_store"), "runtime config should map normalized convenience-store place_type")

assert.ok(
  discoverSource.includes("resolveHomepageTavernCover"),
  "discover cards should reuse the same varied tavern cover resolver",
)
assert.ok(
  discoverSource.includes("resolveUniqueHomepageTavernCovers"),
  "discover card board should allocate covers as a list so repeated tavern metadata does not repeat images on screen",
)
assert.ok(
  !discoverSource.includes("coverImages[index % coverImages.length]"),
  "discover cards should not keep modulo cycling through a small fixed cover list",
)

console.log("homepage-dynamic-entry-test: ok")
