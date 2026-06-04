# Character card import/export trust polish

## Goal

Make community/SillyTavern role-card exchange feel safer and less magical for owners: importing a card should show a compatibility report first, require explicit confirmation, and explain what will or will not be saved. Export should be discoverable as a deliberate owner action.

## Evidence from current code

- `frontend/app/product/CharacterManagementModal.jsx` currently parses the selected file and immediately calls `importCharacterCard(...)`.
- `frontend/app/product/services/tavernService.js::parseCharacterCard` maps `data.character_book.entries` into a normalized `world_info` list.
- `backend/src/fablemap_api/core/tavern.py::_parse_sillytavern_card` only converts `data.character_book.entries` into `_world_info` for persistence during `import_character_card`; sending an already-normalized frontend payload can therefore lose imported lorebook entries in the owner-management import path.
- `frontend/app/lib/taverns.ts` already exposes `exportCharacterCard(...)`; there is no visible owner button in `CharacterManagementModal.jsx`.

## Scope

- Owner-side character management modal only.
- JSON and PNG SillyTavern card import.
- Existing character JSON export.

## Guardrails

- No new schema fields.
- No backend API changes.
- No automatic import/save before owner confirmation.
- Prompt-risk linter remains the final gate before save.
- No owner secrets or API keys are shown in UI copy.

## Acceptance

1. Selecting a card creates a pending import preview with mapped fields, review notes, world-info count, and prompt-risk state.
2. Confirm button is disabled when prompt-risk report contains blocked items.
3. Confirming import calls the existing save path only after `assertCharacterPromptRiskCanSave(...)`.
4. Raw SillyTavern JSON/PNG payload is preserved for import so `character_book.entries` can be handled by the existing backend parser.
5. Existing character rows include a JSON export action via `exportCharacterCard(...)`.

## Validation plan

- Frontend typecheck/build.
- Diff check.
- Focused browser/Playwright check if owner modal route can be exercised locally; otherwise record blocker.
- React Doctor diff scan if sandbox allows it; otherwise record the sandbox/npm-cache blocker.

## Implementation status (2026-06-04)

Completed as a frontend-only slice.

### Changed

- Added `frontend/app/product/characterCardImportTrust.js` with pure helper functions for compatibility reports, import payload preservation, and safe export filenames.
- Tightened the export filename sanitizer so invalid separators collapse cleanly instead of leaving repeated or trailing dashes.
- Updated `frontend/app/product/services/tavernService.js` so PNG extraction can return raw SillyTavern JSON before normalization.
- Updated `frontend/app/product/CharacterManagementModal.jsx`:
  - selecting a card now creates a pending preview instead of immediately saving;
  - preview shows mapped fields, world-info count, review notes, and prompt-risk state;
  - confirm import still runs `assertCharacterPromptRiskCanSave(...)` before `importCharacterCard(...)`;
  - import payload preserves raw `data.character_book.entries` so the existing backend parser can persist world info;
  - saved characters have an explicit `导出 JSON` action using `exportCharacterCard(...)`.
- Updated `frontend/app/product/styles.css` for preview, status, export, and mobile stacking.

### Validation

- `node --input-type=module -e "...characterCardImportTrust..."` — passed.
- `npm --prefix .\frontend run typecheck` — sandbox failed with Tailwind oxide/spawn EPERM; escalated rerun passed.
- `npm --prefix .\frontend run build` — passed with escalation.
- `git -c safe.directory=D:/work/ai- diff --check` — passed.
- `node .trellis\tmp\character-card-import-trust-visual-acceptance.cjs` — sandbox Playwright failed with Chromium `spawn EPERM`; escalated rerun passed. Evidence:
  - `.trellis/tmp/character-card-import-trust-evidence/character-card-import-preview-desktop.png`
  - `.trellis/tmp/character-card-import-trust-evidence/character-card-import-preview-mobile.png`
  - `.trellis/tmp/character-card-import-trust-evidence/character-card-import-trust-visual-report.json`
- `npx -y react-doctor@latest . --verbose --diff` — sandbox failed with `ENOTCACHED`; escalated run was rejected by policy as untrusted third-party npm execution.

### Remaining risk

- The Playwright visual check used a static local harness because this legacy product modal is not currently exposed through a dedicated React Router route. Build/typecheck cover integration syntax; live owner-flow visual verification is still useful if/when the legacy product owner panel is mounted in a routed page.
