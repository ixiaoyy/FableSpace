# Implementation Plan

## Slice 1 — RED tests / contracts

1. Update static test expectations before production code:
   - visitor `tavern.tsx` must not pass `ownerPanel`.
   - `TavernChatWorkbench` must not declare/render owner management.
   - new manage route must exist and must not import/render `TavernChatWorkbench`.
   - owner dashboard must link to `/tavern/:id/manage?owner_id=...`.
2. Run focused scripts and verify they fail for the current implementation.

## Slice 2 — Route and component split

1. Extract existing Roleplay / Home / Visitor Notes owner panels into `frontend/app/features/tavern-owner-management/index.tsx`.
2. Add `frontend/app/routes/tavern-manage.tsx` with owner-gated loader and management-only UI.
3. Register route `tavern/:tavernId/manage` in `frontend/app/routes.ts`.
4. Simplify `frontend/app/routes/tavern.tsx` to visitor chat route only.
5. Remove `ownerPanel` prop and owner management rendering from `TavernChatWorkbench`.
6. Update owner dashboard links and labels.

## Slice 3 — Spec sync and verification

1. Update `.trellis/spec/frontend/mobile-single-mainline.md` to state owner management uses dedicated manage route.
2. Run focused scripts, full frontend test, typecheck/build as feasible.
3. Run Playwright self-acceptance desktop and mobile, record screenshots/report.
4. Write completion/evidence note in the task directory.
