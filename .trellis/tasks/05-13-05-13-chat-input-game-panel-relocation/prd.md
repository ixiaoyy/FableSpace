# Move mini-game panel out of chat input flow

## Problem

The tabletop mini-game launcher currently renders inside the main chat panel between the message log/status and the composer. User screenshot highlighted that this large panel sits in the input area and interferes with normal dialogue flow.

## Requirements

- Keep chat log and composer adjacent; no large secondary tools between messages/status and input.
- Move the mini-game launcher into a secondary/folded tools area below the composer or another non-blocking area.
- Preserve the existing mini-game start behavior and visual content.
- Add a script check so the launcher cannot regress back into the composer/input flow.
- Do not change backend/API/schema.

## Acceptance Criteria

- [x] `data-mini-game-launcher` is no longer rendered before `data-chat-composer="fast-entry"` in `TavernChatWorkbench` source order.
- [x] Mini-game launcher remains present on the tavern page.
- [x] Frontend focused script and build pass.
## Verification / Grill-Me Review

Verdict: PASS.

Source of truth:
- User screenshot: the large “桌边小玩法 / 抽一张玩法卡” panel was highlighted between chat flow and the input area and should not live there.
- Frontend component source order in `frontend/app/features/tavern-chat-workbench/index.tsx`.
- Browser/Playwright evidence for `/tavern/pw_hospital_night_care`.

Evidence:
- `frontend/scripts/tavern-chat-workbench-test.mjs` now asserts `<TavernMiniGamePanel>` renders after `data-chat-composer="fast-entry"` and inside folded secondary tools.
- `frontend/scripts/mini-games-test.mjs` now asserts the legacy chat room renders mini-games after `<ChatInputArea>` and the launcher has `data-mini-game-launcher`.
- Browser DOM: composer visible; big mini-game panel absent before composer; folded “桌边小玩法/小游戏收在这里，不挡聊天输入” summary visible after composer.
- Playwright screenshots saved:
  - `.trellis/tasks/05-13-05-13-chat-input-game-panel-relocation/evidence/desktop-composer-mini-game-folded.png`
  - `.trellis/tasks/05-13-05-13-chat-input-game-panel-relocation/evidence/mobile-composer-mini-game-folded.png`
  - `.trellis/tasks/05-13-05-13-chat-input-game-panel-relocation/evidence/browser-current-composer-mini-game-folded.png`

Problems / risks:
1. [P3] The folded drawer still exists below the composer; if product wants zero mini-game UI in the chat main column, next step is to move it to a side panel or separate tab.
2. [P2 unrelated] Full frontend test suite is still known to fail at `homepage-dynamic-entry-test.mjs` from an existing home-route `clientLoader` expectation, not from this change.

Smallest safe next step:
- If this still feels too close to the input, move the drawer into the left NPC/tools rail or a dedicated “玩法” tab.

