# Black theme home/search reference alignment

## Goal

Adjust the black/cyber theme homepage and search/discover page to match `设计参考/index.png` and `设计参考/search.png` at the same structural level as the current light theme, while keeping layout logic reusable between light and black themes.

## Requirements

- Black theme homepage follows the same section/template contract as the light homepage.
- Black theme search/discover page follows the same section/template contract as the light search/discover page.
- Do not rebuild two independent dark-only layouts when shared section maps and shared chrome can handle the difference.
- Replace theme-specific visual assets and limited style tokens only: colors, backing images/slices, and tone-specific chrome.
- Preserve real tavern-derived links/data and accessible controls.
- Preserve mobile/narrow behavior and avoid horizontal overflow.
- Do not change backend/schema/product semantics.

## Acceptance Criteria

- [x] `/` in black theme renders an index reference-aligned dark/cyber surface based on `设计参考/index.png`.
- [x] `/discover` in black theme renders a search reference-aligned dark/cyber surface based on `设计参考/search.png`.
- [x] Light theme continues to render the existing light reference surfaces.
- [x] Black pages do not use the rejected full-artboard hotspot shell; they reuse the same section-map/template model as light and swap black assets/tokens.
- [x] Homepage and search/discover links remain accessible and use real route targets.
- [x] Typecheck and frontend build pass.
- [x] Playwright desktop + mobile self-acceptance screenshots are saved for black home and black search/discover.

## Non-goals

- No backend/API/schema changes.
- No new third-party UI/map/state dependency.
- No broad cleanup of old intermediate assets unless required by runtime imports.

## Implementation Notes

- Added project-local black reference provenance assets copied from `设计参考/index.png` and `设计参考/search.png`, with 2x siblings and `reference-only` prompt sidecars.
- Added black runtime slices/elements for homepage and discover/search, with same-directory prompt sidecars.
- `HomeBlackReference` is now a lean page shell; black homepage section rendering lives in `home-black-sections.tsx`.
- `HomeBlackReference` uses the shared home section ids/template metadata (`HOME_BLACK_SECTIONS` paired with `HOME_LIGHT_SECTIONS`) and renders the Hero as one image-backed section plus lower real-DOM sections.
- `DiscoverBlackReference` is now a lean page shell; black discover/search section rendering lives in `discover-black-sections.tsx`.
- `DiscoverBlackReference` uses `DISCOVER_REFERENCE_SECTIONS`, the same section map as `DiscoverLightRealDom`, and renders sidebar/search/card-grid/right-rail/bottom-band as real DOM using black assets.
- `LightReferenceTopNav` remains the shared top-navigation component and now accepts `surface="black"` so black pages reuse the same nav layout with black-specific data markers and correct toggle label.
- Removed the rejected `ReferenceArtboard` full-image hotspot shell from runtime.
- `black-reference-test.mjs` now asserts the black page shells stay lean and compose extracted section components rather than becoming large single-file pages.
- Dark `/` routes to `HomeBlackReference`; light `/` continues to route to `HomeLightRealDom`.
- Dark `/discover` routes to `DiscoverBlackReference`; light `/discover` continues to route to `DiscoverLightRealDom`.

## Validation

Passed on 2026-05-09 after shared-template correction:

```powershell
node .\frontend\scripts\black-reference-test.mjs
node .\frontend\scripts\discover-light-reference-test.mjs
node .\frontend\scripts\home-visual-density-test.mjs
node .\frontend\scripts\homepage-dynamic-entry-test.mjs
node .\frontend\scripts\home-pc-polish-test.mjs
node .\frontend\scripts\home-links-test.mjs
node .\frontend\scripts\discover-pc-polish-test.mjs
node .\frontend\scripts\discover-view-mode-test.mjs
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
node .\frontend\scripts\playwright-black-reference-check.mjs
```

Playwright report:

- `D:\work\ai-\.trellis\tasks\05-09-05-09-black-theme-home-search-reference-alignment\artifacts\playwright\black-reference-report.md`

Screenshots:

- `D:\work\ai-\.trellis\tasks\05-09-05-09-black-theme-home-search-reference-alignment\artifacts\playwright\home-black-reference-desktop.png`
- `D:\work\ai-\.trellis\tasks\05-09-05-09-black-theme-home-search-reference-alignment\artifacts\playwright\home-black-reference-mobile.png`
- `D:\work\ai-\.trellis\tasks\05-09-05-09-black-theme-home-search-reference-alignment\artifacts\playwright\discover-black-reference-desktop.png`
- `D:\work\ai-\.trellis\tasks\05-09-05-09-black-theme-home-search-reference-alignment\artifacts\playwright\discover-black-reference-mobile.png`

## Risk / Follow-up

- Homepage black Hero is intentionally a single image-backed section to avoid the original right-side split seam; lower homepage sections and all discover body sections are real DOM on shared section templates.
- Some black homepage lower portrait cards currently reuse light portrait assets because `index.png` did not provide isolated black portrait crops in the current slice set; they can be replaced later without changing the shared template.
