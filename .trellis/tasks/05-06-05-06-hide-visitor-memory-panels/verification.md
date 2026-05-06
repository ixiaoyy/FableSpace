# Verification: Hide visitor-facing memory/system panels

## Commands

- `node .\frontend\scripts\tavern-chat-workbench-test.mjs` — PASS (RED first failed on `对话记忆`, then PASS after implementation)
- `node .\frontend\scripts\tavern-activity-signals-test.mjs` — PASS
- `node .\frontend\scripts\mobile-single-mainline-test.mjs` — PASS
- `npm --prefix .\frontend run typecheck` — PASS
- `npm --prefix .\frontend run build` — PASS
- `npm --prefix .\frontend test` — PASS
- `node .\.trellis\tasks\05-06-05-06-hide-visitor-memory-panels\evidence\visitor-memory-panel-browser-check.mjs` — PASS

## Browser self-acceptance

Target: `http://127.0.0.1:5173/tavern/pw_third_shelf_observatory?visitor_id=privacy_ui_check`

Screenshots:

- `D:\work\ai-\.trellis\tasks\05-06-05-06-hide-visitor-memory-panels\evidence\visitor-memory-panel-desktop.png`
- `D:\work\ai-\.trellis\tasks\05-06-05-06-hide-visitor-memory-panels\evidence\visitor-memory-panel-mobile.png`

Report:

- `D:\work\ai-\.trellis\tasks\05-06-05-06-hide-visitor-memory-panels\evidence\visitor-memory-panel-browser-check.json`

Checks covered: page loads on desktop/mobile, `对话记忆` / `当前访客的身份与回访状态` / `本次会话尚未写入回访状态` / `对话记录会持续写回记忆` / `聊天历史暂时不可用` are not visible, chat helper remains visible, no horizontal overflow, no page errors.
