# Discovery Short-drama Teaser Cards

## Goal

在发现页/酒馆入口展示短剧式冲突标题和 CTA，引导进入对应酒馆玩法。

## Source Planning

* Parent task: `.trellis/tasks/04-30-ai-video-story-mini-game-brainstorm/`
* Source note: AI video story mini-game MVP 2 / Approach B
* Status: backlog task created to prevent this planning item from being lost; not yet implemented.

## Requirements

* 必须有酒馆内玩法承接，不做空包装。
* 不做推荐算法/排行。
* 复用现有 discovery/tavern 数据。

## Acceptance Criteria

* [x] Relevant existing code/docs are inspected before implementation.
* [x] MVP scope is confirmed against `docs/WHAT_NOT_TO_BUILD.md` and owner-sovereignty rules.
* [x] Implementation, if any, uses existing schema/API where possible; any contract change updates tests and docs.
* [x] Verification commands are recorded in this PRD before moving to review/completed.

## Out of Scope

* No automatic platform publication of AI-generated tavern/NPC/story content.
* No platform token billing, recharge, settlement, or revenue-share system.
* No visitor-to-visitor social network, ranking, combat, levels, or equipment unless explicitly re-scoped by user and docs.

## Technical Notes

* Created during 2026-04-30 backlog hardening at user request: “把所有的规划全部拆成子任务，防止未来丢失”.
* This task is intentionally a planning/backlog placeholder until selected for implementation.

## 2026-05-04 Research Notes

* Existing short-drama gameplay templates and candidate detection live in `frontend/app/product/shortDramaGameplayTemplates.js`.
* In-room gameplay handoff already exists via `frontend/app/product/TavernGameplayLauncher.jsx`; discovery should only tease playable, published gameplay and not create a separate play system.
* Native discovery cards live in `frontend/app/routes/discover.tsx`; product-parity discovery lane lives in `frontend/app/product/WorldStageTavernDiscoveryLane.jsx`; tavern entry handoff lives in `frontend/app/product/TavernEntryPanel.jsx`.
* `docs/WHAT_NOT_TO_BUILD.md` confirms no recommendation/ranking/social graph/combat/token billing/platform autopublish.
* `docs/WORLD_SCHEMA.md` confirms `gameplay_definitions` are owner-authored tavern content; runtime `GameplaySession` remains private and is not mixed into discovery payloads.

## 2026-05-04 Implementation Notes

* Added `frontend/app/lib/short-drama-teasers.js` to derive teaser cards from existing published `gameplay_definitions`.
* Updated `frontend/app/product/shortDramaGameplayTemplates.js` to reuse the shared candidate helper.
* Added teaser UI to:
  * `frontend/app/routes/discover.tsx` radar/card results;
  * `frontend/app/product/WorldStageTavernDiscoveryLane.jsx`;
  * `frontend/app/product/TavernEntryPanel.jsx`.
* Added CSS for product-parity discovery/entry teaser cards in `frontend/app/product/styles.css`.
* Added `frontend/scripts/short-drama-teasers-test.mjs` and wired it into `frontend/package.json`.
* No backend/API/schema/persistence changes were made.

## 2026-05-04 Verification

* RED: `node frontend/scripts/short-drama-teasers-test.mjs` initially failed with missing `frontend/app/lib/short-drama-teasers.js`.
* GREEN: `node frontend/scripts/short-drama-teasers-test.mjs` — passed (`short-drama-teasers-test: ok`).
* `npm --prefix .\frontend test` — passed; includes `short-drama-teasers-test.mjs`.
* `npm --prefix .\frontend run typecheck` — first sandbox run failed with Tailwind/Vite native dependency `spawn EPERM`; rerun outside sandbox passed.
* `npm --prefix .\frontend run build` — first sandbox run failed with the same native dependency `spawn EPERM`; rerun outside sandbox passed.
* `& 'C:\Users\phpxi\miniconda3\python.exe' ./.trellis/scripts/task.py validate .trellis/tasks/04-30-discovery-short-drama-teaser-cards` — passed.
* Playwright visual self-acceptance was not run during initial implementation because `frontend/node_modules` did not contain `playwright` or `@playwright/test`.
* 2026-05-04 follow-up after Playwright install: `npm --prefix .\frontend run test:short-drama-ux` — passed outside sandbox; report at `D:\work\ai-\artifacts\playwright\short-drama-ux\report.md`.
  * Covered native `/discover` desktop + mobile/narrow viewport.
  * Verified published short-drama teaser card, guardrail copy, CTA, and search retention.
