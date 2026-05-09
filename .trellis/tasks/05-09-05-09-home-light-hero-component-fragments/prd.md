# Home light Hero component fragments

## Goal

Continue the accepted 1:1 reference decomposition using real frontend component boundaries instead of arbitrary image slicing.

This step keeps the Hero as one top-level section but decomposes its internal visual into two meaningful component fragments:

1. `HeroContentColumn` — the left content/CTA/metrics column.
2. `HeroCoordinateStage` — the right guide-character and coordinate-radar visual stage.

## Scope

Parent runtime section:

- `01b-hero-layout` — `y=72`, `height=398`

New runtime component fragments inside that section:

1. `01b1-hero-content-column` — `x=0`, `y=72`, `width=318`, `height=398`
2. `01b2-hero-coordinate-stage` — `x=318`, `y=72`, `width=640`, `height=398`

The fragments are rendered side by side inside the Hero section with percentage-based absolute placement. Together they reconstruct the original `01b-hero-main` area at 1:1. The old parent image remains as comparison/provenance only and is no longer imported at runtime.

## Design-boundary guardrails

- Split by actual frontend layout semantics: content column vs coordinate visual stage.
- Do not split decorative labels, character body parts, map panels, or CTAs into isolated arbitrary pieces.
- No redraw.
- No typography/button/illustration recreation.
- Keep source artboard visual 1:1.
- Keep full-artboard transparent hotspots so links are not clipped by component-fragment boundaries.
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

Continue by real frontend boundaries only:

- Hero internals can later become real DOM: content text/CTA/metrics and coordinate stage overlays.
- Or move to the next unsplit section and split only section header / card list / CTA surfaces, not decorative spacer-only strips.

