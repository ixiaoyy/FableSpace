# NPC Duel v0: Rock Paper Scissors

## Goal

Implement the smallest tavern-local NPC duel loop: a visitor can start a simple rock-paper-scissors style match with the current tavern NPC, get deterministic win/loss/draw results from local rules, and see NPC-flavored result copy without adding platform-level combat/ranking systems.

## Requirements

* Add a simple NPC duel game to the existing frontend mini-game surface.
* Keep rules deterministic and local: win/loss/draw must be decided by pure functions, not LLM narrative.
* NPC action may use a simple deterministic/random policy seeded by character/game context; no untrusted user code execution.
* Keep it tavern-local and session-local; no backend schema, ranking, matchmaking, level/equipment, rewards, or cross-space social features.
* Keep UI mobile-safe and lightweight.

## Acceptance Criteria

* [x] Game template appears in the mini-game list with a `family-friendly` tag and explicit non-ranking boundary.
* [x] Rules helper validates moves and returns correct win/loss/draw matrix.
* [x] UI lets user choose rock/paper/scissors, displays NPC move, result, score, and short NPC line.
* [x] Existing mini-game chat prompt flow remains intact.
* [x] `frontend/scripts/mini-games-test.mjs` covers template, helper, and panel wiring.
* [x] Run `npm --prefix .\frontend test` and `npm --prefix .\frontend run build`.

## Definition of Done

* Code implemented in frontend source only.
* Tests/build passed or failures reported honestly.
* Parent brainstorm task keeps complex work deferred to future Trellis tasks.

## Technical Approach

* Extend `frontend/app/product/tavernMiniGames.js` with a duel template and pure helpers.
* Extend `TavernMiniGamePanel.jsx` or a focused sibling panel for interactive RPS duel.
* Keep CSS in `frontend/app/product/tavernMiniGames.css`.
* Use existing `TavernChatRoom.jsx` integration; avoid API/backend changes.

## Out of Scope

* Backend persistence/API.
* Real-time action games.
* Tank board game.
* Agent strategy DSL.
* Replay/state-card writeback.
* Ranking/matchmaking/PVP/economy.

## Implementation Notes — 2026-05-13

Implemented `NPC Duel v0: 猜拳心理战` as the first simple Web game/NPC duel slice.

### Changed Files

* `frontend/app/product/tavernMiniGames.js`
  * Added `npc-rps-duel` template.
  * Added pure RPS helpers: move normalization, deterministic NPC move picker, win/loss/draw matrix, NPC result line, and state transition helper.
* `frontend/app/product/TavernMiniGamePanel.jsx`
  * Added interactive RPS duel state and UI.
  * Existing prompt-based mini-game cards still call `onStart`.
* `frontend/app/product/tavernMiniGames.css`
  * Added desktop/mobile styling for the non-ranking NPC duel panel.
* `frontend/app/product/TavernChatRoom.jsx`
  * Passed current NPC and tavern names into the mini-game panel.
* `frontend/app/features/tavern-chat-workbench/index.tsx`
  * Exposed `TavernMiniGamePanel` in the current native tavern chat workbench route.
  * Non-duel mini-game templates fill the composer through `buildMiniGameStartPrompt`; RPS resolves locally.
* `frontend/scripts/mini-games-test.mjs`
  * Added assertions for RPS template, helpers, native workbench wiring, CSS, and product panel wiring.
* `frontend/scripts/playwright-npc-rps-check.mjs`
  * Added browser self-acceptance script with API fixtures for desktop/mobile screenshots.

### Validation

* `npm --prefix .\frontend test` — PASS.
* `npm --prefix .\frontend run build` — PASS.
* `node .\frontend\scripts\playwright-npc-rps-check.mjs` — PASS.
  * Report: `artifacts/playwright/npc-duel-rps/report.md`
  * Desktop screenshot: `artifacts/playwright/npc-duel-rps/desktop-1440.png`
  * Mobile screenshot: `artifacts/playwright/npc-duel-rps/mobile-390.png`

### Deferred / Not Done

* No backend persistence/API.
* No game library management UI.
* No turn-based tank game.
* No Agent strategy DSL.
* No replay/state-card writeback.
* No platform rankings, matchmaking, PVP, levels, equipment, rewards, or economy.
* `npm --prefix .\frontend run typecheck` — PASS.

## Trellis Claim / Check Closeout — 2026-05-13

### Claim record

* Claim file: `implementation-plan.md`.
* Context files: `implement.jsonl`, `check.jsonl`, `debug.jsonl`.
* `py -3 .\.trellis\scripts\task.py validate .trellis\tasks\05-13-npc-duel-rps` — PASS after replacing stale auto-injected `.claude/commands/trellis/*.md` references with existing `.agents/skills/check` and `.agents/skills/finish-work` skill docs.

### Fresh validation

* `npm --prefix .\frontend test` — PASS.
* `npm --prefix .\frontend run typecheck` — PASS.
* `npm --prefix .\frontend run build` — PASS.
* `node .\frontend\scripts\playwright-npc-rps-check.mjs` with `FABLEMAP_PLAYWRIGHT_BASE_URL=http://127.0.0.1:5174` — PASS.
  * `5173` was already occupied and returned `502 Bad Gateway`, so the self-acceptance server was started on `5174` for this run.
  * Report: `artifacts/playwright/npc-duel-rps/report.md`.
  * Screenshots: `artifacts/playwright/npc-duel-rps/desktop-1440.png`, `artifacts/playwright/npc-duel-rps/mobile-390.png`.
* `git diff --check` — PASS (only line-ending conversion warnings from Git, no whitespace errors).

### Grill-Me verdict

Verdict: PASS.

Source of truth:

* This PRD acceptance criteria.
* `docs/WHAT_NOT_TO_BUILD.md` negative boundaries.
* `.trellis/spec/frontend/component-guidelines.md`, `state-management.md`, `type-safety.md`, `quality-guidelines.md`.
* Playwright desktop/mobile screenshots and report above.

Evidence:

* `frontend/app/product/tavernMiniGames.js` defines `npc-rps-duel`, `family-friendly`, local RPS moves, deterministic NPC move selection, and pure winner/state helpers.
* `frontend/app/product/TavernMiniGamePanel.jsx` keeps RPS as local UI state and labels it `NPC 对局 · 非排行`.
* `frontend/scripts/mini-games-test.mjs` covers template ID/order, helper matrix, invalid move handling, deterministic NPC move, panel/style wiring, and product/native integration strings.
* Playwright report confirms tavern route load, mini-game panel visibility, RPS start, local round resolution, and no horizontal overflow at 1440px and 390px.

Problems:

1. [P3] No blocking issue. The local dev port `5173` was unavailable during validation, so evidence used `5174`; this is recorded above and does not affect product code.

Questions / decisions needed:

* Human should visually inspect the screenshots before commit if they want a higher subjective polish bar; automated checks only prove layout availability and no horizontal overflow, not final taste approval.

Smallest safe next step:

* Keep the task in review until human testing/commit; do not extend this slice into rankings, rewards, tank games, or strategy DSL.

