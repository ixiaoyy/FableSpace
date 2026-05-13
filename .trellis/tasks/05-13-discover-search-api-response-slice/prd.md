# Discover/Search API Response Optimization Slice

## Parent

`.trellis/tasks/05-13-backend-api-response-optimization`

## Goal

Optimize the API contract used by the discover/search page after the homepage slice has established a compatible list metadata pattern.

## Requirements

- Scope the slice to `frontend/app/routes/discover.tsx` and its tavern list/search API dependency.
- Reuse the homepage list contract where possible: keep `taverns` and `count`, add metadata only if already accepted.
- Make URL search behavior explicit: the discover route accepts `search` / `q`, while backend currently uses `q`.
- If backend filters are added, cover them with tests: `q`, `place_type`, `special_type`, `access`, `status`, `limit`, `offset`.
- Keep Home out of public discover results unless queried by its owner through an owner-scoped flow.
- Avoid divergence between backend filtering and frontend-only presentation filters.
- Measure discover/search critical API response time; if any measured endpoint exceeds 1s, mark it `待优化` before review.

## Acceptance Criteria

- [x] Discover/search API dependency is documented and aligned with the parent response contract.
- [x] Search/filter response changes are additive and covered by backend tests.
- [x] `frontend/app/routes/discover.tsx` uses the service-layer client, not ad hoc fetch.
- [x] Existing homepage behavior is not changed by this slice.
- [x] Verification commands from parent response contract are run and recorded.
- [x] Discover/search critical API response is measured under 1s, or marked `待优化` with endpoint/parameters/evidence.

## Likely Files

- `backend/src/fablemap_api/api/v1/taverns.py`
- `backend/src/fablemap_api/application/services/management.py`
- `backend/src/fablemap_api/contracts/taverns.py`
- `backend/src/fablemap_api/core/tavern.py`
- `frontend/app/lib/taverns.ts`
- `frontend/app/routes/discover.tsx`
- `backend/tests/test_api_smoke.py`
- `backend/tests/test_v1_place_home_mvp.py` or a focused new backend test
- `frontend/scripts/*test.mjs` if service/route contract checks are added

## Out of Scope

- Homepage API changes.
- Global API envelope rewrite.
- Legacy `/api/*` migration.
- New public Home discovery.
- Ranking, social graph, combat, token billing, or unrelated product features.

## Implementation Notes - 2026-05-13

- Reused the homepage list metadata contract: `GET /api/v1/taverns` still returns `taverns` and `count`, with additive `total`, `limit`, `offset`, and `has_more` from the homepage child.
- Added additive discover/search filters to the v1 tavern list API: `search` alias maps to the existing backend query path (`q` wins if both are present), plus `place_type` and `special_type` filters. Existing `access` and `status` filters continue to work.
- Backend public list still hides `place_type=home` unless owner-scoped by `owner_id`; this slice does not make Home publicly discoverable.
- `frontend/app/routes/discover.tsx` now derives service-layer filters from the route request, caps discover API loading at `limit=100`, maps URL `search` / `q` to backend `q`, and passes optional URL `access`, `status`, `place_type`, `special_type` through `listTaverns(...)`.
- Existing in-page filters and derived presentation search remain client-side on the returned page of results; no visual layout or interaction redesign was made in this slice.
- No Playwright/browser pass was run because this slice changes data loading/filter wiring only, not visible layout or interactive DOM behavior.

## Response-Time SLA - 2026-05-13

- PASS_UNDER_1S: `GET /api/v1/taverns?limit=100&offset=0`, 20 local TestClient runs, max `0.0470s`, mean `0.0363s`, p95 `0.0458s`.
- PASS_UNDER_1S: `GET /api/v1/taverns?search=discover-timing-needle&place_type=cafe&status=open&limit=100&offset=0`, 20 local TestClient runs, max `0.0367s`, mean `0.0279s`, p95 `0.0358s`.
- No measured discover/search endpoint exceeded 1s, so none was marked `待优化`.

## Verification - 2026-05-13

- PASS: `py -3 -m compileall -q backend/src`
- PASS: `py -3 -m pytest -q backend/tests/test_api_smoke.py backend/tests/test_v1_place_home_mvp.py --tb=short` (`11 passed, 48 warnings`; warnings are existing FastAPI `on_event` deprecations)
- PASS: `npm --prefix .\frontend test`
- PASS: `npm --prefix .\frontend run typecheck`
- PASS: `npm --prefix .\frontend run build`
- PASS: `py -3 .\.trellis\scripts\task.py validate .trellis\tasks\05-13-discover-search-api-response-slice`
- PASS_WITH_LINE_ENDING_WARNINGS: `git diff --check`

