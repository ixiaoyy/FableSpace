# Implementation Note

## Summary
- Placed NPC「和光」inside existing official public-welfare tavern `pw_community_repair` / 「社区修补铺」as a second TavernCharacter.
- Kept the NPC inside the tavern model instead of adding a station-wide assistant or unanchored space.
- Added focused regression coverage for seed presence, field completeness, public/rules context, communication-theme keywords, and existing-store seed repair.

## Files Changed
- `backend/src/fablemap_api/core/default_taverns.py`
- `backend/src/fablemap_api/core/tavern.py`
- `tests/test_default_public_welfare_taverns.py`
- `.trellis/tasks/04-24-official-welfare-heguang-npc/prd.md`
- `.trellis/tasks/04-24-official-welfare-heguang-npc/research.md`

## Verification
- RED: `py -3 -m pytest -q tests/test_default_public_welfare_taverns.py::test_community_repair_includes_heguang_communication_npc --tb=short` failed because「和光」was not seeded yet.
- RED: `py -3 -m pytest -q tests/test_default_public_welfare_taverns.py::test_default_public_welfare_seed_adds_missing_platform_characters_to_existing_store --tb=short` failed because existing seeded stores did not receive missing built-in characters.
- GREEN: same focused test passed after adding seed content.
- Final: `py -3 -m compileall -q backend/src`
- Final: `py -3 -m pytest -q tests/test_default_public_welfare_taverns.py tests/test_default_public_welfare_gameplays.py --tb=short` → `7 passed`.

## Scope Notes
- No schema fields changed.
- No API/routes changed.
- No frontend UI changed.
- No new external dependencies.

