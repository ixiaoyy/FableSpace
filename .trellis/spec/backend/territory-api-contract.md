# Territory API Contract

Concise contract for territory/claim APIs.

## Scope

Use when touching territory routes, stores, map claim panels, or territory visualization.

## Product boundary

- Territory must remain anchored to real coordinates/spaces.
- It is not a traditional map app, ranking game, land speculation, or combat/level system.
- Owner/visitor permissions must be explicit.

## Backend placement

- Routes: `backend/src/fablespace_api/api/v1/territories.py`
- Application/service/store: existing territory modules.
- Frontend client/UI: `frontend/app/lib/territoryService.js`, territory panels, map adapter surfaces.

## Contract

- Validate coordinates and space identity.
- Reject collisions/invalid ownership according to existing policy.
- Return public-safe map summaries for visitors.
- Return owner-manageable claims only to authorized owners.
- Do not leak private space config, visitor private memory, or owner secrets.

## Verification

- Backend behavior: focused territory API/store tests if behavior changes.
- Frontend usage: build if UI imports/route changes.
- Avoid broad browser tests unless visual map claim behavior is under review.
