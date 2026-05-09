import assert from "node:assert/strict"
import { existsSync, readFileSync, statSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const discoverSource = readFileSync(resolve(__dirname, "../app/routes/discover.tsx"), "utf8")
const realDomSource = readFileSync(resolve(__dirname, "../app/components/discover-light-real-dom.tsx"), "utf8")
const sharedNavSource = readFileSync(resolve(__dirname, "../app/components/light-reference-top-nav.tsx"), "utf8")
const lightSources = `${discoverSource}\n${realDomSource}`
const assetDir = resolve(__dirname, "../app/assets/discover/light")
const fullAssetPath = resolve(assetDir, "discover-light-reference.png")
const fullAsset2xPath = resolve(assetDir, "discover-light-reference-2x.png")
const fullSidecarPath = resolve(assetDir, "discover-light-reference.prompt.md")
const sliceDir = resolve(assetDir, "slices")
const elementDir = resolve(assetDir, "elements")
const expectedSlices = [
  { role: "nav", name: "discover-light-slice-01a-nav-bar.png", width: 1448, height: 72 },
  { role: "body", name: "discover-light-slice-02a-sidebar.png", width: 184, height: 1014 },
  { role: "body", name: "discover-light-slice-02b-main-search-filters.png", width: 984, height: 145 },
  { role: "body", name: "discover-light-slice-02c-main-card-row-1.png", width: 984, height: 340 },
  { role: "body", name: "discover-light-slice-02d-main-card-row-2.png", width: 984, height: 353 },
  { role: "body", name: "discover-light-slice-02e-main-bottom-band.png", width: 984, height: 176 },
  { role: "body", name: "discover-light-slice-03a-right-recommendations.png", width: 280, height: 501 },
  { role: "body", name: "discover-light-slice-03b-right-activity.png", width: 280, height: 337 },
  { role: "body", name: "discover-light-slice-03c-right-bottom-deco.png", width: 280, height: 176 },
]
const expectedElements = [
  { name: "discover-light-card-01-cover.png", width: 222, height: 180 },
  { name: "discover-light-card-02-cover.png", width: 222, height: 180 },
  { name: "discover-light-card-03-cover.png", width: 222, height: 180 },
  { name: "discover-light-card-04-cover.png", width: 222, height: 180 },
  { name: "discover-light-card-05-cover.png", width: 222, height: 180 },
  { name: "discover-light-card-06-cover.png", width: 222, height: 180 },
  { name: "discover-light-card-07-cover.png", width: 222, height: 180 },
  { name: "discover-light-card-08-cover.png", width: 222, height: 180 },
  { name: "discover-light-right-thumb-01.png", width: 76, height: 58 },
  { name: "discover-light-right-thumb-02.png", width: 76, height: 58 },
  { name: "discover-light-right-thumb-03.png", width: 76, height: 58 },
  { name: "discover-light-right-thumb-04.png", width: 76, height: 58 },
  { name: "discover-light-right-thumb-05.png", width: 76, height: 58 },
  { name: "discover-light-sidebar-orb.png", width: 94, height: 96 },
  { name: "discover-light-sidebar-radar.png", width: 97, height: 102 },
  { name: "discover-light-bottom-city.png", width: 256, height: 153 },
  { name: "discover-light-activity-wave.png", width: 225, height: 29 },
]

function readPngDimensions(path) {
  const buffer = readFileSync(path)
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  }
}

assert.ok(existsSync(fullAssetPath), "discover light full reference image should remain project-local provenance")
assert.ok(existsSync(fullAsset2xPath), "discover light full reference image should have a 2x sibling")
assert.ok(existsSync(fullSidecarPath), "discover light full reference image should have prompt/provenance sidecar")
assert.deepEqual(readPngDimensions(fullAssetPath), { width: 1448, height: 1086 }, "discover light full reference should preserve search_light.png dimensions")
assert.deepEqual(readPngDimensions(fullAsset2xPath), { width: 2896, height: 2172 }, "discover light full reference 2x should preserve retina dimensions")

let totalBodyArea = 0
for (const slice of expectedSlices) {
  const slicePath = resolve(sliceDir, slice.name)
  const slice2xPath = resolve(sliceDir, slice.name.replace(".png", "-2x.png"))
  const sidecarPath = resolve(sliceDir, slice.name.replace(".png", ".prompt.md"))
  assert.ok(existsSync(slicePath), `${slice.name} should exist as a project-local runtime slice`)
  assert.ok(existsSync(slice2xPath), `${slice.name} should have a 2x sibling`)
  assert.ok(existsSync(sidecarPath), `${slice.name} should have prompt/provenance sidecar`)
  assert.deepEqual(readPngDimensions(slicePath), { width: slice.width, height: slice.height }, `${slice.name} should preserve slice dimensions`)
  assert.deepEqual(readPngDimensions(slice2xPath), { width: slice.width * 2, height: slice.height * 2 }, `${slice.name} 2x should preserve retina dimensions`)
  assert.ok(statSync(slice2xPath).size > statSync(slicePath).size, `${slice.name} 2x should contain a higher-resolution payload`)
  if (slice.role === "body") totalBodyArea += slice.width * slice.height
}
assert.equal(totalBodyArea, 1448 * 1014, "discover light body fragments should tile the full post-nav body area")

