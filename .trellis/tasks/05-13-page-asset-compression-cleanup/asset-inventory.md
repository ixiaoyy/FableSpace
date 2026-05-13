# Asset Inventory and Optimization Evidence

## Scope

- Runtime asset root: `frontend/app/assets/soul-link-05-10/`.
- Page surfaces covered: homepage/discover shared SoulLink artboards and direct route imports.
- Method: lossless PNG recompression via Pillow (`optimize=True`, `compress_level=9`) plus scoped deletion of confirmed unused/duplicate PNGs.
- Excluded from mutation: `frontend/public/place-atmosphere-hd/*.png` and `frontend/app/assets/npc-style-cast/portraits-hd/commission-zhideng.png`; trial lossless recompression produced 0-byte savings, and NPC assets keep prompt sidecar hashes untouched.

## Size result

- Deleted assets: 17 files, 12,446,338 bytes (11.87 MiB).
- Optimized assets: 30 files, 1,982,789 bytes (1.89 MiB).
- Total working-tree payload reduction: 14,429,127 bytes (13.76 MiB).

## Deleted assets

| Path | Removed bytes | Reason |
| --- | ---: | --- |
| `frontend/app/assets/soul-link-05-10/home-black/invite-card-2x.png` | 1,999,695 | Duplicate of `home-black/invite-card.png`; black theme now reuses 1x material for `srcSet`. |
| `frontend/app/assets/soul-link-05-10/home-light/icon-arrow-glow.png` | 2,048,382 | No live frontend source/test reference after manifest cleanup; obsolete generated icon variant. |
| `frontend/app/assets/soul-link-05-10/home-light/icon-bell-glow.png` | 2,070,978 | No live frontend source/test reference after manifest cleanup; obsolete generated icon variant. |
| `frontend/app/assets/soul-link-05-10/home-light/icon-book-glow.png` | 8,359 | No live frontend source/test reference after manifest cleanup; obsolete generated icon variant. |
| `frontend/app/assets/soul-link-05-10/home-light/icon-bookmark-glow.png` | 6,964 | No live frontend source/test reference after manifest cleanup; obsolete generated icon variant. |
| `frontend/app/assets/soul-link-05-10/home-light/icon-drop-glow.png` | 2,101,034 | No live frontend source/test reference after manifest cleanup; obsolete generated icon variant. |
| `frontend/app/assets/soul-link-05-10/home-light/icon-home-glow.png` | 13,461 | No live frontend source/test reference after manifest cleanup; obsolete generated icon variant. |
| `frontend/app/assets/soul-link-05-10/home-light/icon-pin-glow.png` | 2,065,732 | No live frontend source/test reference after manifest cleanup; obsolete generated icon variant. |
| `frontend/app/assets/soul-link-05-10/home-light/icon-play-glow.png` | 5,524 | No live frontend source/test reference after manifest cleanup; obsolete generated icon variant. |
| `frontend/app/assets/soul-link-05-10/home-light/icon-search-glow.png` | 2,053,463 | No live frontend source/test reference after manifest cleanup; obsolete generated icon variant. |
| `frontend/app/assets/soul-link-05-10/icons/nav-anchors.png` | 11,612 | No live frontend source/test reference; obsolete PNG nav icon set replaced by DOM/CSS/icons. |
| `frontend/app/assets/soul-link-05-10/icons/nav-create.png` | 11,575 | No live frontend source/test reference; obsolete PNG nav icon set replaced by DOM/CSS/icons. |
| `frontend/app/assets/soul-link-05-10/icons/nav-discover.png` | 12,231 | No live frontend source/test reference; obsolete PNG nav icon set replaced by DOM/CSS/icons. |
| `frontend/app/assets/soul-link-05-10/icons/nav-echoes.png` | 7,232 | No live frontend source/test reference; obsolete PNG nav icon set replaced by DOM/CSS/icons. |
| `frontend/app/assets/soul-link-05-10/icons/nav-home.png` | 9,266 | No live frontend source/test reference; obsolete PNG nav icon set replaced by DOM/CSS/icons. |
| `frontend/app/assets/soul-link-05-10/icons/nav-memory.png` | 12,677 | No live frontend source/test reference; obsolete PNG nav icon set replaced by DOM/CSS/icons. |
| `frontend/app/assets/soul-link-05-10/icons/nav-saved.png` | 8,153 | No live frontend source/test reference; obsolete PNG nav icon set replaced by DOM/CSS/icons. |

## Optimized assets

