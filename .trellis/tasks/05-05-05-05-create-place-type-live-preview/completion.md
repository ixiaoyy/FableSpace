# Completion note

## Root cause

The left place-type cards updated `placeType` and `activePlaceType`, but the right rail still rendered static tavern-oriented cards: AI draft copy, street preview caption, first NPC card, and checklist. The state existed; the right rail simply did not consume it.

## Changed files

- `frontend/app/routes/create.tsx`
  - Added `data-create-live-preview` and `data-active-place-type-preview` markers.
  - Rewired the right rail to use `activePlaceType.label`, `shortLabel`, `tone`, `description`, `cardClass`, and `reserved`.
  - Updated AI draft helper/lifecycle, preview overlay, first NPC card, checklist labels, and private/default hint to follow the selected type.
- `frontend/scripts/create-wizard-route-test.mjs`
  - Added regression checks that the right rail uses `activePlaceType` and no longer keeps tavern-only hardcoded preview copy.
- `.trellis/tasks/05-05-05-05-create-place-type-live-preview/artifacts/playwright-check.mjs`
  - Added browser assertions that switching 酒馆 → 餐馆 → 医院 → Home → 餐馆 updates the right rail on desktop and mobile.

## Verification

- `node .\frontend\scripts\create-wizard-route-test.mjs` — failed before implementation on missing live preview marker, then passed.
- `npm --prefix .\frontend test` — passed.
- `npm --prefix .\frontend run typecheck` — passed after running outside sandbox; sandbox has known Vite/Tailwind native `spawn EPERM` limitation.
- `npm --prefix .\frontend run build` — passed after running outside sandbox.
- Playwright visual self-acceptance — passed for desktop and mobile.
  - Report: `D:\work\ai-\.trellis\tasks\05-05-05-05-create-place-type-live-preview\artifacts\playwright-report.json`
  - Desktop screenshot: `D:\work\ai-\.trellis\tasks\05-05-05-05-create-place-type-live-preview\artifacts\desktop.png`
  - Mobile screenshot: `D:\work\ai-\.trellis\tasks\05-05-05-05-create-place-type-live-preview\artifacts\mobile.png`

## Notes

- The final Playwright screenshot intentionally leaves `餐馆` selected, matching the user-reported case.
- This change does not alter schema/API payloads; the hidden `place_type` input is preserved.
