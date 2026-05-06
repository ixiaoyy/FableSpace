# Completion: Homepage dynamic tavern data and varied entry covers

## Summary

- Replaced homepage live-looking static metrics and featured entry card source with tavern-list-derived view data.
- Added shared `homepage-taverns` helper for homepage metrics, featured tavern selection, and deterministic varied atmosphere covers.
- Reused the same cover resolver from the discovery card view so map-entry cards do not keep cycling through a tiny fixed image list.
- Extended the project-local atmosphere resolver to cover canonical FableMap `place_type` values such as `hospital`, `bookstore`, `restaurant`, and `convenience-store`.

## Verification

```powershell
node .\frontend\scripts\homepage-dynamic-entry-test.mjs
node .\frontend\scripts\home-links-test.mjs
npm --prefix .\frontend test
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
node .\.trellis\tasks\05-05-05-05-homepage-dynamic-entry-covers\artifacts\playwright-check.mjs
```

Results:

- `homepage-dynamic-entry-test`: ok.
- `home-links-test`: ok.
- `npm --prefix .\frontend test`: ok.
- `npm --prefix .\frontend run typecheck`: ok. Final successful run required escalation after sandbox `spawn EPERM` on Tailwind/Vite native dependency loading.
- `npm --prefix .\frontend run build`: ok. Final successful run required escalation after sandbox `spawn EPERM` on Tailwind/Vite native dependency loading.
- Playwright desktop/mobile self-acceptance: ok with mocked tavern API payload, 3 unique entry cover images, no hardcoded metrics/city text, and 0 console errors.

## Artifacts

- `.trellis/tasks/05-05-05-05-homepage-dynamic-entry-covers/artifacts/playwright-report.json`
- `.trellis/tasks/05-05-05-05-homepage-dynamic-entry-covers/artifacts/desktop.png`
- `.trellis/tasks/05-05-05-05-homepage-dynamic-entry-covers/artifacts/mobile.png`

## Notes / risks

- No backend schema or API contract changes.
- No new generated images were created.
- Runtime homepage data depends on `/api/v1/taverns`; API errors now degrade to a safe empty state instead of fake live-looking numbers.

## Follow-up fix: repeated covers

User screenshot showed the first two homepage entry cards still using the same cover image. Root cause: the first implementation resolved each tavern cover independently, so two taverns with the same atmosphere metadata could still resolve to the same asset.

Fix:

- Added `usedCovers` / `findUnusedHomepageCover(...)` list-level allocation.
- Exported `resolveUniqueHomepageTavernCovers(...)`.
- Homepage featured cards and discovery card board now allocate covers as a list and choose an unused project-local fallback when metadata resolves to a duplicate.
- Updated Playwright fixture to force duplicate `fantasy_type: "judgement"` metadata and verified the rendered homepage still shows 3 unique card images.

Additional verification:

- `npm --prefix .\frontend test`: ok.
- `npm --prefix .\frontend run typecheck`: ok.
- `npm --prefix .\frontend run build`: ok.
- Playwright desktop/mobile self-acceptance: ok; report confirms card images are `atmosphere-judgement`, `atmosphere-market`, and `atmosphere-lore` with `uniqueImageCount: 3`.
