# Journal - lijin (Part 1)

> AI development session journal
> Started: 2026-04-22

---


## Session 1: Homepage reference checkpoint and portrait optimization

**Date**: 2026-04-24
**Task**: Homepage reference checkpoint and portrait optimization
**Branch**: `main`

### Summary

(Add summary)

### Main Changes

| Workstream | Description |
|-----------|-------------|
| Homepage landing | Replaced the homepage composition with the user-approved exact reference image, added transparent route hotspots, and archived the completed Trellis task. |
| NPC portraits | Committed the optimized 256x256 fallback portrait set, synced asset docs, and preserved the task as an in-progress checkpoint for future follow-up if needed. |
| Validation | Confirmed `npm --prefix .\\frontend run typecheck`, `npm --prefix .\\frontend run build`, and direct local `curl.exe --noproxy '*' -sS -D - http://127.0.0.1:8950/` returned 200 OK before push. |

**Pushed commits this round**:
- `0cd4d32` `feat(frontend): checkpoint homepage reference and optimize portraits`
- `be2fced` `chore(task): archive 04-23-homepage-landing-redesign`

**Left local-only and uncommitted intentionally**:
- `frontend/public/`
- `首页参考/`


### Git Commits

| Hash | Message |
|------|---------|
| `0cd4d32` | (see git log) |
| `be2fced` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 2: Polish tavern UI and add Heguang NPC

**Date**: 2026-04-24
**Task**: Polish tavern UI and add Heguang NPC
**Branch**: `main`

### Summary

(Add summary)

### Main Changes

| Area | Summary |
|------|---------|
| Frontend | Polished native homepage/discover/create/tavern/product-shell UI around cyber tavern imagery and added homepage module assets. |
| Backend | Added public-welfare NPC「和光」to `pw_community_repair` and seed repair logic that appends missing built-in child records for platform-owned default taverns without overwriting store edits. |
| Tests | Added coverage for 和光 presence and default seed repair behavior. |
| Workspace | Archived completed Trellis tasks: 04-22-refactor-project, 04-24-heguang-visual-design, 04-24-homepage-layout-polish, 04-24-official-welfare-heguang-npc. |

Verification:
- `git diff --check` passed.
- Secret scan over changed/untracked text files found no private-key/API-token patterns.
- `py -3 -m compileall -q backend/src` passed.
- `npm --prefix .\frontend test` passed.
- `npm --prefix .\frontend run build` passed.
- `py -3 -m pytest -q --tb=short` first failed because local `HTTP_PROXY/HTTPS_PROXY=http://127.0.0.1:7890` intercepted localhost page tests with HTTP 502; rerun with proxy variables cleared and `NO_PROXY=127.0.0.1,localhost` passed: 353 passed, 6 warnings.


### Git Commits

| Hash | Message |
|------|---------|
| `ee49284` | (see git log) |
| `b9330d7` | (see git log) |
| `250b654` | (see git log) |
| `ea37bc2` | (see git log) |
| `793ddbf` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 3: 空间发现增强 — 分类浏览与搜索

**Date**: 2026-04-27
**Task**: 空间发现增强 — 分类浏览与搜索
**Branch**: `main`

### Summary

为 /discover 页面增加了分类标签浏览、空间名称模糊搜索、公益/开放切换开关。清空筛选按钮基于 hasFilters 状态自动显示。修复了 Input 组件缺失问题（改为原生 input）。typecheck 和 build 均通过。

### Main Changes

(Add details)

### Git Commits

(No commits - planning session)

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 4: PC Discover polish and Catbell NPC

**Date**: 2026-04-29
**Task**: PC Discover polish and Catbell NPC
**Branch**: `main`

### Summary

(Add summary)

### Main Changes

| Area | Summary |
| --- | --- |
| Homepage task | Archived completed homepage PC visual polish task. |
| Discover PC | Polished desktop default radar view: wider radar board, sticky controls, telemetry strip, two-column signal list, preserved radar/card A+B switching. |
| Feature backlog | Added Trellis brainstorm backlog tasks for neighborhood rumors, AI-assisted tavern drafts, and guestbook/time capsule. |
| Catbell NPC | Added 银票 as second 静安猫铃避难所 default NPC with direct project-local expression PNGs, world-info context, and seed tests. |

**Verification**
- `node .\\frontend\\scripts\\home-visual-density-test.mjs`
- `node .\\frontend\\scripts\\discover-view-mode-test.mjs`
- `node .\\frontend\\scripts\\discover-pc-polish-test.mjs`
- `npm --prefix .\\frontend run typecheck`
- `npm --prefix .\\frontend test`
- `npm --prefix .\\frontend run build`
- `py -3 -m compileall -q backend/src`
- `py -3 -m pytest -q tests/test_default_public_welfare_taverns.py -k jingan --tb=short`
- `py -3 -m pytest -q tests/test_default_public_welfare_taverns.py --tb=short`

**Artifacts**
- `artifacts/dev-server/discover-radar-desktop.png`
- `artifacts/dev-server/discover-cards-desktop.png`
- `frontend/public/assets/npcs/char_pw_yinpiao-*.png`


### Git Commits

| Hash | Message |
|------|---------|
| `0a38f66` | (see git log) |
| `95785d8` | (see git log) |
| `bc59194` | (see git log) |
| `8c9ffba` | (see git log) |
| `c00708e` | (see git log) |
| `097ea75` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 5: Archive public welfare NPC polish

**Date**: 2026-04-29
**Task**: Archive public welfare NPC polish
**Branch**: `main`

### Summary

(Add summary)

### Main Changes

| Item | Summary |
|------|---------|
| Trellis task | Archived `04-29-04-29-public-welfare-polish` after user confirmation. |
| NPC assets | Re-verified 10 public-welfare NPCs × 5 expressions exist under `frontend/public/assets/npcs/` and are valid PNG files. |
| Tests | Focused public-welfare tavern/gameplay tests passed: 20 passed. |
| Build | Backend compile check and frontend production build passed. |

