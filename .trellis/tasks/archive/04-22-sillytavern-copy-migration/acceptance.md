# SillyTavern Copy Migration Acceptance Checkpoint

Date: 2026-04-23
Commit: `8fdd837 refactor: remove sillytavern copy after native compat slices`

## Decision

The repository-level `sillytavern_copy/` deletion gate has passed: the tracked copy is removed, native runtime code no longer references it, and backend/frontend validation passed after deletion.

This checkpoint does not close the parent framework-refactor workstream. It records that the vendor-copy dependency is gone and separates the remaining work into follow-up native refactor/product decisions.

## Evidence

- `sillytavern_copy/` no longer exists in the worktree.
- `git ls-files sillytavern_copy` returns `0`.
- Runtime reference scan passed:

```powershell
git grep -n "sillytavern_copy" -- . ':!.trellis/tasks/*' ':!docs/changes/*'
```

No matches were returned.

## Native Coverage

| Capability | Native coverage | Evidence |
| --- | --- | --- |
| Character cards, PNG, CharX, sprites, expressions | Covered in native `/api/v1` utility and tavern character endpoints | `backend/tests/test_v1_character_assets.py` |
| World/lorebook aliases and diagnostics | Covered in native `/api/v1/worldinfo` and tavern world-info test endpoints | `backend/tests/test_v1_world_info_global.py`, `backend/tests/test_v1_owner_config.py` |
| Prompt blocks, output rules, runtime presets | Covered as owner-config native endpoints and frontend typed clients | `backend/tests/test_v1_owner_config.py`, `frontend/app/lib/taverns.ts` |
| Tokenizer and memory utilities | Covered as native utility endpoints; exact upstream tokenizer model assets are not vendored | `backend/tests/test_v1_memory_tokenizer_utilities.py` |
| Tavern package/import/visitor utility/gameplay abandon | Covered in native package and tavern endpoints | `backend/tests/test_v1_tavern_package.py` |
| Runtime LLM probe, group chat, voice, TTS/STT guardrails | Covered in native runtime endpoints | `backend/tests/test_v1_runtime_features.py` |
| Visitor memory atoms | Covered with private/public/owner visibility tests | `backend/tests/test_v1_memory_atoms.py` |
| MySQL LLM privacy and token usage compatibility | Covered in infrastructure tests and backend spec | `backend/tests/test_mysql_infrastructure.py`, `.trellis/spec/backend/database-guidelines.md` |

## Validation

Fresh validation before commit `8fdd837`:

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests/test_v1_character_assets.py backend/tests/test_v1_memory_tokenizer_utilities.py backend/tests/test_v1_world_info_global.py backend/tests/test_mysql_infrastructure.py --tb=short
py -3 -m pytest -q --tb=short
npm --prefix .\frontend run build
npm --prefix .\frontend test
git diff --check
git diff --cached --check
```

Results:

- Focused backend tests: `27 passed`, with existing `datetime.utcnow()` deprecation warnings.
- Full pytest: `283 passed`, with the same warnings.
- Frontend build: passed.
- Frontend script tests: passed.
- Diff checks: passed.

## Remaining Work

These are not blockers for removing `sillytavern_copy/`, but they remain open in the parent framework-refactor task:

1. Split `backend/src/fablemap_api/application/taverns.py`; it is still a large all-in-one application service.
2. Split `backend/src/fablemap_api/contracts/taverns.py` by bounded API domain.
3. Create `frontend/app/features/*` and move product-compatible UI workflows out of `frontend/app/product/*`.
4. Decide separate product scope for vector/embedding provider parity. Current native memory APIs preserve visitor privacy, but the upstream vector-provider matrix was not vendored.
5. Decide separate product scope for provider-specific LLM integrations beyond the existing owner-config/probe/runtime behavior.
6. Archive or finish the Trellis task after human acceptance and session recording.
