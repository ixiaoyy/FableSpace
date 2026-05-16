# Visitor-first Discovery Page Reduction

## Result

Implemented the reduced visitor discovery flow.

## Completed Scope

- `/discover` passes `visitorReduced` to the FableMap reference artboard.
- Visitor mode caps discovery cards to top 3 and adds a clear `进入这个空间 →` CTA per card.
- Visitor mode removes world status, online entities, and feed/right-rail panels from the first screen.
- Reduced filter strip keeps only all/open/place-type style actions.
- Owner/operations summaries remain outside visitor discovery.

## Validation

- `node frontend/scripts/visitor-first-discovery-test.mjs`: PASS.
- `npm --prefix .rontend run typecheck`: PASS.
- `npm --prefix .\frontend test`: PASS; `npm --prefix .\frontend run build`: PASS.

## Spec

- `.trellis/spec/frontend/visitor-first-discovery-reduction.md`
