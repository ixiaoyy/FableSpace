# Preset Import Preview Safe Converter

## Goal

Implement a draft-only preset import preview and risk report for community / SillyTavern-style prompt preset JSON. Owners can paste or upload a preset-like JSON and see what FableMap can safely understand, what is blocked, and what needs manual review — without applying anything to a live tavern.

## MVP Scope

1. **Preset preview parser**
   - Accept a JSON object or JSON string payload.
   - Recognize common preset fields such as prompt lists/modules, model/runtime parameters, world-info placement hints, style/perspective/dialogue-density notes, and metadata names.
   - Produce a normalized preview report; do not persist imported preset data.

2. **Risk classification**
   - Classify modules/text into:
     - `supported`: safe style/runtime hints that can inform future owner edits.
     - `warning`: model-sensitive or needs owner review.
     - `blocked`: jailbreak/absolute obedience, safety bypass, chain-of-thought forcing, user impersonation, PII/private address, explicit NSFW/forced sexual content.
   - Blocked items must be visible in the report, not silently discarded.

3. **Backend API**
   - Add a utility endpoint for preview only, e.g. `POST /api/v1/taverns/{tavern_id}/preset-import/preview`.
   - Owner-only because preset text can contain private prompts and risky content.
   - Response must not include owner API keys or hidden runtime secrets.

4. **Frontend service + owner UI entry**
   - Add service methods in `frontend/app/lib/taverns.ts` and product compatibility service.
   - Add a compact owner-facing modal/tool from TavernOwnerPanel advanced actions.
   - Show counts, supported/warning/blocked entries, and clear copy that nothing has been applied.

5. **Docs/spec/tests**
   - Add backend/frontend tests for report classification and service contract.
   - Update docs/spec with preview-only boundary.

## Out of Scope / Deferred

- Applying imported presets to live `Tavern`, `TavernCharacter`, prompt blocks, runtime presets, or world info.
- Persistent preset library.
- Importing jailbreak/NSFW/chain-of-thought modules as usable prompts.
- Provider-specific safety bypass optimization.
- Full Prompt Composer / Style Dials UI.

## Acceptance Criteria

- [x] Invalid JSON produces a readable 400/API error or frontend parse error.
- [x] Owner can preview a preset; non-owner cannot preview for that tavern.
- [x] The report includes supported, warning, and blocked groups with counts.
- [x] Unsafe modules are visible as blocked with reasons.
- [x] Nothing is persisted to `Tavern.runtime_presets`, `prompt_blocks`, `world_info`, or `characters` by preview.
- [x] Owner UI states clearly: preview only; apply is not implemented.
- [x] Backend and frontend tests cover the contract.

## Implementation Notes

- Backend domain parser: `backend/src/fablemap_api/core/preset_import.py`.
- Owner-only API: `POST /api/v1/taverns/{tavern_id}/preset-import/preview`.
- Frontend owner modal: `frontend/app/product/PresetImportPreviewModal.jsx`.
- Preview stays draft-only: no schema or persistence writes.

## Verification Results

- `py -3 -m pytest -q tests/test_preset_import_preview.py backend/tests/test_v1_preset_import_preview.py --tb=short` → 5 passed.
- `node .\frontend\scripts\preset-import-preview-test.mjs` → ok.
- `py -3 -m compileall -q backend/src` → passed.
- `npm --prefix .\frontend test` → passed.
- `npm --prefix .\frontend run typecheck` → passed.
- `npm --prefix .\frontend run build` → passed.
- `py -3 -m pytest -q --tb=short` → 512 passed, 103 warnings.

## Technical Notes

- Fullstack task touching API/service/UI/docs, but no new persistent schema.
- Reuse existing runtime preset and prompt-block vocabulary where safe.
- No new dependencies.
