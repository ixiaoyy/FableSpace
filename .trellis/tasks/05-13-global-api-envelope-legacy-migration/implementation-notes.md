# Implementation notes

## 2026-05-13 Phase 1

Implemented transitional dual-shape API envelope:

- Backend: `backend/src/fablemap_api/api/response_envelope.py` ASGI middleware.
- Registered native `/api/v1/*` in `backend/src/fablemap_api/app_factory.py`.
- Registered legacy/core `/api/*` JSON surface in `backend/src/fablemap_api/core/web/app.py`.
- Frontend: central unwrapping in `frontend/app/lib/api-client.ts`, `frontend/app/product/services/apiClient.js`, and `frontend/app/product/services/tavernService.js`.
- Tests/specs updated for envelope compatibility.

Important design choice: the first phase keeps legacy top-level dictionary keys and adds `data/meta`. This avoids breaking existing route handlers and page code while giving every JSON API response the new envelope. Strict envelope-only output remains a later cutover after client/test migration.

Legacy route deletion is not safe in this same patch because `frontend/app/product/services/apiClient.js` and hooks still call `/api/nearby`, `/api/world/*`, `/api/ghost/*`, and legacy `/api/chat` flows; some have no obvious `/api/v1` parity. See `legacy-api-migration-map.md`.

DB/schema/enum: no persisted schema or enum was changed because the envelope is transport-only. See `schema-enum-note.md`.

## Validation

- `py -3 -m compileall -q backend/src` — PASS
- `py -3 -m pytest -q tests/test_api_response_envelope.py tests/test_api_error_envelope.py --tb=short --basetemp .trellis/tmp/pytest-envelope-main3` — PASS (6 passed)
- `py -3 -m pytest -q backend/tests/test_api_smoke.py backend/tests/test_v1_place_home_mvp.py --tb=short --basetemp .trellis/tmp/pytest-envelope-v1-smoke3` — PASS (12 passed)
- `py -3 -m pytest -q tests/test_ai_assisted_tavern_drafts.py::test_owner_default_llm_api_masks_secret tests/test_core_api_owner_config.py::test_core_api_owner_default_llm_config_persists_and_masks_secret backend/tests/test_v1_world_info_global.py::test_v1_worldinfo_global_crud_test_and_permissions tests/test_tavern_visitor_notes.py::test_owner_can_delete_note --tb=short --basetemp .trellis/tmp/pytest-envelope-exact4` — PASS (4 passed, 2 warnings)
- `node scripts/api-client-error-test.mjs; node scripts/service-contract-test.mjs` from `frontend/` — PASS
- `npm --prefix .\frontend run typecheck` — PASS
- `npm --prefix .\frontend test` — PASS
- `npm --prefix .\frontend run build` — PASS
- `py -3 .\.trellis\scripts\task.py validate .\.trellis\tasks\05-13-global-api-envelope-legacy-migration` — PASS
- `git diff --check` — PASS (CRLF warnings only)



## Timing note (1s SLA)

Envelope middleware itself does not add database/service calls. Timing checks:

- JSON/local storage `/api/v1/taverns?limit=12`: max `0.0417s` over 5 samples — OK.
- Native health `/api/v1/health`: max `0.0092s` — OK.
- Core legacy health `/api/health`: max `0.0040s` — OK.
- Current default database environment `/api/v1/taverns?limit=12`: repeated samples around `12.46s–14.11s` — **待优化**. This appears tied to the default DB/service path rather than envelope serialization (response body ~318 KB), and should be handled as a separate DB/list-query optimization slice.
