import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const homeRouteSource = readFileSync(resolve(__dirname, "../app/routes/home.tsx"), "utf8")
const homeLightSource = readFileSync(resolve(__dirname, "../app/components/home-light-real-dom.tsx"), "utf8")
const homeLayoutSource = readFileSync(resolve(__dirname, "../app/components/home-reference-layout.ts"), "utf8")
const sharedNavSource = readFileSync(resolve(__dirname, "../app/components/light-reference-top-nav.tsx"), "utf8")
const combinedHomeSource = `${homeRouteSource}\n${homeLightSource}`
const homeTemplateSource = `${homeLightSource}\n${homeLayoutSource}`

assert.ok(homeRouteSource.includes("HomeLightRealDom"), "desktop light homepage should use the dedicated real-DOM component")
assert.ok(homeLightSource.includes("LightReferenceTopNav"), "desktop light homepage should keep the extracted shared nav component")
assert.ok(homeLightSource.includes('data-home-light-body="hero-image-backed-real-dom-sections"'), "desktop light homepage body should be a hybrid Hero-backed replacement")
assert.ok(homeLightSource.includes('data-home-light-dom-complete="hybrid-hero-backed"'), "desktop light homepage should expose the hybrid Hero-backed marker")
assert.ok(homeLightSource.includes("const TOTAL_RUNTIME_SLICE_COUNT = 2"), "desktop light homepage should only rely on the full Hero backing slice where stitching would create seams")
assert.ok(homeLightSource.includes('data-home-light-section-boundary="real-page-section"') && homeLightSource.includes('data-home-light-section-hotspots="owned"'), "desktop light homepage hotspots should be owned by real page sections")
assert.ok(sharedNavSource.includes('"data-home-light-nav": backing.id') && sharedNavSource.includes("lightReferenceTopNavLayouts"), "desktop light homepage should extract navigation markup and hotspots from the page body")
assert.ok(sharedNavSource.includes("data-home-light-nav-controls") && homeLightSource.includes('<LightReferenceTopNav variant="home"'), "desktop light homepage nav controls should live inside shared LightReferenceTopNav as real links/buttons")
assert.ok(sharedNavSource.includes("data-home-light-nav-text-layer") && sharedNavSource.includes("menu:"), "desktop light homepage nav should expose visible real text over the 1:1 reference backing")
assert.ok(sharedNavSource.includes("data-home-light-nav-chrome") && sharedNavSource.includes("data-home-light-nav-search") && sharedNavSource.includes("data-home-light-nav-cta"), "desktop light homepage nav should extract search/action chrome into real CSS/DOM surfaces")

for (const sectionId of ["hero", "featured-regions", "ai-roles", "memory-echoes", "recommended-coordinates", "cta-footer"]) {
  assert.ok(homeTemplateSource.includes(`id: "${sectionId}"`), `desktop light homepage should keep ${sectionId} as a real section`)
}
assert.ok(homeLightSource.includes("max-w-[958px]"), "desktop light homepage should preserve the reference artboard width instead of stretching a low-resolution image")
assert.ok(homeLightSource.includes("srcSet") && homeLightSource.includes("image2x"), "desktop light homepage should serve 2x image sources for extracted elements")
assert.ok(homeLightSource.includes('data-home-light-hotspot="开始探索真实坐标"'), "light homepage should keep clickable primary CTA hotspots")
assert.ok(homeLightSource.includes("查看全部角色") && homeLightSource.includes("查看更多记忆") && homeLightSource.includes("查看全部区域"), "light homepage should include real links for the lower sections")
assert.ok(homeLightSource.includes("真实坐标，") && homeLightSource.includes("藏着会回应的世界"), "homepage hero title should avoid a chopped three-line blob")
assert.ok(homeLightSource.includes("会回应的世界"), "homepage hero should keep the emotional promise concise across readable lines")
assert.ok(homeLightSource.includes("homeLightSliceHeroMain") && homeLightSource.includes('mode="image-backed-reference"'), "light homepage hero should use the full Hero backing slice to avoid a vertical split seam")
assert.ok(homeRouteSource.includes("discoverRadarSurfaceImage"), "dark PC hero must keep using the high-quality radar surface asset")
assert.ok(!combinedHomeSource.includes('data-home-light-reference="componentized-index-light"'), "desktop light homepage should not use the rejected approximate componentized redraw")
assert.ok(!combinedHomeSource.includes("homeLightIndexReference"), "desktop light homepage should not import the full-page artboard after decomposition")
assert.ok(!combinedHomeSource.includes("lightHomeBodySlices"), "desktop light homepage should not keep the old body slice manifest")
assert.ok(combinedHomeSource.includes("homeLightSliceHeroMain"), "desktop light homepage should intentionally import the full Hero parent image")
assert.ok(!combinedHomeSource.includes("data-home-light-fragment"), "desktop light homepage should not keep screenshot-fragment runtime markers")
assert.ok(!combinedHomeSource.includes("min-h-[calc(100vh-88px)]"), "PC polish must not reintroduce viewport-height blank space")
assert.ok(!combinedHomeSource.includes("lg:min-h-[640px]"), "homepage visual should not retain the oversized hero poster height")

console.log("home-pc-polish-test: ok")
