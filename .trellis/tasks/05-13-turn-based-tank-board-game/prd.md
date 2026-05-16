# Future Agent/Game Task Closure

## Result

Closed this future/planning item as a bounded product-governance decision rather than a literal implementation.

## Decision

The literal tank/arena/game-library/replay direction is not implemented in this pass because it can drift into combat, arenas/rankings, arbitrary strategy-code execution, matchmaking, level/equipment, or game-center behavior. Those directions conflict with `AGENTS.md` and `docs/WHAT_NOT_TO_BUILD.md`.

## Safe Successor

The acceptable successor is tavern-local, owner-confirmed interaction only:

- NPC Duel / simple tavern-local mini-game patterns may exist as local conversation affordances.
- No platform ranking, wagering, settlement, recharge, matchmaking, visitor social graph, or combat progression.
- No untrusted user-submitted code execution in the backend.
- Outputs stay tavern-local and visitor-session scoped unless a future approved PRD changes that.

## Trace

- `docs/changes/2026-05-16-planning-future-task-closure.md`
