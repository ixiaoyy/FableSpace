# Homepage Dynamic Entry Covers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace homepage hardcoded live-looking data with tavern-list-derived display data and use varied project-local atmosphere covers for homepage/discovery entry cards.

**Architecture:** Keep route API access in `frontend/app/lib/taverns.ts` via existing `listTaverns()`. Add one shared pure helper under `frontend/app/lib/` for homepage metrics, featured entry selection, and cover resolution. Reuse it from `home.tsx` and `discover.tsx`.

**Tech Stack:** React Router route modules, TypeScript route code, existing `/place-atmosphere/*.png` public assets, Node script regression tests, Vite build/typecheck.

---

### Task 1: Regression test first

**Files:**
- Create: `frontend/scripts/homepage-dynamic-entry-test.mjs`
- Modify: `frontend/package.json`

- [ ] Add script assertions that:
  - `frontend/app/routes/home.tsx` imports and calls `listTaverns`.
  - homepage route exports a loader.
  - the old `const metrics` and `const citySlices` static arrays are gone.
  - `frontend/app/lib/homepage-taverns.ts` exports `buildHomepageView`, `resolveHomepageTavernCover`, and references `/place-atmosphere/`.
  - `frontend/app/routes/discover.tsx` uses the shared cover resolver instead of `coverImages[index % coverImages.length]`.
- [ ] Run `node .\frontend\scripts\homepage-dynamic-entry-test.mjs` and confirm it fails before implementation.

### Task 2: Shared homepage/discovery helper

**Files:**
- Create: `frontend/app/lib/homepage-taverns.ts`

- [ ] Implement pure helpers:
  - `resolveHomepageTavernCover(tavern, index = 0)`.
  - `buildHomepageMetrics(taverns)`.
  - `buildFeaturedCitySlices(taverns, limit = 3)`.
  - `buildHomepageView(result, error)`.
- [ ] Use safe runtime normalization for unknown/empty tavern payloads.
- [ ] Prefer existing tavern fields only: `id`, `name`, `description`, `address`, `lat`, `lon`, `place_type`, `layout_style`, `characters`, `visit_count`, `status`, `is_open`.

### Task 3: Wire homepage route to real data

**Files:**
- Modify: `frontend/app/routes/home.tsx`

- [ ] Add `clientLoader()` that returns `{ result, error }` from `listTaverns()`.
- [ ] Use `useLoaderData()` and `buildHomepageView(...)`.
- [ ] Replace static `metrics` and `citySlices` with derived `homepage.metrics` and `homepage.featuredCitySlices`.
- [ ] Preserve visual hierarchy, mobile layout, and safe API-error copy.

### Task 4: Reuse cover resolver on discovery cards

**Files:**
- Modify: `frontend/app/routes/discover.tsx`

- [ ] Import `resolveHomepageTavernCover`.
- [ ] Replace `coverForIndex(index)` with `coverForTavern(tavern, index)` or direct resolver call.
- [ ] Keep the existing imported reference images only where they are still used by preview/radar surfaces.

### Task 5: Verify and document completion

**Files:**
- Modify: `.trellis/tasks/05-05-05-05-homepage-dynamic-entry-covers/completion.md`
- Update task metadata through `task.py finish` only after verification passes.

- [ ] Run `node .\frontend\scripts\homepage-dynamic-entry-test.mjs`.
- [ ] Run `npm --prefix .\frontend test`.
- [ ] Run `npm --prefix .\frontend run typecheck`.
- [ ] Run `npm --prefix .\frontend run build`.
- [ ] If visual verification is not run in browser/Playwright, explicitly report that limitation.