**Verification commands**:
- `C:\Users\phpxi\miniconda3\python.exe -m pytest -q --tb=short tests/test_default_public_welfare_taverns.py tests/test_default_public_welfare_gameplays.py` → 20 passed
- `C:\Users\phpxi\miniconda3\python.exe -m compileall -q backend/src` → passed
- `npm --prefix .\frontend run build` → passed
- Asset audit: 50/50 target PNGs present, 0 missing, 0 bad PNG headers


### Git Commits

| Hash | Message |
|------|---------|
| `fef2439` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete

## 2026-04-29 — Completed frontend static asset organization

Task: `.trellis/tasks/04-29-04-29-frontend-static-assets/`

Summary:
- Marked the Trellis task completed after fresh validation.
- Confirmed default public-welfare NPC assets are grouped under `frontend/public/assets/npcs/public-welfare/<char_id>/<expression>.png`.
- Confirmed app reference images moved under `frontend/app/assets/discover/reference/` and `frontend/app/assets/homepage/reference/`.
- Confirmed map snapshots are served from `/assets/map-snapshots/...`.
- Acceptance criteria are checked in the task PRD and implementation notes include verification evidence.

Verification:
- `py -3 -m pytest -q --tb=short tests/test_default_public_welfare_taverns.py` -> 18 passed.
- `npm --prefix .\frontend test` -> passed.
- `py -3 -m compileall -q backend/src` -> passed.
- `npm --prefix .\frontend run build` -> passed.
- Asset audit -> `flat_npc_png_count=0`, `nested_npc_png_count=125`, `public_welfare_char_dirs=25`, `map_snapshot_manifest_exists=True`.

## 2026-04-29 — Claimed AI Assisted Tavern Drafts

Task: `.trellis/tasks/04-29-ai-assisted-tavern-drafts/`

Claim:
- Moved task from `planning` to `in_progress`.
- Set phase to 1 (`brainstorm` / PRD) because the task has no PRD yet.
- Scope: fullstack feature, but initial work should define requirements and constraints before implementation.

Guardrails:
- Draft generation must be owner-confirmed before publishing.
- Do not implement platform-autonomous tavern/NPC creation.
- Preserve Tavern / TavernCharacter schema compatibility and SillyTavern export expectations.
- Treat owner API key / LLM config as sensitive.

Next:
- Read product/architecture/schema/no-build docs and existing create-tavern / AI draft helpers.
- Produce task PRD before implementation.

## 2026-04-29 — AI Assisted Tavern Drafts PRD approved

Task: `.trellis/tasks/04-29-ai-assisted-tavern-drafts/`

Decisions:
- Scope: lightweight `/create` draft generation for tavern name, description, scene prompt, and first NPC minimum fields.
- Generation: use owner-level default LLM config, not per-create temporary config and not a template-only fallback.
- Persistence: owner default config stored server-side for MVP; raw API Key must not be returned to frontend.
- Drafts remain non-persistent until owner clicks create.

Artifact:
- Wrote `.trellis/tasks/04-29-ai-assisted-tavern-drafts/prd.md`.
- Advanced task phase to 2 (research/design-ready).

Next:
- Research implementation touchpoints and write an implementation plan before code changes.

## 2026-04-29 — AI Assisted Tavern Drafts implementation plan

Task: `.trellis/tasks/04-29-ai-assisted-tavern-drafts/`

Artifact:
- Wrote `docs/superpowers/plans/2026-04-29-ai-assisted-tavern-drafts.md`.
- Advanced task phase to 3 (implement-ready).

Plan summary:
- Add server-side owner default LLM JSON store and safe masking policy.
- Add owner default LLM APIs.
- Add tavern draft generation API using owner default LLM.
- Add frontend draft helpers and `/create` integration.
- Verify with focused pytest, frontend scripts/build, compileall, and API key exposure grep.

## 2026-04-29 — Recorded storage strategy for AI Assisted Tavern Drafts

Task: `.trellis/tasks/04-29-ai-assisted-tavern-drafts/`

Decision:
- JSON file storage is acceptable only as an MVP adapter for owner default LLM config.
- `OwnerConfigStore` is required so routes/services do not directly depend on `owner_configs.json`.
- Long-term dynamic multi-user data should migrate to DB-backed stores: owner configs/API keys, taverns, characters, chat history, memory atoms, guestbook, notifications, rumors, token usage.
- Files should remain for seed, fixtures, local development, import/export packages, artifacts, and audits.

Updated:
- `.trellis/tasks/04-29-ai-assisted-tavern-drafts/prd.md`
- `docs/superpowers/plans/2026-04-29-ai-assisted-tavern-drafts.md`
- `.trellis/tasks/04-29-ai-assisted-tavern-drafts/task.json`

## 2026-04-29 — AI assisted tavern drafts implementation

- Task: `.trellis/tasks/04-29-ai-assisted-tavern-drafts/`
- Implemented owner-level default LLM config APIs and JSON-backed `OwnerConfigStore` abstraction.
- Implemented owner-scoped tavern draft generation at `POST /api/v1/owners/me/tavern-drafts/generate`; drafts are sanitized and not persisted.
- Added `/create` AI draft panel that saves/checks default LLM, accepts style/forbidden/tone inputs, and fills existing create form only.
- Added backend and frontend tests; updated task PRD and wrote `implementation.md`.
- Validation passed:
  - `node frontend/scripts/ai-tavern-drafts-test.mjs`
  - `npm --prefix .\frontend test`
  - `npm --prefix .\frontend run build`
  - `py -3 -m compileall -q backend/src`
  - `py -3 -m pytest -q tests/test_ai_assisted_tavern_drafts.py --tb=short`
  - secret grep for `api_key` logging/printing: no matches
- Note: fixed pre-existing invalid triple-quote header in `frontend/app/components/NeighborhoodRumorBubble.tsx` because it blocked production build.

## 2026-04-29 — AI assisted tavern drafts check/spec pass

