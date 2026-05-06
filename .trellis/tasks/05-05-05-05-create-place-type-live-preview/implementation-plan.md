# Implementation plan

1. Add a failing source-level regression in `frontend/scripts/create-wizard-route-test.mjs` to require a right-side live preview marker and `activePlaceType` usage.
2. Update `frontend/app/routes/create.tsx` so the right rail derives its AI draft helper, preview overlay, first NPC card, checklist labels, and reserved/private hint from `activePlaceType`.
3. Add a Playwright desktop/mobile visual check that clicks multiple place types and verifies the right rail updates each time.
4. Run frontend script tests, full frontend test suite, typecheck, build, and Playwright self-acceptance.
