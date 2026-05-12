import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const shellSource = readFileSync(resolve(__dirname, "../app/shell/product-shell.tsx"), "utf8")
const discoverSource = readFileSync(resolve(__dirname, "../app/routes/discover.tsx"), "utf8")
const soulLinkReferenceSource = readFileSync(resolve(__dirname, "../app/components/soul-link-reference-artboards.tsx"), "utf8")
const createSource = readFileSync(resolve(__dirname, "../app/routes/create.tsx"), "utf8")
const tavernSource = readFileSync(resolve(__dirname, "../app/routes/tavern.tsx"), "utf8")
const ownerSource = readFileSync(resolve(__dirname, "../app/routes/owner.tsx"), "utf8")
const packageSource = readFileSync(resolve(__dirname, "../package.json"), "utf8")

assert.ok(shellSource.includes("MOBILE_CRITICAL_FLOW_GUIDES"), "product shell should define mobile critical-flow guidance")
assert.ok(shellSource.includes("data-mobile-critical-flow"), "product shell should render a mobile critical flow strip")
assert.ok(shellSource.includes("Mobile first-screen"), "mobile strip should make first-screen purpose visible")
assert.ok(shellSource.includes("lg:hidden"), "mobile strip should not add another desktop panel")
assert.ok(shellSource.includes("min-h-14 w-full touch-manipulation"), "mobile strip CTA should be touch-safe")
assert.ok(shellSource.includes("移动首屏只保留搜索、筛选、预览入店这一条主线"), "discover guide should focus one mobile line")
assert.ok(shellSource.includes("移动端优先完成坐标、名称、首个 NPC"), "create guide should focus the creation mainline")
assert.ok(shellSource.includes("不把高级管理挤进第一屏"), "tavern guide should keep advanced panels out of first screen")
assert.ok(shellSource.includes("移动端先看经营摘要、通知和下一步建议"), "owner guide should focus first-screen owner tasks")

assert.ok(discoverSource.includes("SoulLinkDiscoverReference"), "discover route should delegate to the shared discover artboard")
assert.ok(soulLinkReferenceSource.includes('id={isDiscover ? "discover-mainline" : undefined}'), "discover artboard should expose mobile mainline anchor")
assert.ok(createSource.includes('id="create-mainline"'), "create route should expose mobile mainline anchor")
assert.ok(tavernSource.includes('id="tavern-mainline"'), "tavern route should expose mobile mainline anchor")
assert.ok(ownerSource.includes('id="owner-mainline"'), "owner route should expose mobile mainline anchor")
assert.ok(soulLinkReferenceSource.includes("scroll-mt-28"), "discover anchor should account for sticky header")
assert.ok(createSource.includes("scroll-mt-28"), "create anchor should account for sticky header")
assert.ok(tavernSource.includes("scroll-mt-28"), "tavern anchor should account for sticky header")
assert.ok(ownerSource.includes("scroll-mt-28"), "owner anchor should account for sticky header")

for (const forbidden of ["@capacitor", "ionic", "react-native", "onsenui"]) {
  assert.ok(!packageSource.toLowerCase().includes(forbidden), `should not introduce mobile framework dependency: ${forbidden}`)
}

const combined = `${shellSource}\n${discoverSource}\n${soulLinkReferenceSource}\n${createSource}\n${tavernSource}\n${ownerSource}`
for (const forbidden of ["排行榜", "装备系统", "充值", "抽成", "营销群发"]) {
  assert.ok(!combined.includes(forbidden), `mobile polish should not introduce forbidden product direction: ${forbidden}`)
}

console.log("mobile-critical-flow-test: ok")
