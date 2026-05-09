import assert from "node:assert/strict"
import { existsSync, readFileSync, statSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const homeRouteSource = readFileSync(resolve(__dirname, "../app/routes/home.tsx"), "utf8")
const homeLightSource = readFileSync(resolve(__dirname, "../app/components/home-light-real-dom.tsx"), "utf8")
const homeLayoutSource = readFileSync(resolve(__dirname, "../app/components/home-reference-layout.ts"), "utf8")
const sharedNavSource = readFileSync(resolve(__dirname, "../app/components/light-reference-top-nav.tsx"), "utf8")
const combinedHomeSource = `${homeRouteSource}\n${homeLightSource}`
const homeTemplateSource = `${homeLightSource}\n${homeLayoutSource}`
const radarAssetPath = resolve(__dirname, "../app/assets/discover/reference/discover-radar-surface.png")
const lightSliceDir = resolve(__dirname, "../app/assets/homepage/light/slices")
const lightElementDir = resolve(__dirname, "../app/assets/homepage/light/elements")

function readPngDimensions(path) {
  const buffer = readFileSync(path)
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  }
}

function assertPngAssetWith2xAndPrompt(dir, name, width, height) {
  const imagePath = resolve(dir, name)
  const image2xPath = resolve(dir, name.replace(".png", "-2x.png"))
  const sidecarPath = resolve(dir, name.replace(".png", ".prompt.md"))
  assert.ok(existsSync(imagePath), `${name} should exist as a project-local image`)
  assert.ok(existsSync(image2xPath), `${name} should have a 2x HD sibling`)
  assert.ok(existsSync(sidecarPath), `${name} should have same-directory prompt provenance`)
  assert.deepEqual(readPngDimensions(imagePath), { width, height }, `${name} should preserve its runtime dimensions`)
  assert.deepEqual(readPngDimensions(image2xPath), { width: width * 2, height: height * 2 }, `${name} 2x should preserve retina dimensions`)
  assert.ok(statSync(image2xPath).size > statSync(imagePath).size, `${name} 2x should contain a higher-resolution payload`)
}

const lightElements = [
  ["home-light-hero-stage.png", 688, 398],
  ["home-light-hero-avatar-coordinate.png", 62, 56],
  ["home-light-hero-avatar-role.png", 62, 56],
  ["home-light-hero-avatar-memory.png", 62, 56],
  ["home-light-hero-avatar-explore.png", 62, 56],
  ["home-light-featured-cover-01.png", 270, 112],
  ["home-light-featured-cover-02.png", 270, 112],
  ["home-light-featured-cover-03.png", 270, 112],
  ["home-light-role-portrait-01.png", 92, 112],
  ["home-light-role-portrait-02.png", 92, 112],
  ["home-light-role-portrait-03.png", 92, 112],
  ["home-light-role-portrait-04.png", 92, 112],
  ["home-light-memory-thumb-01.png", 80, 87],
  ["home-light-memory-thumb-02.png", 80, 87],
  ["home-light-memory-thumb-03.png", 80, 87],
  ["home-light-memory-thumb-04.png", 80, 87],
  ["home-light-recommend-cover-01.png", 270, 113],
  ["home-light-recommend-cover-02.png", 270, 113],
  ["home-light-recommend-cover-03.png", 270, 113],
  ["home-light-section-bunny.png", 77, 73],
  ["home-light-cta-compass.png", 151, 82],
  ["home-light-cta-bunny.png", 100, 94],
  ["home-light-footer-city.png", 180, 124],
]

assert.ok(existsSync(radarAssetPath), "dark homepage hero should retain the project-local high-quality radar/city asset")
assert.ok(homeRouteSource.includes("discoverRadarSurfaceImage"), "dark homepage hero should still import the high-quality radar surface asset")
assert.ok(homeRouteSource.includes("HomeLightRealDom"), "light homepage should render the real-DOM component from the route")
assert.ok(homeRouteSource.includes("featuredCitySlices={homepage.featuredCitySlices}"), "light homepage should receive dynamic featured tavern data from the route")
assert.ok(homeRouteSource.includes("onToggleTheme={toggleTheme}"), "light homepage should receive the route theme toggle")

assertPngAssetWith2xAndPrompt(lightSliceDir, "home-light-slice-01a-nav-bar.png", 958, 72)
for (const [name, width, height] of lightElements) {
  assertPngAssetWith2xAndPrompt(lightElementDir, name, width, height)
}

