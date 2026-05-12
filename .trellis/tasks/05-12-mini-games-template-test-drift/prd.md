# Fix mini-games template regression test drift

## Goal
Restore the frontend regression suite by aligning the mini-game template contract test with the current source of truth, without removing owner-visible mini-game templates or weakening safety checks.

## Requirements
- Keep `frontend/app/product/tavernMiniGames.js` as the single source of truth for available mini-game templates.
- Update the regression test so it reflects the current nine-template catalog and play-mode priority behavior.
- Preserve family-friendly safety boundaries for every template that can be started from tavern chat.
- Do not add new gameplay systems, combat/ranking, or cross-visitor social mechanics.

## Acceptance Criteria
- [ ] `node .\frontend\scripts\mini-games-test.mjs` passes.
- [ ] `npm --prefix .\frontend test` passes or any remaining failures are documented with exact failing command/output.
- [ ] `npm --prefix .\frontend run build` passes after the frontend test fix.
- [ ] Task notes record changed files, validation, and any risks.

## Technical Notes
The current failure is `MINI_GAME_TEMPLATES.length` asserting `6` while the source has nine templates. Before changing expectations, inspect existing template IDs and play-mode priorities, then either harden test coverage for the nine-template contract or adjust source only if a template violates project/product boundaries.
