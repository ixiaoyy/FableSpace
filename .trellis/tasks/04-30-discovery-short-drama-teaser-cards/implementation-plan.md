# Implementation Plan — Discovery Short-drama Teaser Cards

Task: `04-30-discovery-short-drama-teaser-cards`  
Date: 2026-05-04

## Scope

Frontend-only MVP. Reuse existing `gameplay_definitions` from tavern payloads and only surface short-drama teasers when a tavern already has a published short-drama-like GameplayDefinition. No backend/API/schema changes.

## Approach

1. Add a shared derivation helper in `frontend/app/lib/short-drama-teasers.js`.
2. Reuse it from:
   - native `/discover` route cards/radar cards;
   - product-parity `WorldStageTavernDiscoveryLane.jsx`;
   - `TavernEntryPanel.jsx` for handoff before entering.
3. Keep CTA as a link/label to the tavern; actual play still happens through existing in-room `TavernGameplayLauncher`.
4. Add script test and wire it into `frontend/package.json`.

## Guardrails

- Teaser requires `status: published`; drafts are not shown.
- Teaser derives from owner-confirmed GameplayDefinition only.
- Not a recommendation algorithm or ranking signal.
- No platform-generated published content, token billing, visitor social graph, combat/levels/equipment.

## Verification

- `node frontend/scripts/short-drama-teasers-test.mjs`
- `npm --prefix .\frontend test`
- `npm --prefix .\frontend run typecheck`
- `npm --prefix .\frontend run build`
- `python task validate` equivalent using local Miniconda Python because WindowsApps `python` is unavailable in this shell.
