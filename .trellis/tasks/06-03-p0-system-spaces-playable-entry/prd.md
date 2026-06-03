# P0 Make System-created Spaces Playable

## Goal

完善系统默认创建的公益空间：不改店主侧、不改 Schema，把现有 published `gameplay_definitions` 暴露为游客首屏可点玩法，让游客进入系统空间后能直接开始调查、委托、回访或小任务。

## Evidence

- 默认系统空间来源：`backend/src/fablemap_api/core/default_taverns.py` 的 `default_public_welfare_taverns()`。
- 9 个默认空间均为 `owner_id=system_public_welfare`，已有 NPC 和 `gameplay_definitions`。
- 当前 `/tavern/:id` 第一屏已经有 first-minute doorway，但按钮只预填聊天，没有直接启动这些 published gameplay。

## Requirements

- 不改后端 API、Schema、数据库迁移。
- 不改店主创建/后台。
- 非店主游客进入系统空间时，首屏优先显示已发布玩法入口。
- 点击玩法入口启动现有 `startGameplaySession`，不调用 `/chat`，不自动替游客发聊天消息。
- 如果空间没有 published gameplay，保留原来的 3 个快速行动预填输入框。
- 移动端和桌面都可见可点。

## Acceptance

- `/tavern/:id` 首屏有 `[data-doorway-gameplay-entry]`，默认系统空间至少展示 1-3 个玩法按钮。
- 点击玩法按钮会进入 workbench 并显示 GameplaySessionPanel/active session，而不是只进聊天。
- 点击玩法按钮不会触发 `/chat`。
- `npm --prefix .\frontend run typecheck` 和 `npm --prefix .\frontend run build` 通过。
- Playwright 桌面/移动 mock 默认空间，验证可见玩法入口、点击后 session 启动、无 `/chat` 请求。
