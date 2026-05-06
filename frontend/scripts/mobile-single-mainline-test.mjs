import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const routesSource = readFileSync(resolve(__dirname, "../app/routes.ts"), "utf8")
const shellSource = readFileSync(resolve(__dirname, "../app/shell/product-shell.tsx"), "utf8")
const tavernSource = readFileSync(resolve(__dirname, "../app/routes/tavern.tsx"), "utf8")
const manageRouteSource = readFileSync(resolve(__dirname, "../app/routes/tavern-manage.tsx"), "utf8")
const ownerSource = readFileSync(resolve(__dirname, "../app/routes/owner.tsx"), "utf8")
const workbenchSource = readFileSync(resolve(__dirname, "../app/features/tavern-chat-workbench/index.tsx"), "utf8")
const packageJson = JSON.parse(readFileSync(resolve(__dirname, "../package.json"), "utf8"))

function sectionBetween(source, startMarker, endMarker, label) {
  const start = source.indexOf(startMarker)
  assert.notEqual(start, -1, `${label} should include start marker: ${startMarker}`)
  const end = source.indexOf(endMarker, start)
  assert.notEqual(end, -1, `${label} should include end marker: ${endMarker}`)
  return source.slice(start, end)
}

const bottomDockSection = sectionBetween(
  shellSource,
  "const bottomDockOrder = [",
  "]\n\n// 顶部导航",
  "mobile bottom dock",
)
const bottomDockLabels = Array.from(bottomDockSection.matchAll(/label: "([^"]+)"/g), (match) => match[1])

assert.deepEqual(
  bottomDockLabels,
  ["首页", "发现", "进店", "清单", "管理"],
  "mobile bottom dock should follow one visitor-first line: 首页 / 发现 / 进店 / 清单 / 管理",
)
assert.ok(bottomDockSection.includes('{ to: "/create", label: "进店"'), "mobile /create dock label should be visitor-facing 进店")
assert.ok(!bottomDockSection.includes("创建空间"), "mobile bottom dock should not expose the owner/create wording in first-line navigation")
assert.ok(!shellSource.includes("进店(创建入口)"), "source comments should not describe the mobile CTA as a creation-first entry")
assert.ok(!shellSource.includes("创建入口移至底部dock"), "source comments should keep owner creation secondary instead of saying it moved into the mobile dock")
assert.ok(shellSource.includes("aria-label=\"Mobile navigation\""), "mobile dock should keep an accessible label")
assert.ok(shellSource.includes("mobile-bottom-dock fixed inset-x-3 bottom-3"), "mobile dock should stay fixed near the bottom")
assert.ok(shellSource.includes("min-h-14 touch-manipulation"), "mobile dock items should keep touch-safe targets")
assert.ok(shellSource.includes("px-4 py-8 pb-28 sm:px-6"), "main content should reserve bottom padding for the fixed mobile dock")
assert.ok(shellSource.includes("lg:hidden"), "mobile dock and mobile guide should be hidden on large screens")

const topNavSection = sectionBetween(
  shellSource,
  "const topNavItems = [",
  "]\n\nconst MOBILE_CRITICAL_FLOW_GUIDES",
  "desktop top nav",
)
assert.ok(topNavSection.includes('{ to: "/create", label: "创建空间"'), "desktop top navigation should keep the explicit owner/create entry")
assert.ok(topNavSection.includes('{ to: "/owner", label: "管理入口"'), "desktop top navigation should keep the management entry explicit")
const topNavMarkup = sectionBetween(
  shellSource,
  '<nav className="-mx-1',
  'aria-label="Primary navigation"',
  "desktop top navigation markup",
)
assert.ok(topNavMarkup.includes("hidden"), "primary top navigation should be hidden on mobile so it does not duplicate the bottom dock")
assert.ok(topNavMarkup.includes("lg:flex"), "primary top navigation should return on desktop widths")

