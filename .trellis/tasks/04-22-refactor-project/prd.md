# brainstorm: project refactor

## Goal

Plan a safe, scoped refactor for FableMap without changing product semantics, schema contracts, or the cyber tavern mainline unless explicitly approved.

## What I already know

* User requested: "trellis 开始重构项目".
* User clarified: current code/content volume is large; both frontend and backend should be refactored toward mature framework-based structure for future maintainability.
* This is broad/high-risk because it may touch backend, frontend, docs, API/service boundaries, tests, and architecture.
* Repository AGENTS.md requires Trellis start workflow, authoritative docs first, scoped changes, and traceable notes.
* Current Trellis task `.trellis/tasks/00-bootstrap-guidelines` is in `review`; this refactor task is separate.
* Trellis session identity is `lijin`; branch is `main`; working tree already has uncommitted AGENTS/Trellis setup changes.
* The product mainline is `coordinates/location → real map → tavern discovery → enter tavern → configure AI NPC → chat → memory/writeback → revisit feedback`.

## Assumptions (temporary)

* Treat this as a refactor planning task first, not immediate code edits.
* Default MVP should improve maintainability while preserving behavior and public data/API contracts.
* "Mature framework" currently means adopting proven FastAPI/React Router/Vite/TypeScript/Pydantic structure first, unless the user explicitly chooses a larger migration.
* Avoid dependency upgrades, schema changes, large rewrites, or unrelated formatting unless explicitly approved.
* If implementation starts, use one small refactor slice with fresh validation rather than a whole-repo rewrite.

## Open Questions

* Which migration strategy should we use first: incremental framework-hardening inside current FastAPI/React stack, or a larger framework migration/rewrite?

## Requirements (evolving)

* Preserve FableMap product constraints: real coordinates, owner-authored taverns/NPCs, owner API key/token responsibility, SillyTavern compatibility.
* Preserve `docs/WORLD_SCHEMA.md` structures unless schema changes are explicitly approved and tested.
* Use existing Trellis task/spec/doc authority before changing code.
* Keep edits scoped and verifiable.
* Refactor both frontend and backend toward clearer framework conventions, but stage the work in small slices.
* Do not modify unrelated user changes or destructive git state.

## Acceptance Criteria (evolving)

* [ ] Refactor scope is explicit and approved before implementation.
* [ ] Affected files and non-goals are listed.
* [ ] Validation commands are selected before code edits.
* [ ] Behavior/schema/API changes are either avoided or documented and tested.
* [ ] The existing public API endpoints and frontend service contracts remain compatible unless explicitly changed.

## Definition of Done (team quality bar)

* Tests added/updated where behavior is touched.
* Required compile/build/test commands run and reported honestly.
* Trellis task/spec notes and docs updated if contracts or patterns change.
* No destructive git/file operations; no unrelated formatting or dependency upgrades.

## Out of Scope (explicit)

* Platform-generated tavern/NPC/story content.
* Platform-level token payment/recharge/settlement.
* Schema/API behavior changes without explicit approval.
* Large UI/state/map dependency additions.
* Broad rewrite before choosing an MVP slice.

## Technical Notes

### Docs read / authority

* `README.md`, `docs/INDEX.md`, `docs/PRODUCT_BRIEF.md`, `docs/FABLEMAP_TAVERN_PLATFORM.md`.
* `docs/ARCHITECTURE.md`: six-layer architecture; key APIs; API key, access-control, and AI Director boundaries.
* `docs/WORLD_SCHEMA.md`: Tavern, TavernCharacter, WorldInfoEntry, LLMConfig, VisitorState, ChatMessage, GameplayDefinition/Session contracts.
* `docs/WHAT_NOT_TO_BUILD.md`: forbids platform-generated content, platform token billing, unanchored spaces, visitor social, traditional map-app drift, game/combat/level/equipment drift.
* `docs/AI参与开发协议.md`: Task First, pre-implementation claim for medium/high-risk changes, type separation, validation, traceable change notes.

### Trellis specs read

* `.trellis/spec/backend/index.md`: backend code under `backend/src/fablemap_api/core/`, tests under `tests/`, route declarations thin and service payload methods preferred.
* `.trellis/spec/frontend/index.md`: frontend under `frontend/`, API calls through `frontend/app/product/services/`, avoid large UI/state/map dependencies, preserve narrow-screen usability.
* `.trellis/spec/guides/index.md`: use cross-layer and code-reuse thinking guides when splitting shared contracts or duplicated patterns.

### Codebase hotspots from inspection

