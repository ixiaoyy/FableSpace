# Backend Persistence Guidelines

Concise persistence rules for FableMap backend work. Product schema authority remains `docs/WORLD_SCHEMA.md`; API contracts live in focused backend spec files.

## Principles

- Keep data load/normalize/save explicit and testable.
- Keep owner-private, visitor-private, and public payloads separate.
- Do not add schema fields, enum meanings, or required/optional changes without explicit task scope.
- Sensitive owner LLM/API key fields must never leak to visitor payloads, logs, or public responses.
- Runtime-private state such as sessions, draft previews, and dry-runs must not silently become public tavern content.

## Persistence patterns

### Load-normalize-save

1. Load the existing tavern/user/session record.
2. Normalize incoming payload with safe defaults.
3. Validate identity and visibility.
4. Save through the store/core adapter.
5. Return a public/owner/visitor-specific projection, not the raw record.

### Public vs private projections

- Public discovery/entry payloads: no owner API keys, private memories, hidden prompt blocks, private visitor notes, or raw internal diagnostics.
- Owner payloads: may include owner-facing config state, still no raw secrets unless explicitly needed for edit form masking.
- Visitor payloads: only visitor-owned state plus public tavern/NPC content.

### Query/list helpers

Filtering belongs in service/store helpers, not route loops. Always scope visitor-owned state by `visitor_id` and owner-owned state by `owner_id`.

## Schema change rules

Before changing persistence schema:

- Check `docs/WORLD_SCHEMA.md` and existing tests.
- Prefer additive optional fields with defaults.
- Add migration/backfill behavior for existing JSON/SQLite/MySQL rows.
- Update API contracts and tests in the same change.
- Do not reinterpret existing enum values silently.
- Every SQLAlchemy table and column must have a concise Chinese schema comment in `backend/src/fablemap_api/infrastructure/schema_comments.py`.
- New tables/columns are not complete until `backend/tests/test_schema_comments.py` passes and the live MySQL metadata can be synced with `python -m fablemap_api.infrastructure.apply_schema_comments --apply`.
- Database comments are metadata only; do not use a comment-only task to change field types, enum semantics, nullability, or row data.

## Database compatibility

- Existing SQLite/file fixtures may not contain new columns/keys.
- Native stores should tolerate missing fields and write normalized values on next save.
- SQLAlchemy/MySQL changes need explicit migration/backfill notes.

## LLM config and token usage

- API keys are sensitive; expose only configured/masked booleans or owner-only edit placeholders.
- Token usage is owner reference data only; no platform billing, recharge, settlement, or visitor-visible bill.
- Do not log request headers, keys, or provider secrets.

## Tests required

- Persistence helper changed: focused unit/service test.
- API payload changed: backend API test plus contract/client update if frontend consumes it.
- Schema/default changed: regression for old/missing field rows.
- Sensitive field changed: explicit non-leak assertion.

## Common mistakes

- Returning raw tavern records directly to public endpoints.
- Updating in-memory compatibility data but not persistence adapters.
- Adding fields to backend without frontend/client defaults.
- Treating dry-run/preview data as saved chat history.
- Adding monetization/billing semantics around owner token usage.

## Context policy

Large historical scenario blocks were removed. If a task needs a feature-specific contract, read the focused spec from `backend/index.md` or the relevant product document instead of this general guide.
