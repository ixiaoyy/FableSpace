import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, "..", "..")

function readSource(path) {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n")
}

function readPngInfo(path) {
  const buffer = readFileSync(path)
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    sha256: createHash("sha256").update(buffer).digest("hex"),
  }
}

const componentSource = readSource(resolve(repoRoot, "frontend/app/components/soul-link-reference-artboards.tsx"))
const homeRouteSource = readSource(resolve(repoRoot, "frontend/app/routes/home.tsx"))
const discoverRouteSource = readSource(resolve(repoRoot, "frontend/app/routes/discover.tsx"))
const runtimeConfigSource = readSource(resolve(repoRoot, "frontend/app/lib/tavern-runtime-config.js"))
const portraitConfigSource = readSource(resolve(repoRoot, "frontend/app/features/tavern-npc-stage/portraitCatalogConfig.ts"))
const packageJson = JSON.parse(readSource(resolve(repoRoot, "frontend/package.json")))
const newAssetRoot = resolve(repoRoot, "frontend/app/assets/soul-link-05-10")


const archivedReferences = [
  [".trellis/tasks/05-10-05-10-ui-ux-design-audit-and-polish/reference-designs/index_light.png", "1536x1024", "fe123873aaf825a8b354c0285f1aed48547980ec919a55e312cfbbe70e1e8b8b"],
  [".trellis/tasks/05-10-05-10-ui-ux-design-audit-and-polish/reference-designs/index_black.png", "1536x1024", "1f33fa26a02f715a47d287d6e93e41dddaa062d35fa8843fb69b60e2758315ba"],
  [".trellis/tasks/05-10-05-10-ui-ux-design-audit-and-polish/reference-designs/search_light.png", "1536x1024", "0808e5ac824c452e7a3fc6499587b140f6206e06ca07a7952e27e18bd26d52bb"],
  [".trellis/tasks/05-10-05-10-ui-ux-design-audit-and-polish/reference-designs/search_black.png", "1545x1018", "6fc59be6df067693a0579a93cb576be7b117871e5a296cdb13af47c6d24ba303"],
]

assert.ok(existsSync(newAssetRoot), "new SoulLink 05-10 asset root should exist")
assert.ok(!existsSync(resolve(repoRoot, "frontend/app/assets/homepage")), "old homepage design assets should be deleted from runtime assets")
assert.ok(!existsSync(resolve(repoRoot, "frontend/app/assets/discover")), "old discover/search design assets should be deleted from runtime assets")

for (const [file, dimensions, sha256] of archivedReferences) {
  const assetPath = resolve(repoRoot, file)
  assert.ok(existsSync(assetPath), `${file} should remain archived as Trellis-only design reference`)
  const info = readPngInfo(assetPath)
  assert.equal(`${info.width}x${info.height}`, dimensions, `${file} should preserve design dimensions`)
  assert.equal(info.sha256, sha256, `${file} should preserve design hash`)
}

for (const [file, dimensions] of [
  ["frontend/app/assets/soul-link-05-10/home-light/invite-card.png", "1182x1330"],
  ["frontend/app/assets/soul-link-05-10/home-light/invite-card-2x.png", "1182x1331"],
  ["frontend/app/assets/soul-link-05-10/home-black/invite-card.png", "151x170"],
  ["frontend/app/assets/soul-link-05-10/home-black/invite-card-2x.png", "302x340"],
  ["frontend/app/assets/soul-link-05-10/home-black/hero-system-visual.png", "1672x941"],
  ["frontend/app/assets/soul-link-05-10/home-black/node-data-harbor.png", "1736x906"],
  ["frontend/app/assets/soul-link-05-10/home-black/node-neon-ruins.png", "1733x907"],
  ["frontend/app/assets/soul-link-05-10/home-black/node-old-platform.png", "1734x907"],
  ["frontend/app/assets/soul-link-05-10/home-black/node-white-tower.png", "1733x908"],
  ["frontend/app/assets/soul-link-05-10/home-black/recent-echo-waveform.png", "1676x939"],
  ["frontend/app/assets/soul-link-05-10/home-black/user-avatar-node07.png", "1024x1024"],
  ["frontend/app/assets/soul-link-05-10/home-black/world-stats-sparkline.png", "2037x772"],
  ["frontend/app/assets/soul-link-05-10/home-black/guide-protocol-icon.png", "1024x1024"],
  ["frontend/app/assets/soul-link-05-10/home-black/guide-database-icon.png", "1024x1024"],
  ["frontend/app/assets/soul-link-05-10/home-black/guide-security-icon.png", "1024x1024"],
  ["frontend/app/assets/soul-link-05-10/discover-light/sidebar.png", "200x1024"],
  ["frontend/app/assets/soul-link-05-10/discover-light/sidebar-2x.png", "400x2048"],
  ["frontend/app/assets/soul-link-05-10/discover-light/main.png", "1018x1024"],
  ["frontend/app/assets/soul-link-05-10/discover-light/main-2x.png", "2036x2048"],
  ["frontend/app/assets/soul-link-05-10/discover-light/right-rail.png", "318x1024"],
  ["frontend/app/assets/soul-link-05-10/discover-light/right-rail-2x.png", "636x2048"],
  ["frontend/app/assets/soul-link-05-10/discover-black/sidebar.png", "210x1018"],
  ["frontend/app/assets/soul-link-05-10/discover-black/sidebar-2x.png", "420x2036"],
  ["frontend/app/assets/soul-link-05-10/discover-black/main.png", "1020x1018"],
  ["frontend/app/assets/soul-link-05-10/discover-black/main-2x.png", "2040x2036"],
  ["frontend/app/assets/soul-link-05-10/discover-black/right-rail.png", "315x1018"],
  ["frontend/app/assets/soul-link-05-10/discover-black/right-rail-2x.png", "630x2036"],
]) {
  const info = readPngInfo(resolve(repoRoot, file))
  assert.equal(`${info.width}x${info.height}`, dimensions, `${file} should preserve locked crop dimensions`)
}

