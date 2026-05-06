# Verification Log

- RED backend: `python -m pytest -q --tb=short tests/test_default_public_welfare_taverns.py::test_default_public_welfare_seed_is_readable_when_store_is_corrupt` failed before implementation because corrupt `taverns.json` produced an empty seed list.
- RED frontend: `node frontend/scripts/homepage-dynamic-entry-test.mjs` failed before implementation because the homepage hero still used the oversized desktop title contract.
- Focused backend green: `python -m pytest -q --tb=short tests/test_default_public_welfare_taverns.py::test_default_public_welfare_seed_is_readable_when_store_is_corrupt tests/test_default_public_welfare_taverns.py::test_default_public_welfare_seed_fallback_enter_is_readonly_when_store_is_corrupt tests/test_default_public_welfare_taverns.py::test_default_public_welfare_seed_does_not_overwrite_corrupt_store tests/test_default_public_welfare_taverns.py::test_default_public_welfare_seed_can_be_disabled` → 4 passed in 0.91s.
- Frontend focused green: `node frontend/scripts/homepage-dynamic-entry-test.mjs` → ok.
- Syntax: `python -m compileall -q backend/src` → passed.
- Focused backend suite: `python -m pytest -q --tb=short tests/test_default_public_welfare_taverns.py tests/test_public_welfare_runtime_config.py` → 30 passed in 3.75s.
- Frontend typecheck: `npm --prefix ./frontend run typecheck` → passed.
- Frontend build: `npm --prefix ./frontend run build` → passed.
- Frontend tests: `npm --prefix ./frontend test` → passed.
- Full backend suite: `python -m pytest -q --tb=short` → 545 passed, 103 warnings in 48.89s.
- Runtime API: restarted backend with current code; `curl --noproxy * http://127.0.0.1:8950/api/v1/taverns` returned `count=9` while local `taverns.json` remains invalid JSON.
- Browser self-acceptance: `node .trellis/tasks/05-05-homepage-seed-fallback-hero-scale/evidence/homepage-browser-check.mjs` → passed; desktop/mobile screenshots captured; no page errors; no horizontal overflow.

## Follow-up verification: Discover empty state regression

- RED backend: `python -m pytest -q --tb=short tests/test_default_public_welfare_taverns.py::test_default_public_welfare_seed_read_fallback_repairs_partial_seed_records` failed before implementation with `KeyError: 'id'` when a valid JSON store contained a partial `pw_third_shelf_observatory` seed record.
- Focused backend green: `python -m pytest -q --tb=short tests/test_default_public_welfare_taverns.py::test_default_public_welfare_seed_read_fallback_repairs_partial_seed_records tests/test_default_public_welfare_taverns.py::test_default_public_welfare_seed_is_readable_when_store_is_corrupt tests/test_default_public_welfare_taverns.py::test_default_public_welfare_seed_fallback_enter_is_readonly_when_store_is_corrupt` → 3 passed in 0.90s.
- Local runtime service check: `WebService(ApiSettings(output_root=.fablemap-api)).list_taverns_payload()` → count=10, including `pw_third_shelf_observatory`.
- Restarted backend with current code; `curl --noproxy * http://127.0.0.1:8950/api/v1/taverns` → count=10.
- Vite proxy check: `curl --noproxy * http://127.0.0.1:5173/api/v1/taverns` → count=10, len=10.
- Syntax: `python -m compileall -q backend/src` → passed.
- Focused backend suite: `python -m pytest -q --tb=short tests/test_default_public_welfare_taverns.py tests/test_public_welfare_runtime_config.py` → 31 passed in 4.94s.
- Discover static script: `node frontend/scripts/discover-pc-polish-test.mjs` → ok.
- Full backend suite: `python -m pytest -q --tb=short` → 546 passed, 103 warnings in 61.89s.
- Browser self-acceptance: `node .trellis/tasks/05-05-homepage-seed-fallback-hero-scale/evidence/discover-browser-check.mjs` → passed; screenshots: `discover-desktop.png`, `discover-mobile.png`; no page errors; no horizontal overflow; discover shows 10 coordinate signals.

## Runtime data repair: taverns.json

- Stopped the current local API process before writing the store file to avoid concurrent writes.
- Backed up the original runtime file to `D:\work\ai-\.trellis\tasks\05-05-homepage-seed-fallback-hero-scale\backups\taverns.before-repair.20260505-234026.json`.
- Audit before repair: `taverns.json` had 10 records, 9 public-welfare IDs present, and `pw_third_shelf_observatory` was partial with only `_memory_atoms` and missing canonical Tavern fields.
- Repair command: `python .trellis/tasks/05-05-homepage-seed-fallback-hero-scale/evidence/repair-runtime-taverns.py`.
- Repair result: restored `pw_third_shelf_observatory` from canonical `default_public_welfare_taverns()`, preserved `_memory_atoms`, preserved custom tavern `tavern_b4c574b31fad`.
- Raw-store validation without read fallback: `TavernStore(Path('.fablemap-api/taverns'))._load_taverns(include_seed_fallback=False)` returned 10 records; all 9 public-welfare records have matching `id`, `公益·` names, valid `Tavern.from_dict`, and characters.
- Runtime API validation: `curl --noproxy * http://127.0.0.1:8950/api/v1/taverns` returned `api_count=10`, including all 9 public-welfare IDs and `tavern_b4c574b31fad`.
- Vite proxy validation: `curl --noproxy * http://127.0.0.1:5173/api/v1/taverns` returned `proxy_count=10`, `len=10`.
- Browser validation after repair:
  - `node .trellis/tasks/05-05-homepage-seed-fallback-hero-scale/evidence/discover-browser-check.mjs` → passed; no page errors; no horizontal overflow.
  - `node .trellis/tasks/05-05-homepage-seed-fallback-hero-scale/evidence/homepage-browser-check.mjs` → passed; no page errors; no horizontal overflow.

