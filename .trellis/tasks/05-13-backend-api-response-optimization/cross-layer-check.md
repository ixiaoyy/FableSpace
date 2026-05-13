# Cross-Layer Check — Backend API Response Optimization

Date: 2026-05-13

## Scope

Changes span backend route/service/domain payload builders, frontend service helpers/routes, tests, Trellis task records, and code-spec docs.

## Dimension A: Cross-layer data flow

Flow checked:

```text
JSON store / Tavern dataclass
→ TavernService list/get helpers
→ TavernManagementApplicationMixin
→ FastAPI /api/v1/taverns routes
→ frontend/app/lib/taverns.ts service helpers
→ home/discover/tavern route loaders
→ route components / TavernChatWorkbench
```

Result: PASS.

Evidence:

- Backend route signatures forward additive list filters and `view=entry` without changing default detail/list shapes.
- `Tavern.to_dict_entry()` is built server-side before visitor payload exposure; redaction is not delegated to the browser.
- Frontend route modules use `frontend/app/lib/taverns.ts` helpers. `rg -F 'fetch(`/api/v1/taverns' frontend/app` and quote variants found no direct route/component fetch duplicate for the optimized detail path.
- Owner/manage routes still call default `getTavern(...)` without `{ view: "entry" }`, preserving full-detail compatibility.

## Dimension B: Code reuse / duplicated constants

Result: PASS.

- `view=entry` is typed as `TavernDetailView = "entry"` and centralized in `getTavern(...)` query construction.
- List metadata remains in the existing `TavernListResponse` type rather than a second page-specific response type.
- Backend list normalization helpers live in the tavern service/application layer rather than repeated in routes.

## Dimension C: Import/dependency paths

Result: PASS.

- No new runtime dependency was introduced.
- New spec docs are referenced from `.trellis/spec/backend/index.md` and `.trellis/spec/frontend/index.md`.
- FastAPI lifespan cleanup uses standard-library `contextlib.asynccontextmanager` and `collections.abc.AsyncIterator`.

## Dimension D: Same-layer consistency

Result: PASS.

- Page slices consistently avoid a global `{ data, meta }` envelope.
- List endpoints consistently preserve `taverns` + `count` and add `total`, `limit`, `offset`, `has_more` only additively.
- Detail entry optimization is explicit (`view=entry`) and does not change default callers.

## Issues Found / Fixed

1. Existing backend tests emitted FastAPI `on_event` deprecation warnings from `backend/src/fablemap_api/app_factory.py`.
   - Fixed by moving `SimulationWorker` startup/shutdown to FastAPI lifespan.
   - Verified with `py -3 -W error::DeprecationWarning -m pytest -q backend/tests/test_api_smoke.py::test_health_payload_exposes_enterprise_api_status --tb=short`.

No remaining cross-layer blocker found for this task family.


## Additional Issue Found / Fixed

2. `backend/tests/test_startup_optional_mysql.py` showed that explicit JSON storage still imported SQLAlchemy via `RelationshipGraphApplicationMixin` → `SQLAlchemyRelationshipGraphStore` at module import time.
   - Fixed by moving `SQLAlchemyRelationshipGraphStore` behind a lazy import inside `_relationship_graph_store(...)` and using `TYPE_CHECKING` for annotations.
   - Spec guardrail added to `.trellis/spec/backend/database-guidelines.md` under Database-backed Runtime Startup.
   - Verified with `backend/tests/test_startup_optional_mysql.py` and relationship graph API/domain/store/propagation tests.
