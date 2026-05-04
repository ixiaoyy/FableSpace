# Model Profile and Preset Compatibility Report

## Completion decision

Complete as a model-agnostic compatibility report design. The current product should keep using the existing preset import preview pipeline and should not auto-apply community presets or maintain hard-coded claims about current provider model limits.

## Existing evidence inspected

- `docs/WHAT_NOT_TO_BUILD.md`: no platform token billing, no automatic content publication, no unstructured prompt-only outputs.
- `docs/WORLD_SCHEMA.md`: `runtime_presets`, `prompt_blocks`, `world_info`, and `TavernCharacter` fields already exist; this task adds no schema.
- `.trellis/spec/backend/preset-import-preview-contract.md`: supported/warning/blocked report is preview-only and must not persist imported prompt modules.
- `.trellis/spec/frontend/preset-import-preview-ui-boundary.md`: owner-only modal surfaces preview results and blocked modules.
- `backend/src/fablemap_api/core/preset_import.py`: existing classifier redacts secrets and groups supported/warning/blocked items.

## Report dimensions

A model/preset compatibility report should stay provider-neutral and score risks by dimensions that remain useful even when model names change:

- Context budget pressure: long character cards, world info depth, memory summaries, and large example dialogues.
- Instruction hierarchy risk: jailbreaks, absolute obedience, safety bypasses, or user impersonation.
- Structured-output reliability: whether the preset assumes JSON/tool syntax or freeform prose.
- Runtime variance: temperature/top-p/max-token hints and model-specific labels.
- Privacy/secret risk: API keys, phone numbers, private addresses, hidden prompts, or chain-of-thought forcing.
- Owner-confirmation status: supported hints may become suggestions; warnings require review; blocked items never become usable prompt blocks.

## Recommended MVP output shape

Reuse `PresetImportPreviewResponse` and add copy/UI interpretation later rather than new persistence:

- `supported`: safe style or runtime hints the owner may manually adapt.
- `warnings`: model/provider-specific or high-variance behavior that needs owner review.
- `blocked`: visible risk explanations; no silent discard and no automatic conversion.
- `runtime_parameters`: redacted non-secret knobs for owner review only.

## Verification

Docs/code-inspection completion. No code/schema change in this task; focused preset preview tests remain the required verification for future implementation work.
