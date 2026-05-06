import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const routeSource = readFileSync(resolve(__dirname, "../app/routes/home-me.tsx"), "utf8")
const createSource = readFileSync(resolve(__dirname, "../app/routes/create.tsx"), "utf8")
const routeConfigSource = readFileSync(resolve(__dirname, "../app/routes.ts"), "utf8")

assert.ok(routeConfigSource.includes('route("home/me", "./routes/home-me.tsx")'), "legacy /home/me route should remain as a safe compatibility page")
assert.ok(!routeSource.includes("const isOwner = true"), "home-me must not hardcode owner privileges")
assert.ok(!routeSource.includes("chatWithHomeMember"), "home-me must not expose placeholder member chat")
assert.ok(!routeSource.includes("leaveHomeMessage"), "home-me must not expose a second legacy留言 surface")
assert.ok(!routeSource.includes("getMyHome"), "home-me must not fetch a separate legacy home store")
assert.ok(!routeSource.includes("createHome"), "home-me must not create Home outside the place_type=home flow")
assert.ok(!routeSource.includes("与成员互动"), "visitor view should not advertise placeholder member interaction")
assert.ok(!routeSource.includes("可对话成员"), "retired route should not promise conversational members")
assert.ok(routeSource.includes("Home 已并入真实坐标 Place/Home 主线"), "home-me should explain that Home moved into the Place/Home mainline")
assert.ok(routeSource.includes('/create?place_type=home'), "home-me owner action should point to the main create flow with place_type=home")
assert.ok(routeSource.includes("data-home-route-mode=\"retired-mainline"), "route should expose a static retired-mainline contract marker")
assert.ok(routeSource.includes("viewerRole"), "compatibility page should still distinguish owner/visitor copy without granting privileges")

assert.ok(createSource.includes("normalizePlaceTypeId"), "create route should normalize query place_type values through shared place-type helper")
assert.ok(
  createSource.includes('searchParams.get("place_type")') && createSource.includes('useState(() => normalizePlaceTypeId'),
  "create route should preselect place_type=home from query params",
)

console.log("home-route-productization-test: ok")
