# Prompt Composer and Style Dials MVP

## Goal

为店主侧 CharacterEditor 增加一个本地 Prompt Composer / Style Dials MVP：店主可预览 prompt 层次、选择安全风格拨盘，并把拨盘编译进现有 `system_prompt` 草稿；不新增持久化 schema、不调用 AI、不暴露 secret/API key。

## Source Planning

* Parent task: archived source `.trellis/tasks/archive/2026-04/npc-role-prompt-safety-brainstorm/`
* Source note: External preset analysis Approach D
* Claimed for implementation: 2026-05-04 by `lijin`.

## Requirements

* 预览平台边界、TavernCharacter、world_info、visitor state 等层次，但不暴露 secret/API key。
* 风格拨盘先编译进现有字段或草稿，不新增持久化 schema。
* 保持访客主权，禁止 NPC 决定访客言行/内心/同意。
* 保持 owner-facing：不自动发布、不覆盖店主内容、不调用后端生成内容。
* 前端视觉/交互改动需要 build + Playwright 桌面/窄屏自验收。

## Acceptance Criteria

* [x] Relevant existing code/docs are inspected before implementation.
* [x] MVP scope is confirmed against `docs/WHAT_NOT_TO_BUILD.md` and owner-sovereignty rules.
* [x] Implementation uses existing schema/API only; no contract/schema/API change required.
* [x] Style dials compile into an idempotent managed block in `system_prompt`.
* [x] Prompt layer preview includes platform boundary, character card, style dials, world info, and visitor state without exposing arbitrary secrets.
* [x] Desktop and narrow/mobile Playwright self-acceptance screenshots/report are generated.
* [x] Verification commands are recorded in this PRD before review/completed.

## Research Notes

Read before writing code:

* Project/product guardrails: `README.md`, `docs/INDEX.md`, `docs/PRODUCT_BRIEF.md`, `docs/FABLEMAP_TAVERN_PLATFORM.md`, `docs/ARCHITECTURE.md`, `docs/WORLD_SCHEMA.md`, `docs/WHAT_NOT_TO_BUILD.md`, `docs/AI参与开发协议.md`, `.trellis/workflow.md`.
* Frontend specs: `.trellis/spec/frontend/index.md`, `component-guidelines.md`, `state-management.md`, `quality-guidelines.md`, `type-safety.md`, `character-prompt-risk-linter.md`, `preset-import-preview-ui-boundary.md`.
* Shared guide: `.trellis/spec/guides/code-reuse-thinking-guide.md`.
* Existing implementation references: `frontend/app/product/CharacterEditor.jsx`, `frontend/app/product/characterPromptRiskLinter.js`, `frontend/app/product/PromptBlockEditor.jsx`, `frontend/app/product/PresetImportPreviewModal.jsx`, `frontend/app/product/styles.css`.

## Implementation Notes

* Added `frontend/app/product/promptStyleDials.js` as a pure helper for:
  * dial definitions/defaults;
  * normalization and selected line compilation;
  * idempotent managed `【FableMap 风格拨盘】` block insertion/replacement in `system_prompt`;
  * safe layer preview generation.
* Updated `frontend/app/product/CharacterEditor.jsx` with a collapsible owner-only Prompt Composer / Style Dials panel:
  * button groups for reply length, expression density, perspective, emotion strength, and genre flavor;
  * compiled safety fragment preview;
  * “应用到角色指令” action that updates local draft `system_prompt`;
  * layer preview cards and existing prompt risk linter compatibility.
* Updated `frontend/app/product/styles.css` for desktop and narrow/mobile layout.
* Added `frontend/scripts/prompt-composer-style-dials-test.mjs` to the frontend test chain.
* Added `frontend/scripts/playwright-prompt-composer-check.mjs` and `npm run test:prompt-composer-ux` for desktop + mobile harness self-acceptance.

## Verification

Fresh checks run on 2026-05-04:

* RED first: `node frontend/scripts/prompt-composer-style-dials-test.mjs` failed before helper existed (`ERR_MODULE_NOT_FOUND` for `promptStyleDials.js`).
* PASS: `node frontend/scripts/prompt-composer-style-dials-test.mjs`
* PASS: `npm --prefix .\frontend test`
* PASS: `npm --prefix .\frontend run typecheck; npm --prefix .\frontend run build`
* PASS: `npm --prefix .\frontend run test:prompt-composer-ux`
  * Report: `artifacts/playwright/prompt-composer-style-dials/report.md`
  * Desktop screenshot: `artifacts/playwright/prompt-composer-style-dials/desktop-prompt-composer.png`
  * Mobile screenshot: `artifacts/playwright/prompt-composer-style-dials/mobile-prompt-composer.png`

Playwright harness note:

* Initial harness loading failed because `setContent()` produced `origin null` and Vite blocked the module by CORS; fixed by serving a same-origin `@fs` harness HTML.
* React Router Vite transformed JSX requires the React Router HMR preamble; harness imports `/@id/__x00__virtual:react-router/inject-hmr-runtime`.
* Windows dev-server cleanup uses `taskkill /pid <pid> /t /f` so the verification command exits after screenshots/report generation.

## Out of Scope / Not Done

* No automatic platform publication of AI-generated tavern/NPC/story content.
* No platform token billing, recharge, settlement, or revenue-share system.
* No visitor-to-visitor social network, ranking, combat, levels, or equipment.
* No backend/API/storage/schema changes.
* No actual LLM prompt execution or generated story content creation.

## Technical Notes

* Created during 2026-04-30 backlog hardening at user request: “把所有的规划全部拆成子任务，防止未来丢失”.
* Completed as a frontend-only, owner-facing MVP on 2026-05-04.
