# Homepage Dynamic Data Boundary

## Scope

Use this when changing the `/` home route data binding or homepage aggregate API clients.

## Contract

- `frontend/app/routes/home.tsx` fetches tavern cards, platform stats, and recent memories in parallel.
- Failure of `/api/v1/platform/stats` or `/api/v1/platform/recent-memories` must not block the tavern list or primary home rendering.
- API parsing stays in `frontend/app/lib/taverns.ts`; route UI must not parse `{data, meta}` envelopes directly.
- Global metrics should prefer `/api/v1/platform/stats` values and fall back to the paged tavern list only when the stats call fails.
- Recent memories should prefer public backend snippets and fall back to local featured-coordinate copy only when no snippets are available.
- Time-dependent hero labels must be initialized on the client after mount, not during initial render, to avoid hydration mismatch.

## Validation points

```powershell
npm --prefix .\frontend run typecheck
npm --prefix .\frontend test
npm --prefix .\frontend run build
```

Required assertions:

- TypeScript sees `getPlatformStats()` and `getPlatformRecentMemories()` as domain payloads returned by shared API clients.
- Home build succeeds with both light and black reference components using the same dynamic props.
