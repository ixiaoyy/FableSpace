# Discover/Home Layout Overlap Fix

## Result

Completed the layout-only bug fix and browser self-acceptance.

## Completed Scope

- Expanded discover view stacks the compact user card above the `世界状态` card inside the right rail.
- Default visitor `/discover` remains reduced; `?view=expanded` is available for expanded/operator visual checks.
- Home current-coordinate badge keeps the coordinate name in a dedicated one-line truncated span.

## Browser Evidence

- Report: `artifacts/playwright/discover-home-layout-overlap-fix/report.md`
- Discover expanded desktop: `artifacts/playwright/discover-home-layout-overlap-fix/discover-expanded-1440.png`
- Discover visitor mobile: `artifacts/playwright/discover-home-layout-overlap-fix/discover-visitor-mobile-390.png`
- Home desktop: `artifacts/playwright/discover-home-layout-overlap-fix/home-1440.png`

## Validation

- `node frontend/scripts/playwright-discover-home-layout-check.mjs`: PASS at `http://127.0.0.1:5188`.
- `npm --prefix .rontend run typecheck`: PASS.
- `npm --prefix .rontend run build`: PASS after current frontend changes.

## Follow-up Adjustment — SoulLink brand slice
- User clarified the design draft brand lockup should remain `SoulLink / 连接另一个数字世界`.
- The brand lockup is now a single raster placeholder at `frontend/app/assets/fable-map-05-10/brand/soullink-logo-low.png` instead of DOM-composed text.
- Replacement target: display size `164×62` CSS px; recommended source replacement `328×124` px (`2x`) or `492×186` px (`3x`) with the same aspect ratio.

## Follow-up Adjustment — Remove light theme runtime
- User rejected maintaining separate light/black layouts and requested deleting the poor light result.
- Home/discover routes now always render the black SoulLink artboard.
- Deleted light-only runtime resources/components:
  - `frontend/app/assets/fable-map-05-10/home-light/`
  - `frontend/app/assets/fable-map-05-10/discover/world-status/bg-light.png`
  - `frontend/app/components/home-light-real-dom.tsx`
  - `frontend/app/components/discover-light-real-dom.tsx`
  - `frontend/app/components/light-reference-top-nav.tsx`
  - `frontend/app/components/home-reference-layout.ts`
- Validation: `npm --prefix .\frontend run build` passed.