* Backend largest files:
  * `backend/src/fablemap_api/core/web/service.py` ~3529 lines; `WebService` spans ~3005 lines with 136 functions; largest methods include `send_group_chat_payload` and `tavern_chat_payload`.
  * `backend/src/fablemap_api/core/web/router.py` ~2457 lines; `create_api_router` spans ~2293 lines with 151 nested route handlers.
  * `backend/src/fablemap_api/core/tavern.py` ~1741 lines; `TavernStore` and `TavernService` are central but already domain-oriented.
  * `backend/src/fablemap_api/core/llm_clients.py` ~1915 lines; many backend-specific client classes.
* Frontend largest files:
  * `frontend/app/product/styles.css` ~12982 lines.
  * `frontend/app/product/TavernOwnerPanel.jsx` ~2217 lines.
  * `frontend/app/product/services/tavernService.js` ~1651 lines.
  * `frontend/app/product/TavernChatRoom.jsx` ~1620 lines.
  * `frontend/app/product/App.jsx` ~806 lines.
* Service-boundary scan:
  * Most `/api/` calls are already in `frontend/app/product/services/`.
  * Remaining non-service calls appear in current world-facing components (`WorldMap.jsx`, `WorldStageActivePoiPanel.jsx`) and comments/provider base URLs in `LLMConfigForm.jsx`.
* Tests exist for key backend slices: API, group chat, tavern gameplay API/models, chat history, memory, router compatibility, prompt/world-info injection.

## Research Notes

### Constraints from our repo/project

* Refactor must not become product redesign. Architecture says correct changes strengthen tavern discovery/entry/chat/writeback/revisit, not old RPG map visuals.
* Backend route/service split is high-value but cross-layer; needs compile + relevant/full pytest.
* Frontend component/service split is high-value but must preserve mobile/narrow layout and run build/test.
* CSS split is visible-risk because `styles.css` is huge and global selectors may be coupled.
* API/schema changes require docs and tests; default refactor should avoid them.

### Feasible approaches here

**Approach A: Backend router/service domain split** (Recommended if the priority is maintainability)

* How it works: split `backend/src/fablemap_api/core/web/router.py` into domain route registration modules and/or split `WebService` payload groups into domain service modules while preserving `create_api_router(service)` and endpoint behavior.
* Pros: attacks largest Python hotspots; improves testability and route ownership; aligns with backend Trellis guidance that routes stay thin.
* Cons: many endpoints means careful import/registration order and broad pytest coverage required.

**Approach B: Frontend owner/chat UI split**

* How it works: split `TavernOwnerPanel.jsx` and/or `TavernChatRoom.jsx` into smaller focused components/hooks without changing props or service contracts.
* Pros: reduces UI complexity quickly; lower API risk; build validation is straightforward.
* Cons: CSS/global state coupling may cause visual regressions; should include manual narrow-screen check if possible.

**Approach C: Frontend API client split**

* How it works: split `frontend/app/product/services/tavernService.js` into domain clients (`tavernApi`, `characterApi`, `gameplayApi`, `groupChatApi`, `voiceApi`, etc.) while preserving existing exported facade for callers.
* Pros: strong boundary improvement; can keep backward compatibility via facade exports; pairs well with frontend tests.
* Cons: many call sites and scripts may rely on exact export names; requires careful search/test.

**Approach D: Safety-net first refactor preparation**

* How it works: add/refine tests and a route/service contract inventory before moving code.
* Pros: lowest behavior risk; useful before any larger split.
* Cons: does not reduce file size immediately.

## Expansion Sweep

### Future evolution

* Backend route/service domains may later map cleanly to API docs and ownership boundaries.
* Frontend service split may later support generated/validated API contracts, but no new dependency should be introduced now.

### Related scenarios

* Whatever is split should preserve existing imports for current callers until a follow-up cleanup task.
* Old-demo world/map route/components should not be promoted back into the product mainline during refactor.

### Failure & edge cases

* Route registration omissions can silently remove endpoints; need route inventory or router compatibility tests.
* Component extraction can break state lifetimes/effects; need build plus targeted frontend scripts/manual smoke.
* CSS extraction can reorder selectors and cause regressions; avoid as first slice unless the user explicitly wants UI/style cleanup.

### Framework research notes (2026-04-22)

* FastAPI official docs for bigger applications recommend splitting path operations into multiple files with `APIRouter`, while keeping them in the same app/package and including routers in the main app. This directly matches our `web/router.py` hotspot.
* React Router v7 official docs describe three modes: Declarative, Data, and Framework. Data/Framework modes add loader/action/pending-state architecture; Framework mode adds Vite-plugin-backed route modules, type-safe route APIs, code splitting, and rendering strategies. This matches our frontend route/screen growth better than hand-rolled orchestration in `App.jsx`.
* Vite official docs support React + TypeScript templates and modern build targets; Vite transpiles TypeScript quickly, but type-checking should be an explicit validation command rather than assumed from dev-server transpilation.
* Pydantic official docs emphasize typed validation models; FastAPI/SQLModel docs show FastAPI can use SQLModel/SQLAlchemy for SQL persistence, but current project uses JSON persistence, so persistence migration should be a later, explicit feature rather than hidden inside refactor.

