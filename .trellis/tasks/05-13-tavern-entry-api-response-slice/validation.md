# Validation Evidence — Tavern Entry API Response Slice

Date: 2026-05-13

## Response SLA

See `response-time.md`.

Summary: all measured tavern entry page-critical endpoints are `PASS_UNDER_1S` with local focused TestClient max times:

- `GET /api/v1/taverns/{id}?view=entry`: max 0.0195s
- `GET /api/v1/taverns/{id}/roleplay`: max 0.0162s
- `POST /api/v1/taverns/{id}/enter`: max 0.0339s
- `GET /api/v1/taverns/{id}/gameplays`: max 0.0195s
- `GET /api/v1/taverns/{id}/gameplay-sessions`: max 0.0170s

No endpoint in this slice is marked `PENDING_OPTIMIZATION_OVER_1S`.

## Commands Run

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests/test_api_smoke.py::test_v1_tavern_entry_view_is_slim_and_public_safe --tb=short
py -3 -m pytest -q backend/tests/test_api_smoke.py backend/tests/test_v1_place_home_mvp.py --tb=short
node .\frontend\scripts\tavern-entry-surface-test.mjs
node .\frontend\scripts\tavern-chat-workbench-test.mjs
npm --prefix .\frontend test
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
py -3 .\.trellis\scripts\task.py validate .trellis\tasks\05-13-tavern-entry-api-response-slice
git diff --check -- .trellis/tasks/05-13-tavern-entry-api-response-slice backend/src/fablemap_api/api/v1/taverns.py backend/src/fablemap_api/application/services/management.py backend/src/fablemap_api/core/tavern.py backend/tests/test_api_smoke.py frontend/app/lib/taverns.ts frontend/app/routes/tavern.tsx frontend/scripts/tavern-chat-workbench-test.mjs
```

## Results

- `compileall`: PASS
- Focused backend entry-view test: PASS
- Backend smoke/place tests: PASS — 12 passed, 52 warnings (existing FastAPI `on_event` deprecation warnings)
- Focused frontend scripts: PASS
- Full frontend script test suite: PASS
- Typecheck: PASS
- Build: PASS
- Trellis context validation: PASS
- `git diff --check`: PASS; Git reported CRLF normalization warnings only, no whitespace errors.


## Closeout Refresh — 2026-05-13

After replacing FastAPI `on_event` startup/shutdown hooks with lifespan cleanup in `backend/src/fablemap_api/app_factory.py`, response timing was refreshed in `response-time.md`.

Latest max times remain under 1s:

- `GET /api/v1/taverns/{id}?view=entry`: 0.0188s
- `GET /api/v1/taverns/{id}/roleplay`: 0.0181s
- `POST /api/v1/taverns/{id}/enter`: 0.0439s
- `GET /api/v1/taverns/{id}/gameplays`: 0.0189s
- `GET /api/v1/taverns/{id}/gameplay-sessions`: 0.0199s

Additional checks:

```powershell
py -3 -W error::DeprecationWarning -m pytest -q backend/tests/test_api_smoke.py::test_health_payload_exposes_enterprise_api_status --tb=short
py -3 -m pytest -q backend/tests/test_api_smoke.py backend/tests/test_v1_place_home_mvp.py --tb=short
```

Results: PASS; backend API tests now report no FastAPI `on_event` deprecation warnings.
