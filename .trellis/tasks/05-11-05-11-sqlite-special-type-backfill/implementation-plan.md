# Implementation Plan

## Relevant Specs
- `docs/WORLD_SCHEMA.md`: defines `Tavern.special_type?: '' | 'cultivation' | 'divination'` with empty default.
- `.trellis/spec/backend/database-guidelines.md`: additive persistence fields must be backward-compatible; no formal migration runner, use idempotent compatibility patches where possible.
- `.trellis/spec/backend/special-tavern-types.md`: `special_type` is a thin gameplay layer, normalized to empty string for standard taverns.
- `.trellis/spec/backend/quality-guidelines.md`: run compileall and focused pytest for backend changes.

## Code Patterns Found
- `backend/src/fablemap_api/infrastructure/storage.py`: default runtime storage creates `<output_root>/fablemap.sqlite3` and calls `create_mysql_tables` before seeding.
- `backend/src/fablemap_api/infrastructure/mysql_store.py`: `_ensure_runtime_compat_columns` already performs best-effort additive column patches after `Base.metadata.create_all`.
- `backend/tests/test_mysql_infrastructure.py`: uses SQLite-backed `Database` instances for store and schema behavior tests.

## Files to Modify
- `backend/src/fablemap_api/infrastructure/mysql_store.py`: add idempotent compatibility patch for missing `taverns.special_type`.
- `backend/tests/test_mysql_infrastructure.py`: add regression test for a legacy SQLite `taverns` table missing `special_type`.

## Validation Plan
- `py -3 -m compileall -q backend/src`
- `py -3 -m pytest -q backend/tests/test_mysql_infrastructure.py --tb=short`

## Implementation Notes

- Root cause reproduced with a legacy SQLite `taverns` table missing `special_type`: `session.query(TavernModel)` failed with `sqlite3.OperationalError: no such column: taverns.special_type` because `Base.metadata.create_all()` does not alter existing tables.
- Implemented an idempotent additive compatibility patch in `_ensure_runtime_compat_columns` to add `taverns.special_type VARCHAR(32) NOT NULL DEFAULT ''` when absent.
- Added regression coverage that creates a legacy SQLite table without `special_type`, runs `create_mysql_tables` twice, verifies the column/default, and confirms `MySQLTavernStore.get_tavern(...)` can load the row.

## Validation Results

- `py -3 -m pytest -q backend/tests/test_mysql_infrastructure.py::test_create_mysql_tables_backfills_legacy_sqlite_special_type --tb=short` → 1 passed.
- `py -3 -m compileall -q backend/src` → passed.
- `py -3 -m pytest -q backend/tests/test_mysql_infrastructure.py --tb=short` → 20 passed, 6 existing deprecation warnings.

## Bug Analysis: SQLite old taverns table missing special_type

### 1. Root Cause Category
- **Category**: C/D/E — change propagation failure + test coverage gap + implicit SQLAlchemy assumption.
- **Specific Cause**: `TavernModel.special_type` was added to the ORM, but existing local SQLite tables are not altered by `Base.metadata.create_all(...)`. Runtime seeding/querying then selected `taverns.special_type` from an old table where it did not exist.

### 2. Why prior startup kept failing
- Restarting the backend reran `create_all`, but `create_all` only creates missing tables; it never added the missing column, so every restart hit the same `OperationalError`.

### 3. Prevention Mechanisms
| Priority | Mechanism | Specific Action | Status |
|----------|-----------|-----------------|--------|
| P0 | Runtime compatibility patch | Add `taverns.special_type` to `_ensure_runtime_compat_columns` with `VARCHAR(32) NOT NULL DEFAULT ''` | DONE |
| P0 | Regression test | Legacy SQLite table missing `special_type`, idempotent `create_mysql_tables`, ORM read | DONE |
| P1 | Code-spec memory | Document additive SQLAlchemy column rule in backend database guidelines | DONE |

### 4. Systematic Expansion
- **Similar Issues**: Any future ORM column added to an existing SQLAlchemy runtime table can fail the same way on old local SQLite databases.
- **Design Improvement**: Until a formal migration runner exists, additive runtime columns must be listed in `_ensure_runtime_compat_columns` with a concrete default.
- **Process Improvement**: Schema field additions should include a legacy-SQLite missing-column test, not only a clean in-memory `Base.metadata.create_all` test.

### 5. Knowledge Capture
- Updated `.trellis/spec/backend/database-guidelines.md` with the additive SQLAlchemy column compatibility contract.

## Additional Validation Results

- `py -3 -m pytest -q backend/tests/test_database_backed_runtime_stores.py backend/tests/test_startup_optional_mysql.py --tb=short` → 3 passed, 1 failed in `test_explicit_json_storage_startup_does_not_require_sqlalchemy` because importing `fablemap_api.application.services.relationship_graph` eagerly imports `sqlalchemy` while the test intentionally blocks SQLAlchemy. This is outside the `special_type` fix and was not modified.
- Re-ran after spec update: `py -3 -m compileall -q backend/src` → passed.
- Re-ran after spec update: `py -3 -m pytest -q backend/tests/test_mysql_infrastructure.py --tb=short` → 20 passed, 6 existing deprecation warnings.
- Re-ran after spec update: `py -3 -m pytest -q backend/tests/test_database_backed_runtime_stores.py backend/tests/test_api_smoke.py --tb=short` → 6 passed, 6 existing deprecation warnings.
