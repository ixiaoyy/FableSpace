# Research Notes

## Relevant Specs
- `docs/WORLD_SCHEMA.md`: canonical schema; gender is a schema change and must be documented.
- `.trellis/spec/backend/database-guidelines.md`: persistent fields require backward-compatible defaults, docs/tests/frontend sync, and MySQL/JSON round-trip.
- `.trellis/spec/backend/quality-guidelines.md`: schema/API changes require focused pytest and compileall.
- `.trellis/spec/frontend/type-safety.md`: frontend dynamic payloads need runtime normalizers/helpers and service contract tests.
- `.trellis/spec/frontend/quality-guidelines.md`: frontend service/helper changes require npm test/typecheck/build as appropriate.
- `.trellis/spec/guides/cross-layer-thinking-guide.md`: maps API ↔ service ↔ store ↔ frontend field survival.

## Code Patterns Found
- `backend/src/fablemap_api/core/tavern.py`: `TavernCharacter`, `VisitorState`, `_normalize_*` helpers, `_character_from_payload`, `enter_tavern`.
- `backend/src/fablemap_api/application/services/runtime.py`: v1 chat/group-chat paths update `VisitorState` after persisted messages.
- `backend/src/fablemap_api/infrastructure/mysql_store.py` and `models.py`: MySQL conversion methods and table columns for characters/visitors.
- `frontend/app/lib/taverns.ts`: typed v1 client; chat/enter functions and payload types.
- `frontend/app/product/CharacterEditor.jsx`: existing owner-editable NPC draft normalization pattern.
- `frontend/scripts/*-test.mjs`: no-browser script tests for helpers/contracts.

## Data Flow
NPC gender: owner UI/import payload → v1 character request → `TavernService._character_from_payload` → `TavernCharacter.gender` → JSON/MySQL → `to_dict()` → frontend display/editor.

Visitor gender: visitor UI → `enterTavern(..., { visitor_gender })` or chat `visitor_gender` → v1 contracts/routes → `TavernService.enter_tavern` / runtime `_touch_visitor_state` → `VisitorState.gender` → owner visitor summary / chat response visitor_state.

## Files Likely Modified
- Backend: `core/tavern.py`, `contracts/taverns.py`, `contracts/chat.py`, `contracts/characters.py`, `api/v1/taverns.py`, `api/v1/chat.py`, `application/services/management.py`, `application/services/runtime.py`, `infrastructure/models.py`, `infrastructure/mysql_store.py`.
- Frontend: `app/lib/gender.js`, `app/lib/taverns.ts`, `app/features/tavern-chat/index.tsx`, `app/product/CharacterEditor.jsx`, `scripts/gender-fields-test.mjs`, `package.json`.
- Docs/spec: `docs/WORLD_SCHEMA.md`, `.trellis/spec/backend/database-guidelines.md`, `.trellis/spec/frontend/type-safety.md`.
- Tests: `backend/tests/test_v1_gender_fields.py`, `backend/tests/test_mysql_infrastructure.py`.
