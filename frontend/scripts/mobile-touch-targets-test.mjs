import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const buttonSource = readFileSync(resolve(__dirname, "../app/ui/button.tsx"), "utf8")
const homeSource = readFileSync(resolve(__dirname, "../app/routes/home.tsx"), "utf8")
const discoverSource = readFileSync(resolve(__dirname, "../app/routes/discover.tsx"), "utf8")

assert.ok(!buttonSource.includes('sm: "h-9'), "small button variant must not be shorter than the 44px mobile touch target")
assert.ok(/sm:\s*"h-11\s+px-4"/.test(buttonSource), "small button variant should keep a 44px height")
assert.ok(homeSource.includes("min-h-11"), "home navigation/search links should declare 44px mobile touch targets")
assert.ok(discoverSource.includes("min-h-11"), "discover controls should declare 44px mobile touch targets")
assert.ok(discoverSource.includes("touch-manipulation"), "discover tap controls should use touch-manipulation for mobile responsiveness")
assert.ok(homeSource.includes("touch-manipulation"), "home tap controls should use touch-manipulation for mobile responsiveness")
assert.ok(!discoverSource.includes('className="ml-auto inline-flex items-center gap-1 rounded-full border border-cyan-300/22 px-3 py-1'), "discover enter links should not keep sub-44px tap target padding")

console.log("mobile-touch-targets-test: ok")