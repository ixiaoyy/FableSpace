# Shared light reference top navigation

## Goal

Make the bright-theme top navigation a shared frontend component, because `/` light homepage and `/discover` light search page use the same product navigation system: logo, menu items, search affordance, theme toggle, management entry, and primary "开始探索" action.

## Decision

Yes: this navigation should be common. The visual backing can still differ per reference image (`index_light.png` width 958 vs `search_light.png` width 1448), but the DOM ownership, real text layer, chrome overlays, and accessible links/buttons should live in one component: `LightReferenceTopNav`.

## Scope

- Add `frontend/app/components/light-reference-top-nav.tsx`.
- Use it from `frontend/app/routes/home.tsx` with `variant="home"`.
- Use it from `frontend/app/routes/discover.tsx` with `variant="discover"`.
- Split `/discover` light runtime artboard into:
  - `01a-nav-bar` shared-nav backing slice
  - `02-search-body` page body slice
- Keep the approved 1:1 image backing approach; do not redraw the whole page.
- Keep text, search chrome, theme toggle, manager entry, CTA, and nav links as real DOM/SVG overlays.

## Guardrails

- Do not change backend/API contracts.
- Do not change dark theme `/discover` ProductShell behavior.
- Keep body hotspots separate from nav hotspots; nav controls should not be duplicated in page-body hotspot groups.
- Keep same-directory prompt sidecars for newly introduced image slices.

## Validation

Passed on 2026-05-09:

```powershell
node .\frontend\scripts\discover-light-reference-test.mjs
node .\frontend\scripts\home-visual-density-test.mjs
node .\frontend\scripts\home-pc-polish-test.mjs
node .\frontend\scripts\homepage-dynamic-entry-test.mjs
node .\frontend\scripts\discover-view-mode-test.mjs
node .\frontend\scripts\discover-pc-polish-test.mjs
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
node .\frontend\scripts\playwright-discover-light-reference-check.mjs
node .\frontend\scripts\playwright-home-light-reference-check.mjs
node .\frontend\scripts\playwright-discover-board-height-check.mjs
```

## Playwright artifacts

- Discover report: `D:\work\ai-\.trellis\tasks\05-09-05-09-discover-light-reference-search-page\artifacts\playwright\report.md`
- Discover desktop: `D:\work\ai-\.trellis\tasks\05-09-05-09-discover-light-reference-search-page\artifacts\playwright\discover-light-reference-desktop.png`
- Discover mobile: `D:\work\ai-\.trellis\tasks\05-09-05-09-discover-light-reference-search-page\artifacts\playwright\discover-light-reference-mobile.png`
- Home report: `D:\work\ai-\.trellis\tasks\05-09-05-09-home-light-complete-section-boundaries\artifacts\playwright\report.md`
- Home desktop: `D:\work\ai-\.trellis\tasks\05-09-05-09-home-light-complete-section-boundaries\artifacts\playwright\home-light-reference-desktop.png`
- Home mobile: `D:\work\ai-\.trellis\tasks\05-09-05-09-home-light-complete-section-boundaries\artifacts\playwright\home-light-reference-mobile.png`
