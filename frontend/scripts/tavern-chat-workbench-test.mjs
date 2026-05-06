import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const routesSource = readFileSync(resolve(__dirname, "../app/routes.ts"), "utf8")
const routeSource = readFileSync(resolve(__dirname, "../app/routes/tavern.tsx"), "utf8")
const manageRoutePath = resolve(__dirname, "../app/routes/tavern-manage.tsx")
const shellSource = readFileSync(resolve(__dirname, "../app/shell/product-shell.tsx"), "utf8")
const ownerSource = readFileSync(resolve(__dirname, "../app/routes/owner.tsx"), "utf8")
const workbenchPath = resolve(__dirname, "../app/features/tavern-chat-workbench/index.tsx")
assert.ok(existsSync(workbenchPath), "tavern chat workbench component should exist")
const workbenchSource = readFileSync(workbenchPath, "utf8")
assert.ok(existsSync(manageRoutePath), "dedicated tavern owner management route should exist")
const manageRouteSource = readFileSync(manageRoutePath, "utf8")
const productChatRoomSource = readFileSync(resolve(__dirname, "../app/product/TavernChatRoom.jsx"), "utf8")
const tavernClientSource = readFileSync(resolve(__dirname, "../app/lib/taverns.ts"), "utf8")

assert.ok(
  routeSource.includes('import { TavernChatWorkbench } from "../features/tavern-chat-workbench"'),
  "tavern route should render the native SillyTavern-style chat workbench",
)
assert.ok(
  !routeSource.includes("TavernLayoutShowcase"),
  "tavern route should not put the older layout showcase before the chat surface",
)
assert.ok(
  routeSource.includes("getCurrentUserIdFromRequest(request)") &&
    !routeSource.includes("tavern = await getTavern(tavernId, DEFAULT_OWNER_ID)"),
  "loader should use the current viewer identity and must not fall back to owner-demo",
)
assert.ok(
  routesSource.includes('route("tavern/:tavernId/manage", "./routes/tavern-manage.tsx")'),
  "routes should register a dedicated /tavern/:id/manage owner management route",
)
assert.ok(
  !routeSource.includes("ownerPanel=") &&
    !routeSource.includes("<RoleplayPanel") &&
    !routeSource.includes("<PlaceHomePanel") &&
    !routeSource.includes("<VisitorNotesPanel"),
  "visitor tavern route should not mount owner management panels inside the chat page",
)
assert.ok(
  manageRouteSource.includes('data-tavern-owner-management="dedicated-route"'),
  "owner management route should expose a machine-checkable dedicated-route marker",
)
assert.ok(
  !manageRouteSource.includes("TavernChatWorkbench") &&
    !manageRouteSource.includes('data-chat-composer="fast-entry"') &&
    !manageRouteSource.includes('aria-label="聊天记录"'),
  "owner management route should not render the chat workbench or chat composer",
)

for (const snippet of [
  'data-chat-workbench="sillytavern-style"',
  'aria-label="NPC 角色列表"',
  'aria-label="聊天记录"',
  'placeholder="Type a message',
  "Shift+Enter 换行",
  'data-current-npc-stage-card',
  'aria-label="当前 NPC 舞台"',
  "正在接待你",
  'data-npc-seat-gallery',
  'aria-label="NPC 吧台席位"',
  "今晚在场",
  'data-chat-sidecar="conversation-context"',
  "聊天辅助",
  "可以这样开口",
  "当前场景",
  "你正在和",
  'data-chat-log-compact',
  'data-chat-composer="fast-entry"',
  'data-visitor-identity-settings',
  "发言身份",
  "更多酒馆功能",
]) {
  assert.ok(workbenchSource.includes(snippet), `workbench should include ${snippet}`)
}

assert.ok(
  !workbenchSource.includes('className="min-h-0 flex-1 space-y-4 overflow-y-auto'),
  "chat log should not flex-fill the main panel and leave a large blank gap before the composer",
)
assert.ok(
  !workbenchSource.includes('grid min-h-[680px] grid-cols-1'),
  "chat workbench grid should not force a tall empty desktop panel before input",
)
assert.ok(
  !workbenchSource.includes('<main className="flex min-h-[680px]'),
  "chat main panel should not force a 680px minimum height that pushes the composer away",
)
assert.ok(
  !workbenchSource.includes("lg:grid-cols-[18rem_minmax(0,1fr)_21rem]"),
  "visitor-first tavern workbench should not keep a permanent desktop right rail",
)
assert.ok(
  workbenchSource.includes('data-secondary-tools="visitor-folded"'),
  "secondary public tools should be folded instead of always visible in a right rail",
)
assert.ok(
  !workbenchSource.includes("ownerPanel") &&
    !workbenchSource.includes('data-owner-only-panel') &&
    !workbenchSource.includes('data-owner-management-entry="folded"') &&
    !workbenchSource.includes("店主管理"),
  "visitor-first chat workbench should not contain owner management UI",
)
for (const snippet of [
  'data-current-npc-profile',
  "当前 NPC 资料",
  "表情缩略",
  "First message",
  "Current NPC",
  'title="酒馆信息"',
  "真实地图锚点与公开说明",
  "管理入口仅酒馆所有人可见",
]) {
  assert.ok(!workbenchSource.includes(snippet), `visitor chat sidecar should not include project-like sidebar copy: ${snippet}`)
}

for (const snippet of [
  "对话记忆",
  "当前访客的身份与回访状态",
  "本次会话尚未写入回访状态",
  "回访记忆",
  "回访反馈",
  "对话记录会持续写回记忆",
  "聊天历史暂时不可用",
  "VisitorMemoryPanel",
  "relationshipSummary",
]) {
  assert.ok(!workbenchSource.includes(snippet), `visitor chat UI should hide internal memory/status copy: ${snippet}`)
}

assert.ok(
  shellSource.includes("移动首屏聚焦角色列表和聊天输入"),
  "mobile tavern guide should describe chat-first entry",
)
assert.ok(
  ownerSource.includes("/manage?owner_id=${encodeURIComponent(ownerId)}"),
  "owner dashboard should link taverns into the dedicated management route with owner identity",
)
assert.ok(
  tavernClientSource.includes("export type ChatResponseMode"),
  "typed tavern client should expose response_mode metadata for chat payloads",
)
assert.ok(
  tavernClientSource.includes("response_mode?: ChatResponseMode"),
  "chat response type should carry response_mode from backend to UI",
)
assert.ok(
  workbenchSource.includes("responseModeLabel") &&
    workbenchSource.includes("规则模式 / 无 Key 轻量接待") &&
    workbenchSource.includes("外部 LLM 模式"),
  "native tavern workbench should show rules/AI response mode labels",
)
assert.ok(
  workbenchSource.includes("result.response_mode?.message"),
  "native tavern workbench should prefer backend response_mode guidance after chat",
)
assert.ok(
  productChatRoomSource.includes("getTavernResponseMode") &&
    productChatRoomSource.includes("规则模式 / 无 Key 轻量接待") &&
    productChatRoomSource.includes("外部 LLM 模式"),
  "legacy product chat room should also show a rules/AI response mode badge",
)

console.log("tavern-chat-workbench-test: ok")
