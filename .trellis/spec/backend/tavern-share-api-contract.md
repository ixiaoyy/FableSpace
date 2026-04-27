# Tavern Share API Contract

## Scenario: Public-safe tavern share payload

### 1. Scope / Trigger

- Trigger: Any backend or frontend change that reads or writes tavern share/invite payloads.
- Scope: `GET /api/v1/taverns/{tavern_id}/share` and the legacy-compatible `GET /api/taverns/{id}/share` path.
- Source of truth: persisted `Tavern` owner-authored fields only; no platform-generated marketing copy.

### 2. Signatures

- Backend policy: `backend/src/fablemap_api/domain/tavern_share_policy.py`
  - `build_tavern_share_payload(tavern: Any, *, base_url: str = "") -> dict[str, Any]`
- Backend service: `backend/src/fablemap_api/application/services/management.py`
  - `TavernManagementService.get_tavern_share(tavern_id: str, user_id: str = "", base_url: str = "") -> dict[str, Any]`
- API route: `backend/src/fablemap_api/api/v1/taverns.py`
  - `GET /api/v1/taverns/{tavern_id}/share`
- Frontend client: `frontend/app/lib/taverns.ts`
  - `getTavernShare(tavernId: string, userId = "")`

### 3. Contracts

Request:

- Path param: `tavern_id` / `id`; must be URL-encoded by clients with `encodeURIComponent`.
- Header: optional `X-User-Id`; required only when a private tavern is read by its owner.
- Body: none.

Response `200` fields:

```json
{
  "tavern_id": "string",
  "title": "string",
  "description": "string <= 200 chars",
  "short_description": "string <= 80 chars",
  "cover": "string",
  "location": { "lat": 31.2304, "lon": 121.4737, "address": "string <= 120 chars" },
  "status": "open|closed|string",
  "access": "public|password|private|string",
  "tags": ["string"],
  "characters": [{ "id": "string", "name": "string <= 80 chars", "avatar": "string|null" }],
  "character_count": 1,
  "share_url": "https://host/tavern/{encoded_tavern_id}",
  "share_title": "邀请你进入「酒馆名」",
  "share_text": "邀请你进入「酒馆名」：公开短简介"
}
```

Never include:

- `api_key`, LLM runtime config, token stats, key vault values.
- Password plaintext, `password_hash`, password hints.
- Character prompt internals such as `first_mes`, `personality`, `scenario`, `mes_example`, `creatorcomment`.
- Chat history, visitor state, memory atoms, gameplay sessions, owner-only analytics.

### 4. Validation & Error Matrix

| Case | Expected |
|------|----------|
| Missing tavern | `404 {"error": "酒馆不存在"}` |
| `access=public` | Anonymous and visitor users receive `200` |
| `access=password` | Share payload is visible without password, but password/hash is never present |
| `access=private`, non-owner or anonymous | `403 {"error": "此酒馆是私人的"}` |
| `access=private`, owner `X-User-Id` | `200` public-safe payload |
| Missing description | `description=""`, `short_description=""`, share text uses default public summary |

### 5. Good/Base/Bad Cases

Base:

```python
payload = service.get_tavern_share(tavern_id, user_id="visitor-demo", base_url="https://example.test")
assert payload["share_url"] == f"https://example.test/tavern/{tavern_id}"
assert "api_key" not in json.dumps(payload, ensure_ascii=False)
```

Good:

```typescript
const payload = await getTavernShare(tavernId, DEFAULT_VISITOR_ID)
// UI renders payload.share_title/share_url and falls back locally only if the API fails.
```

Bad:

```python
# Do not serialize Tavern.to_dict() directly for sharing.
return tavern.to_dict()
```

### 6. Tests Required

- Backend focused test: `py -3 -m pytest -q backend/tests/test_v1_tavern_share.py --tb=short`
  - Assert public/password visibility.
  - Assert private owner vs visitor behavior.
  - Assert secret and prompt fields are absent from serialized JSON.
  - Assert `share_url` uses `request.base_url` and URL-encoded tavern id.
- Frontend helper test: `node ./frontend/scripts/tavern-share-test.mjs`
  - Assert backend payload is converted into copyable display text.
  - Assert local fallback still handles missing description and coordinates.

### 7. Wrong vs Correct

#### Wrong

- Frontend builds the only share contract from the current `Tavern` detail object and never calls `/share`.
- Backend returns full `Tavern` or character card objects from `/share`.
- Private taverns are indistinguishable from missing taverns for owners.

#### Correct

- Backend builds a dedicated share payload in `tavern_share_policy.py`.
- Service applies the same visibility rules as tavern detail, with explicit owner access for private taverns.
- Frontend prefers `getTavernShare(...)` and keeps local copy text only as a degraded fallback.
