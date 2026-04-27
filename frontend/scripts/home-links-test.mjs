import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const homeSource = readFileSync(resolve(__dirname, "../app/routes/home.tsx"), "utf8")

const knownSeededTavernIds = new Set([
  "pw_community_repair",
  "pw_lantern_helpdesk",
  "pw_lost_found_archive",
  "pw_midnight_commission_board",
  "pw_midnight_treehole",
  "pw_third_shelf_observatory",
])

const featuredIds = [...homeSource.matchAll(/id:\s*"([^"]+)"/g)].map((match) => match[1])

assert.ok(featuredIds.length > 0, "home page should define featured tavern links")
assert.ok(!featuredIds.some((id) => /^tavern-\d+$/.test(id)), "home page must not link to placeholder tavern IDs")
assert.ok(!homeSource.includes("公益锚点"), "home page featured copy should not expose internal public-welfare anchor wording")
assert.ok(!homeSource.includes('tags: ["公益"'), "home page featured tags should describe free/open flavor, not brand the tavern as 公益")
assert.deepEqual(
  featuredIds.filter((id) => !knownSeededTavernIds.has(id)),
  [],
  "home page featured taverns must use seeded public-welfare tavern IDs",
)

console.log("home-links-test: ok")