assert.ok(homeLightSource.includes('data-home-light-reference="index-light-hybrid-dom"'), "light homepage should expose the real-DOM reference contract marker")
assert.ok(homeLightSource.includes('data-home-light-artboard="index-light-958x1642"'), "light homepage should preserve the measured artboard marker")
assert.ok(homeLightSource.includes('data-home-light-slice-count={TOTAL_RUNTIME_SLICE_COUNT}'), "light homepage should expose the runtime slice count")
assert.ok(homeLightSource.includes("const TOTAL_RUNTIME_SLICE_COUNT = 2"), "light homepage runtime should keep nav plus the full Hero backing slice to avoid stitched seams")
assert.ok(homeLightSource.includes('data-home-light-dom-complete="hybrid-hero-backed"'), "light homepage should mark body decomposition as hybrid Hero-backed DOM")
assert.ok(homeLightSource.includes('data-home-light-body="hero-image-backed-real-dom-sections"'), "light homepage body should be a complete DOM replacement rather than screenshot slices")
assert.ok(homeLightSource.includes('mode="image-backed-reference"'), "Hero should use the full Hero backing image instead of stitched left/right fragments")
assert.ok(homeLightSource.includes('"real-dom-replacement" | "image-backed-reference"'), "body sections should expose whether each section is real-DOM or image-backed")
assert.ok(homeLightSource.includes('data-home-light-section-hotspots="owned"'), "body hotspots should be owned by their real page sections")
assert.ok(homeLightSource.includes("const BODY_SECTION_COUNT = 6"), "light homepage body should keep six first-class sections")
for (const sectionId of ["hero", "featured-regions", "ai-roles", "memory-echoes", "recommended-coordinates", "cta-footer"]) {
  assert.ok(homeTemplateSource.includes(`id: "${sectionId}"`), `complete light page should include ${sectionId} as a first-class page section`)
}
for (const label of ["开始探索真实坐标", "进入第一个发光区域", "查看全部角色", "查看更多记忆", "进入推荐坐标云湖图书馆", "创建我的空间并邀请角色与记忆"]) {
  assert.ok(homeLightSource.includes(label), `real-DOM homepage should expose accessible hotspot/text for ${label}`)
}
assert.ok(homeLightSource.includes("cardTargets") && homeLightSource.includes("featuredCitySlices[index]?.id"), "light homepage card targets should derive entry links from real featured tavern IDs")
assert.ok(homeLightSource.includes("srcSet") && homeLightSource.includes("image2x"), "light homepage should expose HD srcSet sources for extracted element images")
assert.ok(homeLightSource.includes("max-w-[958px]"), "real-DOM artboard should preserve the approved source width")

assert.ok(homeLightSource.includes("LightReferenceTopNav") && sharedNavSource.includes('"data-home-light-nav": backing.id'), "navigation should use the shared light reference nav component")
assert.ok(sharedNavSource.includes('"data-home-light-section": "nav"') && sharedNavSource.includes('"data-home-light-section-boundary": "real-page-section"'), "navigation should participate in the complete page section boundary model")
assert.ok(sharedNavSource.includes("lightReferenceTopNavLayouts"), "navigation layout data should live with the shared nav component")
assert.ok(sharedNavSource.includes("lightReferenceTopNavHotspotStyle"), "navigation hotspots should use local nav-section coordinates")
assert.ok(sharedNavSource.includes("data-home-light-nav-controls") && sharedNavSource.includes("data-home-light-nav-control"), "navigation controls should render as real links/buttons")
assert.ok(sharedNavSource.includes("data-home-light-nav-text-layer"), "navigation text should be rendered as a real DOM/SVG text layer")
for (const marker of ["data-home-light-nav-search", "data-home-light-nav-theme-toggle", "data-home-light-nav-manager", "data-home-light-nav-cta"]) {
  assert.ok(sharedNavSource.includes(marker), `navigation chrome should expose ${marker}`)
}
for (const label of ["FableMap", "搜索附近坐标、角色、记忆线索", "管理入口", "开始探索", "探索", "区域", "角色", "记忆", "创建空间"]) {
  assert.ok(sharedNavSource.includes(label), `navigation should expose real text for ${label}`)
}

assert.ok(!combinedHomeSource.includes('data-home-light-reference="componentized-index-light"'), "light theme homepage should not use the rejected approximate componentized redraw")
assert.ok(!combinedHomeSource.includes("homeLightIndexReference"), "homepage should not import the full-page artboard at runtime")
assert.ok(!combinedHomeSource.includes("lightHomeBodySlices"), "homepage should not keep a body slice manifest after real-DOM replacement")
assert.ok(!combinedHomeSource.includes("LightReferencePageSection"), "homepage should not keep old body-slice page section renderer after real-DOM replacement")
assert.ok(!combinedHomeSource.includes("data-home-light-fragment"), "homepage should not keep hero screenshot fragments after real-DOM replacement")
assert.ok(combinedHomeSource.includes("homeLightSliceHeroMain"), "homepage should intentionally import the full Hero parent image to avoid the stitched split seam")
assert.ok(!combinedHomeSource.includes("heroReferenceImage"), "homepage hero should not keep using the old low-resolution screenshot-like reference")
assert.ok(!combinedHomeSource.includes("neon-cyber-tavern-reference.png"), "homepage hero should not reference the old blurry homepage image")
assert.ok(!combinedHomeSource.includes("min-h-[calc(100vh-88px)]"), "homepage hero section should not force a viewport-height layout that creates large blank space")

console.log("home-visual-density-test: ok")