### Revised feasible direction

**Recommended: Incremental framework-hardening, not big-bang rewrite**

* Backend target: keep FastAPI; split routers by domain (`taverns`, `characters`, `chat`, `gameplay`, `group_chat`, `llm`, `voice`, `world/migrated-product-core`), introduce request/response schema modules where behavior is stable, keep `create_api_router(service)` as compatibility shell at first.
* Frontend target: keep React + Vite; move toward React Router v7 Data/Framework-style route modules, page/feature folders, TypeScript migration for services/contracts first, then large components.
* Service/client target: split `tavernService.js` into domain clients with a compatibility facade so existing components keep working during migration.
* Styling target: postpone full CSS framework adoption until component boundaries are stable; first split global CSS by feature to avoid selector-order regressions.
* Persistence target: do not migrate JSON store to SQL/ORM in the first refactor wave; treat that as separate architecture decision because it changes deployment/data migration risk.

**Alternative: Big framework migration/rewrite**

* Backend alternatives like Django/Nest-style architecture or a full DB/ORM migration, and frontend alternatives like Next/Remix-style full-stack migration, are possible but would be high-risk because they touch deployment, routing, auth/API contracts, tests, and persistence together.
* This conflicts with AGENTS/AI protocol preference for small, traceable slices unless explicitly approved as a separate roadmap.


## User Decision Update (2026-04-22)

The user explicitly rejected the incremental refactor plan and clarified the desired direction:

* This should be an overall large refactor, not a small-slice cleanup.
* The current project should be treated as a large demo with limited long-term value.
* The primary goal is future maintainability, even if that requires rebuilding architecture boundaries.

### Revised working interpretation

* Product vision and hard constraints from `AGENTS.md` / docs still apply unless the user explicitly changes them: cyber tavern UGC platform, real-coordinate anchoring, owner-authored content, owner-paid LLM token, SillyTavern compatibility.
* Existing implementation can be mined for behavior, tests, data contracts, and demo features, but should not constrain the target architecture too tightly.
* This becomes a C-class/high-risk architecture refactor under `docs/AI参与开发协议.md`; implementation must be preceded by an explicit target architecture/design document and migration plan.

### New open decision

* Choose the target stack and rewrite boundary before any code implementation.

### Big-refactor candidate directions

**Option A: Full-stack Python-centered platform**

* Backend: FastAPI with proper package layering, APIRouter modules, Pydantic schemas, service/use-case layer, repository/storage abstraction, explicit domain modules.
* Frontend: React + Vite + TypeScript + React Router route modules, feature folders, typed API clients.
* Pros: preserves current language/tooling; fastest way to turn demo into maintainable product; lowest migration risk while still allowing full architecture rebuild.
* Cons: still a two-app architecture; frontend/backend contract discipline must be maintained manually unless we add OpenAPI/typegen later.

**Option B: Full-stack TypeScript app shell + Python AI service**

* Frontend/app: Next.js or React Router Framework-style TypeScript app for routes, UI, API facade, auth/session, typed contracts.
* Python backend becomes an internal AI/domain service for LLM, character cards, memory/writeback, and data jobs.
* Pros: one TypeScript-centered product shell; stronger frontend-routing/data conventions; easier UI maintainability.
* Cons: bigger migration; must decide how to split responsibilities between TS API layer and Python AI service; more deployment complexity.

**Option C: Backend-first product core + rebuilt frontend**

* Backend: rebuild domain/API/persistence first, possibly introduce SQL persistence behind repositories.
* Frontend: rebuild after backend contracts stabilize.
* Pros: strong data/domain foundation; best if current frontend is mostly disposable demo UI.
* Cons: slower visible progress; requires careful migration of existing demo functionality.

### Immediate next artifact needed

Create a Trellis architecture/design record for the target rewrite before coding, covering:

* Target stack and why.
* Module boundaries.
* Data model and persistence strategy.
* API contract strategy.

## Migration Progress Notes (2026-04-22)

### Destructive parity baseline

* Root `fablemap/` and `frontend/src/` were retired after moving runnable product core into the enterprise layout:
  * backend product core now lives under `backend/src/fablemap_api/core/`;
  * React Router product parity source now lives under `frontend/app/product/`.
* Baseline commit: `aba33f3`.

### Native v1 extraction slices

