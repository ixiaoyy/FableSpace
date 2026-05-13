# Response Contract Draft — Backend API Response Optimization

Status: implemented for approved page-based slices on 2026-05-13. Still not approved for a broad/global response-envelope rewrite.

## Contract Decision Log

| Decision | Status | Notes |
|----------|--------|-------|
| Success envelope | Keep existing shapes for now | Do **not** wrap all responses in a new global `{ data, meta }` envelope. Existing clients expect resource/list/action payloads directly. |
| Error envelope | Stable | Keep `HTTPException -> {"error": detail}` and unexpected server failures as `{"error": "服务暂时不可用"}`. Frontend readers must continue accepting both `error` and FastAPI validation `detail`. |
| List metadata | Additive only | Existing list endpoints must keep their named list key and `count`. New metadata, if needed, must be additive (`total`, `limit`, `offset`, `has_more`) and tested. |
| Page-based rollout | Approved direction | User explicitly approved decomposing by page: first homepage API, then search/discover page API. |
| Preview/dry-run flags | Preserve | Keep existing domain names: `preview_only`, `persisted`, `applied`, `audio_generated`, `image_generated`, `requires_confirmation`. Do not rename in this parent task. |
| Sensitive redaction | Required | Public/visitor payloads must not include owner API keys, passwords, hidden prompts, private visitor state, private transcripts, or raw provider payloads. |
| Backward compatibility | Required | Existing `/api/v1/taverns` clients and legacy `/api/*` callers must continue to work unless a child task proves and migrates every caller. |
| Response-time SLA | Required | Page-critical API calls should respond within 1s in focused local validation. Any measured endpoint over 1s must be marked `待优化` / `PENDING_OPTIMIZATION_OVER_1S` in the child task before review. |
| Code-spec sync | Completed | Executable backend and frontend code-specs were added: `.trellis/spec/backend/tavern-api-response-contract.md` and `.trellis/spec/frontend/tavern-api-client-boundary.md`. |

## Response-time SLA

- Target: every page-critical API response in this task family should complete within **1 second** in focused local validation.
- Measurement should be recorded per child task with endpoint, parameters, run count, max/mean/p95 time, and status.
- Status values:
  - `PASS_UNDER_1S`: measured max response time is <= 1s.
  - `待优化` / `PENDING_OPTIMIZATION_OVER_1S`: measured max response time is > 1s; do not hide this behind a green build.
- The SLA is a task acceptance signal, not a reason to make broad unapproved rewrites. If an endpoint exceeds 1s, record it and optimize in the owning page slice or a follow-up child task.

## Rollout Strategy: page first, not global first

This parent task should not perform a global API-envelope rewrite. Implementation should proceed through child tasks that each own one page/entry surface and one narrow API contract.

### Child 1 — Homepage API response slice

Task: `.trellis/tasks/05-13-homepage-api-response-slice`

Primary page:

- `frontend/app/routes/home.tsx`

Current dependency:

- `listTaverns()` in `frontend/app/lib/taverns.ts`
- `GET /api/v1/taverns` in `backend/src/fablemap_api/api/v1/taverns.py`
- `TavernManagementApplicationMixin.list_taverns(...)`

Contract boundary:

- Keep current list response compatible: `{"taverns": [...], "count": <returned_count>}`.
- If homepage needs lighter/faster loading, add only backward-compatible request/response additions such as:
  - query: `limit`, `offset`
  - response: `total`, `limit`, `offset`, `has_more`
- Homepage-specific display labels, cover selection, and visual grouping should remain frontend-side unless a separate product contract approves a page-data endpoint.
- Do not expose private Home records, owner-only `llm_config.api_key`, passwords, hidden prompts, or private visitor memory in homepage results.

Recommended first implementation:

1. Add tested `limit` / `offset` support to `GET /api/v1/taverns` while preserving no-argument behavior.
2. Add `total`, `limit`, `offset`, and `has_more` to `TavernListResponse` as optional/additive fields if implementation confirms the frontend needs them.
3. Add a small frontend wrapper or call-site change so `home.tsx` requests the minimum homepage count instead of relying on an unbounded all-taverns load.
4. Keep `buildHomepageView(...)` and visual derivation in the frontend.

