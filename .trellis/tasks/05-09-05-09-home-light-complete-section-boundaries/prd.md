# Home light complete page section boundaries

## Goal

Finish the current decomposition pass for the approved 1:1 light homepage by giving the entire page real frontend section ownership.

This is not a redraw. The high-resolution 1:1 slices remain the visual backing, while the runtime structure now reflects real page sections rather than a single body image stack plus one full-artboard hotspot overlay.

## Scope

- Keep `设计参考/index_light.png`-derived slice assets and the 958×1642 artboard contract.
- Keep the shared `LightReferenceTopNav` and its real nav controls/chrome from the shared navigation extraction task.
- Add complete page section grouping:
  - `nav`
  - `hero`
  - `featured-regions`
  - `ai-roles`
  - `memory-echoes`
  - `recommended-coordinates`
  - `cta-footer`
- Render body through `LightReferencePageSection` instead of mapping all body slices directly in `LightReferenceHome`.
- Move body click targets from the one full-artboard overlay into `LightReferenceSectionHotspots` owned by each body section.
- Convert original full-artboard hotspot coordinates to section-local percentages through `lightSectionHotspotStyle`.
- Preserve existing accessible labels and dynamic tavern card targets.

## Guardrails

- Do not approximate-redraw the visual design.
- Do not remove the approved slice backing images in this task.
- Do not change API/data contracts or tavern content behavior.
- Keep manual visual inspection as the acceptance path unless the user asks for Playwright screenshots.

## Validation

Passed on 2026-05-09:

```powershell
node .\frontend\scripts\home-visual-density-test.mjs
node .\frontend\scripts\home-pc-polish-test.mjs
node .\frontend\scripts\homepage-dynamic-entry-test.mjs
node .\frontend\scripts\home-links-test.mjs
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
git diff --check -- frontend/app/routes/home.tsx frontend/scripts/home-visual-density-test.mjs frontend/scripts/home-pc-polish-test.mjs frontend/scripts/homepage-dynamic-entry-test.mjs frontend/scripts/playwright-home-light-reference-check.mjs .trellis/tasks/05-09-05-09-home-light-complete-section-boundaries
node .\frontend\scripts\playwright-home-light-reference-check.mjs
```



Playwright artifacts:

- Report: `D:\work\ai-\.trellis\tasks\05-09-05-09-home-light-complete-section-boundaries\artifacts\playwright\report.md`
- Desktop screenshot: `D:\work\ai-\.trellis\tasks\05-09-05-09-home-light-complete-section-boundaries\artifacts\playwright\home-light-reference-desktop.png`
- Mobile screenshot: `D:\work\ai-\.trellis\tasks\05-09-05-09-home-light-complete-section-boundaries\artifacts\playwright\home-light-reference-mobile.png`
## Remaining possible refinement

The whole page now has frontend section boundaries. Further work should be smaller, visual-safe replacements inside each section, for example:

1. Replace nav logo/compass with project asset + real text.
2. Replace Hero headline/buttons/cards with real CSS/DOM while keeping the coordinate-stage image.
3. Replace featured/AI/memory/recommended card text layers with real DOM section by section.