- Ran Trellis `check`: read backend/frontend spec indexes and applicable quality/logging/database/component/state/type-safety guidelines.
- Found and fixed a typecheck issue in `frontend/app/routes/create.tsx`: `LLMConfigForm` must receive controlled `value` and `onChange` props.
- Re-ran validation:
  - `npm --prefix .\frontend run typecheck` passed
  - `npm --prefix .\frontend test` passed
  - `npm --prefix .\frontend run build` passed
- Ran `update-spec` and added executable scenarios:
  - `.trellis/spec/backend/database-guidelines.md` / Owner Default LLM Config Store
  - `.trellis/spec/frontend/type-safety.md` / Create-Page AI Tavern Draft Boundary

## 2026-04-29 — Claimed next task: Tavern Visitor Notes

- Claimed `.trellis/tasks/04-29-tavern-guestbook/` as next task.
- Found original guestbook scope conflicted with `docs/WHAT_NOT_TO_BUILD.md` no-boundary visitor social constraints: public guestbook/replies can become visitor-to-visitor social feed.
- Re-scoped PRD to bounded owner-visible `Tavern Visitor Notes / 回访反馈 MVP`:
  - visitor can leave a note to tavern owner;
  - owner can list/delete notes;
  - no public feed, no replies, no likes/follows/inbox/social graph;
  - notes remain outside public Tavern payload.
- Next: research existing tavern route/store/service boundaries and decide store abstraction before TDD implementation.

## 2026-04-29 — Tavern Visitor Notes implemented

- Implemented re-scoped `.trellis/tasks/04-29-tavern-guestbook/` as owner-visible visitor notes, not public guestbook.
- Added JSON `VisitorNoteStore`, v1 `/visitor-notes` create/list/delete endpoints, backend tests, frontend service helpers, tavern route panel, and frontend contract test.
- Removed active v1 public `/messages` guestbook/reply/pin routes from this task path; tests assert those routes are not exposed.
- Validation passed: compileall, focused backend tests (`12 passed` with AI draft tests), frontend typecheck, frontend test, frontend build.

## 2026-04-29 — Notification system MVP fixed

- Continued with `.trellis/tasks/04-28-notification-system/`.
- Found live WebSocket push bug: v1 WebSocket used `ConnectionManager`, while `NotificationStore.add_notification` broadcast to unused store queues.
- Added `tests/test_notifications.py` for REST list/mark-read and live WebSocket push after connection.
- Fixed WebSocket to register/unregister `NotificationStore` queue and race inbound messages with outbound notification events.
- Updated notification logs/timestamps and owner-visible visitor feedback copy.
- Added backend spec scenario: `.trellis/spec/backend/quality-guidelines.md` / Notification WebSocket MVP.
- Validation passed: compileall + `tests/test_notifications.py tests/test_tavern_visitor_notes.py` (`7 passed`).

## 2026-04-29 — Mobile presentational shell dock

- User requested more “表现化” work, so I pivoted from backend-heavy tasks to `04-28-mobile-adaptation`.
- Implemented a visible mobile bottom navigation dock in `frontend/app/shell/product-shell.tsx`:
  - shared route icons;
  - `lg:hidden` fixed bottom dock;
  - `min-h-14 touch-manipulation` targets;
  - `pb-28` page padding to avoid covering content.
- Updated `frontend/scripts/mobile-shell-layout-test.mjs` and added spec scenario in `.trellis/spec/frontend/component-guidelines.md`.
- Validation passed: mobile-shell script, full frontend test, typecheck, build.

## 2026-04-29 — Place type visual cards

- Continued presentational development with `.trellis/tasks/04-28-place-type-expansion/`.
- Implemented `/create` place-type visual cards: icon, tone copy, active state, type color, Home default-private badge.
- Preserved submission contract through hidden `place_type` input; no backend/schema change.
- Added `tone` and `cardClass` presentation metadata to `PLACE_TYPES` and extended `place-types-test.mjs`.
- Added spec scenario in `.trellis/spec/frontend/type-safety.md`.
- Validation passed: place-types script, full frontend test, typecheck, build.

## 2026-04-29 — Global visual quality bar added to Trellis spec

- User explicitly raised the bar: pages must have very high visual quality, and this should be global spec.
- Updated `.trellis/spec/frontend/component-guidelines.md` with `Global High Visual Quality Page Standard`:
  - consumer-grade cyber tavern UI, not admin-form MVP;
  - required hierarchy, panels/cards, mobile touch targets, active states, empty/error states;
  - no product-boundary violations such as fake social walls or platform-authored content;
  - required validation commands and manual desktop/mobile visual check note.
- Updated `.trellis/spec/frontend/quality-guidelines.md` code-review checklist to enforce the visual quality bar.

## 2026-04-29 — Claimed task: new features brainstorm

- Archived completed current task .trellis/tasks/04-29-04-29-frontend-static-assets/ to .trellis/tasks/archive/2026-04/04-29-04-29-frontend-static-assets/ with --no-commit.
- Set current Trellis task to .trellis/tasks/04-28-new-features-brainstorm/.
- Next: refresh brainstorm against completed 04-29 feature work and project constraints before proposing the next concrete implementation task.


## 2026-04-29 — New features brainstorm refreshed

- Updated .trellis/tasks/04-28-new-features-brainstorm/brainstorm.md with a 2026-04-29 status refresh.
- Marked completed/reviewed spin-off directions: visitor notes, notification MVP, place-type cards, mobile dock, AI tavern drafts, neighborhood rumor system.
- Re-scoped risky old ideas against docs/WHAT_NOT_TO_BUILD.md, especially Home, Quest, and public/social guestbook directions.
- Recommended next concrete implementation candidate: Owner Dashboard presentational MVP, reusing existing tavern/feedback/notification/LLM state instead of adding complex BI or billing.


## 2026-04-29 — Claimed Owner Dashboard Presentational MVP

