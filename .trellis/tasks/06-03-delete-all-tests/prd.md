# Delete all test cases at user request

## Goal

User explicitly requested deleting all test cases after confirmation.

## Scope

- Delete `tests/`.
- Delete `apps/api/tests/`.
- Delete `apps/web/scripts/` test and Playwright scripts.
- Delete root `scripts/` P0 validation scripts created for tests/demo smoke.
- Delete `pytest.ini`.
- Remove `apps/web/package.json` `scripts.test` entry so it does not point at deleted files.

## Validation after deletion

No test command remains by design. Run only non-test build/syntax checks:

- `py -3 -m compileall -q apps/api/src`
- `npm --prefix .\apps\web run build`

## Risk

This removes regression coverage and leaves historical docs/Trellis records that mention old tests. Those records are history, not active test files.

## Result

Deleted per explicit user confirmation:

- `tests/`
- `apps/api/tests/`
- `apps/web/scripts/`
- `scripts/`
- `pytest.ini`
- Removed `scripts.test` from `apps/web/package.json`

## Validation

- `py -3 -m compileall -q apps/api/src` — PASS
- `npm --prefix .\apps\web run build` — PASS

## Remaining risk

- There is no automated regression suite left in the repository.
- Historical docs/Trellis records still mention old tests as history.
- `tests/fixtures/` was removed together with `tests/`, so any runtime path still expecting `tests/fixtures/overpass_sample.json` will no longer have that fixture file.
