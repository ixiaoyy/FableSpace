# Docs and Test Script Cleanup Report

## Scope

User selected option 3 (aggressive cleanup): remove outdated historical docs, tracked generated evidence/caches, one-off tooling, and non-formal test/visual-check scripts from version control while preserving core product docs, Trellis workflow/specs/tasks, and formal pytest/npm test suites.

## Removed from version control

- Tracked generated/cache/evidence directories:
  - `.trellis/tmp/`
  - `artifacts/`
  - `.trellis/tasks/archive/`
  - `.trellis/tasks/*/artifacts/`
- Historical docs and old collaboration records:
  - `docs/changes/`
  - `docs/claims/`
  - `docs/superpowers/`
  - `docs/README.md`
  - `docs/CURRENT_TASKS.md`
  - `docs/AI_SHARED_TASKLIST.md`
  - `docs/FABLEMAP_ROADMAP_PHASE2.md`
  - `docs/NPC角色创建指南.md`
  - `docs/NPC角色素材生成说明.md`
  - `CLAUDE.md`
  - `test_out.txt`
- One-off/local tooling:
  - `tools/`
  - `scripts/`
  - workspace evidence/log/scans under `.trellis/workspace/lijin/` except index and journal files
- Non-formal frontend tests/checks:
  - `frontend/tests/` Vitest files (Vitest is not in current package deps/scripts)
  - frontend visual/manual scripts not referenced by `frontend/package.json`

## Kept

- Core docs: `README.md`, `docs/INDEX.md`, `docs/PRODUCT_BRIEF.md`, `docs/FABLEMAP_TAVERN_PLATFORM.md`, `docs/ARCHITECTURE.md`, `docs/WORLD_SCHEMA.md`, `docs/WHAT_NOT_TO_BUILD.md`, `docs/IMAGE_ASSETS_SPEC.md`, `docs/AI参与开发协议.md`.
- Trellis workflow/spec/scripts and active task records.
- Formal test suites:
  - `tests/`
  - `backend/tests/`
  - `frontend/scripts/*.mjs` referenced by current `frontend/package.json` scripts.

## Local-only preserved files

Two modified visual-audit files were removed from Git index but kept on disk as ignored local work to avoid destroying in-progress edits:

- `artifacts/playwright/discover-visual-audit/report.md`
- `frontend/scripts/playwright-discover-visual-audit.mjs`

## Follow-up note

Many historical Trellis task PRDs still mention artifact paths that were removed. Those references are now historical notes, not live file links.

## Verification

- Core markdown link check (`README.md`, `docs/*.md`, `.trellis/spec/frontend/image-asset-guidelines.md`): passed, 10 files checked, 0 broken local links.
- `frontend/package.json` script reference check: passed, 0 missing referenced scripts, 0 remaining tracked unreferenced `frontend/scripts` files.
- `npm --prefix .\frontend test`: passed.
- Post-cleanup tracked counts: `docs/` 8 files, `artifacts/` 0, `.trellis/tmp/` 0, `docs/changes/` 0, `docs/claims/` 0, `tools/` 0, `scripts/` 0, `frontend/tests/` 0, `.trellis/tasks/**/artifacts/` 0.