- Created child task .trellis/tasks/04-29-04-29-owner-dashboard-presentational-mvp/ under  4-28-new-features-brainstorm.
- Initialized frontend Trellis context and added component/state/type-safety/quality guidelines.
- Wrote PRD for /owner presentational dashboard polish and existing-entry aggregation.
- Guardrails: no billing, no public/social guestbook, no complex BI/schema expansion, no AI auto-publishing.
- Next: research current /owner implementation and write/execute a small implementation plan.


## 2026-04-29 — Owner Dashboard implementation plan

- Wrote .trellis/tasks/04-29-04-29-owner-dashboard-presentational-mvp/implementation-plan.md.
- Planned frontend-only changes: extend pure owner-summary, polish /owner hero/entry cards, add owner dashboard regression script, then run frontend test/typecheck/build.
- Explicitly excluded backend routes, schema migration, token billing UI, public/social guestbook, and broad theme rewrites.


## 2026-04-29 — NPC expression art quality rebuild started

- Created and started .trellis/tasks/04-29-04-29-npc-expression-art-quality-rebuild/.
- Wrote PRD and added image/npc-art guidelines to task context.
- Marked rejected public-welfare NPC assets with path, hash, and reason in
ejected-public-welfare-npc-assets.json.
- Root cause: old tests accepted file existence + hash difference, so tint/icon-only variants passed.
- Next: regenerate true expression sprites and add rejected-hash regression checks.


## 2026-04-29 — Home System completed

- Completed .trellis/tasks/04-28-home-system/ personal home page system.
- Implemented: Home model with JSON store, CRUD API endpoints, frontend route with member management, visitor view with chat interaction.
- Updated prd.md with actual member_type implementation (conversational_character, silent_member, display_object).
- Fixed UI component issues: replaced missing Input/Textarea with native HTML, changed variant="outline" to variant="secondary".
- Validation passed: compileall, frontend typecheck, frontend test, frontend build.


## Session 6: StateCard MVP review — already implemented, all tests pass

**Date**: 2026-04-30
**Task**: StateCard MVP review — already implemented, all tests pass
**Branch**: `main`

### Summary

Reviewed task 04-29-state-cards-for-tavern-continuity. Backend: core/state_cards.py, service layer, API router, test. Frontend: StateCardReviewPanel, TavernChatRoom integration, tavernService. WORLD_SCHEMA.md Section 12 already documented. All 35 tavern/state_card tests pass. Ready for owner-side card management UI as remaining work.

### Main Changes

(Add details)

### Git Commits

(No commits - planning session)

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 7: Review and complete easysdd migration task

**Date**: 2026-04-30
**Task**: Review and complete easysdd migration task
**Branch**: `main`

### Summary

Reviewed 04-30-remove-easysdd-migrate-to-trellis task; verified easysdd directory removed, migration files preserved, validation passed

### Main Changes

(Add details)

### Git Commits

(No commits - planning session)

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 8: Research WorldInfo Visual Editor Modern MVP

**Date**: 2026-04-30
**Task**: Research WorldInfo Visual Editor Modern MVP
**Branch**: `main`

### Summary

Analyzed existing WorldBookEditor.jsx (588 lines), documented all features, compared with PromptBlockEditor, defined MVP scope (loading state, mobile layout, keyboard shortcuts, visual polish), updated PRD and created implementation files

### Main Changes

(Add details)

### Git Commits

(No commits - planning session)

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 9: Home Real-coordinate Governance Review

**Date**: 2026-04-30
**Task**: Home Real-coordinate Governance Review
**Branch**: `main`

### Summary

Reviewed Home system governance alignment. Verified existing Home implementation (home.py 305 lines) aligns with product-direction-decision.md framework. Access control, member classification, nonliving silence, and owner sovereignty confirmed. No code changes required. Three minor documentation gaps documented but not blocking.

### Main Changes

(Add details)

### Git Commits

(No commits - planning session)

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 10: Review Character Asset Prompt Skill

**Date**: 2026-04-30
**Task**: Review Character Asset Prompt Skill
**Branch**: `main`

### Summary

Reviewed 04-30-character-asset-prompt-skill task. Comprehensive skill/spec work including: generate-character-prompt and image-style-prompt-extractor skills with 15-dimension analysis, Style DNA templates, Prompt-as-Code techniques, image generation principles, Prompt-first rule, and anti-sameness quality rules. All verification passed.

### Main Changes

(Add details)

### Git Commits

(No commits - planning session)

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 11: Review Hospital Nurse NPC Asset

**Date**: 2026-04-30
**Task**: Review Hospital Nurse NPC Asset
**Branch**: `main`

### Summary

Reviewed 04-30-hospital-nurse-npc-asset task. Added hospital Place type with 3 NPC roles (弥夏/青柚/南星), 512x512 expression assets (15 sprites), role-division gameplay, and verified core per-character chat. All verification passed including 32 pytest tests, frontend typecheck/build, and PNG audit.

### Main Changes

(Add details)

### Git Commits

(No commits - planning session)

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 12: Trellis backlog triage

**Date**: 2026-05-06
**Task**: Trellis backlog triage
**Branch**: `codex-homepage-dynamic-entry-covers`

### Summary

整理当前 Trellis 待办：统计 92 个有效 task、20 个待办/待收口，并生成优先级队列与下一步认领建议。

### Main Changes

# Trellis 待办任务整理（2026-05-06）

> Scope: 只整理 `.trellis/tasks/` 中的任务状态与优先队列；未修改业务代码、未改任何 task 状态。

## 1. 快照摘要

- 有效 `task.json`：92 个。
- 已完成/已做：72 个（`completed` 71，`done` 1）。
- 待办/待收口：20 个（`review` 1，`planning` 19）。
- `P1` 待办：9 个（其中 1 个 review、8 个 planning）。
- `P2` 待办：11 个。
- 目录但无 `task.json`：4 个：`archive`（预期）、`04-28-guest-message-board`、`04-28-owner-dashboard`、`04-29-new-feature-directions`。
- `task.py list` 只显示 80 个任务；另有 12 个有效 task 因父任务 `04-29-npc-role-prompt-safety-brainstorm` 缺失而不可达，但它们全是 completed，不影响当前待办。
- `task.py list --status planning` 只显示 5 个顶层 planning；completed 父任务下的 planning 子任务会被过滤隐藏，因此本次待办统计以直接解析 `task.json` 为准。

