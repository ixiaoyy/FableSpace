# Implementation Plan — Tavern Skill Packs MVP

## Scope

- Add a persistent `Tavern.skill_packs` setting list with safe normalization.
- Add v1 owner API: `GET/PUT /api/v1/taverns/{tavern_id}/skill-packs`.
- Implement first pack `local-rumor` using existing NeighborhoodRumor data as non-canon runtime context.
- Add owner UI and frontend service methods.
- Update docs/spec/tests.

## Red/Green Evidence

- RED backend: `py -3 -m pytest -q tests/test_tavern_skill_packs.py backend/tests/test_v1_skill_packs.py --tb=short` initially failed with `ModuleNotFoundError: No module named 'fablemap_api.core.skill_packs'`.
- RED frontend: `node .\frontend\scripts\skill-packs-test.mjs` initially failed because `service.listSkillPacks` was undefined.

## Implementation slices

1. Backend domain + persistence
   - `core/skill_packs.py`
   - `Tavern.skill_packs` JSON field
   - JSON/MySQL mapping and package import/export compatibility
2. Backend API + runtime
   - `SkillPackApplicationMixin`
   - v1 router registration
   - `local-rumor` prompt/rules integration
3. Frontend
   - typed service methods in `app/lib/taverns.ts`
   - compatibility service methods
   - `SkillPackManager` owner UI + OwnerPanel entry
4. Docs/spec/tests
   - schema/architecture/readme
   - Trellis spec contracts
   - backend + frontend regression tests