for (const file of [
  "frontend/app/assets/soul-link-05-10/home-black/sidebar.png",
  "frontend/app/assets/soul-link-05-10/home-black/sidebar-2x.png",
]) {
  assert.ok(!existsSync(resolve(repoRoot, file)), `${file} must stay deleted; black navigation is real DOM/CSS, not a full sidebar bitmap`)
}

for (const [file, dimensions] of [
  ["frontend/public/place-atmosphere-hd/atmosphere-ember.png", "1024x576"],
  ["frontend/public/place-atmosphere-hd/atmosphere-lore.png", "1024x576"],
  ["frontend/app/assets/npc-style-cast/portraits-hd/commission-zhideng.png", "512x512"],
]) {
  const info = readPngInfo(resolve(repoRoot, file))
  assert.equal(`${info.width}x${info.height}`, dimensions, `${file} should be an HD runtime material asset`)
}

assert.ok(homeRouteSource.includes("SoulLinkHomeReference"), "home route should render the SoulLink real-DOM page")
assert.ok(discoverRouteSource.includes("SoulLinkDiscoverReference"), "discover route should render the SoulLink real-DOM page")
assert.ok(runtimeConfigSource.includes("/place-atmosphere-hd/"), "atmosphere resolver should return HD public images")
assert.ok(portraitConfigSource.includes("portraits-hd"), "NPC portrait catalog should use HD imported images")
assert.ok(homeRouteSource.includes('variant="black"') && homeRouteSource.includes('variant="light"'), "home route should keep theme-driven light/dark rendering")
assert.ok(discoverRouteSource.includes('variant="black"') && discoverRouteSource.includes('variant="light"'), "discover route should keep theme-driven light/dark rendering")
assert.ok(!componentSource.includes("../assets/soul-link-05-10/discover-light/main"), "light discover runtime should not import the full main screenshot slice")
assert.ok(!componentSource.includes("../assets/soul-link-05-10/discover-light/right-rail"), "light discover runtime should not import the full right-rail screenshot slice")
assert.ok(!discoverRouteSource.includes("../assets/soul-link-05-10/discover-light/main"), "discover route should not import the full light search screenshot")

