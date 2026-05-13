# Legacy `/api/*` migration map (initial)

## Current registration points

- Native `/api/v1/*`: `backend/src/fablemap_api/api/v1/router.py`.
- Legacy/core `/api/*`: `backend/src/fablemap_api/core/web/router.py`, registered by `backend/src/fablemap_api/core/web/app.py` through `create_api_router(service)`.
- Old combined app also registers native `/api/v1/*`, so `/api/v1` is the preferred target for current product flows.

## Frontend callers still referencing legacy `/api/*`

- `frontend/app/product/services/apiClient.js`
  - `/api/health`, `/api/meta`
  - `/api/nearby`
  - `/api/world/event`, `/api/world/disturbance`, `/api/world/disturbance/{id}`
  - `/api/ghost/trace`, `/api/ghost/traces/{playerId}`
  - `/api/chat`, `/api/chat/history`
- Hooks using that client:
  - `frontend/app/product/hooks/useBackendStatus.js`
  - `frontend/app/product/hooks/useNearbySession.js`
  - `frontend/app/product/hooks/useWritebackSession.js`
  - `frontend/app/product/hooks/useWorldSession.js`

## Migration classification

| Legacy area | Candidate action | Risk |
|---|---|---|
| `/api/health`, `/api/meta` | Move callers to `/api/v1/health`, `/api/v1/meta` | Low |
| `/api/chat`, `/api/chat/history` | Prefer tavern-scoped `/api/v1/taverns/{id}/chat` and `/api/v1/taverns/{id}/chat`/sessions/search helpers | Medium: legacy payload uses old `poi_id`/player model |
| `/api/taverns/*` | Prefer existing `/api/v1/taverns/*` helpers | Medium/high: many owner/visitor flows already migrated but some docs/tests still mention old routes |
| `/api/nearby`, `/api/world/*`, `/api/ghost/*` | Decide whether these old separated-shell/map-preview flows are still product-supported; if not, retire frontend hooks first | High: no obvious `/api/v1` parity for every endpoint |
| `/api/tts/*`, `/api/taverns/{id}/tts`, `/api/taverns/{id}/stt` | Prefer `/api/v1/taverns/{id}/tts` and `/api/v1/taverns/{id}/stt`; keep binary response exclusion | Medium |
| `/generated/*`, `/sillytavern/*` | Not API JSON; do not envelope as API data | N/A |

## Current task decision

Do not delete the legacy router in the same patch as the first global envelope middleware. Deletion is high risk because legacy frontend hooks still exist and some legacy endpoints lack v1 parity. This task makes the legacy JSON surface envelope-compatible and documents the remaining migration/deletion work.
