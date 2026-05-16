# 2026-05-16 Planning/Future Task Closure

## Summary

Closed the remaining Trellis planning/future queue by implementing safe MVPs and recording explicit boundaries for ideas that conflict with FableMap's product constraints.

## Implemented

- Default DB tavern list performance: removed per-row token usage lookups from SQLAlchemy list hydration and added a statement-count regression.
- NPC vividness: strengthened default voice instructions for sensory detail, emotional resonance, and anti-robotic phrasing.
- Clue Hunt MVP: added owner-confirmed route governance, visitor session/answer gate, idempotent tavern-local reward claim, frontend owner builder, and visitor route.
- Visitor-first discovery reduction: default discover view now uses a reduced visitor mode with top 3 taverns and one entry CTA, without world/feed/online side panels.
- Tavern doorway ritual: non-owner visitors see a real-coordinate doorway beat and NPC greeting before chat controls; CTA fills/focuses the composer without auto-sending.
- Discover/home layout overlap fix: expanded discover view stacks user/world-status cards without overlap; home current-coordinate title stays one-line/truncated with Playwright evidence.
- Validation cleanup: legacy `core.api.create_app()` now uses JSON storage for its compatibility writeback state so legacy tests can read `persistence.state_file` while native/default DB paths remain covered separately.

## Closed as bounded/non-literal

- Agent tank / turn-based tank / strategy arena / replay review / web game library are not implemented literally because combat, arenas/rankings, arbitrary strategy code execution, and game-center drift conflict with `docs/WHAT_NOT_TO_BUILD.md` and `AGENTS.md`.
- The safe successor remains tavern-local, owner-confirmed mini-game/NPC interaction patterns only, with no platform ranking, wagering, levels/equipment, matchmaking, or untrusted backend code execution.

## Validation

See the Trellis task records for current command output. Focused backend and frontend validations were added for the new contracts.
