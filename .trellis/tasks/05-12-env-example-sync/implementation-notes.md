# Implementation Notes

## Research
- `.env` is gitignored; this pass compared key names only and never printed values.
- Local `.env` had `OPENCODE_API_KEY`, which is supported by `backend/config/system_public_welfare_llm.json` through `api_key_env` but was missing from `.env.example` and `docker-compose.yml` backend environment.
- Local `.env` also had `KILO_*` and `FABLEMAP_DEFAULT_FREE_LLM_*`; repository search found no current code reads those keys, so they were treated as legacy/local leftovers and not promoted to the committed env contract.
- Frontend AMap env keys are read by `frontend/app/product/mapAdapter/AMapAdapter.js`; `.env.example` and Docker build args now document/pass them consistently.

## Changes
- Added `OPENCODE_API_KEY=` placeholder and OpenCode public-welfare guidance to `.env.example`.
- Removed stale Kilo public-welfare wording from `.env.example`.
- Passed `OPENCODE_API_KEY` through `docker-compose.yml` to the backend container.
- Added `VITE_AMAP_KEY` / `VITE_AMAP_SECURITY_CODE` placeholders and Docker build args/ENV wiring.

## Validation
- Key comparison script (names only): supported local `.env` keys missing from `.env.example` = `[]`; unsupported legacy local keys = `KILO_*`, `FABLEMAP_DEFAULT_FREE_LLM_*`.
- `rg -n "Early system/public-welfare Kilo|KILO_API_KEY=|KILO_BASE_URL=|KILO_MODEL=|FABLEMAP_DEFAULT_FREE_LLM_.*=" .env.example` — no matches.
- `rg -n "OPENCODE_API_KEY|VITE_AMAP_KEY|VITE_AMAP_SECURITY_CODE" .env.example docker-compose.yml frontend/Dockerfile backend/config/system_public_welfare_llm.json` — expected wiring found.
- `docker compose config --quiet` — passed.

## Follow-up parity fix
- User clarified that `.env.example` should include every private `.env` key name, even when the current code does not read old local keys, so new developers can copy one visible template.
- Added explicit placeholders for `FABLEMAP_DEFAULT_FREE_LLM_*` and deprecated `KILO_*` keys with comments that current runtime prefers `OPENCODE_API_KEY` plus the versioned OpenCode config.

## Follow-up validation
- Key comparison script (names only): `.env` keys missing from `.env.example` = `[]`; `example_covers_env=True`.
- `docker compose config --quiet` — passed.
- `git diff --check` — passed, CRLF warnings only.
