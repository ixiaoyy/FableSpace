# Backend API Response Optimization

## Priority

P0 — highest priority. This is a cross-layer API contract task and must be handled before broad backend response-shape changes are made elsewhere.

## Goal

Audit and optimize backend API responses across FableMap so frontend clients receive consistent, predictable, safe, and well-tested payloads without breaking existing core flows.

This task is intentionally created as a high-risk planning/research task first. Implementation must be split into smaller child tasks after endpoint inventory and response contract approval.

## Problem Statement

Backend responses currently come from multiple layers and historical route groups (`/api/...`, `/api/v1/...`, core web router, v1 routers). The likely issues are inconsistent success/error shapes, inconsistent list metadata, uneven field naming, unclear preview/dry-run markers, ad hoc error messages, and frontend clients needing scattered defensive normalization.

Because this touches many routes and frontend clients, changing responses without an inventory and compatibility plan can break tavern discovery, chat, memory, gameplay, owner tools, share links, and imported/client-side tests.

## Requirements

1. Inventory every backend endpoint and response source before implementation:
   - `backend/src/fablemap_api/core/web/router.py`
   - `backend/src/fablemap_api/api/v1/`
   - related service payload builders under `backend/src/fablemap_api/application/`, `backend/src/fablemap_api/core/`, and `backend/src/fablemap_api/domain/` as discovered.
2. Classify endpoint response types:
   - single resource read
   - list/search response
   - create/update/delete/action result
   - chat/runtime/gameplay result
   - preview/dry-run result
   - health/status result
   - error/validation/not-found/permission-denied response
3. Propose a response contract before broad changes:
   - success payload conventions
   - error envelope conventions
   - list metadata conventions (`count`, `limit`, `offset`, etc.)
   - preview/dry-run flags (`preview_only`, `persisted`, `applied`, etc.) where already used
   - sensitive-data redaction rules
   - backward compatibility strategy for existing frontend clients
4. Optimize responses only within approved boundaries:
   - safer/more consistent error messages
   - clearer flags and metadata
   - predictable empty states
   - no owner secrets / API keys / hidden prompts in public or visitor responses
   - no unapproved schema or enum changes
5. Update tests and clients together for any response shape changes.
6. Keep changes incremental; create child Trellis tasks for implementation slices.

## Non-Goals / Explicit Boundaries

- Do not rewrite the entire API in one pass.
- Do not silently change persistent schema, field types, enum meanings, required/optional semantics, or database migrations without explicit approval.
- Do not change product scope or add new features while optimizing responses.
- Do not expose owner API keys, hidden prompts, password hashes, private visitor state, or other sensitive fields.
- Do not introduce a platform-level token billing, ranking, combat, matchmaking, economy, social graph, or unrelated gameplay system.
- Do not remove legacy `/api/...` compatibility routes until a migration plan and client tests prove safety.

## Acceptance Criteria

- [x] Endpoint inventory document exists in this task directory and covers all active backend route modules.
- [x] Existing response shapes are grouped by category with compatibility risks noted.
- [x] Proposed response contract is documented with examples for success, error, list, action, and preview responses.
- [x] Implementation is decomposed into child Trellis tasks with clear file scopes.
- [x] For any implemented slice, backend tests and affected frontend client tests are updated before reporting completion.
- [x] Verification plan includes at minimum:
  - `py -3 -m compileall -q backend/src`
  - relevant `py -3 -m pytest -q ... --tb=short` or full `py -3 -m pytest -q --tb=short`
  - `npm --prefix .\frontend test` if frontend clients change
  - `npm --prefix .\frontend run typecheck` if TypeScript client types change
  - `npm --prefix .\frontend run build` if route/client build surface changes

## Suggested Deliverables

1. `endpoint-inventory.md` — endpoint list, route file, current success/error shapes, callers/tests.
2. `response-contract.md` — proposed conventions and migration plan.
3. Child task list — small implementation slices such as:
   - normalize FastAPI/HTTPException error envelope
   - normalize list/search response metadata
   - normalize preview/dry-run response flags
   - harden public/visitor response redaction
   - update frontend clients and tests for one endpoint family
4. Updated `.trellis/spec/backend/` response guidelines after the first implemented slice, if a reusable convention is confirmed.

## Initial Research Scope

Relevant files and directories:

- `backend/src/fablemap_api/core/web/app.py`
- `backend/src/fablemap_api/core/web/router.py`
- `backend/src/fablemap_api/api/v1/`
- `backend/src/fablemap_api/application/`
- `backend/src/fablemap_api/core/`
- `frontend/app/lib/taverns.ts`
- `frontend/app/product/services/tavernService.js`
- `tests/`
- `backend/tests/`
- `frontend/scripts/*test.mjs`

## Required Source-of-Truth Documents

- `AGENTS.md`
- `README.md`
- `docs/INDEX.md`
- `docs/PRODUCT_BRIEF.md`
- `docs/FABLEMAP_TAVERN_PLATFORM.md`
- `docs/ARCHITECTURE.md`
- `docs/WORLD_SCHEMA.md`
- `docs/WHAT_NOT_TO_BUILD.md`
- `docs/AI参与开发协议.md`
- `.trellis/workflow.md`
- `.trellis/spec/backend/index.md`
- `.trellis/spec/backend/error-handling.md`
- `.trellis/spec/backend/quality-guidelines.md`
- `.trellis/spec/backend/logging-guidelines.md`
- `.trellis/spec/frontend/type-safety.md`
- `.trellis/spec/guides/cross-layer-thinking-guide.md`

## Current Status

Completed. Endpoint inventory and response contract are recorded; page-based implementation slices cover homepage, discover/search, and tavern entry; executable backend/frontend specs and cross-layer validation are recorded. No broad/global response-envelope rewrite was performed.

## Planning Update — 2026-05-13 Page-based Decomposition

User confirmed that backend API response optimization can be split by page/entry surface, e.g. homepage API first and search/discover page API second.

Completed in this planning pass:

- Endpoint inventory generated in `endpoint-inventory.md`.
- Response contract draft updated in `response-contract.md` to reject a broad global envelope rewrite and prefer additive, backward-compatible list metadata.
- Child task `.trellis/tasks/05-13-homepage-api-response-slice` created for the homepage API slice.
- Child task `.trellis/tasks/05-13-discover-search-api-response-slice` created for the discover/search API slice.
- Both child tasks have PRDs and context files; validation passes after replacing stale `.claude/commands/trellis/*` context references with `.agents/skills/*` skill docs.

Deferred / Not Done:

- No backend or frontend response-code implementation in the parent planning task.
- Homepage child must be started before code changes.
- Discover/search child should wait until the homepage list metadata contract is implemented and verified.


## Implementation Update — 2026-05-13 Page Slices

Completed child slices now in review:

- `.trellis/tasks/05-13-homepage-api-response-slice` — additive tavern list pagination metadata and homepage bounded request; local API timing `PASS_UNDER_1S`.
- `.trellis/tasks/05-13-discover-search-api-response-slice` — additive search alias/filter support and discover bounded request; local API timing `PASS_UNDER_1S`.
- `.trellis/tasks/05-13-tavern-entry-api-response-slice` — additive `view=entry` tavern detail contract with public-safe redaction and page-critical endpoint timing `PASS_UNDER_1S`.

Still not done by design:

- No global `{data, meta}` response-envelope migration.
- No legacy `/api/*` route removal or migration.
- No database migration, schema enum change, token billing, ranking/combat, or social graph work.


## Final Closeout — 2026-05-13

Completed and validated:

- `.trellis/tasks/05-13-homepage-api-response-slice` — completed.
- `.trellis/tasks/05-13-discover-search-api-response-slice` — completed.
- `.trellis/tasks/05-13-tavern-entry-api-response-slice` — completed.
- `.trellis/spec/backend/tavern-api-response-contract.md` added as executable backend/API response contract.
- `.trellis/spec/frontend/tavern-api-client-boundary.md` added as executable frontend route/service boundary.
- `backend/src/fablemap_api/app_factory.py` moved FastAPI startup/shutdown from deprecated `@app.on_event` handlers to lifespan cleanup; warning-as-error smoke test passes.
- `cross-layer-check.md` and `validation.md` record final evidence.

Still intentionally not done because it is out of approved scope / parent non-goals:

- No global `{ data, meta }` response envelope rewrite.
- No legacy `/api/*` migration/removal.
- No persistent schema, enum, or database migration.
- No unrelated product scope such as platform token billing, ranking/combat, or visitor social graph.