* Tavern policy extraction:
  * `backend/src/fablemap_api/domain/tavern_policy.py`
  * `backend/tests/test_tavern_policy.py`
* Native v1 memory-atoms:
  * `backend/src/fablemap_api/domain/memory_atom_policy.py`
  * `/api/v1/taverns/{id}/memory-atoms` CRUD routes/application/contracts
  * `frontend/app/lib/taverns.ts` native memory-atom client methods
  * `backend/tests/test_v1_memory_atoms.py`
  * Commit: `52c215b`.
* Native v1 owner-config diagnostics/configuration:
  * `backend/src/fablemap_api/domain/world_info_policy.py`
  * `/api/v1/taverns/{id}/world-info/test`
  * `/api/v1/taverns/{id}/output-rules`
  * `/api/v1/taverns/{id}/prompt-blocks`
  * `/api/v1/taverns/{id}/runtime-presets`
  * `frontend/app/lib/taverns.ts` native owner-config client methods
  * `backend/tests/test_v1_owner_config.py`
  * Commit: `dfd596b`.
* Native v1 package / owner utility endpoints:
  * `backend/src/fablemap_api/domain/tavern_package_policy.py`
  * `/api/v1/taverns/{id}/package`
  * `/api/v1/tavern-packages/import`
  * `/api/v1/taverns/{id}/visitors`
  * `/api/v1/taverns/{id}/characters/import`
  * `/api/v1/taverns/{id}/gameplay-sessions/{session_id}/abandon`
  * `frontend/app/lib/taverns.ts` native package/visitor/import/abandon client methods
  * `backend/tests/test_v1_tavern_package.py`

### Current migration boundary

The native `/api/v1` layer must continue to call `application/`, `domain/`, and reusable product-core domain modules, but must not delegate to `backend/src/fablemap_api/core/web/service.py` or `core/web/router.py`. Compatibility `/api/*` remains available only as a behavior source during migration.
* Frontend routing/state/component strategy.
* Migration policy from current demo code.
* What current behavior/tests must be preserved.
* What current code can be discarded.


## Target Architecture Direction Confirmed (2026-04-22)

User selected: **frontend/backend separated enterprise project**.

### Updated target

FableMap should be rebuilt as a maintainable, front-back separated product system:

* Frontend and backend are independently structured, built, tested, and deployable.
* Backend exposes stable API contracts; frontend consumes APIs through typed service/client modules.
* Current demo implementation is reference material, not the architecture baseline.
* Existing product/domain constraints still apply unless explicitly changed.

### Enterprise separation requirements

* Backend owns domain model, persistence, permissions, LLM integration, memory/writeback, import/export, API contracts.
* Frontend owns routing, screens, UI state, form validation UX, map/tavern discovery UI, owner console, visitor experience.
* Cross-layer contracts are explicit: OpenAPI/schema docs, typed client generation or hand-maintained typed contract layer, API tests.
* Deployment should support separate backend service and frontend static/app build.
* No hidden platform token billing, no platform-generated tavern content, no schema drift without design/test/doc updates.

### Blocking stack decision

Before writing target architecture doc or code, choose backend core stack:

1. Python/FastAPI enterprise layering.
2. Java/Spring Boot backend with Python AI worker/service.
3. TypeScript/NestJS backend with Python AI worker/service.

Frontend default assumption unless user changes it: React + Vite + TypeScript + React Router, separated from backend.


## Stack Decision (2026-04-22)

User selected option 1: **Python / FastAPI enterprise layering** as the backend primary stack.

### Confirmed target stack

* Backend: Python + FastAPI, rebuilt with enterprise-style layering.
* Backend structure: API routers, Pydantic schemas/contracts, application/use-case services, domain modules, repository/storage abstractions, infrastructure adapters.
* Frontend: React + Vite + TypeScript + React Router, maintained as an independently built/deployed frontend app.
* Cross-layer: explicit API contracts, typed frontend clients, backend API tests, frontend service contract tests.
* Current implementation: source of product behavior and regression tests, not target structure.

### Decision rationale

* Preserves Python AI/LLM ecosystem advantages for LLM clients, memory/writeback, SillyTavern card parsing, and data jobs.
* Keeps migration risk lower than Java/Spring or NestJS rewrites while still enabling a full architecture rebuild.
* Aligns with current dependency baseline (`fastapi`, `uvicorn`, `httpx`, `pytest`) and current frontend baseline (`React`, `Vite`, `React Router`).


## Frontend Framework Decision Pending (2026-04-22)

User questioned whether the frontend should use a real framework instead of plain React/Vite.

### Clarification

The previous "React + Vite + TypeScript + React Router" wording describes a base stack, but not a sufficiently opinionated enterprise frontend framework.

### Recommended frontend framework direction

