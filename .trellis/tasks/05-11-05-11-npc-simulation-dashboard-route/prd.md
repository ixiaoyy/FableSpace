# Connect NPC Simulation Status to Owner Management Route

## Goal
Close the route-wiring task by ensuring the existing NPC simulation status overview is reachable from `/tavern/:id/manage` for verified tavern owners.

## Requirements
- Reuse existing `NpcSimulationStatusPanel` / `NpcSimulationOverview`; do not add backend or schema changes.
- Keep it owner-only inside `TavernOwnerManagement`, not on visitor chat routes.
- Add or update a lightweight regression script so the route wiring cannot silently regress.
- Preserve mobile-first separation: owner management route has management panels only and no visitor chat workbench.

## Acceptance Criteria
- [ ] Owner management feature imports `NpcSimulationStatusPanel` and renders `NpcSimulationOverview` in `TavernOwnerManagement`.
- [ ] A frontend script test asserts the management route and panel wiring.
- [ ] `node .\frontend\scripts\owner-management-panels-test.mjs` passes.
- [ ] `npm --prefix .\frontend test` and `npm --prefix .\frontend run build` pass.
