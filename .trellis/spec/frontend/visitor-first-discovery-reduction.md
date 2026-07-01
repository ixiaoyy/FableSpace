# Visitor-first Discovery Reduction

## Scope

Use this for `/discover` first-time visitor selection flow and FableSpace discover reference artboards.

## Contracts

- Default visitor `/discover` uses `visitorReduced` mode: map/search + top 3 space cards + one clear `进入这个空间 →` CTA per card. `?view=expanded` or owner-scoped discovery may opt into the expanded operational artboard.
- Visitor first screen must not render world status, online entities, feed/echo panels, footprint panels, rankings, or social activity streams.
- Filters in the reduced view stay to a small set of discoverable actions: clear/all, open/亮灯, and place-type exploration.
- Owner/operations summaries remain outside the visitor discovery first screen; expanded/operator views may show the right rail when explicitly requested.
- This reduction does not remove underlying owner-authored spaces or change API payload semantics.

## Validation

- `node frontend/scripts/visitor-first-discovery-test.mjs`
- `npm --prefix .\frontend run typecheck`
- `npm --prefix .\frontend run build`

## Affected Files

- `frontend/app/routes/discover.tsx`
- `frontend/app/components/fable-map-reference-artboards.tsx`
- `frontend/scripts/visitor-first-discovery-test.mjs`