## Follow-up: homepage hero typography polish

- RED frontend contract: `node frontend/scripts/homepage-dynamic-entry-test.mjs` failed before implementation because the page still used the previous poster-sized hero title contract.
- Changed `frontend/app/routes/home.tsx` hero title from a dense three-line stack (`每个坐标 / 都可能藏着 / 会回应的世界`) to a compact two-line editorial headline (`真实坐标 / 藏着会回应的世界`).
- Reduced title scale to `text-[1.72rem]`, `lg:text-[2.4rem]`, `xl:text-[2.58rem]`; changed `font-extrabold` to `font-bold`; increased line-height to `leading-[1.24]`; loosened Chinese tracking from `-0.045em` to `-0.015em`.
- Focused script: `node frontend/scripts/homepage-dynamic-entry-test.mjs` → ok.
- Typecheck: `npm --prefix ./frontend run typecheck` → passed.
- Build: `npm --prefix ./frontend run build` → passed.
- Frontend tests: `npm --prefix ./frontend test` → passed.
- Browser self-acceptance: `node .trellis/tasks/05-05-homepage-seed-fallback-hero-scale/evidence/homepage-browser-check.mjs` → passed; updated screenshots `homepage-desktop.png`, `homepage-mobile.png`; no page errors; no horizontal overflow.


## Follow-up: rules chat response should stay in character voice

- Root cause: native v1 `_rules_response` built unmatched rules replies from `message + tavern.scene_prompt`, producing `这里的气味和灯光让我想到...氛围是...` system-like copy; core web rules fallback also used a generic all-tavern helper response when a public-welfare tavern message did not hit a keyword.
- RED core-web regression: `python -m pytest -q tests/test_default_public_welfare_taverns.py::test_third_shelf_observatory_generic_chat_stays_in_character_voice --tb=short` failed before implementation.
- RED native-v1 regression: `python -m pytest -q backend/tests/test_v1_runtime_features.py::test_v1_third_shelf_generic_rules_chat_does_not_echo_scene_prompt --tb=short` failed before implementation.
- Syntax: `python -m compileall -q backend/src` → passed.
- Focused public-welfare chat checks: `python -m pytest -q tests/test_default_public_welfare_taverns.py::test_default_public_welfare_tavern_chat_uses_local_rules_backend tests/test_default_public_welfare_taverns.py::test_third_shelf_observatory_chat_uses_alien_convenience_rules_response tests/test_default_public_welfare_taverns.py::test_third_shelf_observatory_generic_chat_stays_in_character_voice tests/test_default_public_welfare_taverns.py::test_midnight_commission_board_chat_uses_text_adventure_rules_response tests/test_default_public_welfare_taverns.py::test_after_school_hero_supply_chat_uses_hero_dream_rules_response --tb=short` → 5 passed in 1.26s.
- Additional public-welfare all-seeded-character chat smoke: `python -m pytest -q tests/test_default_public_welfare_taverns.py::test_default_public_welfare_every_seeded_character_can_chat --tb=short` → 1 passed in 2.69s.
- Native v1 runtime feature suite: `python -m pytest -q backend/tests/test_v1_runtime_features.py --tb=short` → 9 passed in 3.70s.
- Restarted local API on `127.0.0.1:8950` with current code.
- Live API check: `POST http://127.0.0.1:8950/api/v1/taverns/pw_third_shelf_observatory/chat` with `天气怎么样？` → `200 OK`, `degraded=false`, response saved to `evidence/weather-chat-response-after-fix.json`; response no longer contains `这里的气味和灯光让我想到`, `氛围是`, or `我听见了——天气怎么样`.


## Follow-up: clean generated bad rules-chat artifacts

- Stopped the local API before writing runtime JSON/chat-history files.
- Runtime repair script: `python .trellis/tasks/05-05-homepage-seed-fallback-hero-scale/evidence/repair-bad-rules-chat-artifacts.py`.
- Backup files: `backups/taverns.before-rules-chat-artifact-repair.20260505-161207.json` and `backups/chat-history.before-rules-chat-artifact-repair.20260505-161207/`.
- Repair report: `evidence/bad-rules-chat-artifact-repair-report.json`.
- Repair results: removed 1 bad auto memory atom, removed 4 bad pending state-card candidates, rewrote 3 bad third-shelf visitor-demo assistant messages, rewrote 1 bad hospital visitor-demo assistant message, removed 3 Codex verification chat-history files, reset `pw_third_shelf_observatory.llm_config.token_used` to 0.
- Marker scan: no files under `.fablemap-api` contain `这里的气味和灯光让我想到`, `我听见了——天气怎么样`, or `我听见了——你好` after repair.
- Restarted local API on `127.0.0.1:8950`.
- Live API check: `GET http://127.0.0.1:8950/api/v1/taverns` → `200 OK`, `count=10`, `pw_third_shelf_observatory.llm_config.token_used=0`.

