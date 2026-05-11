import assert from "node:assert/strict"
import { existsSync, readFileSync, statSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..", "..")
const homeRouteSource = readFileSync(resolve(__dirname, "../app/routes/home.tsx"), "utf8")
const soulLinkSource = readFileSync(resolve(__dirname, "../app/components/soul-link-reference-artboards.tsx"), "utf8")
const portraitConfigSource = readFileSync(resolve(__dirname, "../app/features/tavern-npc-stage/portraitCatalogConfig.ts"), "utf8")
const assetRoot = resolve(repoRoot, "frontend/app/assets/soul-link-05-10")

function readPngInfo(path) {
  const buffer = readFileSync(path)
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}
function assertPng(rel, width, height) {
  const path = resolve(repoRoot, rel)
  assert.ok(existsSync(path), `${rel} should exist`)
  assert.deepEqual(readPngInfo(path), { width, height }, `${rel} should preserve reference crop dimensions`)
  assert.ok(statSync(path).size > 1024, `${rel} should contain a real image payload`)
}

assert.ok(existsSync(assetRoot), "new SoulLink 05-10 runtime asset root should exist")
assert.ok(!existsSync(resolve(repoRoot, "frontend/app/assets/homepage")), "old homepage design asset directory should be deleted")
assert.ok(!existsSync(resolve(repoRoot, "frontend/app/assets/discover")), "old discover/search design asset directory should be deleted")
assertPng("frontend/app/assets/soul-link-05-10/home-light/invite-card.png", 1182, 1330)
assertPng("frontend/app/assets/soul-link-05-10/home-light/invite-card-2x.png", 1182, 1331)
assert.ok(!existsSync(resolve(repoRoot, "frontend/app/assets/soul-link-05-10/home-black/sidebar.png")), "black home sidebar must be real DOM/CSS, not a full sidebar bitmap")
assert.ok(!existsSync(resolve(repoRoot, "frontend/app/assets/soul-link-05-10/home-black/sidebar-2x.png")), "black home sidebar must not keep a 2x full-sidebar bitmap")
assertPng("frontend/app/assets/soul-link-05-10/home-black/hero-system-visual.png", 1672, 941)
assertPng("frontend/app/assets/soul-link-05-10/home-black/node-data-harbor.png", 1736, 906)
assertPng("frontend/app/assets/soul-link-05-10/home-black/node-neon-ruins.png", 1733, 907)
assertPng("frontend/app/assets/soul-link-05-10/home-black/node-old-platform.png", 1734, 907)
assertPng("frontend/app/assets/soul-link-05-10/home-black/node-white-tower.png", 1733, 908)
assertPng("frontend/app/assets/soul-link-05-10/home-black/recent-echo-waveform.png", 1676, 939)
assertPng("frontend/app/assets/soul-link-05-10/home-black/world-stats-sparkline.png", 2037, 772)
assertPng("frontend/app/assets/soul-link-05-10/home-black/user-avatar-node07.png", 1024, 1024)
assertPng("frontend/app/assets/soul-link-05-10/home-black/guide-protocol-icon.png", 1024, 1024)
assertPng("frontend/app/assets/soul-link-05-10/home-black/guide-database-icon.png", 1024, 1024)
assertPng("frontend/app/assets/soul-link-05-10/home-black/guide-security-icon.png", 1024, 1024)
assertPng("frontend/public/place-atmosphere-hd/atmosphere-lore.png", 1024, 576)
assertPng("frontend/app/assets/npc-style-cast/portraits-hd/commission-zhideng.png", 512, 512)

assert.ok(homeRouteSource.includes("SoulLinkHomeReference"), "home route should render the locked 1:1 SoulLink component")
assert.ok(
  homeRouteSource.includes("featuredCitySlices={homepage.featuredCitySlices}") ||
    homeRouteSource.includes("featuredCitySlices: homepage.featuredCitySlices"),
  "home route should pass dynamic featured tavern data",
)
assert.ok(
  homeRouteSource.includes("onToggleTheme={toggleTheme}") ||
    homeRouteSource.includes("onToggleTheme: toggleTheme"),
  "home route should pass theme toggle",
)
assert.ok(soulLinkSource.includes("HOME_LIGHT") && soulLinkSource.includes("HOME_BLACK"), "component should define both home artboards")
assert.ok(soulLinkSource.includes("home-light-real-dom-1536x1024"), "light home should expose the 1536x1024 marker")
assert.ok(soulLinkSource.includes("home-black-real-dom-1536x1024"), "black home should expose the 1536x1024 marker")
assert.ok(soulLinkSource.includes("function SoulLinkSidebar"), "home should use the shared visible sidebar component")
assert.ok(soulLinkSource.includes('active="home"'), "home should mark the shared sidebar home item active")
assert.ok(soulLinkSource.includes("sidebar.navItems.map"), "sidebar items should come from the shared HOME_LAYOUT sidebar geometry")
assert.ok(!soulLinkSource.includes("homeSharedNavHotspots"), "home should not keep a page-specific sidebar hotspot list")
assert.ok(soulLinkSource.includes("function SoulLinkUserCluster"), "home should use the shared top-right user cluster component")
assert.ok(soulLinkSource.includes("SoulLinkUserAvatar") && soulLinkSource.includes("SoulLinkUserIdentity"), "user cluster should split avatar and text into subcomponents")
assert.ok(soulLinkSource.includes('data-soul-link-notification="real-button"'), "notification bell should be a real button, not baked pixels")
assert.ok(soulLinkSource.includes("function SoulLinkFeedPanel"), "home right-rail feed should be a reusable component")
assert.ok(soulLinkSource.includes("function SoulLinkDailyQuotePanel"), "home quote card should be a reusable component")
assert.ok(homeRouteSource.includes("worldPulseItems") && homeRouteSource.includes("dailyQuote"), "home route should pass editable right-rail data")
assert.ok(homeRouteSource.includes("onlineEntities"), "home route should pass editable online-entity data")
assert.ok(homeRouteSource.includes("recentMemories"), "home route should pass editable recent-memory data")
assert.ok(homeRouteSource.includes("guideCards"), "home route should pass editable guide-card data")
assert.ok(homeRouteSource.includes("worldStats"), "home route should pass editable world-stat data")
assert.ok(soulLinkSource.includes('data-soul-link-feed-title="real-text"'), "home feed rows should render real text")
assert.ok(soulLinkSource.includes('data-soul-link-daily-quote="real-text"'), "home quote should render real text")
assert.ok(soulLinkSource.includes("function SoulLinkOnlineEntitiesPanel"), "home online souls should be a reusable component")
assert.ok(soulLinkSource.includes('data-soul-link-online-name="real-text"'), "home online rows should render real names")
assert.ok(soulLinkSource.includes('data-soul-link-online-avatar="real-image"'), "home online rows should render real avatars")
assert.ok(soulLinkSource.includes("function SoulLinkRecentMemoriesPanel"), "home recent memories should be a reusable component")
assert.ok(soulLinkSource.includes('data-soul-link-memory-thumb="real-image"'), "home recent memories should render real thumbnail images")
assert.ok(soulLinkSource.includes('data-soul-link-memory-title="real-text"'), "home recent memories should render real text")
assert.ok(soulLinkSource.includes("function SoulLinkGuidePanel"), "home guide cards should be a reusable component")
assert.ok(soulLinkSource.includes('data-soul-link-guide-title="real-text"'), "home guide cards should render real title text")
assert.ok(soulLinkSource.includes('data-soul-link-guide-image="real'), "home guide cards should render separate visual assets")
assert.ok(soulLinkSource.includes("function SoulLinkWorldStatsPanel"), "home world stats should be a reusable component")
assert.ok(soulLinkSource.includes('data-soul-link-world-stat-value="real-text"'), "home world stats should render real values")
assert.ok(soulLinkSource.includes('data-soul-link-world-stat-label="real-text"'), "home world stats should render real labels")
assert.ok(soulLinkSource.includes("SoulLinkHomeMainSurface"), "home should render a shared real-DOM surface")
assert.ok(soulLinkSource.includes("hero: { x: 220, y: 18, w: 1000, h: 530 }"), "home hero geometry should live in the shared HOME_LAYOUT")
assert.ok(soulLinkSource.includes("heroDecorations: {"), "home hero decoration geometry should live in the shared HOME_LAYOUT")
assert.ok(soulLinkSource.includes("sidebar: {"), "home sidebar geometry should live in the shared HOME_LAYOUT")
assert.ok(soulLinkSource.includes("userCluster: { x: 1234, y: 26, w: 286, h: 72 }"), "home user cluster geometry should live in the shared HOME_LAYOUT")
assert.ok(soulLinkSource.includes("currentCoordinate: { x: 1000, y: 397, w: 170, h: 76 }"), "home current-coordinate geometry should live in the shared HOME_LAYOUT")
assert.ok(soulLinkSource.includes("rightRail: {"), "home right rail geometry should live in the shared HOME_LAYOUT")
assert.ok(soulLinkSource.includes("bottomRail: {"), "home bottom rail geometry should live in the shared HOME_LAYOUT")
assert.ok(soulLinkSource.includes("const SIDEBAR_MATERIALS ="), "sidebar assets should be theme materials, not separate layout definitions")
assert.ok(!soulLinkSource.includes("homeBlackSidePanel"), "black sidebar must not import a full-sidebar bitmap")
assert.ok(soulLinkSource.includes("data-soul-link-current-coordinate=\"shared\""), "current-coordinate badge should be a shared module in both home themes")
assert.ok(!soulLinkSource.includes("HOME_BLACK_LAYOUT"), "black home must not keep a separate layout geometry constant")
assert.ok(!soulLinkSource.includes("HOME_BLACK_RIGHT_RAIL"), "black home must reuse the shared right-rail geometry")
assert.ok(!soulLinkSource.includes("HOME_BLACK_BOTTOM_RAIL"), "black home must reuse the shared bottom-rail geometry")
assert.ok(!soulLinkSource.includes("homeBlackCardBoxes"), "black home cards must reuse the shared card geometry")
assert.ok(!soulLinkSource.includes("HOME_RIGHT_RAIL"), "home must not keep right-rail geometry outside HOME_LAYOUT")
assert.ok(!soulLinkSource.includes("HOME_BOTTOM_RAIL"), "home must not keep bottom-rail geometry outside HOME_LAYOUT")
assert.ok(!soulLinkSource.includes("SIDEBAR_REFERENCE_PANELS"), "home must not keep per-variant sidebar layout panels")
assert.ok(!soulLinkSource.includes("SIDEBAR_INVITE_CARDS"), "home must not mix sidebar material assets with layout constants")
assert.ok(!soulLinkSource.includes("SHARED_USER_CLUSTER"), "home user cluster geometry must not drift outside HOME_LAYOUT")
assert.ok(!soulLinkSource.includes("slice(0, isBlack"), "black home must not change list density through isBlack")
assert.ok(!soulLinkSource.includes("forceVisible && !isBlack"), "black home must not change panel compactness through isBlack")
assert.ok(soulLinkSource.includes("../assets/npc-style-cast/portraits-hd/commission-zhideng.png"), "SoulLink avatar fallback should use the HD portrait catalog")
assert.ok(soulLinkSource.includes('srcSet={`${slice.src} 1x, ${slice.src2x} 2x`}'), "SoulLink design slices should render with 2x srcSet")
assert.ok(portraitConfigSource.includes("portraits-hd"), "home route should receive HD portrait fallbacks from the shared portrait catalog")
assert.ok(!soulLinkSource.includes("../assets/homepage/"), "runtime home component must not import deleted old homepage assets")
assert.ok(!soulLinkSource.includes("homeLightIndexReference"), "homepage should not import a full-page artboard at runtime")

console.log("home-visual-density-test: ok")