## 2. 当前最需要先收口

### A. Review / 分支收口

1. `05-05-homepage-seed-fallback-hero-scale` — **P1 / review / fullstack**
   - 状态：已有 notes 显示多轮验证已通过，仍停在 `review`。
   - 建议：先做人工确认、record-session/commit 或明确退回修改；不要在当前 103 个未提交变更上继续混入新功能。

## 3. P1 开发队列（建议顺序）

### B. Demo → Product 基础治理

1. `05-06-replace-demo-user-identity-defaults` — **P1 / fullstack**
   - 原因：owner/visitor 身份边界是通知、记忆、Home、权限测试的基础。
   - 建议先做：显式 owner identity、稳定匿名 visitor session、移除生产默认 `owner-demo` / `visitor-demo`。

2. `05-06-hardcoded-rules-mode-response` — **P1 / fullstack**
   - 原因：直接影响访客聊天主体验；当前规则模式容易被感知为“系统回复 / 写死”。
   - 建议先做：规则模式产品化、文案透明、避免 prompt/scene/system 字段泄露。

3. `05-06-productize-ai-draft-generation` — **P1 / fullstack**
   - 原因：店主 AI 草稿不应伪装为真实 LLM 生成；需要 owner LLM / fallback 元数据。
   - 建议先做：`source=owner_llm | local_template_fallback`，店主确认前访客不可见。

4. `05-06-persistent-notification-auth` — **P1 / fullstack**
   - 依赖/关联：建议在 identity 边界明确后做。
   - 建议先做：持久化通知、REST/WS 统一身份校验、越权测试。

5. `05-06-home-route-productization` — **P1 / fullstack**
   - 依赖/关联：建议在 identity 边界明确后做。
   - 建议先做：二选一——产品化为真实 `place_type=home` 主线，或从入口下线半成品 `home-me`。

### C. 角色关系图链路（按依赖顺序）

1. `05-06-relationship-graph-schema-storage` — **P1 / backend**
2. `05-06-relationship-graph-propagation-engine` — **P1 / backend**
3. `05-06-relationship-graph-api-governance` — **P1 / backend**
4. `05-06-relationship-graph-owner-ui` — **P2 / frontend**
5. `05-06-relationship-graph-prompt-discovery-integration` — **P2 / fullstack**

建议：先完成 schema/storage，再做 propagation，再开放 API；UI 和 prompt/discovery 必须等 confirmed/enabled 边界稳定后再接。

## 4. P2 产品化补齐队列

1. `05-06-memory-search-adapter-productization` — **P2 / backend**
   - 二选一：实现可配置 graph/vector adapter，或改名为 keyword/shared-field search，消除 `graph_stub` 能力错配。

2. `05-06-owner-dialogue-preview-dryrun` — **P2 / fullstack**
   - 二选一：接后端 prompt dry-run / 可选 owner LLM 测试，或 UI 明确改名为本地模拟器。

3. `05-06-preset-import-apply-flow` — **P2 / fullstack**
   - 在 preview risk report 之后补 owner-confirmed apply，只应用 supported 子集，blocked/warning 默认不自动应用。

4. `05-06-quest-checklist-persistence` — **P2 / fullstack**
   - 二选一：改成探索指南（不承诺进度），或做非竞技、非奖励化的 visitor 持久清单。

## 5. Brainstorm / 方案评估类待办

这些任务目前适合先继续沉淀方案，不建议和上面的实现任务混在同一次代码改动里：

- `05-05-brainstorm-sillytavern-vs-fablemap` — SillyTavern vs FableMap 架构对比。
- `05-05-character-gacha-gameplay-brainstorm` — 角色抽卡/玩法方向。
- `05-06-local-codex-llm-chat-evaluation` — 本地 Codex 作为 LLM/chat backend 可行性评估。
- `05-06-tavern-soft-currency-gifts-design` — 空间纪念币 / 礼物 / 好感度 / 限额抽卡券设计。
- `05-06-visitor-profile-affinity-access-brainstorm` — 游客身份画像、初始好感、可见性与长期记忆边界。

## 6. 建议的下一步认领策略

如果现在要继续开发，建议三选一：

1. **先收口当前分支**：认领/继续 `05-05-homepage-seed-fallback-hero-scale` review，完成 record-session 与提交。
2. **做产品化基础设施**：认领 `05-06-replace-demo-user-identity-defaults`，它会减少后续通知、记忆、Home、权限类任务返工。
3. **优先修聊天体验**：认领 `05-06-hardcoded-rules-mode-response`，直接回应“像系统回复 / 写死”的用户可见问题。

## 7. 建议但本次未执行的 Trellis 清理

- 可考虑把 `05-06-05-06-hide-visitor-memory-panels` 的 status 从 `done` 统一成 `completed`；当前 Trellis progress 已把 `done` 当完成处理，因此不是阻塞。
- 可考虑恢复或清理缺失父任务 `04-29-npc-role-prompt-safety-brainstorm` 的 12 个 completed 子任务 parent 链接；这只影响历史列表可达性，不影响当前待办。
- 可考虑增强 `task.py list --status <status>`：即使父任务不匹配，也应能显示匹配状态的子任务，避免漏掉 completed 父任务下的 planning backlog。
- `05-06-demo-level-implementation-audit` 与 `05-06-tavern-character-relationship-graph-brainstorm` 自身为 completed，但 children 仍 planning；这是“父任务完成产出 backlog”的合理状态，不建议改成未完成。

## 8. 开发前风险提醒

- 当前工作区有 103 个未提交变更；开始新实现前应先收口/提交/另开 worktree，避免把多个任务混在一起。
- P1 fullstack/API/schema 任务开始前需按 `AGENTS.md` 读取对应权威文档与 `.trellis/spec/` 指南，并预先确定验证命令。


### Git Commits

(No commits - planning session)

