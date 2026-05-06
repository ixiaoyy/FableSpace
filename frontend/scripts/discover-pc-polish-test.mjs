import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const discoverSource = readFileSync(resolve(__dirname, "../app/routes/discover.tsx"), "utf8")

assert.ok(discoverSource.includes("DesktopRadarTelemetry"), "discover PC radar should include a desktop telemetry strip")
assert.ok(discoverSource.includes("lg:grid-cols-[0.62fr_1.38fr]"), "discover PC layout should give the radar board stronger width dominance")
assert.ok(discoverSource.includes("lg:sticky lg:top-28"), "discover PC control column should stay stable while scanning results")
assert.ok(discoverSource.includes("lg:min-h-[680px]"), "discover PC radar board should have a stronger desktop poster scale")
assert.ok(
  !discoverSource.includes("grid gap-3 xl:grid-cols-2"),
  "discover radar signals should stay in a breathable single scan column instead of crowding two dense cards per row",
)
assert.ok(discoverSource.includes("CharacterAvatarBadge"), "discover character avatars should have a dedicated fallback badge")
assert.ok(
  discoverSource.includes("onError={() => setBroken(true)}"),
  "discover character avatar images should fall back when a source fails to load",
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
assert.ok(discoverSource.includes("Live telemetry"), "discover telemetry should expose a visible cockpit label")
assert.ok(discoverSource.includes('type DiscoverViewMode = "radar" | "cards"'), "discover view-mode contract must remain intact")

console.log("discover-pc-polish-test: ok")
