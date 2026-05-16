# Default DB Tavern List Performance

## Scope

Use this when changing native/default database `list_taverns` hydration or `/api/v1/taverns?limit=...` list performance.

## Contracts

- Store/query helpers own list hydration. API routes must not loop through per-tavern enrichment queries.
- SQLAlchemy-backed `list_taverns()` preloads characters, world info entries, and owner LLM config needed by `_to_tavern()`.
- `_to_tavern()` must use already-loaded `LLMConfigModel`/relationship fields for token usage in list payloads; do not call `get_token_usage()` once per row.
- Public/visitor list payloads still must not leak owner API keys or private prompt/memory fields.

## Validation

- `py -3 -m pytest backend/tests/test_default_db_tavern_list_performance.py -q --tb=short`
- `py -3 -m compileall -q backend/src`

## Affected Files

- `backend/src/fablemap_api/infrastructure/mysql_store.py`
- `backend/tests/test_default_db_tavern_list_performance.py`
