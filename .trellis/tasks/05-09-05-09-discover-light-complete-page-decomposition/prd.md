# Discover light complete page decomposition

## Goal

Finish decomposing the approved `/discover` bright-theme reference page so it is no longer one large body image or a set of body screenshot fragments under the shared nav. The runtime should reflect real frontend page ownership while preserving the desktop `search_light.png` visual result.

## Final runtime structure

| Section | Runtime representation |
| --- | --- |
| `nav` | Shared `LightReferenceTopNav` using the nav backing slice |
| `sidebar` | Real DOM links/copy plus cropped orb/radar decorations |
| `main-search` | Real search input, filter controls, and more-filter control |
| `main-card-grid` | Real card links/copy/chips/stats plus cropped card cover images |
| `right-rail` | Real recommendation/activity/signal panels plus cropped thumbnails/wave |
| `bottom-band` | Real load-more/stat links plus cropped city decoration |

## Asset policy

- Old body slices remain in the repository as provenance/reference from the decomposition process.
- Runtime code does **not** import the whole-body screenshot or body section fragments.
- Runtime code imports 17 focused `elements/` bitmaps for real image content only, each with a 2x sibling and prompt sidecar.

## Guardrails

- Deterministic implementation from the approved design, not a product/content invention.
- No new UI frameworks or map dependencies.
- No backend/API/schema changes.
- Dark theme `/discover` ProductShell remains unchanged.

## Validation

Latest pass on 2026-05-09:

```powershell
node ./frontend/scripts/discover-light-reference-test.mjs
npm --prefix ./frontend run typecheck
npm --prefix ./frontend run build
node ./frontend/scripts/playwright-discover-light-reference-check.mjs
```

Regression commands also used during this work:

```powershell
node ./frontend/scripts/home-visual-density-test.mjs
node ./frontend/scripts/home-pc-polish-test.mjs
node ./frontend/scripts/homepage-dynamic-entry-test.mjs
node ./frontend/scripts/discover-view-mode-test.mjs
node ./frontend/scripts/discover-pc-polish-test.mjs
node ./frontend/scripts/playwright-discover-board-height-check.mjs
```

## Playwright artifacts

- Report: `D:/work/ai-/.trellis/tasks/05-09-05-09-discover-light-reference-search-page/artifacts/playwright/report.md`
- Desktop screenshot: `D:/work/ai-/.trellis/tasks/05-09-05-09-discover-light-reference-search-page/artifacts/playwright/discover-light-reference-desktop.png`
- Mobile/narrow screenshot: `D:/work/ai-/.trellis/tasks/05-09-05-09-discover-light-reference-search-page/artifacts/playwright/discover-light-reference-mobile.png`
