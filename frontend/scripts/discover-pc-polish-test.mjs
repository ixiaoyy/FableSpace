import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const discoverSource = readFileSync(resolve(__dirname, "../app/routes/discover.tsx"), "utf8")
const referenceSource = readFileSync(resolve(__dirname, "../app/components/soul-link-reference-artboards.tsx"), "utf8")
const combinedSource = `${discoverSource}\n${referenceSource}`

assert.ok(
  discoverSource.includes("SoulLinkDiscoverReference"),
  "discover route should delegate to the shared SoulLink reference DOM instead of keeping a stale duplicate layout",
)
assert.ok(
  !discoverSource.includes('id="discover-mainline"'),
  "discover route should not keep the retired mainline JSX fragment outside the route return",
)
assert.ok(
  referenceSource.includes('data-soul-link-dom={kind}') && referenceSource.includes('kind === "discover"'),
  "shared SoulLink surface should expose a discover DOM marker for visual auditing",
)
assert.ok(
  referenceSource.includes('data-soul-link-discover-title="real-text"') &&
    referenceSource.includes('data-soul-link-discover-filter-panel="real-dom"') &&
    referenceSource.includes('data-soul-link-discover-timeline="real-dom"') &&
    referenceSource.includes('data-soul-link-discover-right-rail="real-dom"'),
  "discover desktop artboard should expose real DOM title, filter, timeline, and right rail regions",
)
assert.ok(
  referenceSource.includes('data-soul-link-discover-card="real-card"') &&
    referenceSource.includes('data-soul-link-discover-card-copy="real-text-layer"'),
  "discover cards should remain real DOM cards with text layers instead of flat screenshots",
)
assert.ok(
  referenceSource.includes('data-soul-link-discover-square-image="512x512"'),
  "discover reference should use project square imagery for cards/feed rather than bare remote placeholders",
)
assert.ok(discoverSource.includes("RadarSignalSummary"), "discover radar cards should use a compact text summary instead of image-heavy rows")
const previewTileSource = discoverSource.slice(
  discoverSource.indexOf("function PreviewTile"),
  discoverSource.indexOf("function RadarSignalCard"),
)
assert.ok(
  discoverSource.includes("function previewBackgroundImage"),
  "discover side preview tiles should have a luminous background fallback instead of depending on a bare image block",
)
assert.ok(
  previewTileSource.includes("previewBackgroundImage(image)"),
  "discover side preview tiles should render project images as background art with a fallback glow",
)
const radarCardSource = discoverSource.slice(
  discoverSource.indexOf("function RadarSignalCard"),
  discoverSource.indexOf("function ResultCard"),
)
assert.ok(
  !radarCardSource.includes("EntrySignalGrid"),
  "radar signal cards should not render the full nested entry signal grid",
)
assert.ok(
  !radarCardSource.includes("ShortDramaTeaserCard"),
  "radar signal cards should not render nested teaser cards in the compact radar scan view",
)
assert.ok(
  combinedSource.includes("时间流") && combinedSource.includes("探索") && combinedSource.includes("真实坐标"),
  "discover UI copy should keep visible exploration/timeline/coordinate anchors",
)
assert.ok(discoverSource.includes('type DiscoverViewMode = "radar" | "cards"'), "discover view-mode contract must remain intact")

console.log("discover-pc-polish-test: ok")
