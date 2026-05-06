# Homepage dynamic tavern data and varied entry covers

## Background

User observed that the native homepage feels hardcoded:

- Homepage metrics and featured entry cards are static marketing arrays in `frontend/app/routes/home.tsx`.
- The section titled `从地图进入未被看见的世界` shows fixed entries rather than real tavern data.
- Tavern/card entrance images can repeat, weakening the sense that map entries lead to distinct worlds.

Visual companion choice: user selected **A. 真实酒馆驱动（推荐）**.

## Goals

1. Drive homepage metrics from the existing `listTaverns()` API response where possible.
2. Build the homepage featured entry cards from real taverns instead of fixed `citySlices`.
3. Use varied project-local atmosphere images for entry covers, derived from tavern `place_type`, `layout_style`, or related existing fields.
4. Keep the real-coordinate tavern-entry language and avoid traditional map-app features.
5. Do not add backend fields, dependencies, generated images, or platform-authored new tavern content.

## Non-goals

- No backend schema/API changes.
- No new image generation.
- No rankings, social feeds, route planning, or combat/game stats.
- No broad homepage redesign outside the data/cover replacement.

## Acceptance criteria

- `frontend/app/routes/home.tsx` no longer uses fixed `metrics` / `citySlices` as the source of truth for live-looking numbers and entry cards.
- Homepage has a loader that calls `listTaverns()` and displays real tavern-derived cards; API failure degrades to a small safe fallback/empty state.
- Entry card cover images come from a shared resolver that maps tavern metadata to `/place-atmosphere/atmosphere-*.png`.
- Discovery card covers also use the shared resolver so the same issue is not duplicated there.
- A frontend script test proves the homepage imports `listTaverns`, derives homepage data, and avoids fixed fake city slices as primary data.
- Run:
  - `npm --prefix .\frontend test`
  - `npm --prefix .\frontend run typecheck`
  - `npm --prefix .\frontend run build`

