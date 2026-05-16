# Global API envelope and legacy API migration

## Goal

The user explicitly approved continuing beyond the previous page-slice optimization scope: introduce a repository-wide API response envelope contract, plan legacy `/api/*` retirement/migration, and allow DB/schema/enum changes only where a concrete contract requires them. The immediate goal is to make envelope handling real and testable without breaking current frontend/backend callers in one unreviewable hard cutover.

## Why these items were not done in the previous task

- The previous parent task `05-13-backend-api-response-optimization` scoped work to page-level response-time optimization and explicitly listed global `{data, meta}` rewriting, legacy `/api/*` migration/deletion, and DB/schema/enum changes as out of scope.
- A hard global response-shape cutover would affect 200+ route handlers, frontend service helpers, and many tests. It needs its own P0 task, migration contract, and verification matrix.
- Legacy `/api/*` is still registered by `backend/src/fablemap_api/core/web/app.py` through `create_api_router(service)` and is still referenced by `frontend/app/product/services/apiClient.js` and product hooks for legacy world/nearby/ghost flows. Deleting it without a migration map would break those callers.
- No concrete persisted field or enum change was specified. Per `docs/WORLD_SCHEMA.md` and AGENTS.md, DB/schema/enum changes must not be invented just to show activity; they require explicit fields, docs, tests, and migration/backward-compat notes.

## What I already know

- Native enterprise routes are included under `/api/v1` by `backend/src/fablemap_api/api/v1/router.py`.
- The old combined web app in `backend/src/fablemap_api/core/web/app.py` includes both legacy/core `/api/*` routes and native `/api/v1/*` routes.
- Existing backend error handlers normalize HTTP errors to `{"error": detail}` and unexpected exceptions to `{"error":"服务暂时不可用"}`.
- Some routes return non-JSON/binary/static/proxy responses (`/api/v1/taverns/{id}/tts`, `/api/tts/synthesize`, `/generated/*`, `/sillytavern/*`) and must not be wrapped as JSON.
- Existing frontend native client boundary is `frontend/app/lib/api-client.ts` + `frontend/app/lib/taverns.ts`; product-parity legacy boundary is `frontend/app/product/services/tavernService.js` and `frontend/app/product/services/apiClient.js`.
- Current tests and services expect old top-level payload keys such as `id`, `taverns`, `ok`, `error`, and `detail`.

## Requirements

1. Add a global JSON transport envelope for API responses that exposes:
   - `data`: the canonical response body for successful responses, or `null` for errors.
   - `meta`: machine-readable transport metadata, at minimum `ok`, `status`, and envelope version.
2. Keep a compatibility transition: existing top-level payload keys must remain available during this task so existing page code/tests do not all break at once.
3. Error responses must preserve legacy `error` / `detail` fields while also exposing the error through `meta.error`.
4. Envelope wrapping must apply centrally, not by editing every route handler.
5. Envelope wrapping must skip non-JSON/binary/static/proxy responses.
6. Frontend API clients must be able to consume either raw legacy payloads or `{data, meta}` envelopes.
7. Legacy `/api/*` retirement must be tracked with a migration map before deleting route registrations.
8. DB/schema/enum changes are allowed only if a concrete endpoint contract requires them; otherwise this task should explicitly record that no persistence schema migration is needed.
9. Preserve the 1s response SLA: envelope middleware must avoid extra service/database calls and should be O(response body size) only.

## Acceptance Criteria

- [x] `/api/v1/health` returns JSON containing both legacy keys and `data`/`meta`.
- [x] A `/api/v1/*` HTTP error returns JSON containing legacy error key(s), `data: null`, and `meta.ok: false`.
- [x] Legacy web app JSON API responses also expose `data`/`meta` while retaining legacy keys.
- [x] Binary/file responses are not converted to JSON.
- [x] `frontend/app/lib/api-client.ts` unwraps enveloped success payloads and still accepts raw legacy responses.
- [x] Product legacy service readers (`frontend/app/product/services/*.js`) unwrap enveloped success payloads and still accept raw responses.
- [x] A Trellis migration map documents which legacy `/api/*` callers still exist and which need v1 replacements or deletion.
- [x] If no DB/schema/enum change is made, the task records why: transport envelope only, no persisted data/enum contract changed.
- [x] Focused backend/frontend tests pass.

## Technical Approach

### Phase 1 implemented in this task: transitional dual-shape envelope

- Add one backend middleware/helper module and register it in both app factories.
- For successful JSON object payloads, emit old keys plus `data` and `meta`:
  - old callers can still read `payload.id`, `payload.taverns`, `payload.ok`, etc.
  - new callers can read `payload.data` and `payload.meta`.
- For successful JSON array/scalar payloads, emit `{data: <payload>, meta: ...}`.
- For errors, emit old `error`/`detail` keys plus `data: null` and `meta.error`.
- Add frontend unwrapping helpers so later hard-only envelope cutover can happen with smaller client risk.

### Later phases tracked, not hidden

- Phase 2: Update direct frontend/service callers to prefer `data` where appropriate and add tests around the new contract.
- Phase 3: Migrate or retire legacy `/api/*` product hooks (`apiClient.js`, world/nearby/ghost/writeback flows) after mapping each old endpoint to a v1 endpoint or explicit deletion.
- Phase 4: Optional hard-only cutover (`{data, meta}` only) after tests and consumers are migrated.

## Decision (ADR-lite)

**Context**: The user requested global envelope and legacy API work after the previous page-slice task intentionally excluded it. A hard cutover would break many unrelated tests and frontend consumers.

**Decision**: Start with a central transitional dual-shape envelope and frontend unwrapping support. This satisfies the global availability of `{data, meta}` while preserving old keys for controlled migration.

**Consequences**:
- Pros: deployable/testable in one task, low risk to existing route handlers, no DB migration.
- Cons: during transition, responses have both legacy keys and envelope keys. A later task must remove duplicated top-level keys if the final desired contract is strict envelope-only.

## Out of Scope for this task

- No unconfirmed persisted DB/schema/enum change.
- No deletion of all legacy `/api/*` routes until the migration map proves they are unused or have v1 parity.
- No large UI redesign or unrelated refactor.
- No wrapping of binary/file/static/proxy responses.

## Technical Notes

- Relevant backend files: `backend/src/fablemap_api/app_factory.py`, `backend/src/fablemap_api/core/web/app.py`, `backend/src/fablemap_api/api/v1/router.py`.
- Relevant frontend files: `frontend/app/lib/api-client.ts`, `frontend/app/product/services/apiClient.js`, `frontend/app/product/services/tavernService.js`.
- Prior inventory: `.trellis/tasks/05-13-backend-api-response-optimization/endpoint-inventory.md`.
- Specs read: backend error handling/quality/database, frontend type-safety/tavern boundary, cross-layer guide.

## Completion Note (2026-05-16)

Focused backend envelope tests, frontend service tests, typecheck, and build passed. Strict envelope-only cutover and legacy /api/* deletion remain later-phase work per the task decision and migration map.
