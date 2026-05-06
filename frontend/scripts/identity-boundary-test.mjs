import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(__dirname, "../app")

function source(path) {
  return readFileSync(resolve(appRoot, path), "utf8")
}

const runtimeConfigSource = source("lib/tavern-runtime-config.js")
assert.ok(
  !runtimeConfigSource.includes("owner-demo") && !runtimeConfigSource.includes("visitor-demo"),
  "production runtime config must not ship owner-demo/visitor-demo identities",
)
assert.ok(
  runtimeConfigSource.includes("getOrCreateVisitorIdentity"),
  "runtime config should expose a stable anonymous visitor identity helper",
)
assert.ok(
  runtimeConfigSource.includes("requireExplicitOwnerIdentity"),
  "runtime config should expose an explicit owner identity guard",
)

const runtimeConfig = await import(pathToFileURL(resolve(appRoot, "lib/tavern-runtime-config.js")).href)
const memoryStorage = (() => {
  const values = new Map()
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null
    },
    setItem(key, value) {
      values.set(key, String(value))
    },
  }
})()

const firstVisitorId = runtimeConfig.getOrCreateVisitorIdentity(memoryStorage)
const secondVisitorId = runtimeConfig.getOrCreateVisitorIdentity(memoryStorage)
assert.match(firstVisitorId, /^visitor_[a-z0-9]+_[a-z0-9]+$/)
assert.equal(secondVisitorId, firstVisitorId, "anonymous visitor identity should persist across reads")
assert.throws(
  () => runtimeConfig.requireExplicitOwnerIdentity(""),
  /店主身份|owner/i,
  "owner operations should fail fast when no explicit owner identity is provided",
)
assert.equal(runtimeConfig.requireExplicitOwnerIdentity(" owner-live "), "owner-live")

const tavernsSource = source("lib/taverns.ts")
assert.ok(
  !tavernsSource.includes("DEMO_TAVERN_IDENTITIES"),
  "API client should not import demo identity defaults",
)
assert.ok(
  tavernsSource.includes('DEFAULT_OWNER_ID: string = ""'),
  "DEFAULT_OWNER_ID should be empty so owner calls need explicit identity",
)
assert.ok(
  tavernsSource.includes("getOrCreateVisitorIdentity"),
  "DEFAULT_VISITOR_ID should come from the anonymous visitor helper",
)

const chatSource = source("features/tavern-chat/index.tsx")
assert.ok(
  !chatSource.includes("visitor-demo"),
  "tavern chat should not hardcode visitor-demo",
)

console.log("identity-boundary-test: ok")
