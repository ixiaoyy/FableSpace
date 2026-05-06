# Implementation plan

1. Add a regression check to `frontend/scripts/tavern-chat-workbench-test.mjs` that rejects project-like visitor sidebar copy and requires a conversation-focused sidecar.
2. Remove the duplicated current NPC profile, first-message, expression-thumbnail, and raw tavern metadata panels from the chat workbench sidebar.
3. Replace them with a `聊天辅助` panel that shows current conversation participant, current scene, and quick opening lines.
4. Keep conversation memory and optional public/owner panels folded below the chat helper.
5. Verify with source tests, full frontend tests, typecheck, build, and desktop/mobile Playwright screenshots.