### Testing

- [OK] `py -3 .trellis/scripts/task.py list` produced current task hierarchy.
- [OK] Parsed `.trellis/tasks/*/task.json` to count status/priority/parent-link health.
- No code tests run; this was Trellis metadata/report整理 only.

### Status

[OK] **Completed**

### Next Steps

- If continuing implementation, first close/review `05-05-homepage-seed-fallback-hero-scale` or use an isolated worktree because the current branch has many uncommitted changes.
- Recommended next claim after branch hygiene: `05-06-replace-demo-user-identity-defaults` or `05-06-hardcoded-rules-mode-response`.


## Session 13: De-demo hardcoded rules response mode

**Date**: 2026-05-06
**Task**: `.trellis/tasks/05-06-hardcoded-rules-mode-response/`
**Branch**: `codex-homepage-dynamic-entry-covers`

### Summary

将公益 / 无 Key 规则回复产品化为显式 `response_mode`：访客聊天 payload 和前端聊天页会区分“规则模式 / 无 Key 轻量接待”“外部 LLM 模式”“AI 后端未配置/未开放”和“规则兜底回应”，同时保留内置公益空间 no-key 可聊天能力。

### Main Changes

- Backend v1 runtime and product-core chat service return `response_mode` metadata without exposing prompt/system/config internals.
- 用户自建空间无可用 LLM 时返回 `llm_not_configured` 降级原因与店主配置引导，不再只显示泛化歇业原因。
- `public_welfare_rules.py` 文档改为 built-in local rules fixture，不再描述为 demo behavior。
- Native tavern workbench and legacy `TavernChatRoom` 增加规则/LLM模式 badge。
- Added regressions for public-welfare rules mode, no-key user tavern degradation, and frontend mode badge contract.

### Testing

- `py -3 -m pytest -q backend/tests/test_v1_runtime_features.py tests/test_tavern_llm_degradation.py --tb=short` → 18 passed, 17 existing deprecation warnings.
- `py -3 -m compileall -q backend/src` → passed.
- `npm --prefix .\frontend run typecheck` → passed.
- `npm --prefix .\frontend test` → passed.
- `npm --prefix .\frontend run build` → passed.
- `git diff --check -- <changed files>` → passed with CRLF normalization warnings only.

### Status

[OK] **Review-ready**

### Next Steps

- Continue with the next open Trellis task after clearing current task pointer.


## Session 14: Persistent notification identity guard

**Date**: 2026-05-06
**Task**: `.trellis/tasks/05-06-persistent-notification-auth/`
**Branch**: `codex-homepage-dynamic-entry-covers`

### Summary

将通知中心从内存/MVP 表述收口到持久化通知与显式身份边界：默认 SQLAlchemy 通知 store 的重启恢复能力被回归测试覆盖，REST 与 WebSocket 均按当前用户身份隔离，前端不再暴露 “MVP” 内部实现文案。

### Main Changes

- Added notification regression tests for persistence across app recreation, cross-user REST isolation, and WebSocket path-only / mismatched identity rejection.
- Hardened `websocket_notifications` to require matching header/query/session user identity and close unauthorized connections with 1008.
- Updated notification hook to send matching query identity, and updated notification page product copy to avoid MVP leakage.
- Updated backend Trellis quality spec with persistent notification / WebSocket identity contracts and no-marketing/no-social-push boundary.

### Testing

- `py -3 -m pytest -q tests/test_notifications.py --tb=short` → 4 passed.
- `py -3 -m compileall -q backend/src` → passed.
- `node .\scripts\notification-center-test.mjs`（cwd: `frontend`）→ passed.
- `npm --prefix .\frontend run typecheck` → passed.
- `npm --prefix .\frontend test` → passed.
- `npm --prefix .\frontend run build` → passed.
- `git diff --check -- <changed files>` → passed with CRLF normalization warnings only.

### Status

[OK] **Review-ready**

### Next Steps

- Clear current Trellis task pointer and continue claiming the next P1 task.


## Session 15: Home route productization by mainline merge

**Date**: 2026-05-06
**Task**: `.trellis/tasks/05-06-home-route-productization/`
**Branch**: `codex-homepage-dynamic-entry-covers`

### Summary

选择低风险“下线/合并”路径：旧 `/home/me` 不再作为独立 Home MVP 产品面，而是兼容提示页，引导到真实坐标 `place_type=home` 创建/管理主线；同时去掉硬编码 owner 权限与占位成员聊天/留言入口。

### Main Changes

- Replaced `/home/me` with a retired-mainline compatibility page that explains Home moved into Place/Home, distinguishes owner/visitor copy without granting privileges, and links to `/create?place_type=home` / `/owner`.
- Removed legacy route usage of `getMyHome`, `createHome`, `chatWithHomeMember`, and `leaveHomeMessage` from the page.
- Added `?place_type=home` preselection to `/create` via shared `normalizePlaceTypeId(...)`.
- Added `frontend/scripts/home-route-productization-test.mjs` and included it in `npm test`.
- Updated frontend type-safety spec with `/home/me` compatibility and `place_type=home` query contracts.

### Testing

- RED: `node .\scripts\home-route-productization-test.mjs`（cwd: `frontend`）failed on `const isOwner = true`.
- GREEN: `node .\scripts\home-route-productization-test.mjs`（cwd: `frontend`）→ passed.
- `npm --prefix .\frontend run typecheck` → passed.
- `npm --prefix .\frontend test` → passed.
- `npm --prefix .\frontend run build` → passed.
- `py -3 -m compileall -q backend/src` → passed.
- `git diff --check -- <changed files>` → passed with CRLF normalization warnings only.

### Status

[OK] **Review-ready**

### Next Steps

- Clear current Trellis task pointer and continue with the relationship-graph P1 chain.


## Session 16: Relationship graph schema and storage

**Date**: 2026-05-06
**Task**: `.trellis/tasks/05-06-relationship-graph-schema-storage/`
**Branch**: `codex-homepage-dynamic-entry-covers`