Verification minimum:

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests/test_api_smoke.py backend/tests/test_v1_place_home_mvp.py --tb=short
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
```

If frontend script coverage exists or is added for homepage list behavior, also run `npm --prefix .\frontend test`.

### Child 2 — Discover/search API response slice

Task: `.trellis/tasks/05-13-discover-search-api-response-slice`

Primary page:

- `frontend/app/routes/discover.tsx`

Current dependency:

- `listTaverns()` in `frontend/app/lib/taverns.ts`
- `GET /api/v1/taverns?q=...&access=...&status=...`
- Current route also performs client-side search/category/place-type filtering.

Contract boundary:

- Keep `{"taverns": [...], "count": ...}` compatible.
- Search/discover may extend the same list endpoint with additive filters only after tests:
  - `q` / `search` alias policy must be explicit; current backend uses `q` while route URL accepts `search` and `q`.
  - Optional filters may include `place_type`, `special_type`, `access`, `status`, `limit`, `offset`.
- If backend filtering is introduced, frontend must not silently diverge with a different client-side definition. Any remaining client-only filters must be documented as presentation filters.
- Do not make Home publicly discoverable; keep Home default-private and out of public discover chips.

Recommended second implementation:

1. Reuse the homepage list metadata contract rather than inventing a separate search envelope.
2. Map discover URL `search` to backend `q` in the route/client.
3. Add focused backend tests for `q`, public/private/Home visibility, `place_type`, `status`, `limit`, and `offset` if those filters are implemented.
4. Add frontend checks so discover route tolerates both old and additive list metadata.

Verification minimum:

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests/test_api_smoke.py backend/tests/test_v1_place_home_mvp.py --tb=short
npm --prefix .\frontend test
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
```


### Child 3 — Tavern entry/detail API response slice

Task: `.trellis/tasks/05-13-tavern-entry-api-response-slice`

Primary page:

- `frontend/app/routes/tavern.tsx`
- Runtime child surface: `frontend/app/features/tavern-chat-workbench/index.tsx`

Current dependencies:

- `GET /api/v1/taverns/{tavern_id}`
- `GET /api/v1/taverns/{tavern_id}/roleplay`
- `POST /api/v1/taverns/{tavern_id}/enter`
- `GET /api/v1/taverns/{tavern_id}/gameplays`
- `GET /api/v1/taverns/{tavern_id}/gameplay-sessions`

Contract boundary:

- Keep default `GET /api/v1/taverns/{id}` response compatible for existing full-detail callers.
- Add only explicit `view=entry` for a slim public-safe visitor entry payload.
- Entry payload may include public identity/copy/coordinates/access/status/roleplay/layout/place/special type, safe character first-render data, safe LLM backend mode, and published gameplay summaries.
- Entry payload must not include owner-hidden authoring data, provider secrets, raw prompt blocks, world info, private memory policies, draft gameplay node graphs, private visitor state, transcripts, or raw provider payloads.
- Frontend routes must call the typed service helper (`getTavern(..., { view: "entry" })`) rather than ad hoc `fetch`.

Verification minimum:

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests/test_api_smoke.py backend/tests/test_v1_place_home_mvp.py --tb=short
node .\frontend\scripts\tavern-entry-surface-test.mjs
node .\frontend\scripts\tavern-chat-workbench-test.mjs
npm --prefix .\frontend test
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
```

Response-time SLA evidence is recorded in `.trellis/tasks/05-13-tavern-entry-api-response-slice/response-time.md` and is `PASS_UNDER_1S` for all page-critical endpoints in this slice.

## Contract examples

### Existing-compatible list success

```json
{
  "taverns": [
    {
      "id": "tavern_123",
      "name": "星港夜谈",
      "description": "靠近真实坐标的小空间",
      "lat": 31.23,
      "lon": 121.47,
      "access": "public",
      "status": "open",
      "characters": []
    }
  ],
  "count": 1
}
```

### Additive paged list success

```json
{
  "taverns": [],
  "count": 0,
  "total": 0,
  "limit": 12,
  "offset": 0,
  "has_more": false
}
```

Rules:

- `count` remains the number of `taverns` returned in this response for compatibility.
- `total` is the number after filters but before pagination, if pagination is implemented.
- `limit`/`offset` echo normalized request values.
- `has_more` is `offset + count < total`.

### Action success

Keep endpoint-family shapes unless a child task migrates a specific family with tests. Existing examples include `{"ok": true}`, `{"success": true}`, or domain payloads such as `{"relationship": {...}}`.

### Preview/dry-run success

Keep existing explicit flags:

```json
{
  "preview_only": true,
  "applied": false,
  "persisted": false
}
```

Do not rename established fields in this parent task.

### Error / validation failure

Stable current contract:

```json
{ "error": "空间不存在" }
```

FastAPI request validation remains:

```json
{ "detail": ["..."] }
```

Frontend readers must continue to accept both.

## Backward Compatibility Strategy

1. No broad response envelope migration.
2. Preserve `taverns` + `count` on list endpoints.
3. Add metadata only after endpoint-family tests confirm old clients still parse.
4. Page slices must update backend tests and affected frontend client tests together.
5. Legacy `/api/*` routes are inventoried but not migrated in the homepage/search slices unless explicitly listed in the child PRD.
6. Binary/static/proxy endpoints stay excluded from JSON contract changes.
