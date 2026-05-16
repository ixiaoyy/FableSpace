# Default DB Tavern List Response Optimization

## Result

Implemented the default DB list-path optimization for `GET /api/v1/taverns?limit=12`.

## Completed Scope

- `list_taverns()` now eager-loads characters, world info entries, and LLM config.
- `_to_tavern()` reads token usage from the already-loaded LLM config relationship instead of running a per-row token query.
- Added a regression that seeds 12 DB taverns and asserts the tavern list endpoint stays under a small SQL statement budget.

## Validation

- `py -3 -m pytest backend/tests/test_default_db_tavern_list_performance.py -q --tb=short`: PASS.

## Spec

- `.trellis/spec/backend/default-db-tavern-list-performance.md`
