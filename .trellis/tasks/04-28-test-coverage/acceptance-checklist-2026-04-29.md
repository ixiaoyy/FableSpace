# Test Coverage Acceptance Checklist — 2026-04-29

## Done

- [x] Backend core `char_card_parser` has focused tests for JSON V2/V3, PNG metadata, CharX, and invalid bytes.
- [x] Backend core `llm_clients` has focused tests for deterministic helpers/factory/request construction without real provider calls.
- [x] No new runtime or dev dependency was added.
- [x] Trellis context files validate.
- [x] Full Python test suite passes in this workspace.
- [x] Existing frontend Node service script suite passes.

## Deferred / not done

- [ ] Coverage percentage enforcement via `pytest-cov` is deferred pending dependency approval.
- [ ] Property-based tests via `hypothesis` are deferred pending dependency approval.
- [ ] React component tests via Vitest/React Testing Library are deferred pending dependency approval.
- [ ] Playwright E2E tests are deferred pending dependency approval and browser-test scope confirmation.

## Verification evidence

- `py -3 -m pytest -q tests/test_char_card_parser.py tests/test_llm_clients.py --tb=short` → 13 passed.
- `py -3 -m compileall -q backend/src` → passed.
- `npm --prefix .\frontend test` → passed.
- `py -3 -m pytest -q --tb=short` → 498 passed, 103 warnings.
- `py -3 .\.trellis\scripts\task.py validate .trellis/tasks/04-28-test-coverage` → passed.
