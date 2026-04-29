# Test Coverage Implementation Note — 2026-04-29

## Scope completed

- Added dependency-free backend core tests for `char_card_parser`:
  - SillyTavern V2 field/world_info/sprite mapping.
  - SillyTavern V3 `data` envelope and extension precedence.
  - PNG `ccv3` metadata preference, write/replace round-trip, non-card rejection.
  - CharX `card.json` archive auto-detection with stub prefix.
- Added dependency-free backend core tests for `llm_clients`:
  - `LLMConfig`, factory aliases/defaults, unknown backend guardrail.
  - request body/header helpers.
  - `complete(...)` streaming vs non-streaming dispatch.
  - mocked OpenAI request construction/response parsing without external network.
  - Claude message conversion and TextGen prompt/base_url guardrail.
  - supported backend registry metadata.
- Initialized and fixed Trellis implement/check/debug context files for this task.

## Deliberate constraints

- Did not add `pytest-cov`, `hypothesis`, Vitest, React Testing Library, or Playwright because project rules forbid adding dependencies without explicit approval.
- Did not add CI coverage gates for the same reason: no coverage tool is currently installed.
- Frontend component/E2E dependency-backed coverage remains deferred; existing Node service script suite was still run successfully.

## Files changed

- `tests/test_char_card_parser.py`
- `tests/test_llm_clients.py`
- `.trellis/tasks/04-28-test-coverage/implement.jsonl`
- `.trellis/tasks/04-28-test-coverage/check.jsonl`
- `.trellis/tasks/04-28-test-coverage/debug.jsonl`
- `.trellis/tasks/04-28-test-coverage/task.json`
