# Clue Hunt / Egg Hunt Rewards MVP

## Result

Implemented a bounded, owner-confirmed clue-hunt MVP.

## Completed Scope

- Route domain/governance: routes require one owner, at least two unique public real-coordinate tavern nodes, and normal owners can only use their own taverns.
- Session + answer gate: visitors start/resume their own session, see only unlocked/current nodes, submit answers to backend-only hash comparison, and cannot advance another visitor's session.
- Reward: completed sessions can claim an idempotent tavern-local commemorative reward. This is not a platform wallet, recharge, settlement, ranking, or tradable economy.
- Owner/visitor UI: owner dashboard can create a simple two-stop route; `/clue-hunts/:routeId` supports visitor start, answer submit, unlock display, tavern entry links, and reward claim.

## Validation

- `py -3 -m compileall -q backend/src`: PASS.
- `py -3 -m pytest backend/tests/test_clue_hunt_api.py -q --tb=short`: PASS.
- `npm --prefix .\frontend run typecheck`: PASS; `npm --prefix .\frontend test`: PASS; `npm --prefix .\frontend run build`: PASS.

## Specs

- `.trellis/spec/backend/clue-hunt-api-contract.md`
- `.trellis/spec/frontend/clue-hunt-ui-boundary.md`
