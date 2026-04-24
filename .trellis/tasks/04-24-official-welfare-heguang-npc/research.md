# Research

## Relevant Specs
- `.trellis/spec/backend/index.md`: backend work must preserve real-coordinate taverns, owner-authored content, TavernCharacter/WORLD_SCHEMA alignment, and rules/public-welfare constraints.
- `.trellis/spec/backend/directory-structure.md`: default public-welfare seed data belongs in `backend/src/fablemap_api/core/default_taverns.py`; behavior tests live under `tests/test_tavern_*.py` / focused tests.
- `.trellis/spec/backend/database-guidelines.md`: default seed/update logic must stay backward-compatible and avoid schema changes.
- `.trellis/spec/backend/quality-guidelines.md`: behavior/content changes should have focused pytest and compileall verification.
- `.trellis/spec/guides/code-reuse-thinking-guide.md`: search existing seed constants/helpers and reuse `_character` / `_tavern` patterns rather than new helpers.

## Code Patterns Found
- `backend/src/fablemap_api/core/default_taverns.py`: default public-welfare taverns are built with `_tavern`, `_character`, `_world_info`, `_gameplay`, and deep-copied on return.
- `tests/test_default_public_welfare_taverns.py`: verifies default public-welfare taverns are seeded, discoverable, rules-backed, and chat-capable.
- `tests/test_default_public_welfare_gameplays.py`: assumes every id in `DEFAULT_PUBLIC_WELFARE_TAVERN_IDS` has at least one published gameplay, so avoid adding a new tavern unless adding gameplay too.

## Placement Decision
Place「和光」as a second NPC in existing `pw_community_repair` / 「社区修补铺」.
Reason: this keeps the NPC inside an existing public-welfare tavern, preserves the current 4-tavern structure, avoids adding a new coordinate/tavern/gameplay surface, and conceptually fits “关系修补 / 把对话落到可执行小事”.

## Files to Modify
- `tests/test_default_public_welfare_taverns.py`: add focused regression asserting「和光」is seeded in `pw_community_repair` with complete TavernCharacter-compatible fields and rules-backed public-welfare context; add regression that existing platform-owned default stores receive missing built-in characters on startup.
- `backend/src/fablemap_api/core/default_taverns.py`: add「和光」via existing `_character` helper to `pw_community_repair.characters`.
- `backend/src/fablemap_api/core/tavern.py`: extend public-welfare seeding to append missing built-in child records for existing platform-owned default taverns without overwriting existing edits.

