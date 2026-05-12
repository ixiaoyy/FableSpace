# Sync .env.example with local env contract

## Goal
Keep the committed `.env.example` aligned with the currently supported deployment/runtime environment variables, without committing local secrets from `.env`.

## Requirements
- Compare `.env` and `.env.example` by key name only; never print or commit secret values.
- Add documented placeholders for supported env vars that are used by the current code/config but missing from `.env.example`.
- Update stale comments that still mention the removed Kilo public-welfare route.
- Do not document local-only or obsolete variables as supported unless code actually reads them.
- Leave the ignored local `.env` values untouched.

## Acceptance Criteria
- [x] `.env.example` documents `OPENCODE_API_KEY` as an optional system/public-welfare OpenCode credential placeholder.
- [x] `.env.example` no longer tells operators to use a Kilo system/public-welfare test config.
- [x] Legacy/local keys seen only in ignored `.env` are recorded as unsupported/ignored rather than promoted to committed env contract.
- [x] Validation compares env key names without printing values.

## Technical Notes
- `.env` is ignored by `.gitignore` and must not be committed.
- Current code/config reads `OPENCODE_API_KEY` through `backend/config/system_public_welfare_llm.json` (`api_key_env`).
- Repository search found no current code reads `KILO_*` or `FABLEMAP_DEFAULT_FREE_LLM_*`.

