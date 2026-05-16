# Discover card ReferenceError fix

## Goal
Fix runtime crash reported on `http://127.0.0.1:8950/assets/homepage-taverns-EkUQICWS.js`:

```text
ReferenceError: FableMapDiscoverCard is not defined
```

## Root cause
The cleanup commit removed the `FableMapDiscoverCard` function from `frontend/app/components/fable-map-reference-artboards.tsx`, but `DiscoverCardLinks` still referenced it when rendering `/discover` cards with `forceVisible`.

## Change
Restored `FableMapDiscoverCard` from the previous working implementation, scoped to discover card rendering only.

## Validation
- `npm --prefix .\frontend run build` passed.
- `npm --prefix .\frontend run typecheck` passed.
- Static Playwright interception visit to `/discover` passed with `errors: []`.
- `node frontend/scripts/playwright-soullink-visual-compare.mjs` passed: `similarityPercent = 100`, `errors = []`.
