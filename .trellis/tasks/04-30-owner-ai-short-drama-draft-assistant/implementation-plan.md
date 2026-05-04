# Implementation Plan — Owner AI Short-drama Draft Assistant

Task: `04-30-owner-ai-short-drama-draft-assistant`  
Date: 2026-05-04

## Scope

Frontend-only MVP inside existing `GameplayManager`. The assistant creates a local, unpublished GameplayDefinition draft from tavern metadata and owner-provided conflict/tone fields. No backend/API/schema changes and no external AI call in this MVP.

## Approach

1. Add `frontend/app/product/shortDramaDraftAssistant.js` pure helper.
2. Add owner-facing assistant panel to `GameplayManager` before short-drama templates.
3. The generated gameplay uses existing `GameplayDefinition` fields only: `id`, `title`, `status`, `summary`, `entry_label`, `mode`, `owner_brief`, `nodes`, `completion`.
4. Draft always starts as `status: draft`, is inserted locally, and is only persisted by existing `保存玩法` action.
5. Add script test and wire into `frontend/package.json`.

## Guardrails

- No auto-publish or overwrite of existing gameplay.
- No external model call / token cost in this MVP.
- UI surfaces prompt safety, copyright/material, and cost risks before generation.
- Generated forbidden list blocks privacy collection, dangerous actions, RPG mechanics, platform autopublish, and external影视/名人/版权素材.

## Verification

- `node frontend/scripts/short-drama-draft-assistant-test.mjs`
- `npm --prefix .\frontend test`
- `npm --prefix .\frontend run typecheck`
- `npm --prefix .\frontend run build`
- Trellis context validation.