for (const marker of [
  'data-soul-link-real-dom="true"',
  'data-soul-link-dom={kind}',
  'kind="home"',
  'kind="discover"',
  'data-soul-link-design-lock="owner-reference-1-to-1"',
  "src2x:",
  "srcSet={`${slice.src} 1x, ${slice.src2x} 2x`}",
  'home-light-real-dom-1536x1024',
  'home-black-real-dom-1536x1024',
  'discover-light-real-dom-1536x1024',
  'discover-black-real-dom-1536x1024',
  'min-h-11 touch-manipulation',
  'aria-label="SoulLink navigation"',
  'data-soul-link-search={onChange ? "real-input" : undefined}',
  'value={value}',
  'onChange?.(event.target.value)',
  'onOpenOnlyChange(true)',
  'onPublicOnlyChange(true)',
  'onToggleSpecialType("cultivation-retreat")',
  'onTogglePlaceType("bookstore")',
  'onToggleCategory("陪伴树洞")',
  "const HOME_LAYOUT =",
  "sidebar: {",
  "hero: { x: 220, y: 18, w: 1000, h: 530 }",
  "heroDecorations: {",
  "currentCoordinate: { x: 1000, y: 397, w: 170, h: 76 }",
  "recommendedHeader: { x: 252, y: 560, w: 936, h: 44 }",
  "rightRail: {",
  "bottomRail: {",
  "const DISCOVER_LAYOUT =",
  "function SoulLinkSidebar",
  'data-soul-link-sidebar="shared"',
  "sidebar.navItems.map",
  "const SIDEBAR_MATERIALS =",
  'data-soul-link-sidebar-invite="fixed-image"',
  "srcSet={`${inviteCard.src} 1x, ${inviteCard.src2x} 2x`}",
  "function SoulLinkUserCluster",
  'data-soul-link-user-cluster="shared"',
  'data-soul-link-current-coordinate="shared"',
  'data-soul-link-notification="real-button"',
  'data-soul-link-user-avatar="real-image"',
  'data-soul-link-user-name="real-text"',
  "SoulLinkUserAvatar",
  "SoulLinkUserIdentity",
  "function SoulLinkFeedPanel",
  "function SoulLinkFeedItemRow",
  "function SoulLinkDailyQuotePanel",
  "function SoulLinkOnlineEntitiesPanel",
  "function SoulLinkOnlineEntityRow",
  "function SoulLinkOnlineStatus",
  "function SoulLinkRecentMemoriesPanel",
  "function SoulLinkRecentMemoryRow",
  "function SoulLinkGuidePanel",
  "function SoulLinkGuideCardView",
  "function SoulLinkWorldStatsPanel",
  "function SoulLinkDiscoverLightSurface",
  "function SoulLinkDiscoverLightFilterPanel",
  "function SoulLinkDiscoverLightRightRail",
  'data-soul-link-feed-panel="real-list"',
  'data-soul-link-feed-thumb="real-image"',
  'data-soul-link-feed-title="real-text"',
  'data-soul-link-discover-filter-panel="real-dom"',
  'data-soul-link-discover-timeline="real-dom"',
  'data-soul-link-discover-right-rail="real-dom"',
  'data-soul-link-discover-card-cover="real-image"',
  'data-soul-link-discover-card-title="real-text"',
  'data-soul-link-daily-quote="real-text"',
  'data-soul-link-online-panel="real-list"',
  'data-soul-link-online-avatar="real-image"',
  'data-soul-link-online-name="real-text"',
  'data-soul-link-online-location="real-text"',
  'data-soul-link-online-status="real-text"',
  'data-soul-link-recent-memories="real-list"',
  'data-soul-link-memory-thumb="real-image"',
  'data-soul-link-memory-title="real-text"',
  'data-soul-link-memory-source="real-text"',
  'data-soul-link-guide-panel="real-cards"',
  'data-soul-link-guide-title="real-text"',
  'data-soul-link-guide-text="real-text"',
  'data-soul-link-guide-image="real',
  'data-soul-link-world-stats="real-data"',
  'data-soul-link-world-stat-value="real-text"',
  'data-soul-link-world-stat-label="real-text"',
  'data-soul-link-world-stats-deco="real-image"',
  'active="home"',
  'active="discover"',
  "HOME_LAYOUT.cards.map",
  "DISCOVER_LAYOUT.cards.map",
]) {
  assert.ok(componentSource.includes(marker), `real-DOM SoulLink component should include ${marker}`)
}

for (const forbidden of [
  "../assets/ui-reference/05-10-design-audit",
  "../assets/homepage/",
  "../assets/discover/",
  "soul-link-index-light.png",
  "soul-link-index-black.png",
  "soul-link-search-light.png",
  "soul-link-search-black.png",
  'data-soul-link-hotspot',
  'ReferenceArtboard',
  'position: "absolute"',
  'object-cover"\n            decoding="async"',
  ".codex",
  "generated_images",
  "设计问题/",
  "homeBlackNavHotspots",
  "HOME_BLACK_LAYOUT",
  "HOME_BLACK_RIGHT_RAIL",
  "HOME_BLACK_BOTTOM_RAIL",
  "HOME_RIGHT_RAIL",
  "HOME_BOTTOM_RAIL",
  "SHARED_USER_CLUSTER",
  "SIDEBAR_REFERENCE_PANELS",
  "SIDEBAR_INVITE_CARDS",
  "homeBlackSidePanel",
  "home-black/sidebar.png",
  "homeBlackCardBoxes",
  "slice(0, isBlack",
  "forceVisible && !isBlack",
  "discoverBlackNavHotspots",
  "discoverBlackCardBoxes",
  "homeLightCardBoxes",
  "discoverLightCardBoxes",
  "discoverLightNavHotspots",
  "homeSharedNavHotspots",
  "discoverSharedNavHotspots",
  "HOME_LAYOUT.nav",
  "DISCOVER_LAYOUT.nav",
  "homeLightSidebar",
  "homeBlackSidebar",
  "discoverLightSidebar",
  "discoverBlackSidebar",
  "Lv.28.png",
  "世界脉搏.png",
  "每日一句.png",
]) {
  assert.ok(!componentSource.includes(forbidden), `runtime real-DOM component must not use full artboard/prototype pattern: ${forbidden}`)
}

assert.ok(packageJson.scripts.test.includes("soul-link-reference-artboards-test.mjs"), "SoulLink real-DOM contract test should be wired into npm test")
console.log("soul-link-reference-artboards-test: ok")

