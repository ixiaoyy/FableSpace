# DB / schema / enum note

No persisted DB schema, document schema, or enum change is required for Phase 1.

Reason:

- `{data, meta}` is an HTTP transport response envelope, not a stored Tavern/Character/VisitorState/WorldInfo model field.
- Legacy `/api/*` migration is a route/client compatibility concern, not a persistence shape change.
- AGENTS.md and `docs/WORLD_SCHEMA.md` prohibit inventing schema fields/enums without a concrete product/data contract and tests.

If a later strict-envelope task introduces persisted audit/request metadata, new enum values, or database-backed response tracking, that later task must update `docs/WORLD_SCHEMA.md`, backend contracts, tests, and migration/backward-compat notes.
