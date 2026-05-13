# Implementation Plan — Backend API Response Optimization

Status: review on 2026-05-13; homepage and discover/search children implemented and awaiting human review.

## Claim

- Owner: `lijin`
- Current parent task: `.trellis/tasks/05-13-backend-api-response-optimization`
- Risk: P0 / high-risk cross-layer API contract
- Implementation rule: no broad response rewrite in the parent task.

## User decision

The implementation should be split by page/entry surface:

1. Homepage API response slice first.
2. Discover/search page API response slice second.

## Child tasks created

1. `.trellis/tasks/05-13-homepage-api-response-slice`
   - Scope: homepage route + tavern list response contract.
   - Primary files: `frontend/app/routes/home.tsx`, `frontend/app/lib/taverns.ts`, `backend/src/fablemap_api/api/v1/taverns.py`, `backend/src/fablemap_api/application/services/management.py`, `backend/src/fablemap_api/contracts/taverns.py`.
   - Contract: preserve `taverns` + `count`; only additive list metadata if implemented.

2. `.trellis/tasks/05-13-discover-search-api-response-slice`
   - Scope: discover/search route + tavern list/search filters.
   - Primary files: `frontend/app/routes/discover.tsx`, `frontend/app/lib/taverns.ts`, `backend/src/fablemap_api/api/v1/taverns.py`, `backend/src/fablemap_api/application/services/management.py`, `backend/src/fablemap_api/core/tavern.py`, `backend/src/fablemap_api/contracts/taverns.py`.
   - Contract: reuse homepage list metadata pattern; map `search`/`q` explicitly; keep Home out of public discover results.

## Parent deliverables completed

- `endpoint-inventory.md`: generated inventory of active FastAPI routes and response risks.
- `response-contract.md`: page-first contract draft and compatibility strategy.
- Child task PRDs and context files.

## Deferred / not done

- Homepage and discover/search API response children implemented and in review.
- No global response envelope migration.
- No legacy `/api/*` route migration.
- No schema enum changes, database migrations, or product feature expansion.

## Progress - 2026-05-13

- `05-13-homepage-api-response-slice`: implemented additive `limit`/`offset` request support and `total`/`has_more` list metadata for `GET /api/v1/taverns`; homepage now requests `limit=12`. Focused backend/frontend validation passed.
- `05-13-discover-search-api-response-slice`: still pending; should reuse the homepage list metadata pattern without changing search/discover behavior until that child starts.

- `05-13-discover-search-api-response-slice`: implemented additive search/filter wiring (`search` alias, `place_type`, `special_type`) and discover loader service filters with `limit=100`; focused backend/frontend validation and 1s SLA timing passed.
