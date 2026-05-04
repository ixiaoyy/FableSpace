# Persistent Preset Library Import Model Design

## Completion decision

Complete as a deferred model design. Do not add a persistent preset library in this task. The current preview-only importer is the correct MVP boundary until owners actually need saved preset reports.

## Existing evidence inspected

- `docs/WHAT_NOT_TO_BUILD.md`: imported presets must not become automatic platform-authored content or hidden billing/secret behavior.
- `docs/WORLD_SCHEMA.md`: `runtime_presets`, `prompt_blocks`, `output_rules`, `memory_policy`, and `world_info` already exist; no new schema is added now.
- `.trellis/spec/backend/preset-import-preview-contract.md`: preview must not mutate runtime presets, prompt blocks, world info, characters, memory, State Cards, access rules, LLM config, or keyvault data.
- `.trellis/spec/frontend/preset-import-preview-ui-boundary.md`: the UI must say preview-only and not apply imported modules.
- `backend/src/fablemap_api/core/preset_import.py`: existing parsing/classification is deterministic and redacts sensitive fields.

## Future model sketch (not implemented)

If a future task proves persistence is needed, design a separate owner-scoped model such as `PresetLibraryEntry` with at least:

- `id`, `owner_id`, `tavern_id`, `name`, `source_label`, `created_at`, `updated_at`.
- `risk_snapshot`: supported/warning/blocked counts and reasons from the preview run.
- `sanitized_modules`: only owner-reviewable safe hints, never raw blocked modules.
- `runtime_parameters`: redacted values, never provider secrets.
- `status`: `draft`, `reviewed`, `archived`; no direct `applied` side effect.
- `applied_to`: optional audit list only after a separate explicit owner action.

## Required future gates

- Update `docs/WORLD_SCHEMA.md`, backend contracts, frontend service types, and tests together.
- Keep preview and persistence as separate endpoints.
- Add a deletion/export story before storing community preset text.
- Never silently apply jailbreak/NSFW/CoT-forcing modules.

## Verification

Docs-only completion. No backend/frontend/schema change was made.
