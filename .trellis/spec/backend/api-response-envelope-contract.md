# API Response Envelope Contract

> Global JSON transport envelope for FableSpace API responses.

## Scenario: Transitional `{data, meta}` API envelope

### 1. Scope / Trigger

Use this when changing FastAPI app shells, response middleware, API error handlers, or route/client contracts that depend on response shape.

This is a transport contract only. It does not add persisted Space / Character / VisitorState / WorldInfo fields and does not require DB schema or enum migration by itself.

### 2. Signatures

```python
ENVELOPE_VERSION = "data-meta.v1"

add_api_response_envelope_middleware(
    app: FastAPI,
    *,
    path_prefixes: Iterable[str] = ("/api/v1",),
) -> None

build_response_envelope(
    payload: Any,
    *,
    status_code: int,
    method: str,
    path: str,
) -> dict[str, Any]
```

Registered app shells:

- `backend/src/fablespace_api/app_factory.py`: wraps `/api/v1/*` JSON responses.
- `backend/src/fablespace_api/core/web/app.py`: wraps legacy/core `/api/*` JSON responses while that compatibility surface exists.

### 3. Contracts

- Successful JSON responses expose:
  - `data`: the canonical original payload.
  - `meta.ok: true`
  - `meta.status`: HTTP status code.
  - `meta.envelope: "data-meta.v1"`
  - `meta.method` / `meta.path`: request metadata for debugging/client telemetry.
- Transitional compatibility keeps legacy top-level keys for dictionary payloads. Example:

```json
{
  "status": "ok",
  "data": { "status": "ok" },
  "meta": { "ok": true, "status": 200, "envelope": "data-meta.v1" }
}
```

- Error JSON responses expose:
  - legacy `error` or `detail` key(s) when originally present;
  - `data: null`;
  - `meta.ok: false`;
  - `meta.error.code`, `meta.error.message`, `meta.error.detail`.
- Non-JSON responses must not be enveloped. This includes audio/file/static/proxy responses such as TTS/STT binary routes, generated files, frontend static files, and SillyTavern proxy/static responses.
- The middleware must not call service/database code; overhead should be limited to reading/parsing/serializing the JSON response body.
- If an endpoint already returns this exact envelope version, do not double-wrap it.

### 4. Validation & Error Matrix

| Case | Expected |
|------|----------|
| `GET /api/v1/health` | Contains legacy `status`, `data.status`, and `meta.ok: true` |
| `GET /api/health` through core web app | Contains legacy `status`, `data.status`, and `meta.path: "/api/health"` |
| Missing `/api/v1/*` route | JSON error still has legacy `detail`/`error` if available, `data: null`, `meta.ok: false` |
| FastAPI validation error | Legacy `detail` remains available; `meta.error.message` is user-safe |
| JSON array payload | Response becomes `{ "data": [...], "meta": ... }` because there are no legacy dict keys to preserve |
| Audio/file response | Original content type/body unchanged; no envelope header |
| Already-enveloped payload | Returned as-is, no nested `data.data` |

### 5. Good/Base/Bad Cases

- Good: add the middleware once in the app factory instead of editing every route.
- Base: dictionary payloads are dual-shaped during migration so existing clients can still read old keys.
- Bad: changing `response_model` schemas to include `data/meta` on every route; this duplicates transport concerns and breaks route models.
- Bad: wrapping audio/file/static responses into JSON.
- Bad: using the envelope to introduce persisted request metadata without a separate schema task.

### 6. Tests Required

Run focused backend checks after changing the envelope:

```powershell
py -3 -m pytest -q tests/test_api_response_envelope.py tests/test_api_error_envelope.py --tb=short
py -3 -m compileall -q backend/src
```

Required assertions:

- Native `/api/v1` success and error responses expose `data/meta`.
- Core legacy `/api` success responses expose `data/meta`.
- Binary responses remain binary.
- JSON arrays are wrapped without pretending to preserve legacy dict keys.

If response-shape behavior changes beyond transitional dual-shape, run broader API tests because many callers assert top-level fields.

### 7. Wrong vs Correct

#### Wrong

```python
@router.get("/health")
def health():
    return {"data": {"status": "ok"}, "meta": {"ok": True}}
```

This makes each route own transport concerns and drifts from the global envelope policy.

#### Correct

```python
app.include_router(api_router)
add_api_response_envelope_middleware(app, path_prefixes=("/api/v1",))
```

Route handlers keep returning domain payloads; the app shell applies the transport envelope centrally.
