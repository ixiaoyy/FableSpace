# Acceptance Checklist: NPC Expression Art Quality Rebuild

Date: 2026-04-29
Status: ready_for_human_visual_review

## Original NPC expression acceptance

- [x] Rejected public-welfare NPC asset manifest exists: `rejected-public-welfare-npc-assets.json`.
- [x] Manifest records old bad hashes, paths, reasons, and regeneration status.
- [x] Forced repair characters have five project-local PNGs each: `neutral`, `joy`, `anger`, `embarrassment`, `curiosity`.
- [x] Forced repair character sprites are `256×256` PNGs under `frontend/public/assets/npcs/public-welfare/<char_id>/`.
- [x] Regression test rejects regenerated assets that still match old bad hashes.
- [x] Contact sheet exists for human visual review: `artifacts/04-29-npc-expression-art-quality-rebuild/forced-npc-expressions-contact-sheet.png`.

## Visual acceptance rework

- [x] 10 place atmosphere PNGs exist under `frontend/public/place-atmosphere/`.
- [x] Each place atmosphere PNG is `512×288` and project-local.
- [x] `TavernInterior.jsx` uses project-local atmosphere image URLs via `resolveTavernAtmosphereImage(...)`.
- [x] CSS gradient remains as fallback through `--tavern-atmosphere-fallback`, not as primary visual.
- [x] 5 faction emblem SVGs exist under `frontend/public/faction-emblems/`.
- [x] Visual asset provenance records include direct project-local source/target/hash entries for atmosphere PNGs and emblem SVGs.
- [x] Contact sheet exists for human visual review: `artifacts/04-29-npc-expression-art-quality-rebuild/place-atmosphere-contact-sheet.png`.

## Trellis / quality workflow

- [x] `implement.jsonl`, `check.jsonl`, and `debug.jsonl` validate successfully with `task.py validate`.
- [x] Implementation note records work, verification, and `.codex/generated_images` audit.
- [x] Cross-layer/reuse check completed: atmosphere mapping centralized in `frontend/app/product/services/atmosphereAssets.js`; tests import the same resolver instead of duplicating logic.
- [x] Typecheck blocker fixed at the shared Button contract (`size="icon"` variant) rather than patching one route.

## Verification commands

- [x] `python ./.trellis/scripts/task.py validate .trellis/tasks/04-29-04-29-npc-expression-art-quality-rebuild`
- [x] `npm --prefix .\frontend run typecheck`
- [x] `npm --prefix .\frontend run build`
- [x] `npm --prefix .\frontend test`
- [x] `py -3 -m pytest -q tests/test_default_public_welfare_taverns.py --tb=short`
- [x] `py -3 -m compileall -q backend/src`

## Remaining review item

- [ ] Human visual review of the two contact sheets before final commit/record-session.
- [ ] Decide whether unrelated `.claude/settings.local.json` local changes should be kept or reverted outside this task.
