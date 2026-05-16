# npc duel v0 rock paper scissors

> Compact pending-task summary. Verbose planning detail was removed to reduce AI context noise; re-expand from git history only if this task is resumed.

- Status: completed
- Task dir: `05-13-npc-duel-rps`
- Scope: frontend

## Preserved hints
- NPC Duel v0: Rock Paper Scissors
- Goal
- Implement the smallest tavern-local NPC duel loop: a visitor can start a simple rock-paper-scissors style match with the current tavern NPC, get deterministic win/loss/draw results from local rules, and see NPC-flavored 
- Requirements
- * Add a simple NPC duel game to the existing frontend mini-game surface.
- * Keep rules deterministic and local: win/loss/draw must be decided by pure functions, not LLM narrative.
- * NPC action may use a simple deterministic/random policy seeded by character/game context; no untrusted user code execution.
- * Keep it tavern-local and session-local; no backend schema, ranking, matchmaking, level/equipment, rewards, or cross-space social features.

## Resume policy
- Before implementing, re-confirm scope with current product docs/code.
- Do not treat this old planning note as a current approved contract.

## Completion Note (2026-05-16)

Closed after current Trellis sweep. Prior Playwright evidence remains in task metadata; current shared frontend test/typecheck/build validation passed with no additional NPC duel scope changes.
