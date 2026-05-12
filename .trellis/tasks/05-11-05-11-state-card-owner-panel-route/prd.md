# Connect StateCard Review Panel to Owner Management Route

## Goal
Expose the existing owner-side Canon Ledger / StateCard management panel from the dedicated `/tavern/:id/manage` owner route so tavern owners can review pending candidate changes without opening the visitor chat surface.

## Requirements
- Reuse existing StateCard service helpers and `OwnerStateCardPanel`; do not add direct fetch calls.
- Keep the panel owner-only by mounting it inside `TavernOwnerManagement`, which is only rendered after `/tavern/:id/manage` verifies the current user is the tavern owner.
- UI copy must clarify pending cards are candidate changes and confirmation is required before structured canon is updated.
- Preserve visitor/chat route behavior and do not change backend/API/schema.

## Acceptance Criteria
- [ ] `frontend/app/features/tavern-owner-management/index.tsx` imports and exposes `OwnerStateCardPanel` behind an owner management card/action.
- [ ] `frontend/scripts/state-cards-test.mjs` covers the owner-management route wiring.
- [ ] `node .\frontend\scripts\state-cards-test.mjs` passes.
- [ ] `npm --prefix .\frontend test` and `npm --prefix .\frontend run build` pass, or failures are documented.

## Non-goals
- No new StateCard API fields or backend behavior.
- No redesign of the modal panel.
- No public visitor wall or cross-visitor visibility expansion.
