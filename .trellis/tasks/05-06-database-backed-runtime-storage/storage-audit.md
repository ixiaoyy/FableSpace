# Storage audit: database-backed runtime storage

Date: 2026-05-06
Task: `.trellis/tasks/05-06-database-backed-runtime-storage`

## Migrated / made database-backed

| Area | Previous risk | Current implementation |
|---|---|---|
| Native `/api/v1` startup | Defaulted to JSON `TavernStore` unless MySQL URL was set | `infrastructure/storage.py` resolves `FABLEMAP_DATABASE_URL` / `FABLEMAP_MYSQL_URL` / default `<output_root>/fablemap.sqlite3`; `main.py` uses the shared factory |
| Legacy `py -m fablemap_api api` web app | Always constructed JSON Tavern/owner/note stores | `core/web/app.py` now uses the same DB TavernStore, owner config store, visitor note store and writeback store |
| Tavern/Character/WorldInfo/VisitorState/Chat/Memory/Gameplay/LLM/TavernMessage | Existing SQL store was optional and not default | `MySQLTavernStore` is now default DB store; character/world-info IDs are tavern-scoped; gameplay event JSON serialization fixed |
| State cards / Canon Ledger | JSON private bucket only on `TavernStore` | Added `state_cards` table and `MySQLTavernStore` list/get/save/delete methods |
| Default public welfare taverns | JSON `TavernStore` seeded them; DB default showed empty data | DB startup now seeds built-in public welfare taverns when `FABLEMAP_SEED_DEFAULT_TAVERNS` is enabled |
| Owner default LLM config | JSON `owner_configs.json` | Added `owner_configs` table + `SQLAlchemyOwnerConfigStore` via shared factory |
| Visitor notes / revisit feedback | JSON `visitor_notes.json` | Added `visitor_notes` table + `SQLAlchemyVisitorNoteStore` via shared factory |
| Notifications | In-memory process store | Added `notifications` table + `SQLAlchemyNotificationStore`; global route store is configured on app startup |
| Neighborhood rumors | In-memory `RumorStore` | Added `neighborhood_rumors` table + `SQLAlchemyRumorStore`; service upgrades to DB store when available |
| Home/member/visit APIs | JSON files under `.fablemap-api/homes` | Added `homes` / `home_visits` tables + `SQLAlchemyHomeStore`; global route store is configured on startup |
| Legacy writeback state | JSON `writeback-state.json` | Added `writeback_states` table + `SQLAlchemyWritebackStore`; legacy web service receives DB store |

## Intentionally retained as file/cache/artifact

| Area | Reason |
|---|---|
| Overpass/API cache (`core/cache.py`) | Cache is not authoritative product state and can be regenerated |
| Export/import packages, backup files, episode markdown/json export | User/requested artifacts; moving to DB would break download/export semantics |
| Frontend/static images and generated assets | Project assets must stay as files under frontend/artifacts paths per image asset rules |
| Test fixtures and sample JSON | Test input data, not runtime storage |
| Explicit JSON fallback stores | Kept only for `FABLEMAP_STORAGE_BACKEND=json` and backward-compat tests |
| `core/auth.py`, legacy `core/owner_config.py` | No active route imports found in the current API; documented as dead/legacy surface. If product auth is enabled later, it needs a separate DB-backed identity design task. |

## Verification evidence

- `py -3 -m compileall -q backend/src` ✅
- `py -3 -m pytest -q backend/tests --tb=short` ✅ `248 passed, 169 warnings`

Warnings are pre-existing `datetime.utcnow()` deprecation warnings in multiple test/support paths; no test failures remain.
