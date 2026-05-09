# Home light nav real search/action chrome

## Goal

Continue decomposing the approved 1:1 light homepage reference by replacing the right-side navigation chrome with maintainable frontend surfaces.

The user provided a clearer nav crop on 2026-05-09. This step follows the real header/nav component boundary and keeps the reference backing image only as alignment/texture support.

## Scope

- Keep `LightReferenceNav` as the navigation component boundary.
- Keep the approved nav backing image for now; do not redraw the whole page.
- Keep logo and menu labels in the existing real DOM/SVG text layer.
- Extract these right-side surfaces into real DOM/CSS chrome:
  - search pill with search icon, placeholder text, sparkle icon
  - theme toggle moon icon
  - `管理入口` label surface
  - purple `开始探索` CTA button surface
- Keep the actual clickable links/buttons in `data-home-light-nav-controls="real-links"` above the chrome layer.
- Update static route tests and the Playwright script contract for the new markers.

## Guardrails

- Do not replace body/Hero/section slices in this task.
- Do not remove the nav backing image until logo, menu, icons, and layout are all decomposed safely.
- Keep visual positioning measured against the original 958×72 nav artboard.
- Playwright visual self-check was not run because the user confirmed manual inspection is available; use static/build validation unless the user asks for browser screenshots.

## Validation

Passed on 2026-05-09:

```powershell
node .\frontend\scripts\home-visual-density-test.mjs
node .\frontend\scripts\home-pc-polish-test.mjs
node .\frontend\scripts\homepage-dynamic-entry-test.mjs
node .\frontend\scripts\home-links-test.mjs
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
```

## Next possible slice

Continue within the nav component boundary:

1. Replace logo block / compass icon with split asset + real text without changing layout.
2. Replace menu labels from SVG into regular DOM links if visual alignment remains acceptable.
3. After all visible nav elements are real frontend surfaces, remove or reduce the nav backing image.