### Summary

完成统一空间/角色关系图谱的后端 schema/storage 切片：新增关系边与访客私有投影的 domain helpers、SQLAlchemy 表与 store，并同步世界模型、架构和 backend persistence spec。

### Main Changes

- Added `relationship_graph.py` with fixed node/behavior/strength/governance/status enums, dual-axis `affinity` / `hostility` projection helpers, and specificity ranking.
- Added `relationship_edges` and `visitor_relationship_projections` SQLAlchemy models plus `SQLAlchemyRelationshipGraphStore`.
- Added focused domain/store tests for negative drain-then-hostility, positive cap, specificity winner, confirmed edge round-trip, pending/disabled exclusion, and projection provenance upsert.
- Updated `docs/WORLD_SCHEMA.md`, `docs/ARCHITECTURE.md`, and `.trellis/spec/backend/database-guidelines.md` with owner/source-side perspective and visitor-private projection boundaries.

### Testing

- RED: `py -3 -m pytest -q backend/tests/test_relationship_graph_domain.py backend/tests/test_relationship_graph_store.py --tb=short` failed on missing module.
- GREEN: `py -3 -m pytest -q backend/tests/test_relationship_graph_domain.py backend/tests/test_relationship_graph_store.py --tb=short` → 9 passed.
- `py -3 -m compileall -q backend/src` → passed.
- `py -3 -m pytest -q backend/tests/test_mysql_infrastructure.py --tb=short` → 19 passed, 6 existing utcnow deprecation warnings.
- `git diff --check -- <changed files>` → passed.

### Status

[OK] **Review-ready**

### Next Steps

- Continue with `05-06-relationship-graph-propagation-engine`.


## Session 17: Relationship graph propagation engine

**Date**: 2026-05-06
**Task**: `.trellis/tasks/05-06-relationship-graph-propagation-engine/`
**Branch**: `codex-homepage-dynamic-entry-covers`

### Summary

实现关系图谱一跳传播引擎：confirmed edges 可将访客对一个空间/角色的关系变化确定性传播到直接相邻节点，并保留 source-side perspective、specificity、双轴 affinity/hostility 与角色到父 Tavern 弱回流边界。

### Main Changes

- Added propagation event/result domain types.
- Added `RelationshipGraphService.propagate_event(...)` with friendly/allied caps, neutral no-op, rival/hostile negative effects, target-to-source perspective reactions, specificity suppression, and character roll-up.
- Added focused propagation tests for friendly/allied/rival/hostile/neutral, one-hop only, cross-owner reaction, same-owner mutual behavior, character-specific override, and influence-weighted roll-up.
- Updated architecture and backend quality specs with propagation contracts.

### Testing

- RED: `py -3 -m pytest -q backend/tests/test_relationship_graph_propagation.py --tb=short` failed on missing service module.
- GREEN: `py -3 -m pytest -q backend/tests/test_relationship_graph_propagation.py --tb=short` → 7 passed.
- `py -3 -m pytest -q backend/tests/test_relationship_graph_domain.py backend/tests/test_relationship_graph_store.py backend/tests/test_relationship_graph_propagation.py --tb=short` → 16 passed.
- `py -3 -m compileall -q backend/src` → passed.
- `git diff --check -- <changed files>` → passed with CRLF normalization warning for docs only.

### Status

[OK] **Review-ready**

### Next Steps

- Continue with `05-06-relationship-graph-api-governance`.


## Session 18: Relationship graph API governance

**Date**: 2026-05-06
**Task**: `.trellis/tasks/05-06-relationship-graph-api-governance/`
**Branch**: `codex-homepage-dynamic-entry-covers`

### Summary

完成关系图谱的后端 API / governance 切片：在 tavern 作用域下暴露 edge list/create/update/decision routes，并把 owner source-side authority、AI auto-confirm 边界和 pending candidate 不参与传播的规则落到服务层测试。

### Main Changes

- Added `backend/src/fablemap_api/api/v1/relationship_graph.py` and registered it in the v1 router.
- Added application-service governance methods for relationship edge list/create/update/decision flows.
- Added `SQLAlchemyRelationshipGraphStore.get_edge(...)` for edge decision/update flows.
- Added API tests for owner mutation, non-owner denial, delegated AI source-side auto-confirm, cross-owner directionality, and pending-to-confirmed decisions.
- Updated architecture and backend quality specs with source-side API governance contracts.

### Testing

- RED: `py -3 -m pytest -q backend/tests/test_relationship_graph_api.py --tb=short` failed with 404s before routes existed.
- GREEN: `py -3 -m pytest -q backend/tests/test_relationship_graph_api.py --tb=short` → 4 passed.
- `py -3 -m pytest -q backend/tests/test_relationship_graph_domain.py backend/tests/test_relationship_graph_store.py backend/tests/test_relationship_graph_propagation.py backend/tests/test_relationship_graph_api.py --tb=short` → 20 passed.
- `py -3 -m compileall -q backend/src` → passed.
- `git diff --check -- <changed files>` → passed with CRLF normalization warnings only.

### Status

[OK] **Review-ready**

### Next Steps

- Continue with remaining P2 productization / relationship graph integration tasks.


## Session 19: Memory search adapter productization

**Date**: 2026-05-06
**Task**: `.trellis/tasks/05-06-memory-search-adapter-productization/`
**Branch**: `codex-homepage-dynamic-entry-covers`

### Summary

将当前 memory graph/vector adapter 的产品口径收敛为真实可用的 keyword / shared-field 轻量检索，不再暴露 `graph_stub:*` 这类半成品 source label；同时补上访客过滤与 source label 回归测试。

### Main Changes

- `GraphMemoryStore.search_atoms(...)` now preserves keyword/recent result reasons from `KeywordMemoryStore`.
- `GraphMemoryStore.related_atoms(...)` now returns `shared_fields`, documenting that it is field-overlap retrieval rather than graph traversal.
- Renamed the vector adapter source heading away from stub language while keeping no-dependency keyword fallback behavior.
- Updated adapter tests for productized fallback names, visitor filter scoping, and static source-label regression.
- Updated architecture and backend quality specs with memory adapter productization contracts.

