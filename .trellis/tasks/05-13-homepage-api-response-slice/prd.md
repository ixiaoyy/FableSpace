# Homepage API Response Optimization Slice

## Parent

`.trellis/tasks/05-13-backend-api-response-optimization`

## Goal

Optimize the API contract used by the homepage first, without changing unrelated backend response shapes or breaking existing tavern list clients.

## Requirements

- Scope the slice to the homepage route and the tavern list response it consumes.
- Preserve existing `GET /api/v1/taverns` compatibility: `taverns` and `count` remain available.
- If pagination/light-loading is implemented, use additive query/response fields only (`limit`, `offset`, `total`, `has_more`).
- Keep homepage-specific visual grouping, cover selection, and display labels in frontend code unless separately approved.
- Do not expose owner secrets, passwords, hidden prompts, private Home records, or private visitor state.
- Do not modify search/discover page behavior in this child task.

## Acceptance Criteria

- [x] Homepage API dependency is documented and tests identify the response shape it needs.
- [x] Any backend response changes are backward-compatible and covered by pytest.
- [x] `frontend/app/routes/home.tsx` keeps rendering with old or additive list metadata.
- [x] No unrelated endpoints or global response envelopes are changed.
- [x] Verification commands from parent response contract are run and recorded.
- [x] Homepage critical API response is measured under the 1s SLA, or marked `待优化` if exceeded.

## Likely Files

- `backend/src/fablemap_api/api/v1/taverns.py`
- `backend/src/fablemap_api/application/services/management.py`
- `backend/src/fablemap_api/contracts/taverns.py`
- `frontend/app/lib/taverns.ts`
- `frontend/app/routes/home.tsx`
- `backend/tests/test_api_smoke.py`
- `backend/tests/test_v1_place_home_mvp.py` or a focused new backend test

## Out of Scope

- Discover/search filters.
- Global API envelope rewrite.
- Legacy `/api/*` migration.
- Schema enum changes or database migrations.
- Platform-generated content, ranking, combat, social graph, or token billing.

## Implementation Notes - 2026-05-13

- `GET /api/v1/taverns` keeps the existing `{ taverns, count }` response shape and adds optional list metadata: `total`, `limit`, `offset`, `has_more`.
- Added additive `limit` / `offset` query support in the v1 tavern list route and application service; omitted `limit` preserves the old full-list behavior.
- Homepage loader now requests `limit=12&offset=0` through the existing `frontend/app/lib/taverns.ts` service helper; display grouping/labels remain frontend-owned.
- Focused backend smoke coverage now asserts backward-compatible list shape and paged metadata. Test clients in the touched backend smoke/place-home tests explicitly use isolated JSON storage so local `.env` database settings do not leak into focused verification.
- Search/discover route behavior was not changed in this child task.
- No Playwright/browser pass was run because this slice changes data loading only, not visible layout or interaction.
- Response-time SLA measured for `GET /api/v1/taverns?limit=12&offset=0`: 20 warm local TestClient runs, max `0.0383s`, mean `0.0329s`, p95 `0.0381s`; status `PASS_UNDER_1S`, so not marked 待优化.

## Verification - 2026-05-13

- PASS: `py -3 -m compileall -q backend/src`
- PASS: `py -3 -m pytest -q backend/tests/test_api_smoke.py backend/tests/test_v1_place_home_mvp.py --tb=short` (`10 passed, 44 warnings`; warnings are existing FastAPI `on_event` deprecations)
- PASS: `npm --prefix .\frontend test`
- PASS: `npm --prefix .\frontend run typecheck`
- PASS: `npm --prefix .\frontend run build`
- PASS: `py -3 .\.trellis\scripts\task.py validate .trellis\tasks\05-13-homepage-api-response-slice`
- PASS_WITH_LINE_ENDING_WARNINGS: `git diff --check`
- PASS_UNDER_1S: `GET /api/v1/taverns?limit=12&offset=0` timing validation, 20 runs, max `0.0383s`, mean `0.0329s`, p95 `0.0381s`