Use **React Router Framework Mode + Vite + TypeScript** as the frontend application framework, with FastAPI remaining the separated backend API.

Rationale:

* Existing frontend already uses React and React Router, so migration preserves more useful UI/domain code than Angular/Vue/Next rewrites.
* React Router Framework Mode provides route modules, data loading/actions, type-oriented route APIs, code splitting, SPA/SSR/static strategies, and Vite integration.
* It supports strict frontend/backend separation: frontend routes and UX live in the frontend app; data is loaded from the FastAPI API contract.

### Alternatives to keep visible

* **Next.js App Router**: mature React framework with server components, layouts/pages, route handlers, SSR/static rendering. Strong choice if FableMap needs SSR/SEO/public landing pages or a Node BFF, but it can blur strict front/back separation and adds Node server deployment.
* **Angular**: highly opinionated enterprise frontend framework. Strong conventions, but would discard most current React assets and require a full frontend rewrite.
* **TanStack Start**: modern type-safe full-stack React framework powered by TanStack Router. Promising, but less conservative than React Router/Next for this project.

### UI framework still separate

Application framework choice is separate from UI component/design-system choice. For enterprise UI, a later decision should choose one of:

* Ant Design: enterprise admin/console-oriented component framework.
* MUI: broad React component framework.
* shadcn/ui + Tailwind: customizable component composition/design-system path.

Do not mix multiple UI frameworks in the first rebuild.


## Frontend Product UI Correction (2026-04-22)

User clarified: FableMap is **not an admin/backend dashboard project**.

### Correction

* Do not use Ant Design as the default UI direction.
* Do not frame the frontend as an enterprise admin console.
* The frontend is a consumer/creator product experience: map discovery, cyber tavern entry, immersive NPC conversation, owner creation/configuration, revisit feedback.
* "Frontend/backend separated enterprise project" means engineering architecture quality, not admin-style UI.

### Revised frontend recommendation

* Application framework: **React Router Framework Mode + Vite + TypeScript**.
* UI/design-system path: **Tailwind CSS + shadcn/ui-style owned components + Radix UI primitives**.
* Visual direction: custom FableMap product design system, not generic SaaS admin dashboard.
* Owner-side screens should feel like in-product creator tools, not a back-office management system.

### Rationale

* shadcn/ui explicitly positions itself as a way to build your own component library rather than a traditional packaged component library; that fits FableMap's custom cyber-tavern visual identity.
* Radix UI primitives provide accessible, unstyled building blocks, so FableMap can own the look while keeping accessible dialogs, popovers, menus, tabs, etc.
* Tailwind supports rapid custom UI composition without locking the product into an admin-dashboard skin.

### UI non-goals

* No Ant Design default.
* No admin-template look as product baseline.
* No mixing several UI libraries in the first rebuild.


## Phase 1 Implementation Notes (2026-04-22)

Implemented a non-destructive first refactor slice:

* Added `backend/src/fablemap_api/` FastAPI enterprise-layered skeleton with `api/v1`, `contracts`, `application`, `domain`, `infrastructure`, and `repositories` packages.
* Added backend smoke tests under `backend/tests/` for `/api/v1/health` and `/api/v1/meta`.
* Converted frontend build target to React Router Framework Mode with `frontend/app/root.tsx`, `frontend/app/routes.ts`, product route modules, product shell, owned UI card component, and framework config.
* Retained current `backend/src/fablemap_api/core/` and `frontend/app/product/` source for behavior reference during staged migration.
* Added architecture and decision docs for the enterprise separation decision.
* Updated Trellis backend/frontend specs for new target structure and verification commands.

Validation run:

* `py -3 -m compileall -q backend/src` — passed.
* `py -3 -m pytest -q backend/tests --tb=short` — passed, 2 tests.
* `py -3 -m compileall -q backend/src` — passed.
* `npm --prefix frontend run typecheck` — passed.
* `npm --prefix frontend run build` — passed.
* `npm --prefix frontend test` — passed.
* `npm --prefix frontend audit --audit-level=moderate` — failed due existing Vite/esbuild dev-server advisory requiring breaking `vite@8` force update; not fixed in this slice.


## Full Compatibility Migration Update (2026-04-22)

User requested to continue until all migration is complete. The migration baseline is now functional rather than placeholder-only:

* New backend `backend/src/fablemap_api/main.py` exposes new `/api/v1/*` endpoints and complete migrated-product-core `/api/*` product API through a temporary adapter file.
* New frontend React Router Framework Mode app renders the complete existing FableMap product via temporary route adapter files pointing at the current `frontend/app/product/App.jsx` route tree.
* This makes the enterprise entrypoints operational for all existing product behavior while preserving a path to replace current-source modules domain by domain.

