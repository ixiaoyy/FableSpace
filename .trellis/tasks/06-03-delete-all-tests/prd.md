# Delete all test cases at user request

## Goal

User explicitly requested deleting all test cases after confirmation.

## Scope

- Delete `tests/`.
- Delete `backend/tests/`.
- Delete `frontend/scripts/` test and Playwright scripts.
- Delete root `scripts/` P0 validation scripts created for tests/demo smoke.
- Delete `pytest.ini`.
- Remove `frontend/package.json` `scripts.test` entry so it does not point at deleted files.

## Validation after deletion

No test command remains by design. Run only non-test build/syntax checks:

- `py -3 -m compileall -q backend/src`
- `npm --prefix .\frontend run build`

## Risk

This removes regression coverage and leaves historical docs/Trellis records that mention old tests. Those records are history, not active test files.

## Result

Deleted per explicit user confirmation:

- `tests/`
- `backend/tests/`
- `frontend/scripts/`
- `scripts/`
- `pytest.ini`
- Removed `scripts.test` from `frontend/package.json`

## Validation

- `py -3 -m compileall -q backend/src` — PASS
- `npm --prefix .\frontend run build` — PASS

## Remaining risk

- There is no automated regression suite left in the repository.
- Historical docs/Trellis records still mention old tests as history.
- `tests/fixtures/` was removed together with `tests/`, so any runtime path still expecting `tests/fixtures/overpass_sample.json` will no longer have that fixture file.
