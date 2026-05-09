import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const homeSource = readFileSync(resolve(__dirname, "../app/routes/home.tsx"), "utf8")
const homeLightSource = readFileSync(resolve(__dirname, "../app/components/home-light-real-dom.tsx"), "utf8")
const sharedNavSource = readFileSync(resolve(__dirname, "../app/components/light-reference-top-nav.tsx"), "utf8")
const discoverSource = readFileSync(resolve(__dirname, "../app/routes/discover.tsx"), "utf8")
const atmosphereSource = readFileSync(resolve(__dirname, "../app/product/services/atmosphereAssets.js"), "utf8")
const runtimeConfigSource = readFileSync(resolve(__dirname, "../app/lib/tavern-runtime-config.js"), "utf8")
const helperPath = resolve(__dirname, "../app/lib/homepage-taverns.ts")
const helperSource = existsSync(helperPath) ? readFileSync(helperPath, "utf8") : ""
const combinedHomeSource = `${homeSource}\n${homeLightSource}`

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
  homeSource.includes("HomeLightRealDom") && homeLightSource.includes('data-home-light-reference="index-light-hybrid-dom"'),
  "home light theme should use the approved real-DOM bright reference component",
)
assert.ok(
  homeLightSource.includes('data-home-light-body="hero-image-backed-real-dom-sections"') && homeLightSource.includes('mode="image-backed-reference"'),
  "home light theme body should use a full-image-backed Hero plus real frontend DOM lower sections",
)
assert.ok(
  homeLightSource.includes("const TOTAL_RUNTIME_SLICE_COUNT = 2") && !combinedHomeSource.includes("lightHomeBodySlices"),
  "home light theme should keep the shared nav and full Hero backing as runtime slices",
)
assert.ok(
  homeLightSource.includes('data-home-light-section-hotspots="owned"'),
  "home light theme should split the complete page into first-class section components with owned hotspots",
)
assert.ok(
  homeLightSource.includes("LightReferenceTopNav") && sharedNavSource.includes("lightReferenceTopNavLayouts"),
  "home light theme navigation should be extracted as its own reference component and hotspot group",
)
assert.ok(
  sharedNavSource.includes("data-home-light-nav-text-layer") && sharedNavSource.includes("data-home-light-nav-text") && sharedNavSource.includes("开始探索"),
  "home light theme navigation labels should be real DOM/SVG text, not only baked into the nav image",
)
assert.ok(
  sharedNavSource.includes("data-home-light-nav-controls") && sharedNavSource.includes("lightReferenceTopNavHotspotStyle"),
  "home light theme navigation controls should be real links/buttons owned by the nav component",
)
assert.ok(
  sharedNavSource.includes("data-home-light-nav-chrome") && sharedNavSource.includes("data-home-light-nav-search") && sharedNavSource.includes("data-home-light-nav-cta"),
  "home light theme navigation search and primary action chrome should be real CSS/DOM instead of only baked into the nav image",
)
assert.ok(
  homeLightSource.includes("cardTargets") && homeLightSource.includes("featuredCitySlices[index]?.id"),
  "home light theme card links should still derive entry links from real featured tavern IDs",
)
assert.ok(
  homeLightSource.includes("进入第${index + 1}个发光区域") && homeLightSource.includes("进入第一个发光区域"),
  "home light theme should preserve accessible featured-entry hotspots over the artboard",
)
assert.ok(
  homeLightSource.includes("进入推荐坐标云湖图书馆") && homeLightSource.includes("查看更多记忆"),
  "home light theme should add accessible links for lower-page recommended coordinate and memory sections",
)
assert.ok(
  !combinedHomeSource.includes('data-home-light-reference="componentized-index-light"'),
  "home light theme should not use the rejected approximate componentized redraw",
)
assert.ok(
  homeLightSource.includes("真实坐标，") && homeLightSource.includes("藏着会回应的世界") && !combinedHomeSource.includes("都可能藏着"),
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