Validation rerun:

* `py -3 -m compileall -q backend/src` — passed.
* `py -3 -m pytest -q backend/tests --tb=short` — passed, 3 tests.
* `py -3 -m compileall -q backend/src` — passed.
* `py -3 -m pytest -q --tb=short` — passed, 229 tests.
* `npm --prefix frontend run typecheck` — passed.
* `npm --prefix frontend run build` — passed.
* `npm --prefix frontend test` — passed.
* `npm --prefix frontend audit --audit-level=moderate` — failed: existing Vite/esbuild dev-server advisory; fix requires breaking `vite@8.0.9` force update, intentionally not applied without separate dependency-upgrade decision.

Migration caveat:

* The earlier functional migration through temporary adapters was superseded by the native-entry cleanup. Internal product behavior still needs staged extraction into native `api/v1`, `application`, `domain`, and route-module implementations with tests.


## Dependency Upgrade Update (2026-04-22)

User approved the breaking dependency upgrade required by npm audit.

Changes:

* Ran `npm audit fix --force` in `frontend/`, upgrading Vite to `^8.0.9`.
* Upgraded `@vitejs/plugin-react` to `^6.0.1` to match Vite 8 peer requirements.

Validation after upgrade:

* `npm --prefix frontend run typecheck` — passed.
* `npm --prefix frontend run build` — passed with Vite 8 / React Router Framework Mode.
* `npm --prefix frontend test` — passed.
* `npm --prefix frontend audit --audit-level=moderate` — passed, 0 vulnerabilities.
* `py -3 -m compileall -q backend/src` — passed.
* `py -3 -m pytest -q backend/tests --tb=short` — passed, 3 tests.
* `py -3 -m compileall -q backend/src` — passed.
* `py -3 -m pytest -q --tb=short` — passed, 229 tests.


## Workflow Correction (2026-04-22)

User clarified that the previous spec workflow directory was intentionally deleted and the project is switching to Trellis for future workflow and traceability.

Actions:

* Removed restored/generated previous-workflow content from the workspace.
* Trellis task PRD / task.json / `.trellis/spec/` are now the source of record for this refactor.
* AGENTS.md was updated to make Trellis the primary task/spec workflow.


## Native Entry + UI Framework Upgrade (2026-04-22)

User requested complete removal of temporary adapter references and a UI framework upgrade.

Implemented:

* Removed the new-backend temporary API adapter file and all imports from `backend/src/fablemap_api/main.py`.
* Removed React Router route adapter files from `frontend/app/` and restored native route modules for home/discover/create/tavern.
* Removed compatibility scripts from `frontend/package.json`.
* Added Tailwind CSS via `@tailwindcss/vite`.
* Added Radix/shadcn-style owned UI foundation: `Button`, `Card`, `Tabs`, `Dialog`, `cn()` utility, `class-variance-authority`, `tailwind-merge`, `lucide-react`.
* Rebuilt the native product routes with Tailwind utility classes and Radix primitives; the UI direction remains consumer/creator product experience, not admin dashboard.
* Verified no temporary-adapter wording remains in active backend, `frontend/app`, package config, AGENTS, or Trellis records/specs.

Validation:

* `py -3 -m compileall -q backend/src` — passed.
* `py -3 -m pytest -q backend/tests --tb=short` — passed, 2 tests.
* `npm --prefix frontend run typecheck` — passed.
* `npm --prefix frontend run build` — passed.
* `npm --prefix frontend test` — passed.
* `npm --prefix frontend audit --audit-level=moderate` — passed, 0 vulnerabilities.
* `py -3 -m compileall -q backend/src` — passed.
* `py -3 -m pytest -q --tb=short` — passed, 229 tests.


## Terminology Cleanup Update (2026-04-22)

After the temporary-adapter removal, scanned the non-vendored workspace and replaced remaining temporary-adapter wording with compatibility/older-format wording where it referred to backward compatibility rather than the new architecture.

Validation rerun after terminology cleanup:

* `py -3 -m compileall -q backend/src` — passed.
* `py -3 -m pytest -q backend/tests --tb=short` — passed, 2 tests.
* `py -3 -m compileall -q backend/src` — passed.
* `py -3 -m pytest -q --tb=short` — passed, 229 tests.
* `npm --prefix frontend run typecheck` — passed.
* `npm --prefix frontend run build` — passed.
* `npm --prefix frontend test` — passed.
* `npm --prefix frontend audit --audit-level=moderate` — passed, 0 vulnerabilities.
* Non-vendored workspace scan for temporary-adapter terminology — no matches.

## Native Tavern Mainline Iteration (2026-04-22)

User requested continuing until the iteration is complete. This pass turns the enterprise skeleton into a runnable native tavern mainline slice.

