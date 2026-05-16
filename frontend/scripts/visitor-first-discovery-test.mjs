import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
const component = readFileSync(resolve(root, "app/components/fable-map-reference-artboards.tsx"), "utf8")
const route = readFileSync(resolve(root, "app/routes/discover.tsx"), "utf8")

const checks = [
  [route.includes("visitorReduced"), "discover route enables visitorReduced mode"],
  [component.includes("visitorReduced?: boolean"), "reference props expose visitorReduced flag"],
  [component.includes("data-fable-map-discover-user-card=\"right-rail\""), "desktop right rail keeps the user card"],
  [component.includes("data-fable-map-world-status-card=\"dynamic-dom\""), "desktop right rail keeps the world status card"],
  [component.includes("maxCards={props.visitorReduced ? 3 : undefined}"), "desktop card links are capped to top 3"],
  [component.includes("const cardCount = visitorReduced ? 3 : 6"), "mobile card list is capped to top 3"],
  [component.includes("data-fable-map-visitor-first-filters=\"place-type-only\""), "visitor filters are reduced to place/open controls"],
  [component.includes("data-fable-map-discover-entry-cta=\"visitor-primary\""), "cards expose one primary entry CTA"],
  [component.includes("<FableMapDiscoverRightRail"), "desktop search keeps the designed right-rail stack"],
]

const failed = checks.filter(([ok]) => !ok)
if (failed.length) {
  console.error("Visitor-first discovery checks failed:")
  for (const [, label] of failed) console.error(`- ${label}`)
  process.exit(1)
}

console.log("visitor-first-discovery-test: PASS")


