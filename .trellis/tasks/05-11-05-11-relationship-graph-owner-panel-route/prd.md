# Connect Relationship Graph Panel to Owner Management Route

## Goal
Close the relationship graph route-wiring task by ensuring the existing `RelationshipGraphPanel` is reachable from `/tavern/:id/manage` for verified tavern owners.

## Requirements
- Reuse existing `frontend/app/features/relationship-graph` and `frontend/app/lib/relationship-graph.js` helpers.
- Keep graph management owner-only in the dedicated management route; do not expose it on visitor chat pages.
- Preserve owner governance semantics: pending/confirmed edge controls remain owner-managed and cross-owner perspectives stay labelled as such.
- Add/maintain regression coverage for both helper contracts and owner route wiring.

## Acceptance Criteria
- [x] `TavernOwnerManagement` imports and renders `RelationshipGraphPanel`.
- [x] `frontend/scripts/relationship-graph-test.mjs` protects helper normalization behavior.
- [x] `frontend/scripts/owner-management-panels-test.mjs` protects the route wiring.
- [x] Focused scripts pass.
- [x] Full frontend test/build pass in this session.