Implemented:

* Added native `/api/v1/taverns` routes for discovery, create, detail, update, delete, enter, characters, chat, memories, gameplays, and gameplay sessions.
* Added `TavernApplicationService` as the new application-layer boundary for tavern use cases. It delegates to current FableMap core behavior during staged extraction while v1 routes own the HTTP contract.
* Added flexible Pydantic request/response contract models for tavern creation/update, character writes, chat, enter, gameplay writes, and list responses.
* Added backend smoke coverage for create → discover → add NPC → enter → chat → history through `/api/v1`.
* Added `frontend/app/lib/taverns.ts` as the typed React Router service client for `/api/v1`.
* Reworked native route modules:
  * `/discover` now loads real tavern data from `/api/v1/taverns`.
  * `/create` now creates a tavern and optional first NPC through `/api/v1`.
  * `/tavern/:tavernId` now loads tavern detail, displays NPCs, enters the tavern, and sends chat through `/api/v1`.
* Updated Trellis frontend/backend specs to reflect the approved React Router + Tailwind + Radix/shadcn-style UI direction and the new `frontend/app/lib` / `backend/src/fablemap_api` boundaries.

Validation:

* `py -3 -m compileall -q backend/src` — passed.
* `py -3 -m pytest -q backend/tests --tb=short` — passed, 3 tests.
* `py -3 -m compileall -q backend/src` — passed.
* `py -3 -m pytest -q --tb=short` — passed, 229 tests.
* `npm --prefix frontend run typecheck` — passed.
* `npm --prefix frontend run build` — passed.
* `npm --prefix frontend test` — passed.
* `npm --prefix frontend audit --audit-level=moderate` — passed, 0 vulnerabilities.
* Non-vendored workspace scan for prohibited old-architecture wording — no matches.
* Active new backend/frontend/Trellis scan for temporary-adapter wording — no matches.

Remaining boundary:

* `backend/src/fablemap_api/core/` and `frontend/app/product/` are still retained as migrated product core/regression source. They should only be deleted after all equivalent native modules and tests exist. This iteration completes the runnable native tavern mainline slice, not the destructive retirement of every migrated-product-core file.

## Spec Compliance Sweep (2026-04-22)

User asked whether any files still violated project conventions and requested full refactor of non-conforming files.

Findings and fixes:

* Found one concrete new-architecture layer violation: `backend/src/fablemap_api/application/taverns.py` depended on `fablemap.web.config` / `fablemap.web.service`, which made the new application layer depend on the current web layer.
* Refactored `TavernApplicationService` to depend directly on migrated product core domain/storage modules instead: `fablemap.tavern`, `fablemap.gameplay`, `fablemap.memory`, and `fablemap.llm_clients`.
* Kept HTTP route parsing in `backend/src/fablemap_api/api/v1/taverns.py`; route modules still delegate to application services.
* Preserved `/api/v1` behavior for discover → create → NPC → enter → chat → history through the smoke test.
* Updated backend/frontend Trellis specs so future new work points to `backend/src/fablemap_api/api/v1`, `backend/src/fablemap_api/application`, `backend/src/fablemap_api/contracts`, and `frontend/app/lib` instead of suggesting migrated-product-core route/service files for enterprise work.

Compliance scans after refactor:

* `rg "from fablemap\.web|import fablemap\.web" backend/src frontend/app .trellis/tasks/04-22-refactor-project` — no matches.
* Prohibited old-architecture vocabulary scan across active new architecture/spec/task files — no matches.
* `rg "console\.log|debugger|!\.|as any|: any" frontend/app backend/src` — no matches.
* `git diff --check` — no whitespace errors; only existing LF→CRLF warnings for frontend package files.

Validation:

* `py -3 -m compileall -q backend/src` — passed.
* `py -3 -m pytest -q backend/tests --tb=short` — passed, 3 tests.
* `py -3 -m compileall -q backend/src` — passed.
* `py -3 -m pytest -q --tb=short` — passed, 229 tests.
* `npm --prefix frontend run typecheck` — passed.
* `npm --prefix frontend run build` — passed.
* `npm --prefix frontend test` — passed.
* `npm --prefix frontend audit --audit-level=moderate` — passed, 0 vulnerabilities.

Remaining note:

* Migrated-product-core files such as `backend/src/fablemap_api/core/web/service.py`, `backend/src/fablemap_api/core/web/router.py`, `frontend/app/product/*`, and historical docs still exist and may contain compatibility/backward-compatibility terminology for real product/data compatibility. They are not part of the new `backend/src` + `frontend/app` enterprise entrypoint compliance surface. Retiring them requires a separate parity-and-delete iteration after all migrated-product-core behavior has native coverage.



