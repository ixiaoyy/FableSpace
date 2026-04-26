# Player NPC Roleplay MVP

## Goal

Allow a tavern owner to opt into player-as-NPC roleplay for a tavern, let visitors request to claim one existing NPC role, and let the tavern owner approve or reject those requests.

This task updates the previous product boundary: player-as-NPC is now allowed, but only as tavern-scoped, owner-controlled roleplay attached to existing NPC cards. It does not open a general social network.

## Requirements

- Add tavern-level roleplay mode:
  - `ai_only`: existing behavior, all NPCs are AI-driven.
  - `hybrid`: visitors may request to perform as an NPC, owner approval is required.
- Persist roleplay claim records on the tavern:
  - claim id, character id, player id/name, status, timestamps, and optional owner note.
  - statuses: `pending`, `approved`, `rejected`, `revoked`.
- Add native `/api/v1` endpoints for reading roleplay state, owner mode updates, visitor claim requests, and owner claim decisions.
- Keep tavern visibility and owner permissions consistent with existing v1 tavern rules.
- Surface roleplay status in the tavern route and NPC stage.
- Update product boundary/schema/architecture docs so they no longer contradict the implemented capability.
- Add focused backend tests for persistence, permissions, approval flow, and invalid cases.

## Non-Goals

- No realtime chat/WebSocket implementation.
- No cross-tavern direct messages, friend graph, visitor feed, or global online presence.
- No platform-generated NPC content.
- No moderation automation beyond owner approval/revoke state.

## Acceptance Criteria

- [x] Existing taverns default to `roleplay_mode = "ai_only"` and `character_claims = []`.
- [x] Owners can set roleplay mode to `hybrid`; non-owners cannot.
- [x] Visitors cannot create claims while mode is `ai_only`.
- [x] Visitors can create a pending claim for an existing character while mode is `hybrid`.
- [x] Owners can approve, reject, and revoke claims.
- [x] A character cannot have more than one approved claim at the same time.
- [x] Tavern API payloads expose roleplay mode and claim state without exposing secrets.
- [x] Tavern UI lets users see mode/claims and submit/resolve MVP claims through service methods.
- [x] `docs/WHAT_NOT_TO_BUILD.md`, `docs/WORLD_SCHEMA.md`, and architecture/product docs describe the new boundary.
- [x] Backend and frontend validation commands pass.

## Implementation Notes

- Added tavern fields `roleplay_mode` and `character_claims` with JSON and optional MySQL persistence support.
- Added native roleplay endpoints under `/api/v1/taverns/{tavern_id}/roleplay`.
- Added roleplay panel and NPC card claim badges to the React Router tavern route.
- Kept MVP scoped to owner-approved tavern/NPC claims; no realtime messaging, friend graph, or global online status was added.

## Validation Results

- `py -3 -m compileall -q backend/src`: passed.
- `py -3 -m pytest -q backend/tests/test_v1_roleplay.py --tb=short`: passed, 4 tests.
- `npm --prefix .\frontend run typecheck`: passed.
- `npm --prefix .\frontend run build`: passed.
- `npm --prefix .\frontend test`: passed.
- `py -3 -m pytest -q backend/tests --tb=short`: passed, 132 tests.
- `py -3 -m pytest -q --tb=short`: passed, 357 tests, 6 existing datetime deprecation warnings.

## Data Flow

```text
UI form
  -> frontend/app/lib/taverns.ts
  -> /api/v1/taverns/{id}/roleplay...
  -> TavernApplicationService Roleplay mixin
  -> Tavern.character_claims / Tavern.roleplay_mode
  -> JSON TavernStore
  -> Tavern.to_dict()
  -> route/component display
```

## API Contract

- `GET /api/v1/taverns/{tavern_id}/roleplay`
  - Visible to anyone who can view the tavern.
  - Returns tavern id, roleplay mode, claims, and character summaries.
- `PUT /api/v1/taverns/{tavern_id}/roleplay`
  - Owner-only.
  - Body: `{ "roleplay_mode": "ai_only" | "hybrid" }`.
- `POST /api/v1/taverns/{tavern_id}/roleplay/claims`
  - Visitor/requester action.
  - Body: `{ "character_id": string, "player_id"?: string, "player_name"?: string }`.
  - `player_id` defaults to `X-User-Id`.
- `PUT /api/v1/taverns/{tavern_id}/roleplay/claims/{claim_id}`
  - Owner-only.
  - Body: `{ "status": "approved" | "rejected" | "revoked", "note"?: string }`.

## Validation Plan

- `py -3 -m compileall -q backend/src`
- `py -3 -m pytest -q backend/tests/test_v1_roleplay.py --tb=short`
- `npm --prefix .\frontend run typecheck`
- `npm --prefix .\frontend run build`
- `npm --prefix .\frontend test`