### Testing

- RED: `py -3 -m pytest -q tests/test_memory_store_adapters.py --tb=short` failed on old `graph_stub:*` reason/source labels.
- GREEN: `py -3 -m pytest -q tests/test_memory_store_adapters.py --tb=short` → 3 passed.
- `py -3 -m pytest -q tests/test_memory_store_adapters.py tests/test_tavern_memory_permissions.py tests/test_tavern_memory_atoms.py --tb=short` → 11 passed.
- `py -3 -m compileall -q backend/src` → passed.
- `git diff --check -- <changed files>` → passed with CRLF normalization warnings only.

### Status

[OK] **Review-ready**

### Next Steps

- Continue claiming remaining P2 productization tasks.


## Session 20: Owner dialogue preview prompt dry-run

**Date**: 2026-05-06
**Task**: `.trellis/tasks/05-06-owner-dialogue-preview-dryrun/`
**Branch**: `codex-homepage-dynamic-entry-covers`

### Summary

把店主角色对话预览从前端假回复升级为 owner-only 后端 prompt dry-run：默认只组装真实 Tavern/NPC/WorldInfo prompt，不调用模型；店主显式点击后才可测试一次模型；全程不写 chat history、memory、visitor state 或 writeback。

### Main Changes

- Added `POST /api/v1/taverns/{id}/dialogue-preview/dry-run` request contract, route, and application service method.
- Dry-run response includes `dry_run`, `persisted`, `model_called`, write flags, matched WorldInfo count, model status/error, and token estimate.
- Added backend tests for prompt building, owner-only permission, explicit model-call gating, no chat history writes, and no memory atom writes.
- Updated frontend `taverns.ts` service, owner preview component, local fallback normalizer, modal owner identity propagation, and static frontend regression script.
- Updated architecture plus backend/frontend quality specs with the dry-run contract.

### Testing

- RED: `py -3 -m pytest -q backend/tests/test_v1_owner_dialogue_preview.py --tb=short` failed with 404 before route existed.
- GREEN: `py -3 -m pytest -q backend/tests/test_v1_owner_dialogue_preview.py --tb=short` → 3 passed.
- `py -3 -m pytest -q backend/tests/test_v1_owner_dialogue_preview.py backend/tests/test_v1_owner_config.py --tb=short` → 17 passed.
- `py -3 -m compileall -q backend/src` → passed.
- `node .\scripts\owner-dialogue-preview-test.mjs`（cwd: `frontend`）→ passed.
- `npm --prefix .\frontend run typecheck` → passed.
- `npm --prefix .\frontend test` → passed.
- `npm --prefix .\frontend run build` → passed.
- `git diff --check -- <changed files>` → passed with CRLF normalization warnings only.

### Status

[OK] **Review-ready**

### Deferred / Not Done

- No Playwright desktop/narrow screenshot self-acceptance was run for this modal UI slice.

### Next Steps

- Continue claiming remaining P2 productization tasks.


## Session 21: Conversation Beats Implementation

**Date**: 2026-05-07
**Task**: Conversation Beats Implementation
**Branch**: `codex-homepage-dynamic-entry-covers`

### Summary

Completed all 6 child tasks for Conversation Beats feature. Created conversation-beats.js helper module and test. Tasks 2-5 were already partially implemented. Full verification passed: tests, typecheck, build.

### Main Changes

(Add details)

### Git Commits

(No commits - planning session)

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 22: Garden Tavern Currency Economy

**Date**: 2026-05-08
**Task**: Garden Tavern Currency Economy
**Branch**: `codex-homepage-dynamic-entry-covers`

### Summary

Implemented black-diamond currency economy: seed costs, daily bonus, local visitor stats, shop purchases, premium seed unlocks, tavern-local self-rank prompts.

### Main Changes

(Add details)

### Git Commits

(No commits - planning session)

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete

## Memory Note: Visual QA Preference

**Date**: 2026-05-09

User preference for frontend visual work: before running Playwright/browser self-acceptance, first pause and confirm whether the user can do manual visual inspection. If the user confirms manual inspection is available, do not run Playwright self-check unless the current repository/task hard requirement explicitly still requires it; in that case, explain the constraint before running.


## Session 23: Terminate Cobuddy Test

**Date**: 2026-05-09
**Task**: Terminate Cobuddy Test
**Branch**: `main`

### Summary

User reported Baidu Cobuddy model as not useful after testing. Updated task to abandoned and archived it. Config remains at kilo-auto:free.

### Main Changes

(Add details)

### Git Commits

(No commits - planning session)

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 24: NPC Hobby Persistence & Visual Feedback Polish

**Date**: 2026-05-11
**Task**: NPC Hobby Persistence & Visual Feedback Polish
**Branch**: `main`

### Summary

Completed full-cycle NPC hobby system: implemented persistence in CharacterModel/MySQLTavernStore, added multi-round stress tests (passing after runtime.py visitor_name fix), and enhanced UI with premium glassmorphism/gradient badges in TavernChatRoom NPC bubbles.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `89e706f` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 25: Sidebar UI/UX Icon and Style Refinement

**Date**: 2026-05-11
**Task**: Sidebar UI/UX Icon and Style Refinement
**Branch**: `main`

### Summary

Completed the refinement of sidebar icons and styles to match the premium design draft (index_light.png). Replaced unicode icons with Lucide components, removed heavy borders, added indicator-bar active states, and updated branding typography. Verified with Playwright UX regression suite.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `bc57960` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 26: Optimize NPC Interaction: Greetings and Mentions

**Date**: 2026-05-11
**Task**: Optimize NPC Interaction: Greetings and Mentions
**Branch**: `main`

### Summary

Enhanced tavern entrance greetings to summarize multiple NPCs and improved public chat mention UX by adding click-to-mention support in the sidebar.

### Main Changes

(Add details)

### Git Commits

(No commits - planning session)

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete
