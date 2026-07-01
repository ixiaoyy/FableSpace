# Preset Import Preview / Apply UI Boundary

## Scope

Use this spec when changing the owner-facing preset import modal, frontend
preset import service methods, or script tests for the preview/apply contract.

## Service contract

Shared typed clients belong in `frontend/app/lib/spaces.ts`:

```typescript
previewPresetImport(spaceId, data, userId)
applyPresetImport(spaceId, data, userId)
```

Product-parity helpers in `frontend/app/product/services/spaceService.js`
should expose the same methods when product components or script tests need
them.

Endpoints:

```http
POST /api/v1/spaces/{space_id}/preset-import/preview
POST /api/v1/spaces/{space_id}/preset-import/apply
```

## UI contract

`PresetImportPreviewModal` must:

- Open only from owner surfaces (`SpaceOwnerPanel` card actions or advanced
  tools), not visitor chat controls.
- Parse pasted JSON client-side and show a readable parse error before calling
  the API when JSON is invalid.
- State clearly that preview produces a risk report first; live writes require
  owner selection, an apply diff, and an explicit confirm step.
- Show summary counts plus supported / warning / blocked groups.
- Make only supported items selectable. Warning / blocked items must remain
  visible but not selectable for direct apply.
- Let the owner choose supported-item targets (`prompt_blocks`, `world_info`,
  `characters`) and whether safe runtime parameters become a custom runtime
  preset.
- Display the apply diff before enabling final confirmation, with counts for
  Prompt Blocks / WorldInfo / Characters / Runtime Presets.
- Avoid showing owner API keys or secrets in UI copy.
- Keep loading, error, diff, and applied-result states visible.

## Forbidden patterns

- Direct `fetch` inside owner UI components instead of service helpers.
- Copy implying imported presets are automatically applied to live space state.
- Applying warning/blocked prompt blocks, runtime presets, world info,
  characters, memory, State Cards, or skill packs from the modal.
- Visitor-facing controls for importing or previewing owner-private prompts.

## Required verification

```powershell
node frontend/scripts/preset-import-preview-test.mjs
npm --prefix .\frontend test
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
```
