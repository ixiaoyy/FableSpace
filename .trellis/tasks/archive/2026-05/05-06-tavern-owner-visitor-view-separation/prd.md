# Tavern owner and visitor view separation

## Goal

把空间详情页从“同一个聊天页面里折叠店主管理”改成明确的双视角：访客进入 `/tavern/:id` 时只看到 NPC 对话主线和少量折叠的公开空间功能；店主从 `/tavern/:id/manage` 进入时只看到管理/经营/治理面板，不默认加载聊天工作台。解决当前右侧长串管理内容导致页面过高、左右失衡、普通用户看不懂的问题。

## What I already know

- 用户明确反馈：店主管理时不需要聊天；右侧长串信息对普通用户无用；当前页面不是视觉微调问题，而是店主/访客视角没有分开。
- `frontend/app/routes/tavern.tsx` 当前在同一个 route 中判断 `isOwner` 并把 `ownerPanel` 传入 `TavernChatWorkbench`。
- `frontend/app/features/tavern-chat-workbench/index.tsx` 当前仍有 `ownerPanel` / `data-owner-management-entry="folded"`，说明管理功能还在聊天页面里。
- `frontend/app/routes/owner.tsx` 的空间跳转目前指向 `/tavern/:id?owner_id=...`，会把店主带回聊天页。
- 权威产品文档要求：探索者主线是进入空间与 NPC 聊天；店主维护主线是管理角色、访问、LLM、访客反馈和经营状态。

## Requirements

1. 访客路由 `/tavern/:tavernId` 保留为 visitor-first chat mainline。
   - 保留 NPC 角色列表、当前 NPC 舞台、聊天记录、输入框、密码入场和公开折叠功能。
   - 不再渲染任何店主管理面板、管理抽屉或 `店主管理` 折叠入口。
2. 新增店主管理路由 `/tavern/:tavernId/manage`。
   - 只渲染管理/经营/治理面板，不渲染 `TavernChatWorkbench`、聊天记录或聊天输入框。
   - 使用 `owner_id` / `user_id` 查询参数作为当前店主身份；只有 `currentUserId === tavern.owner_id` 时显示管理台。
   - 非 owner 进入时显示“需要店主身份”的可读错误和返回访客视角入口。
3. Owner dashboard 的空间管理入口改为 `/tavern/:id/manage?owner_id=...`。
4. 复用现有 Roleplay / Home / Visitor Notes 管理能力，避免复制两套面板逻辑。
5. 同步 Trellis 前端规范中关于 mobile tavern mainline 的描述：owner-only 管理不再通过 chat workbench 的 `ownerPanel` 折叠，而是进入独立 manage route。
6. 不改后端 API、Schema、持久化字段或访问控制语义；前端只调整路由/组件/测试/规范。

## Acceptance Criteria

- [x] `frontend/app/routes.ts` 注册 `/tavern/:tavernId/manage` 路由。
- [x] `frontend/app/routes/tavern.tsx` 不再定义/传入 `ownerPanel`，不再包含 Roleplay/Home/VisitorNotes 管理面板。
- [x] `frontend/app/features/tavern-chat-workbench/index.tsx` 不再接收或渲染 `ownerPanel`，源码中不再出现 `data-owner-management-entry` 或 `店主管理`。
- [x] 新的 manage route 不渲染 `TavernChatWorkbench`，并包含 `data-tavern-owner-management="dedicated-route"` 机器可检查标记。
- [x] `/owner` 中每个空间入口指向 `/tavern/:id/manage?owner_id=...`，并提供访客预览入口。
- [x] 静态脚本测试覆盖"访客路由无管理、管理路由无聊天、owner dashboard 跳转到 manage"。
- [x] 前端 build 通过。
- [x] Playwright 自验收保存桌面 + 移动截图，证明访客页没有管理入口，店主管理页没有聊天输入。

## Definition of Done

