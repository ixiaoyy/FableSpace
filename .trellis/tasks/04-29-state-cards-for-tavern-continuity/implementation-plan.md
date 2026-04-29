# State Cards for Tavern Continuity — Research & Implementation Plan

## Confirmed scope

User confirmed full implementation, not docs-only. This task will implement the MVP across backend API, chat runtime, frontend review UI, tests, and documentation.

## Data-flow map

```text
chat turn / explicit candidate payload
→ backend rule-based candidate extraction
→ TavernStore private `_state_cards` bucket
→ GET `/api/v1/taverns/{id}/state-cards` returns visible cards
→ frontend chat room displays pending changes
→ visitor/owner decides card
→ PUT `/state-cards/{card_id}/decision` changes pending → confirmed/rejected/superseded
```

No candidate directly mutates `Tavern`, `TavernCharacter`, `WorldInfoEntry`, owner LLM config, or other owner-authored canon.

## Relevant specs/docs read

- `README.md`, `docs/INDEX.md`, `docs/PRODUCT_BRIEF.md`, `docs/FABLEMAP_TAVERN_PLATFORM.md`
- `docs/ARCHITECTURE.md`, `docs/WORLD_SCHEMA.md`, `docs/WHAT_NOT_TO_BUILD.md`, `docs/AI参与开发协议.md`
- `.trellis/spec/backend/*` relevant backend guidelines: directory structure, database, error handling, quality, logging
- `.trellis/spec/frontend/*` relevant frontend guidelines: directory structure, component, hook, state, quality, type safety
- `.trellis/spec/guides/cross-layer-thinking-guide.md`, `.trellis/spec/guides/code-reuse-thinking-guide.md`

## Code patterns found

- Private persistence buckets: `TavernStore` uses `_visitors`, `_memory_atoms`, `_gameplay_sessions` and preserves unknown `_` buckets during `update_tavern`.
- Runtime writeback: `RuntimeApplicationMixin.send_chat` creates chat messages, visitor state, memory atoms, then returns structured UI hints.
- v1 routing: `/api/v1/taverns/*` route modules delegate to `TavernApplicationService` mixins.
- Frontend service boundary: route/product UI calls `frontend/app/lib/taverns.ts` or compatibility `frontend/app/product/services/tavernService.js`, not raw `fetch` in components.
- Frontend chat UI: `TavernChatRoom.jsx` already displays created structured memories and gameplay panels near the chat flow.

## Files to modify/create

### Backend

- Create `backend/src/fablemap_api/core/state_cards.py`: storage-neutral model, normalization, candidate extraction, filters.
- Modify `backend/src/fablemap_api/core/tavern.py`: add `_state_cards` store CRUD methods.
- Create `backend/src/fablemap_api/application/services/state_cards.py`: list/create/decide application use cases with owner/visitor boundaries.
- Modify `backend/src/fablemap_api/application/taverns.py`: include the state-card mixin.
- Create `backend/src/fablemap_api/api/v1/state_cards.py` and include it in `api/v1/router.py`.
- Modify `backend/src/fablemap_api/application/services/runtime.py`: generate pending candidates after chat/group chat and include `state_card_candidates` in response.
- Optionally expose legacy `/api/taverns/*/state-cards` from `core/web/router.py`/`service.py` only if needed after v1 tests.

### Frontend

- Modify `frontend/app/lib/taverns.ts`: add StateCard types, list/create/decision helpers, chat response field.
- Modify `frontend/app/product/services/tavernService.js`: compatibility helpers for service contract tests.
- Create `frontend/app/product/StateCardReviewPanel.jsx`: pending changes UI.
- Modify `frontend/app/product/TavernChatRoom.jsx`: load pending cards, merge chat candidates, confirm/reject cards.
- Append scoped CSS in `frontend/app/product/styles.css`.
- Add `frontend/scripts/state-cards-test.mjs` and include it in `frontend/package.json` test script.

### Tests/docs/spec

- Add backend tests for model extraction and v1 API permissions/round-trip.
- Add frontend service/source contract test.
- Update `docs/WORLD_SCHEMA.md`, `docs/ARCHITECTURE.md`, `docs/AI参与开发协议.md`.
- Add Trellis backend/frontend state-card contract specs and update spec indexes.

## Validation plan

- RED first: run targeted backend/frontend tests before implementation and confirm they fail for missing feature.
- GREEN: run targeted backend tests and frontend state-cards script.
- Final: `py -3 -m compileall -q backend/src`; targeted pytest; `npm --prefix .\frontend test`; `npm --prefix .\frontend run build`.