for (const element of expectedElements) {
  const elementPath = resolve(elementDir, element.name)
  const element2xPath = resolve(elementDir, element.name.replace(".png", "-2x.png"))
  const sidecarPath = resolve(elementDir, element.name.replace(".png", ".prompt.md"))
  assert.ok(existsSync(elementPath), `${element.name} should exist as a project-local reference element`)
  assert.ok(existsSync(element2xPath), `${element.name} should have a 2x sibling`)
  assert.ok(existsSync(sidecarPath), `${element.name} should have prompt/provenance sidecar`)
  assert.deepEqual(readPngDimensions(elementPath), { width: element.width, height: element.height }, `${element.name} should preserve cropped element dimensions`)
  assert.deepEqual(readPngDimensions(element2xPath), { width: element.width * 2, height: element.height * 2 }, `${element.name} 2x should preserve retina dimensions`)
}

assert.ok(realDomSource.includes("discoverLightSliceNavBar") && realDomSource.includes("discover-light-slice-01a-nav-bar.png"), "discover real-DOM component should import only the light nav backing slice")
assert.ok(!realDomSource.includes("discoverLightSliceSidebar") && !realDomSource.includes("discover-light-slice-02a-sidebar.png"), "discover real-DOM component should not import sidebar body screenshots at runtime")
assert.ok(!realDomSource.includes("discoverLightSliceMainSearchFilters") && !realDomSource.includes("discover-light-slice-02b-main-search-filters.png"), "discover real-DOM component should not import search/filter body screenshots at runtime")
assert.ok(!realDomSource.includes("discoverLightSliceRightActivity") && !realDomSource.includes("discover-light-slice-03b-right-activity.png"), "discover real-DOM component should not import right-rail body screenshots at runtime")
assert.ok(realDomSource.includes("LightReferenceTopNav") && realDomSource.includes('variant="discover"'), "discover light navigation should use the shared top nav component")
assert.ok(sharedNavSource.includes('data-light-reference-top-nav="shared"') && sharedNavSource.includes('"data-discover-light-nav": backing.id'), "shared top nav should expose discover nav markers")
assert.ok(sharedNavSource.includes('data-discover-light-nav-controls') && sharedNavSource.includes('data-discover-light-nav-chrome'), "shared top nav should expose discover controls and chrome")
assert.ok(discoverSource.includes("function LightDiscoverReference"), "discover route should render a dedicated light reference component")
assert.ok(discoverSource.includes("DiscoverLightRealDom"), "discover route should delegate light rendering to the real-DOM component")
assert.ok(realDomSource.includes("function SectionShell") && realDomSource.includes('data-discover-light-section-dom="real-dom-replacement"'), "discover light body should be represented by owned real-DOM section shells")
assert.ok(realDomSource.includes('data-discover-light-reference="search-light-real-dom"'), "discover light route should expose the real-DOM reference marker")
assert.ok(realDomSource.includes('data-discover-light-artboard="search-light-1448x1086"'), "discover light route should expose the measured artboard marker")
assert.ok(realDomSource.includes("data-discover-light-slice-count={TOTAL_RUNTIME_SLICE_COUNT}") && realDomSource.includes("const TOTAL_RUNTIME_SLICE_COUNT = 1"), "discover light route should only keep the shared nav backing as a runtime slice")
assert.ok(realDomSource.includes("data-discover-light-section-count={TOTAL_SECTION_COUNT}"), "discover light route should expose the complete page section count")
assert.ok(realDomSource.includes('data-discover-light-body="complete-dom-replacement"'), "discover light route should render the body as complete real DOM")
assert.ok(!realDomSource.includes("data-discover-light-body-fragment"), "discover light route should not render body screenshot fragments after full replacement")
assert.ok(realDomSource.includes('data-discover-light-section-boundary="real-page-section"'), "discover light route should expose real section boundaries")
assert.ok(realDomSource.includes('data-discover-light-search="real-input"'), "discover light route should keep a real search input over the reference artboard")
assert.ok(realDomSource.includes("data-discover-light-hotspot={") || realDomSource.includes('data-discover-light-hotspot="'), "discover light route should expose accessible real body controls")
assert.ok(realDomSource.includes('data-discover-light-section-hotspot="'), "discover light route should attach controls to owned page sections")
assert.ok(discoverSource.includes("if (isDark)") && discoverSource.includes("<DiscoverBlackReference"), "discover route should route dark theme to the black reference component")
assert.ok(discoverSource.includes("<LightDiscoverReference"), "discover route should continue using the light reference component for light theme")
assert.ok(discoverSource.includes("onToggleTheme={toggleTheme}"), "discover light route should keep the theme-toggle control live through shared nav")
assert.ok(realDomSource.includes("buildCards") && discoverSource.includes("filteredTaverns"), "discover light cards should preserve real links from the filtered tavern list")
assert.ok(!discoverSource.includes("discoverLightReferenceImage"), "discover route should no longer import the full search_light artboard at runtime after nav/body splitting")
assert.ok(!lightSources.includes("discoverLightSliceBody") && !lightSources.includes("discover-light-slice-02-body.png"), "discover route should no longer import the old whole-body runtime slice after complete decomposition")
for (const label of ["雨巷书店", "进入第一张地点卡", "进入第八张地点卡", "查看更多推荐", "查看全部动态", "适合对话筛选", "更多筛选", "侧边栏设置"]) {
  assert.ok(lightSources.includes(label), `discover light route should expose ${label}`)
}

console.log("discover-light-reference-test: ok")