- Trellis 任务有 PRD / implementation-plan / context / 验收报告。
- 代码改动范围只包含前端 route/feature/test/spec/task artifacts。
- `npm --prefix .\frontend test` 与 `npm --prefix .\frontend run build` 至少本轮新鲜运行一次并记录结果。
- Playwright 自验收报告记录到本任务 artifacts。

## Technical Approach

### Selected approach: dedicated owner management route (recommended)

- `/tavern/:id`：单一访客体验页，聊天主线优先，不夹带店主工具。
- `/tavern/:id/manage`：店主管理页，复用现有 owner panels，但不加载聊天工作台。
- `/owner`：经营看板，点击“进入空间处理反馈/查看空间”进入 manage route；必要时提供“访客预览”链接。

### Why not just collapse right rail further?

继续折叠右栏仍然是“聊天页里混入管理台”，会保留同一页面高度和产品心智混乱；用户已经明确指出这是信息架构问题。

### Data flow

```text
/owner?owner_id=X -> ownerTavernManagePath(id, X) -> /tavern/:id/manage?owner_id=X
/manage loader -> getTavern(id, X) + getRoleplayState(id, X) -> if X === tavern.owner_id render owner management
/tavern/:id loader -> getTavern(id, current viewer) + getRoleplayState -> render visitor chat only
```

## Decision (ADR-lite)

**Context**: 同页右侧面板造成视觉失衡和产品角色混淆。普通访客不需要看管理工具；店主管理也不应该默认处在聊天上下文中。

**Decision**: 增加 dedicated owner management route，并从 chat workbench 移除 owner panel 入口。保留 `/tavern/:id` 作为 visitor-first chat surface。

**Consequences**:

- 优点：访客页更短、更聚焦；店主页能按经营任务组织，不被聊天布局限制；后续可在管理页扩展 LLM/角色/访问设置。
- 代价：新增一个 route 和共享 owner management feature，需要更新静态测试和移动主线规范。
- 风险：旧 `/owner` 跳转文案需要同步；直接打开 `/tavern/:id?owner_id=...` 的店主仍会看到访客预览而非管理台，这是有意分离。

## Out of Scope

- 不新增后端 owner-only API。
- 不实现完整角色编辑器、LLM Key 配置或访问规则编辑重构。
- 不新增平台计费、访客社交、公开留言墙、排行榜、战斗或等级装备。
- 不改变 Tavern / TavernCharacter / VisitorState Schema。

## Technical Notes

### Relevant specs

- `.trellis/spec/frontend/component-guidelines.md`: product-grade route/panel UI and accessibility.
- `.trellis/spec/frontend/directory-structure.md`: route module + feature module placement.
- `.trellis/spec/frontend/state-management.md`: local state, no global store, no secret persistence.
- `.trellis/spec/frontend/type-safety.md`: Tavern / RoleplayState schema alignment.
- `.trellis/spec/frontend/mobile-single-mainline.md`: mobile tavern visitor mainline; will be updated to reflect dedicated manage route.
- `.trellis/spec/frontend/quality-guidelines.md`: build/test and Playwright visual self-acceptance.

### Files likely to change

- `frontend/app/routes.ts`: add manage route.
- `frontend/app/routes/tavern.tsx`: visitor-only route, remove owner panels.
- `frontend/app/routes/tavern-manage.tsx`: new owner management route.
- `frontend/app/features/tavern-owner-management/index.tsx`: extracted reusable owner management panels.
- `frontend/app/features/tavern-chat-workbench/index.tsx`: remove `ownerPanel` prop/render.
- `frontend/app/routes/owner.tsx`: link owner taverns to manage route and add preview link.
- `frontend/scripts/tavern-chat-workbench-test.mjs`, `frontend/scripts/mobile-single-mainline-test.mjs`: update static contract tests.
- `.trellis/spec/frontend/mobile-single-mainline.md`: sync contract.
- `.trellis/tasks/05-06-tavern-owner-visitor-view-separation/artifacts/playwright/*`: self-acceptance evidence.
