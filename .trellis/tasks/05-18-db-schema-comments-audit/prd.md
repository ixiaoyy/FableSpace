# DB schema comments audit

Date: 2026-05-18
Owner: lijin

## Goal

1. Audit the configured `FABLEMAP_DATABASE_URL` database for tables that are not part of the current FableMap SQLAlchemy model set.
2. Add authoritative table and column comments for all current SQLAlchemy tables.
3. Make the rule persistent for future schema work: every new SQLAlchemy table/column must declare a comment and the live MySQL comment sync script must be usable to apply metadata-only comments.

## Scope

- Inspect current configured MySQL database schema only; do not delete, rename, or truncate any table/data.
- Add schema comments to backend source metadata and a metadata-only apply script.
- Update Trellis backend database guidelines as the global project memory.

## Non-goals

- No data cleanup or deletion.
- No Schema field/type/enum semantic changes.
- No product feature behavior change.

## Verification plan

- Audit configured DB table names against `Base.metadata.tables`.
- Run focused schema-comment unit test.
- Run backend compile check.
- Apply comments to configured MySQL DB and verify zero missing table/column comments.
