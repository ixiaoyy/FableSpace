import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const homeSource = readFileSync(resolve(__dirname, "../app/routes/home.tsx"), "utf8")
const helperSource = readFileSync(resolve(__dirname, "../app/lib/homepage-taverns.ts"), "utf8")

assert.ok(homeSource.includes("buildHomepageView"), "home page should derive featured tavern links from homepage view data")
assert.ok(helperSource.includes("id: tavern.id"), "featured homepage links should use real tavern IDs from the API")
assert.ok(!homeSource.includes("tavern-1") && !homeSource.includes("tavern-2"), "home page must not link to placeholder tavern IDs")
assert.ok(!homeSource.includes("公益锚点"), "home page featured copy should not expose internal public-welfare anchor wording")
assert.ok(!homeSource.includes('tags: ["公益"'), "home page featured tags should describe free/open flavor, not brand the tavern as 公益")
assert.ok(!helperSource.includes('tags: ["公益"'), "dynamic homepage tags should avoid public-welfare branding")

console.log("home-links-test: ok")
