# Discover light reference search page

## Goal

Replace `/discover` in light theme with the approved `设计参考/search_light.png` design, matching the desktop reference as a 1:1 artboard while preserving the existing dark discover page behavior.

## Final implementation

- `/discover` light theme delegates to `frontend/app/components/discover-light-real-dom.tsx`.
- The top navigation is the shared `LightReferenceTopNav` component used by both light homepage and light discover.
- Runtime keeps only the shared nav backing slice as a screenshot slice: `discover-light-slice-01a-nav-bar.png` / `-2x.png`.
- The body is a complete real-DOM replacement with five owned sections:
  - `sidebar`
  - `main-search`
  - `main-card-grid`
  - `right-rail`
  - `bottom-band`
- The body no longer imports the whole-body image or body section screenshot fragments at runtime.
- High-fidelity visual pieces that are legitimate image content are cropped as project-local 1x/2x elements under `frontend/app/assets/discover/light/elements/`:
  - 8 card covers
  - 5 recommendation thumbnails
  - sidebar orb and radar decorations
  - activity wave
  - bottom city decoration
- Each formal element has a same-directory `reference-only` prompt/provenance sidecar.
- Real controls remain accessible: shared nav controls, real search input, filters, card links, recommendation links, sidebar links, and bottom stat links.

## Guardrails

- Use the reference image as visual source of truth; do not approximate the desktop composition with unrelated generated art.
- Keep functional links/controls as real DOM.
- Keep top navigation controls in the shared navigation component instead of duplicating them in page body.
- Do not introduce new UI libraries or map dependencies.
- Do not change backend APIs, schema, or dark theme discover behavior.
- Do not add platform-generated tavern/NPC/story content; the light reference content is a deterministic visual fixture for the approved design.

## Validation

Latest pass on 2026-05-09:

```powershell
node ./frontend/scripts/discover-light-reference-test.mjs
npm --prefix ./frontend run typecheck
npm --prefix ./frontend run build
node ./frontend/scripts/playwright-discover-light-reference-check.mjs
```

Additional regression commands used during this task:

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
