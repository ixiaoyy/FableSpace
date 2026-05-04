# Owner AI Short-drama Draft Assistant

## Goal

让店主基于酒馆设定生成未发布的短剧玩法草稿，编辑确认后才能保存。

## Source Planning

* Parent task: `.trellis/tasks/04-30-ai-video-story-mini-game-brainstorm/`
* Source note: AI video story mini-game MVP 3 / Approach C
* Status: backlog task created to prevent this planning item from being lost; not yet implemented.

## Requirements

* 草稿默认不发布、不覆盖已有玩法。
* 严守 AI draft lifecycle/status UI 边界。
* 风险包括 prompt safety、版权素材、成本，需先设计。

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

* Existing owner gameplay management lives in `frontend/app/product/GameplayManager.jsx`.
* Existing short-drama templates live in `frontend/app/product/shortDramaGameplayTemplates.js`; `GameplayDefinitionEditor.jsx` already supports editing title, status, brief, materials, forbidden items, nodes, and completion.
* Existing draft lifecycle copy is centralized in `frontend/app/lib/ai-draft-lifecycle.js` and already covers the `gameplay` context.
* `docs/WHAT_NOT_TO_BUILD.md` confirms AI draft content must not bypass owner confirmation and must not become platform-published content.
* `docs/WORLD_SCHEMA.md` confirms `GameplayDefinition` is owner tavern content and `GameplaySession` remains runtime-private.

## 2026-05-04 Implementation Notes

* Added `frontend/app/product/shortDramaDraftAssistant.js`, a pure helper that builds a local `GameplayDefinition` draft from current tavern name, description, scene prompt, characters, and owner conflict/tone input.
* Added an `AI 短剧草稿助手` panel to `frontend/app/product/GameplayManager.jsx`.
  * Drafts are inserted locally with `status: draft`.
  * Existing gameplays are not overwritten.
  * Persistence still requires the existing `保存玩法` action.
  * Publication still requires the owner to change status to `published`.
* Added risk copy for prompt safety, copyright/material risk, and Token cost.
* Added styles in `frontend/app/product/tavernGameplay.css`.
* Added `frontend/scripts/short-drama-draft-assistant-test.mjs` and wired it into `frontend/package.json`.
* No backend/API/schema/persistence changes were made.

## 2026-05-04 Verification

* RED: `node frontend/scripts/short-drama-draft-assistant-test.mjs` initially failed with missing `frontend/app/product/shortDramaDraftAssistant.js`.
* GREEN: `node frontend/scripts/short-drama-draft-assistant-test.mjs` — passed (`short-drama-draft-assistant-test: ok`).
* `npm --prefix .\frontend test` — passed; includes `short-drama-draft-assistant-test.mjs`.
* `npm --prefix .\frontend run typecheck` — passed outside sandbox due known Windows native Tailwind/Vite EPERM issue inside sandbox.
* `npm --prefix .\frontend run build` — passed outside sandbox for the same reason.
* `& 'C:\Users\phpxi\miniconda3\python.exe' ./.trellis/scripts/task.py validate .trellis/tasks/04-30-owner-ai-short-drama-draft-assistant` — passed.
* Playwright visual self-acceptance was not run during initial implementation because `frontend/node_modules` did not contain `playwright` or `@playwright/test`.
* 2026-05-04 follow-up after Playwright install: `npm --prefix .\frontend run test:short-drama-ux` — passed outside sandbox; report at `D:\work\ai-\artifacts\playwright\short-drama-ux\report.md`.
  * Browser-verified the native `/discover` short-drama entry that consumes published gameplay.
  * `GameplayManager` / `AI 短剧草稿助手` remains script-test covered rather than browser-route covered because the product compatibility manager is not directly exposed by current React Router routes.
