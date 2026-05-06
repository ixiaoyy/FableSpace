# PRD: Persistent notifications and identity guard

## Problem
通知中心已经有用户可见入口，但当前实现仍是 MVP：通知存在内存中，重启会丢；WebSocket 身份校验只接受 `user_id`，缺少真实身份边界。若继续产品化回访/关系/记忆通知，这会造成数据丢失和越权风险。

## Evidence
- `backend/src/fablemap_api/api/v1/notifications.py:67` 写明身份校验 `simplified for MVP - just accepts user_id`。
- `backend/src/fablemap_api/core/notifications.py:4` / `:59` 写明 notification store 是 in-memory MVP。
- `frontend/app/routes/notifications.tsx:25-29` 将其作为已有通知 MVP 的表现化入口。

## Goal
把通知从表现化 MVP 补齐到可持续产品能力：
1. 通知可持久化并能重启恢复；
2. REST / WebSocket 使用统一身份来源；
3. 保持“回访关怀/关系申请/店主反馈”边界，不扩成营销推送系统。

## Non-goals
- 不做营销推送、广告推送、陌生访客社交推荐。
- 不引入大型消息队列，除非另行批准。

## Acceptance Criteria
- [x] 后端通知 store 支持持久化（JSON/数据库二选一，优先复用现有持久化方式），重启后未读状态不丢。
- [x] WebSocket 不再仅凭 URL/path 的 `user_id` 建立身份；与现有 header/session/visitor identity 策略一致。
- [x] REST 标记已读、列表、未读数具备越权测试。
- [x] 前端通知页处理断线/重连/空状态，不暴露内部实现“MVP”。
- [x] 文档或 Trellis spec 明确通知只服务回访/关系/店主管理，不做营销。

## Suggested files
- `backend/src/fablemap_api/api/v1/notifications.py`
- `backend/src/fablemap_api/core/notifications.py`
- `frontend/app/routes/notifications.tsx`
- `.trellis/spec/frontend/revisit-care-notification-boundary.md`


## Implementation Notes

- 默认应用启动继续使用 `SQLAlchemyNotificationStore` 挂接现有 DB session，回归测试通过重建 app 验证 unread/read 状态不会因为进程级 store 重置而丢失。
- WebSocket `/api/v1/notifications/ws/{user_id}` 现在要求 header/query/session 中声明的身份与 path `user_id` 一致；仅 path-only 或不匹配连接会以 1008 关闭。
- REST list / unread / mark-read 保持 user-scoped 过滤，跨用户标记已读返回 404。
- 前端 hook 使用同一 `user_id` 构造 path 与 query 身份声明；通知页文案去掉 MVP 暴露，并明确只呈现当前身份相关事件。
- `.trellis/spec/backend/quality-guidelines.md` 新增持久化通知与 WebSocket 身份约束，明确禁止营销、广告、陌生访客社交增长类推送。

## Validation

- `py -3 -m pytest -q tests/test_notifications.py --tb=short` → 4 passed.
- `py -3 -m compileall -q backend/src` → passed.
- `node .\scripts\notification-center-test.mjs`（cwd: `frontend`）→ passed.
- `npm --prefix .\frontend run typecheck` → passed.
- `npm --prefix .\frontend test` → passed.
- `npm --prefix .\frontend run build` → passed.
- `git diff --check -- <changed files>` → passed with CRLF normalization warnings only.
