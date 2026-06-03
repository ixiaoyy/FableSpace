# P0 one-space playable slice

## Scope

Only polish one system-created visitor space first: `pw_midnight_commission_board` / 午夜小委托板.

## User direction

- Do not try to polish all spaces at once.
- Prioritize visitor retention/playability over shopkeeper tools.
- Prove one space can actually be played.

## Implementation notes

- Backend seed: replaced the generic `gp_pw_commission_clue_case` continue/finish flow with a concrete multi-node no-LLM text commission.
- Frontend API alignment: `getGameplays` accepts the real backend `gameplays` key; `startGameplaySession` sends `gameplay_id`.
- Frontend session handling: use start/advance response `scene` and `session` directly so first scene and choices are not lost.
- Doorway scope: for 午夜小委托板, show only the recommended clue-case gameplay at entry.

## Validation

- `py -3 -m compileall -q backend/src` — PASS.
- `npm --prefix .\frontend run typecheck` — PASS.
- `npm --prefix .\frontend run build` — PASS.
- Service-level backend smoke using `TavernStore + TavernApplicationService` — PASS:
  - `gameplay_count=4`
  - `entry_label=推荐先玩：接线索调查`
  - `node_count=8`
  - path: `start -> position -> timeline -> complete`
  - `completed=true`, `final_state=completed`
- Playwright frontend smoke with real backend-shaped mock responses — PASS:
  - desktop and mobile doorway each showed exactly 1 gameplay entry
  - POST body used `gameplay_id=gp_pw_commission_clue_case`
  - gameplay panel showed concrete start narration and choices
  - `chatCalls=0`

## Evidence paths

- `artifacts/validation/p0-one-space-playable-slice-2026-06-03/service-store-direct/`
- `artifacts/validation/p0-one-space-playable-slice-2026-06-03/playwright-report.json`
- `artifacts/validation/p0-one-space-playable-slice-2026-06-03/doorway-desktop.png`
- `artifacts/validation/p0-one-space-playable-slice-2026-06-03/gameplay-start-desktop.png`
- `artifacts/validation/p0-one-space-playable-slice-2026-06-03/doorway-mobile.png`
- `artifacts/validation/p0-one-space-playable-slice-2026-06-03/gameplay-start-mobile.png`

## Known runtime issue found

- `py -3 -m fablemap_api api` reported ready but `/api/meta` and `/api/v1/...` returned 502 in this environment.
- Direct `uvicorn fablemap_api.main:app` hung at application startup, likely due default database/simulation startup path.
- This was not fixed in this slice; the playable core and frontend contract were validated through service-level and Playwright checks.

## Follow-up: flow length adjustment

User feedback: "流程不要过短".

Change:

- Expanded `gp_pw_commission_clue_case` from a quick 2-3 click completion into a medium 5-step commission flow.
- Removed premature complete choices from start/mid nodes.
- Added `hypothesis` node so the visitor must make a conservative judgment before safety boundary and settlement.

Validation:

- `py -3 -m compileall -q backend/src` — PASS.
- Service-level smoke — PASS:
  - no premature complete choices in `start/position/writing/time/timeline/witness/hypothesis`
  - path `start -> position -> timeline -> hypothesis -> safe-boundary -> complete`
  - `turn_count=5`, `completed=true`
- `npm --prefix .\frontend run build` — PASS.