| Path | Before | After | Saved |
| --- | ---: | ---: | ---: |
| `frontend/app/assets/soul-link-05-10/home-black/guide-database-icon.png` | 1,479,138 | 1,364,359 | 114,779 |
| `frontend/app/assets/soul-link-05-10/home-black/guide-protocol-icon.png` | 1,542,237 | 1,418,659 | 123,578 |
| `frontend/app/assets/soul-link-05-10/home-black/guide-security-icon.png` | 1,523,859 | 1,392,844 | 131,015 |
| `frontend/app/assets/soul-link-05-10/home-black/hero-system-visual.png` | 2,472,313 | 2,419,515 | 52,798 |
| `frontend/app/assets/soul-link-05-10/home-black/invite-card.png` | 1,999,695 | 1,923,479 | 76,216 |
| `frontend/app/assets/soul-link-05-10/home-black/node-data-harbor.png` | 2,197,543 | 2,137,541 | 60,002 |
| `frontend/app/assets/soul-link-05-10/home-black/node-neon-ruins.png` | 2,356,231 | 2,301,776 | 54,455 |
| `frontend/app/assets/soul-link-05-10/home-black/node-old-platform.png` | 2,148,931 | 2,082,561 | 66,370 |
| `frontend/app/assets/soul-link-05-10/home-black/node-white-tower.png` | 2,114,819 | 2,039,899 | 74,920 |
| `frontend/app/assets/soul-link-05-10/home-black/recent-echo-waveform.png` | 1,161,208 | 1,055,291 | 105,917 |
| `frontend/app/assets/soul-link-05-10/home-black/user-avatar-node07.png` | 1,914,486 | 1,826,652 | 87,834 |
| `frontend/app/assets/soul-link-05-10/home-black/world-stats-sparkline.png` | 1,301,514 | 1,188,484 | 113,030 |
| `frontend/app/assets/soul-link-05-10/home-light/bg-paper-plane-soft.png` | 882,984 | 768,764 | 114,220 |
| `frontend/app/assets/soul-link-05-10/home-light/bg-plane-wash.png` | 839,879 | 721,293 | 118,586 |
| `frontend/app/assets/soul-link-05-10/home-light/card-envelope-soft.png` | 1,000,203 | 891,642 | 108,561 |
| `frontend/app/assets/soul-link-05-10/home-light/card-invite-soft.png` | 998,477 | 893,866 | 104,611 |
| `frontend/app/assets/soul-link-05-10/home-light/card-shield-soft.png` | 995,191 | 892,132 | 103,059 |
| `frontend/app/assets/soul-link-05-10/home-light/icon-compass-glow.png` | 19,904 | 19,522 | 382 |
| `frontend/app/assets/soul-link-05-10/home-light/icon-map-pin-glow.png` | 10,847 | 10,727 | 120 |
| `frontend/app/assets/soul-link-05-10/home-light/icon-message-glow.png` | 9,798 | 9,502 | 296 |
| `frontend/app/assets/soul-link-05-10/home-light/icon-plane-glow.png` | 7,371 | 7,308 | 63 |
| `frontend/app/assets/soul-link-05-10/home-light/icon-pulse-bars-glow.png` | 2,369 | 2,284 | 85 |
| `frontend/app/assets/soul-link-05-10/home-light/invite-card-2x.png` | 1,835,669 | 1,743,761 | 91,908 |
| `frontend/app/assets/soul-link-05-10/home-light/invite-card.png` | 1,723,655 | 1,624,650 | 99,005 |
| `frontend/app/assets/soul-link-05-10/home-light/scene-library-cafe-wide.png` | 179,222 | 177,354 | 1,868 |
| `frontend/app/assets/soul-link-05-10/home-light/scene-library-sunlit.png` | 172,936 | 171,314 | 1,622 |
| `frontend/app/assets/soul-link-05-10/home-light/scene-library-wide.png` | 2,184,976 | 2,125,603 | 59,373 |
| `frontend/app/assets/soul-link-05-10/home-light/scene-sea-lane.png` | 191,733 | 189,493 | 2,240 |
| `frontend/app/assets/soul-link-05-10/home-light/scene-sky-city-balcony.png` | 2,788,245 | 2,674,402 | 113,843 |
| `frontend/app/assets/soul-link-05-10/home-light/scene-train-platform-rain.png` | 167,352 | 165,319 | 2,033 |

## Reference checks

- Deleted filenames were checked repo-wide with hidden files included, excluding `.git`, `node_modules`, and build outputs, after manifest cleanup.
- Remaining references are limited to this Trellis evidence file/report and the regression assertion in `frontend/scripts/soul-link-reference-artboards-test.mjs` that `home-black/invite-card-2x.png` remains deleted.
- `frontend/app/assets/soul-link-05-10/manifest.json` was refreshed; all manifest `path` entries and manifest `source` paths exist and their SHA-256 values match current bytes.
- `home-light/icon-compass-glow.png` was intentionally kept because `discover/cards/card-compass-square.png` records it as a source asset in the manifest.

## Validation

- `node .\frontend\scripts\soul-link-reference-artboards-test.mjs` — PASS.
- `node .\frontend\scripts\home-visual-density-test.mjs` — PASS.
- `node .\scripts\visual-assets-test.mjs` from `frontend/` — PASS. Note: the same script run from repo root fails because it resolves `public/...` relative to cwd; reran with the expected frontend cwd.
- `npm --prefix .\frontend test` — PASS.
- `npm --prefix .\frontend run typecheck` — PASS.
- `npm --prefix .\frontend run build` — PASS.
- `py -3 .\.trellis\scripts\task.py validate .trellis\tasks\05-13-page-asset-compression-cleanup` — PASS.
- `git diff --check -- .trellis/tasks/05-13-page-asset-compression-cleanup frontend/app/assets/soul-link-05-10 frontend/app/components/soul-link-reference-artboards.tsx frontend/scripts/soul-link-reference-artboards-test.mjs` — PASS with existing CRLF normalization warnings for the two edited frontend text files.

## Visual review note

No lossy compression, resize, crop, or UI layout redesign was applied. Pixel dimensions are unchanged and route/build tests passed, so no browser visual diff was required for this cleanup-only task.
