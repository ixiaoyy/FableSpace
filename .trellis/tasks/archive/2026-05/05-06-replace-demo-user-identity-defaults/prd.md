# PRD: Replace demo user identity defaults

## Problem
前端 API 层大量默认使用 `owner-demo` / `visitor-demo`。这在 demo 阶段方便联调，但在真实产品中会导致权限、数据归属、通知、记忆、店主管理等全部像单用户 demo，甚至可能解释“数据都是 0 / 之前数据去哪了”这类身份错位问题。

## Evidence
- `frontend/app/lib/tavern-runtime-config.js:1-3` 固定 `ownerId: "owner-demo"` / `visitorId: "visitor-demo"`。
- `frontend/app/lib/taverns.ts:4-5` 导出 `DEFAULT_OWNER_ID` / `DEFAULT_VISITOR_ID`。
- `frontend/app/lib/taverns.ts` 中大量服务函数默认参数使用这些 demo identity。
- `frontend/app/features/tavern-chat/index.tsx:84` 默认 visitor 也来自 `DEFAULT_VISITOR_ID`。

## Goal
建立真实、显式、可测试的 owner/visitor identity 边界：
1. owner 身份来自当前管理会话/显式配置，不再默认 owner-demo；
2. visitor 身份来自匿名访客会话（本地持久 visitor id）或登录态，不再所有人共用 visitor-demo；
3. API client 不再隐式吞掉身份参数。

## Non-goals
- 不在本任务中实现完整账号系统，除非已有架构支持。
- 不引入第三方认证服务。
- 不改变核心 Tavern Schema 字段语义。

## Acceptance Criteria
- [x] `owner-demo` / `visitor-demo` 被限制到开发 fixture 或明确的 test-only 常量，不作为生产 API 默认值。
- [x] API client 对 owner-only 操作要求显式 owner identity；缺失时给出可处理错误。
- [x] visitor 操作使用稳定匿名 visitor session id，并能跨刷新保持。
- [x] 后端对 owner-only / visitor-only 路径有最小权限校验测试。
- [x] 通知、记忆、聊天历史、店主管理数据不再因 demo identity 混到同一用户下。
- [x] 前端 build 与关键 API 脚本测试通过。

## Implementation note — 2026-05-06

- 移除前端生产运行时中的 `owner-demo` / `visitor-demo` 常量；`DEFAULT_OWNER_ID` 现在为空字符串，owner-only 操作必须由页面 query/form/session 显式传入 owner identity。
- 新增 `getOrCreateVisitorIdentity(...)`，通过 `localStorage` 保存匿名访客 ID；无浏览器 storage 的测试/SSR 环境退化为进程内生成值。
- 新增 `requireExplicitOwnerIdentity(...)`，并用 `identity-boundary-test.mjs` 固化 owner/visitor 默认身份边界。
- 后端 native v1 与兼容 WebService 的创建空间入口在缺失 owner identity 时返回 401，避免创建 ownerless tavern。
- 验证：
  - `node frontend/scripts/identity-boundary-test.mjs`
  - `node frontend/scripts/runtime-config-centralization-test.mjs`
  - `npm --prefix .\frontend test`
  - `npm --prefix .\frontend run typecheck`
  - `npm --prefix .\frontend run build`
  - `py -3 -m compileall -q backend/src`
  - `py -3 -m pytest -q tests/test_identity_boundaries.py tests/test_tavern_create_wizard_regression.py backend/tests/test_v1_runtime_features.py --tb=short`

## Suggested files
- `frontend/app/lib/tavern-runtime-config.js`
- `frontend/app/lib/taverns.ts`
- `frontend/app/features/tavern-chat/index.tsx`
- `backend/src/fablemap_api/core/web/service.py`
- `backend/src/fablemap_api/core/web/router.py`
- `.trellis/spec/guides/cross-layer-thinking-guide.md`
