# brainstorm: 留存与传播闭环

## Goal

围绕 FableMap 盈利前置目标，先不急于收费，优先验证用户留存与传播闭环。当前路线按 C → A → B → D 推进：先让店主看到经营反馈，再让探索者有回访理由，再支持酒馆传播，最后促进探索者转店主。

## What I already know

* 用户明确选择先走 D：先不收费，优先做留存和传播闭环。
* 用户随后确认采用推荐顺序：C → A → B → D。
* FableMap 当前主链路是：坐标输入/定位 → 真实底图 → 浏览酒馆 → 进入酒馆 → 配置 AI NPC → 对话互动 → 写回记忆 → 回访反馈。
* 产品核心约束：真实地图锚点、主人主权、平台不自动生成酒馆内容、Token 由店主自行承担、保持 SillyTavern 兼容。

## Assumptions (temporary)

* 本轮先做一个可落地的产品/技术 PRD，不直接实现代码。
* 第一阶段 MVP 应优先围绕 C「店主经营反馈」设计，因为它最能让店主感知酒馆被访问，从而支撑后续 A/B/D。
* 不引入平台级付费、充值、抽成或无边界社交。

## Open Questions

* 第一阶段店主经营反馈 MVP 应该聚焦哪一种反馈粒度？

## Requirements (evolving)

* 路线顺序：C 店主经营反馈 → A 探索者回访 → B 酒馆传播 → D 探索者转店主。
* 所有设计必须服务真实酒馆/NPC/记忆/回访闭环。
* 不做平台生成酒馆内容，不做 Token 计费系统，不做跨酒馆访客社交网络。

## Acceptance Criteria (evolving)

* [x] PRD 明确第一阶段 MVP 范围、成功指标和不做范围。
* [x] PRD 将 C/A/B/D 拆成可独立开发的阶段或子任务。
* [x] PRD 给出至少 2 个可选技术/产品方案并记录取舍。
* [x] 后续实现任务能据此进入 Trellis Task Workflow。

## Definition of Done (team quality bar)

* Tests added/updated when implementation begins.
* Frontend build/typecheck and relevant tests pass for UI/service changes.
* Backend compile/tests pass for API/model changes.
* Docs/Trellis notes updated for behavior or product contract changes.
* Rollout/rollback considered if changing persisted data or cross-layer contracts.

## Out of Scope (explicit)

* 平台级 Token 充值、结算、抽成。
* 平台替店主自动生成酒馆/NPC/故事内容。
* 访客好友、动态墙、私信、全局在线状态等无边界社交。
* 传统地图导航、POI 评分、路线规划。

## Technical Notes

* Need inspect existing docs/tasks/code before locking MVP.
* Likely related docs: README.md, docs/PRODUCT_BRIEF.md, docs/FABLEMAP_TAVERN_PLATFORM.md, docs/WHAT_NOT_TO_BUILD.md, docs/CURRENT_TASKS.md, docs/AI_SHARED_TASKLIST.md, docs/WORLD_SCHEMA.md.

## Auto-Context Findings

### Existing product/code baseline

* `docs/CURRENT_TASKS.md` shows many C/A foundations are already implemented: 店主最近对话会话、访客状态与回访关系、会话详情/导出/隐私边界、访客关系记忆注入 Prompt、回访面板会话联动、店主会话关键词搜索。
* Existing native frontend client includes `listTavernVisitors`, `listChatSessions`, `exportChatHistory`, `searchChatHistory`, and `listMemoryAtoms` in `frontend/app/lib/taverns.ts`.
* Backend/spec baseline includes visitor state, chat sessions, memory atoms, gameplay sessions, package export privacy, and owner visitor summaries.
* `docs/AI_SHARED_TASKLIST.md` records the earlier “让记忆变成产品卖点” wave as completed; next work should avoid duplicating raw panels and instead improve retention/growth outcomes.

### Constraints from docs/specs