## Full Parity Migration + Current-Core Deletion Iteration (2026-04-22)

User explicitly requested the next destructive iteration: full parity migration plus deletion of the root current core.

Implemented in this pass:

* Moved the Python product core from root `fablemap/` into `backend/src/fablemap_api/core/` and deleted the root `fablemap/` directory.
* Repointed all Python imports, tests, monkeypatch targets, path calculations, and CLI entrypoints to `fablemap_api.core`.
* Added `backend/src/fablemap_api/__main__.py` so the migrated CLI can run as `python -m fablemap_api ...` when `backend/src` is on `PYTHONPATH`.
* Moved the previous `frontend/src/` product UI/modules into `frontend/app/product/` and deleted root `frontend/src/`.
* Repointed frontend regression scripts and TypeScript include paths to `frontend/app/product/`.
* Updated active AGENTS/README/Trellis spec references so future work targets `backend/src/fablemap_api/core/`, native `backend/src/fablemap_api/*`, `frontend/app/lib`, and `frontend/app/product/` instead of deleted root current-core paths.

Validation after destructive migration:

* `py -3 -m compileall -q backend/src` — passed.
* `py -3 -m pytest -q backend/tests --tb=short` — passed, 3 tests.
* `py -3 -m pytest -q --tb=short` — passed, 232 tests.
* `npm --prefix frontend run typecheck` — passed.
* `npm --prefix frontend run build` — passed.
* `npm --prefix frontend test` — passed.

Deletion evidence:

* `Test-Path fablemap` — `False`.
* `Test-Path frontend\src` — `False`.
* Active code scan for `from fablemap`, `import fablemap`, `frontend/src`, `src/main`, `/src/` returned only an intentional `/src/` negative assertion in `tests/test_api.py` plus new-path documentation strings.

## Native Domain Policy Extraction Iteration (2026-04-22)

After committing the destructive parity baseline (`aba33f3`), continued migration with a small enterprise-layer slice:

* Extracted reusable v1 tavern access/text/relationship rules from `backend/src/fablemap_api/application/taverns.py` into framework-independent `backend/src/fablemap_api/domain/tavern_policy.py`.
* Kept HTTP error translation in the application layer; domain helpers return normalized values/booleans and do not import FastAPI.
* Added `backend/tests/test_tavern_policy.py` for text normalization, private tavern visibility, memory visibility, and relationship-stage thresholds.
* Updated backend directory-structure spec with the new domain policy contract and test location.

Validation after this slice:

* `py -3 -m compileall -q backend/src` — passed.
* `py -3 -m pytest -q backend/tests --tb=short` — passed, 7 tests.
* `py -3 -m pytest -q --tb=short` — passed, 236 tests.
* `git diff --check` — passed; Git emitted LF→CRLF working-copy warnings for touched text files only.

## Native v1 Memory Atoms Migration Iteration (2026-04-22)

Continued migration by moving structured memory atom behavior into the native enterprise API surface:

* Added `backend/src/fablemap_api/domain/memory_atom_policy.py` for framework-independent memory atom filters, payload normalization, visibility/editability, and create/update validation.
* Added native v1 routes in `backend/src/fablemap_api/api/v1/taverns.py`:
  * `GET /api/v1/taverns/{tavern_id}/memory-atoms`
  * `POST /api/v1/taverns/{tavern_id}/memory-atoms`
  * `GET /api/v1/taverns/{tavern_id}/memory-atoms/{memory_id}`
  * `PUT /api/v1/taverns/{tavern_id}/memory-atoms/{memory_id}`
  * `DELETE /api/v1/taverns/{tavern_id}/memory-atoms/{memory_id}`
* Added `MemoryAtomWriteRequest` in `backend/src/fablemap_api/contracts/taverns.py`.
* Added corresponding application methods in `backend/src/fablemap_api/application/taverns.py` without delegating to `core/web/service.py`.
* Added native frontend API client methods/types in `frontend/app/lib/taverns.ts`.
* Added `backend/tests/test_v1_memory_atoms.py` covering private visitor memory boundaries, owner/public visibility, update, and delete.
* Updated backend directory-structure spec with executable v1 memory-atom contracts, error matrix, and test points.

Validation after this slice:

* `py -3 -m compileall -q backend/src` — passed.
* `py -3 -m pytest -q backend/tests --tb=short` — passed, 9 tests.
* `py -3 -m pytest -q --tb=short` — passed, 238 tests.
* `npm --prefix frontend run typecheck` — passed.
* `npm --prefix frontend run build` — passed.
* `npm --prefix frontend test` — passed.
* `git diff --check` — passed; Git emitted LF→CRLF working-copy warnings for touched text files only.
