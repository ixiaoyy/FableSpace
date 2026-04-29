# State Cards for Tavern Continuity — Implementation Note (2026-04-29)

## Summary

Implemented full StateCard / Canon Ledger MVP for long-running tavern continuity.

## What changed

- Backend StateCard model and rule-based chat candidate extraction.
- TavernStore `_state_cards` private bucket CRUD, preserved across tavern metadata updates.
- `/api/v1/taverns/{id}/state-cards` list/create/decision API.
- Chat and group-chat responses now include `state_card_candidates` when a turn mentions tasks, resources, conflicts, or event-log-worthy changes.
- Frontend service helpers and `StateCardReviewPanel` in `TavernChatRoom` show pending changes and let the visitor confirm or reject their own cards.
- Documentation updated: `README.md`, `docs/WORLD_SCHEMA.md`, `docs/ARCHITECTURE.md`, `docs/AI参与开发协议.md`.
- Trellis specs added for backend API and frontend UI boundaries.

## Guardrails

- Chat extraction only creates `pending` cards.
- Confirm/reject/supersede is done through a dedicated API.
- Candidates do not mutate `Tavern`, `TavernCharacter`, `WorldInfoEntry`, access rules, or owner LLM config.
- `_state_cards` is private runtime data: no public Tavern payload, no tavern package export.
- Non-owner visitors can only decide their own visitor-scope cards.

## Verification

- `py -3 -m compileall -q backend/src` — exit 0.
- `py -3 -m pytest -q tests/test_tavern_state_cards.py backend/tests/test_v1_state_cards.py tests/test_tavern_gameplay_api.py tests/test_tavern_memory_atoms.py backend/tests/test_v1_memory_atoms.py --tb=short` — 13 passed.
- `py -3 -m pytest -q --tb=short` — 503 passed, 103 existing deprecation warnings.
- `npm --prefix .\frontend test` — all frontend script tests passed, including `state-cards-test`.
- `npm --prefix .\frontend run build` — React Router/Vite build succeeded.
- `npm --prefix .\frontend run typecheck` — exit 0.

## Notes / risks

- Candidate extraction is intentionally rule-based and conservative. Future work can improve extraction quality, but should keep the same pending-before-confirmation contract.
- Owner-side bulk review UI is not part of this MVP; owner can use the API and visitor-side review exists in chat room.
