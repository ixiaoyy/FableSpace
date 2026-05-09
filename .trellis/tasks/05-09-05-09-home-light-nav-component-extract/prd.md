# Home light nav component extract

## Goal

Continue the accepted 1:1 reference decomposition by extracting the navigation out of the generic page-body slice stream.

This is a code/component decomposition step, not a visual redraw. The navigation remains a 1:1 image slice from the approved `index_light` artboard, but it is now represented as its own `LightReferenceNav` boundary with its own hotspot builder.

## Scope

Before this step:

- `01a-nav-bar` was a row inside the generic `lightHomeSlices` / body mapping.
- Navigation hotspots lived inline with the rest of the page hotspots.

After this step:

1. `lightHomeNavSlice` owns the nav asset metadata.
2. `LightReferenceNav` renders only the navigation boundary.
3. `lightReferenceNavHotspots()` owns the nav interaction hotspots.
4. `lightHomeBodySlices` renders the remaining page body from Hero downward.
5. The artboard still exposes total slice count `12`, and the full-page overlay still keeps all hotspots aligned to the original 958×1642 reference.

## Guardrails

- No redraw.
- No CSS/HTML approximation of the nav yet.
- Do not split nav internals into logo/menu/search/buttons at this stage; they remain one Header/Nav boundary.
- Keep source artboard visual 1:1.
- Keep full-artboard transparent hotspots so existing links remain aligned.
- Playwright visual self-check was not run because the user confirmed they can manually inspect; use static/build validation only unless the user asks for a screenshot/self-check.

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

Continue extracting true frontend boundaries only:

- Promote Hero content/coordinate stage hotspots into their own helper groups.
- Or extract the featured-region section into `FeaturedRegionHeader` + `FeaturedRegionGrid` boundaries while still using 1:1 source fragments.

