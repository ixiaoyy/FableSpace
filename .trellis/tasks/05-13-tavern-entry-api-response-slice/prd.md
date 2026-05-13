# Tavern Entry API Response Optimization Slice

## Goal

Optimize API payloads used by the tavern entry/detail page so first entry loads remain predictable, safe, and under the 1s local response SLA, without breaking existing full tavern/owner management clients.

## Parent

- `.trellis/tasks/05-13-backend-api-response-optimization`

## Primary Page Surface

- `frontend/app/routes/tavern.tsx`
- Runtime child surface: `frontend/app/features/tavern-chat-workbench/index.tsx`

## Current Page API Dependencies

- `GET /api/v1/taverns/{tavern_id}` via `getTavern(...)`
- `GET /api/v1/taverns/{tavern_id}/roleplay` via `getRoleplayState(...)`
- On mount after entry:
  - `POST /api/v1/taverns/{tavern_id}/enter`
  - `GET /api/v1/taverns/{tavern_id}/gameplays`
  - `GET /api/v1/taverns/{tavern_id}/gameplay-sessions?state=active&visitor_id=...`

## Requirements

- Keep existing `GET /api/v1/taverns/{tavern_id}` default/full response backward-compatible.
- Add only an additive, explicit request option for the route page if a slimmer entry payload is implemented, e.g. `view=entry`.
- Entry payload must include fields required by `TavernChatWorkbench` first render: identity, public copy, coordinates, access/status, roleplay/layout/place/special type, characters, safe LLM mode status, and published gameplay summary if needed.
- Entry payload must not expose owner-only secrets or hidden authoring data to visitors: `llm_config.api_key`, `password_hash`, private voice config, owner hidden prompts, private visitor state, private transcripts, raw provider payloads.
- Frontend route must use service helpers in `frontend/app/lib/taverns.ts`, not ad hoc `fetch`.
- Measure all page-critical endpoints in this slice; if any exceeds 1s locally, record `PENDING_OPTIMIZATION_OVER_1S` / `待优化` in task evidence.
- Do not change persistent schema, enums, database migrations, legacy `/api/*` compatibility routes, or product scope.

## Acceptance Criteria

- [x] Trellis context is configured and validates.
- [x] Route page uses an explicit entry/detail API contract without breaking default `getTavern` callers.
- [x] Backend tests cover default full compatibility and entry-view redaction/required fields.
- [x] Frontend tests/typecheck/build cover service call shape and route compilation.
- [x] Response-time evidence exists with max/mean/p95 and 1s status for page-critical endpoints.
- [x] Parent task child list/status metadata is updated.

## Technical Notes

- Preferred contract: `GET /api/v1/taverns/{id}?view=entry` returns a slim public-safe tavern object; no global `{data, meta}` envelope.
- `count`/pagination metadata from list slices do not apply to this single-resource route.
- The full/default route remains available for owner management and product-parity callers.
- Use existing visibility checks (`private` tavern owner-only) before building the payload.

## Verification Plan

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests/test_api_smoke.py backend/tests/test_v1_place_home_mvp.py --tb=short
npm --prefix .\frontend test
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
```

Add or run a focused response timing script and record results in `response-time.md`.


## Completion Update — 2026-05-13

Implemented additive `GET /api/v1/taverns/{id}?view=entry` support for the tavern entry route. The default/full tavern detail response remains compatible for existing callers, while the entry view removes owner-hidden authoring payloads and returns a slim public-safe first-render shape.

Key evidence:

- Backend route/service/core now pass `view=entry` through to `Tavern.to_dict_entry()`.
- `frontend/app/routes/tavern.tsx` requests `getTavern(tavernId, currentUserId, { view: "entry" })` through the typed service helper.
- `backend/tests/test_api_smoke.py::test_v1_tavern_entry_view_is_slim_and_public_safe` covers default compatibility plus entry-view redaction and published gameplay summaries.
- `response-time.md` records all page-critical endpoint max times below 1s; no `PENDING_OPTIMIZATION_OVER_1S` endpoints.
- `validation.md` records compile, pytest, frontend tests/typecheck/build, Trellis validation, and diff-check results.
