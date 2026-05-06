# Implementation note: database-backed runtime storage

## Summary

The runtime storage default is now SQLAlchemy-backed. When no explicit database URL is configured, FableMap uses `<output_root>/fablemap.sqlite3` instead of JSON files. `FABLEMAP_DATABASE_URL` is the preferred production setting; `FABLEMAP_MYSQL_URL` remains a legacy alias. JSON storage remains only as an explicit local fallback via `FABLEMAP_STORAGE_BACKEND=json`.

## Key code paths

- `backend/src/fablemap_api/infrastructure/storage.py`: shared storage resolver/factories.
- `backend/src/fablemap_api/main.py`: native `/api/v1` app uses the shared factories.
- `backend/src/fablemap_api/core/web/app.py`: legacy web app uses the shared factories.
- `backend/src/fablemap_api/infrastructure/models.py`: added side-store/state-card/writeback models.
- `backend/src/fablemap_api/infrastructure/mysql_store.py`: added state-card methods, fixed tavern-scoped character/world-info IDs, deterministic chat order and gameplay event serialization.

## Follow-up boundary

Do not migrate caches, exports, generated files, static assets, or test fixtures to DB. Dead legacy `core/auth.py`/`core/owner_config.py` were audited but not productized because no active route imports them.