assert.ok(shellSource.includes("MOBILE_CRITICAL_FLOW_GUIDES"), "product shell should keep mobile critical-flow copy")
assert.ok(shellSource.includes("移动首屏只保留搜索、筛选、预览入店这一条主线"), "discover mobile guide should preserve one-mainline wording")
assert.ok(shellSource.includes("移动端优先完成坐标、名称、首个 NPC"), "create mobile guide should preserve minimal creation scope")
assert.ok(shellSource.includes("不把高级管理挤进第一屏"), "tavern mobile guide should keep advanced management out of the first screen")

assert.ok(tavernSource.includes("<TavernChatWorkbench"), "tavern route should render the chat workbench as the first mobile mainline")
assert.ok(!tavernSource.includes('<details className="mt-6 lg:hidden">'), "tavern route should not keep a separate pre-chat mobile secondary details block")

const workbenchIndex = tavernSource.indexOf("<TavernChatWorkbench")
assert.ok(workbenchIndex !== -1, "tavern route should keep the chat workbench as the main surface")
assert.ok(!tavernSource.includes("TavernActivitySignalsCard"), "visitor tavern route should not expose activity analytics in the folded public sidecar")

assert.ok(workbenchSource.includes('data-chat-workbench="sillytavern-style"'), "workbench should expose the chat-first contract marker")
assert.ok(workbenchSource.includes('aria-label="NPC 角色列表"'), "workbench mobile first screen should include the NPC roster")
assert.ok(workbenchSource.includes('aria-label="聊天记录"'), "workbench mobile first screen should include chat history")
assert.ok(workbenchSource.includes("Shift+Enter 换行"), "workbench should keep an obvious composer hint")
assert.ok(workbenchSource.includes("更多酒馆功能"), "public secondary panels should be folded behind 更多酒馆功能")
assert.ok(!workbenchSource.includes("data-owner-only-panel"), "visitor chat workbench should not contain owner-only management panels")

assert.ok(tavernSource.includes("publicPanel={"), "route should pass folded public tavern features into the workbench")
assert.ok(tavernSource.includes("<NeighborhoodRumorBubble tavernId={tavern.id} limit={3} />"), "public folded panel should retain NeighborhoodRumorBubble")
assert.ok(tavernSource.includes("<CreatorConversionCard tavern={tavern} />"), "public folded panel should retain creator conversion")
assert.ok(!tavernSource.includes("ownerPanel="), "visitor tavern route should not pass owner panels into the chat workbench")
assert.ok(!tavernSource.includes("<RoleplayPanel"), "visitor tavern route should not render roleplay management")
assert.ok(!tavernSource.includes("<PlaceHomePanel"), "visitor tavern route should not render Place/Home management")
assert.ok(!tavernSource.includes("<VisitorNotesPanel"), "visitor tavern route should not render visitor-note review management")
assert.ok(
  routesSource.includes('route("tavern/:tavernId/manage", "./routes/tavern-manage.tsx")'),
  "dedicated owner management route should be registered",
)
assert.ok(
  manageRouteSource.includes('data-tavern-owner-management="dedicated-route"') &&
    manageRouteSource.includes("<TavernOwnerManagement") &&
    !manageRouteSource.includes("TavernChatWorkbench") &&
    !manageRouteSource.includes('data-chat-composer="fast-entry"'),
  "owner management route should contain management only and no chat workbench",
)
assert.ok(
  ownerSource.includes("/manage?owner_id=${encodeURIComponent(ownerId)}"),
  "owner dashboard tavern links should go to management route instead of visitor chat",
)

for (const forbidden of ["@capacitor", "ionic", "react-native", "onsenui"]) {
  assert.ok(!JSON.stringify(packageJson).toLowerCase().includes(forbidden), `should not introduce mobile framework dependency: ${forbidden}`)
}

assert.ok(
  packageJson.scripts.test.includes("mobile-single-mainline-test.mjs"),
  "focused mobile single-mainline regression should be wired into npm test",
)

console.log("mobile-single-mainline-test: ok")
