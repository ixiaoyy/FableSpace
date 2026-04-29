# Implementation Note: Quest System MVP

Date: 2026-04-29

## Decision

The original PRD proposed a broad fullstack Quest schema with rewards/progress. That overlaps with `docs/WHAT_NOT_TO_BUILD.md` warnings against traditional RPG quests, rankings, levels, equipment, and unnecessary new platform systems. This pass intentionally ships a safe MVP: a frontend guide quest board that reuses existing tavern data and does not add backend schema, billing, public social, rankings, or persistent reward systems.

## Implemented

- Added `frontend/app/lib/quest-guide.js`:
  - platform guide quest definitions;
  - progress derived from existing tavern list data;
  - safe metrics for open taverns, NPC count, quest-play/gameplay taverns, and owner taverns;
  - no persistent Quest/Reward schema.
- Added `/quests` route in `frontend/app/routes/quests.tsx`:
  - polished guide quest board;
  - progress bars and status labels;
  - discover/create CTAs;
  - clear boundary copy that this is not traditional RPG/level/equipment/ranking scope.
- Added route registration in `frontend/app/routes.ts`.
- Added global navigation entry in `frontend/app/shell/product-shell.tsx`; mobile dock updated to five items.
- Added `frontend/scripts/quest-guide-test.mjs` and wired it into `npm --prefix .\frontend test`.
- Initialized and validated Trellis context files for this task.

## Verification run

- `python ./.trellis/scripts/task.py validate .trellis/tasks/04-28-quest-system` → passed
- `node .\frontend\scripts\quest-guide-test.mjs` → `quest-guide-test: ok`
- `node .\frontend\scripts\mobile-shell-layout-test.mjs` → `mobile-shell-layout-test: ok`
- `npm --prefix .\frontend run typecheck` → passed
- `npm --prefix .\frontend test` → passed, includes `quest-guide-test: ok`
- `npm --prefix .\frontend run build` → passed

## Not run

- Browser manual visual review of `/quests` was not run in this pass.
