# Implementation Note — 2026-04-29

## Done

- Implemented Tavern Skill Packs MVP with first built-in pack `local-rumor`.
- Added backend normalization, persistence, v1 API, runtime prompt/rules integration, MySQL mapping, package export/import compatibility, and tests.
- Added owner-facing `SkillPackManager` UI plus service clients and product service wrappers.
- Updated `README.md`, `docs/WORLD_SCHEMA.md`, `docs/ARCHITECTURE.md`, and Trellis backend/frontend skill-pack specs.

## Explicitly not done

- `revisit-care` proactive follow-up behavior remains deferred.
- `visual-souvenir` image/audio generation remains deferred.
- No notification, quiet-hours, rate-limit, provider-cost, image-retention, or proactive visitor behavior was added.

## Verification

- `py -3 -m compileall -q backend/src` → exit 0.
- `py -3 -m pytest -q tests/test_tavern_skill_packs.py backend/tests/test_v1_skill_packs.py tests/test_tavern_state_cards.py backend/tests/test_v1_state_cards.py tests/test_tavern_runtime_presets.py backend/tests/test_v1_tavern_package.py --tb=short` → 12 passed.
- `py -3 -m pytest -q --tb=short` → 507 passed, 103 warnings.
- `npm --prefix .\frontend test` → all script tests passed, including `skill-packs-test`.
- `npm --prefix .\frontend run typecheck` → exit 0.
- `npm --prefix .\frontend run build` → build succeeded.
