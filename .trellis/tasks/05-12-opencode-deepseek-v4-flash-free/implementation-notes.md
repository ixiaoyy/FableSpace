# Implementation Notes

## External source checked
- 2026-05-12: OpenCode Zen docs list `DeepSeek V4 Flash Free` model id `deepseek-v4-flash-free` on `https://opencode.ai/zen/v1/chat/completions` and describe it as limited-time free.
- 2026-05-12 quality pass: official OpenCode Zen docs and `https://opencode.ai/zen/v1/models` still list `deepseek-v4-flash-free`.

## Decisions
- Reused the existing `custom` OpenAI-compatible backend instead of adding a new persistent backend enum. The configured base URL is `https://opencode.ai/zen`, which the existing custom adapter expands to `/v1/chat/completions`.
- Removed the committed Kilo credential from `backend/config/system_public_welfare_llm.json` and added `api_key_env: OPENCODE_API_KEY`.
- Preserved system/public-welfare hydration for legacy managed markers (`kilo-auto/free`, `glm-4.7-flash`) so existing public-welfare records can migrate to the current OpenCode model without ordinary user taverns inheriting a system key.
- If `OPENCODE_API_KEY` is absent, system/public-welfare spaces keep the local `rules` fallback and do not consume external-token accounting.
- Quality pass removed old `DEBUG: get_llm_config(...)` error logs from `backend/src/fablemap_api/core/tavern.py` because public-welfare LLM fallback/config diagnostics must not log keyvault-like payload fragments.

## Verification
- 2026-05-12 fresh quality pass:
  - `py -3 -m compileall -q backend/src` — passed.
  - `py -3 -m pytest -q backend/tests/test_v1_runtime_features.py::test_v1_public_welfare_seed_chat_uses_system_public_welfare_llm backend/tests/test_v1_runtime_features.py::test_v1_public_welfare_default_rules_marker_is_not_reported_to_visitors backend/tests/test_v1_runtime_features.py::test_v1_public_welfare_uses_versioned_opencode_config_when_free_model_is_selected --tb=short` — passed, 3 tests.
  - `node .\frontend\scripts\llm-config-presets-test.mjs` — passed.
  - `rg -n "eyJhbGci|api\.kilo|kilo-auto/free|Kilo|sk-[A-Za-z0-9_-]{20,}" backend\config frontend\app\product\LLMConfigForm.jsx frontend\app\product\TavernCreatePanel.jsx frontend\app\routes\create.tsx -S` — no matches.
  - `rg -n 'DEBUG: get_llm_config|logger\.error\(f"DEBUG' backend/src/fablemap_api/core/tavern.py` — no matches.
  - `npm --prefix .\frontend test` — still fails before reaching this slice's preset test at existing `frontend/scripts/mini-games-test.mjs:12`, `9 !== 6`.
  - `npm --prefix .\frontend run build` — still fails on unrelated malformed `frontend/app/routes/discover.tsx?__react-router-build-client-route:1287`, `Unexpected token` at a stray `</section>`.

## 2026-05-12 final validation update

### Done
- After fixing unrelated frontend regression blockers, reran the OpenCode/public-welfare focused backend checks and the full frontend regression/build chain.
- The prior full frontend blocker (`mini-games-test.mjs` and follow-on stale tests) is now resolved by `D:\work\ai-\.trellis\tasks\05-12-mini-games-template-test-drift`.

### Fresh validation
- `py -3 -m compileall -q backend/src` — PASS
- `py -3 -m pytest -q --tb=short backend/tests/test_v1_runtime_features.py -k "public_welfare_seed_chat_uses_system_public_welfare_llm or public_welfare_default_rules_marker_is_not_reported_to_visitors or public_welfare_uses_versioned_opencode_config_when_free_model_is_selected"` — PASS (3 passed, 9 deselected; deprecation warnings only)
- `npm --prefix .\frontend test` — PASS
- `npm --prefix .\frontend run build` — PASS
- `git diff --check` — PASS (CRLF normalization warnings only)

### Residual risk
- No live OpenCode API call was made because the task must not expose or depend on private API keys in automation.