* Strengthen the main loop: 地图浏览 → 酒馆发现 → 入场 → 对话 → 写回 → 回访。
* Owner-visible feedback must not expose visitor private memory beyond existing permission boundaries.
* Sharing/virality must not become visitor-to-visitor social networking.
* Any generated summaries/insights must be derived from existing owner-visible runtime data and must not write platform-created tavern/NPC content back into owner-authored content.

### Initial interpretation

The first C-phase should probably not be “add another raw visitor list”. The stronger MVP is an owner-facing operating feedback layer that turns existing visits/chats/memory into clear next actions: who came, who returned, what they cared about, and what the owner can improve.

## Decision (ADR-lite)

**Context**: 现有系统已经具备访客状态、会话、记忆、搜索和导出等底层能力。继续新增原始列表的收益有限；真正需要的是让店主一眼感知“我的酒馆有人来、有人回、有人聊”。

**Decision**: 第一阶段选择 **C-1 经营摘要卡**。先在店主入口提供确定性经营摘要：酒馆总数/营业数、访客数、回访者、消息量、最近会话、重点回访者、酒馆表现和下一步建议。摘要只读取现有 owner 可见数据，不引入新持久化 schema，不调用 LLM，不生成/写回酒馆内容。

**Consequences**:

* 优点：小切片、可测试、直接强化店主经营反馈，可作为 A/B/D 后续入口。
* 代价：第一版偏规则摘要，不做复杂增长分析或自动内容建议。
* 风险：需要保持 owner/visitor 权限边界，不能泄露 visitor private memory。

## Technical Approach

### Data flow

`/owner` route → `listTaverns(owner_id)` → per-tavern `listTavernVisitors` + owner `listGlobalChatSessions` → frontend pure helper `buildOwnerOperatingSummary` → display summary cards.

### Files to modify/create

* Create `frontend/app/lib/owner-summary.js`: pure deterministic summary builder, no fetch, no React.
* Create `frontend/scripts/owner-summary-test.mjs`: script-level tests for summary metrics, top returning visitors, tavern ranking, next-action hints.
* Modify `frontend/package.json`: include owner summary script in `npm test`.
* Create `frontend/app/routes/owner.tsx`: native React Router owner operating dashboard.
* Modify `frontend/app/routes.ts`: add `/owner` route.
* Modify `frontend/app/shell/product-shell.tsx`: add 店主 nav item.
* Optionally modify homepage owner entry from `/create` to `/owner` if it better matches wording.

### Implementation Plan

1. RED: add owner-summary script test expecting `buildOwnerOperatingSummary` contract; run and confirm it fails because helper is missing.
2. GREEN: implement `owner-summary.js` minimal pure helper to pass the script.
3. Wire `owner-summary-test.mjs` into `frontend/package.json` test script.
4. Add `/owner` route that loads default owner data with existing API clients and renders the operating summary card.
5. Add route/nav links.
6. Verify with frontend script test, typecheck, build, and full frontend test.

## Final MVP Requirements

* 店主能通过 `/owner` 看到经营摘要。
* 摘要至少包含：酒馆数、营业酒馆数、访客数、回访者、会话数、消息数。
* 摘要展示最近会话和重点回访者，用于感知“有人来过/回来了”。
* 摘要展示酒馆表现排行，帮助店主知道哪间酒馆更活跃。
* 摘要给出确定性下一步建议，但不替店主生成酒馆/NPC/故事内容。
* 不新增后端 schema，不新增依赖，不实现收费/社交/平台内容生成。


## Implementation Notes

* Added `/owner` native route with owner operating summary card.
* Summary uses existing owner-visible APIs and pure deterministic frontend aggregation; no backend schema or persistence changes.
* Added `owner-summary-test.mjs` and wired it into `npm --prefix .\frontend test`.
* Verification: `node frontend/scripts/owner-summary-test.mjs`, `npm --prefix .\frontend test`, `npm --prefix .\frontend run build`, `npm --prefix .\frontend run typecheck`, `git diff --check`.
