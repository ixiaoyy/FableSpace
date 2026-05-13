# Switch Docker Runtime to MySQL

## Goal
Make Docker Compose use the database URL from `.env` and migrate existing local SQLite runtime data into that configured MySQL database.

## Requirements
- Do not hardcode or start a Compose-local MySQL service.
- Pass `.env` `FABLEMAP_DATABASE_URL` through to the backend container.
- Add a non-destructive SQLite/SQLAlchemy DB to target DB migration utility.
- Create the configured MySQL database if it is missing and credentials allow it.
- Migrate existing `.fablemap-api/fablemap.sqlite3` rows into the `.env` target database.
- Do not change business schema, API payloads, or memory data model.
- Do not delete the existing local SQLite file in this task.

## Acceptance Criteria
- [x] `docker-compose.yml` passes `.env` `FABLEMAP_DATABASE_URL` to backend without hardcoded DB defaults.
- [x] `.env.example` documents `FABLEMAP_DATABASE_URL` as the deployment database source.
- [x] README documents Compose `.env` database behavior and the SQLite/direct-local distinction.
- [x] Compose config renders without syntax errors.
- [x] Backend Python syntax check passes.
- [x] Existing SQLite rows are migrated into the configured MySQL target.

## Technical Notes
Existing SQLAlchemy storage already supports MySQL via `FABLEMAP_DATABASE_URL`; the migration utility copies all SQLAlchemy model tables by primary key without deleting target-only rows.
## Follow-up: Auto-load `.env` for local API entrypoints
- [x] Add lightweight dependency-free `.env` parser/loader.
- [x] Load project-root `.env` before `py -3 -m fablemap_api api`, `python -m fablemap_api.core.api`, and `uvicorn fablemap_api.main:app` create settings.
- [x] Preserve explicit process environment variables over `.env`.
- [x] Verify `.env` database URL is loaded without recreating local SQLite.

