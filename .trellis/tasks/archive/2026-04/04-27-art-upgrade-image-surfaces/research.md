# Art Upgrade Image Surfaces Research

## Goal

Inventory product surfaces that require real project-local image assets, compare them with the current repository state, and identify safe implementation slices that do not overlap with the paused affinity-system work.

## Relevant Specs

- `docs/IMAGE_ASSETS_SPEC.md`: canonical image categories, paths, dimensions, naming, and prompt templates.
- `.trellis/spec/frontend/image-asset-guidelines.md`: generated images are not deliverables until copied/transformed into repository paths.
- `.trellis/spec/frontend/npc-art-guidelines.md`: formal NPC roles require direct `avatar` or `sprites.neutral`; fallback art is display-only and does not make a shipped NPC complete.
- `.trellis/spec/frontend/index.md`: frontend image work must build and preserve narrow-screen behavior.
- `.trellis/spec/backend/quality-guidelines.md`: default seed payload changes need focused tests and must not add platform-generated tavern content beyond approved project seed/demo scope.

## Existing Assets

### NPC fallback portraits

`frontend/app/assets/npc-style-cast/portraits/` already contains optimized 256x256 PNGs:

- Generic fallback archetypes: `merchant-a/b`, `guardian-a/b`, `healer-a/b`, `scholar-a/b`, `wanderer-a/b`, `spirit-a/b`.
- Specific default/demo mappings: alien convenience store NPCs, commission board NPCs, and several newer custom portrait files.
- `frontend/app/features/tavern-npc-stage/portraitCatalog.ts` maps some default NPC ids to these fallback portraits, then falls back by archetype and deterministic variant.

Important boundary: these are UI fallback assets. Per `npc-art-guidelines.md`, they do not make formal default NPC seed payloads complete unless the seed itself references direct `avatar`/`sprites` assets.

### Mimi Nya formal assets

`frontend/public/assets/npcs/` contains:

- `mimi-nya-neutral.png`
- `mimi-nya-joy.png`
- `mimi-nya-anger.png`
- `mimi-nya-embarrassment.png`
- `mimi-nya-curiosity.png`

`backend/src/fablemap_api/core/default_taverns.py` directly references these paths for `char_pw_mimi_nya` through both `avatar` and `sprites` aliases. This is the current good example.

### Homepage/reference assets

`frontend/app/assets/homepage-reference/` contains the current homepage/marketing module imagery used by:

- `frontend/app/routes/home.tsx`
- `frontend/app/routes/discover.tsx`
- `frontend/app/routes/create.tsx`
- `frontend/app/features/tavern-layout-showcase/index.tsx`

These are already project-local imports and build-safe.

## Gaps Found

### P0: Formal default NPC seed art

Current default public-welfare taverns contain 12 formal NPCs. Only one has complete direct seed art:

| Tavern | Character | Direct avatar/sprites status |
| --- | --- | --- |
| `pw_lantern_helpdesk` | `char_pw_xiaozhou` / 小舟 | missing direct `avatar` and `sprites.neutral` |
| `pw_midnight_treehole` | `char_pw_anlan` / 安澜 | missing direct `avatar` and `sprites.neutral` |
| `pw_community_repair` | `char_pw_ahuai` / 阿槐 | missing direct `avatar` and `sprites.neutral` |
| `pw_community_repair` | `char_pw_heguang` / 和光 | missing direct `avatar` and `sprites.neutral` |
| `pw_lost_found_archive` | `char_pw_wenjian` / 闻笺 | missing direct `avatar` and `sprites.neutral` |
| `pw_third_shelf_observatory` | `char_pw_9_delta` | missing direct `avatar` and `sprites.neutral` |
| `pw_third_shelf_observatory` | `char_pw_mu_mu` | missing direct `avatar` and `sprites.neutral` |
| `pw_third_shelf_observatory` | `char_pw_v17` | missing direct `avatar` and `sprites.neutral` |
| `pw_third_shelf_observatory` | `char_pw_pi_pi` | missing direct `avatar` and `sprites.neutral` |
| `pw_midnight_commission_board` | `char_pw_mozhan` / 墨栈 | missing direct `avatar` and `sprites.neutral` |
| `pw_midnight_commission_board` | `char_pw_zhideng` / 栀灯 | missing direct `avatar` and `sprites.neutral` |
| `pw_jingan_catbell_refuge` | `char_pw_mimi_nya` / 眯眯喵桑 | complete: avatar + neutral + joy/anger/embarrassment/curiosity aliases |

Recommended implementation split:

1. Small safe slice: add tests that document the current failing direct-art contract for default NPCs.
2. Asset slice: generate/copy project-local direct assets under `frontend/public/assets/npcs/`.
3. Seed slice: wire `avatar` and `sprites` in `default_taverns.py`.
4. Verification slice: focused seed asset test + frontend build.

### P0: Missing public default avatar file

`frontend/app/product/TavernEntryPanel.jsx` references `/assets/default-avatar.png`, but `frontend/public/assets/default-avatar.png` does not exist.

This creates a likely 404 when an entry-panel character lacks `avatar`.

Safe fixes:

- Preferred: update the entry panel to reuse the same `sprites.neutral || avatar || image_url || first sprite` order, then render an initial placeholder when no image exists.
- Alternative: add a project-local `frontend/public/assets/default-avatar.png`. This is less aligned with the current "no abstract placeholders" NPC art rule unless it is real tavern-themed NPC art.

Avoid touching `TavernContextPanel.jsx` while affinity work is in progress because that file already has uncommitted affinity changes.

### P1: Place atmosphere assets not implemented

`docs/IMAGE_ASSETS_SPEC.md` defines `frontend/public/place-atmosphere/` and 10 atmosphere images, but the directory does not exist.

No code references `place-atmosphere` today. This is a clear future slice:

1. Generate/place images under `frontend/public/place-atmosphere/`.
2. Add a mapping helper from tavern/place type or theme to atmosphere URL.
3. Wire only after product surface is chosen, so assets do not become unused baggage.

### P1/P2: Tavern card and platform entry imagery

Native home/discover/create/layout-showcase already use imported homepage reference assets. Current remaining issues are less about missing files and more about whether card images are semantically matched to specific taverns.

Potential future work:

- Add per-default-tavern cover/atmosphere mapping for public demo taverns.
- Keep `Tavern.cover` schema work out of this task unless separately approved, because the PRD explicitly says not to change persistence schema.

## Recommended Next Slice

The safest non-overlapping implementation slice is:

1. Fix `TavernEntryPanel.jsx` missing `/assets/default-avatar.png` reference by using local placeholder markup instead of a missing public image.
2. Add or update a small frontend script test if there is an existing service/helper path to cover image fallback logic.
3. Run `npm --prefix .\frontend run build`.

The highest-value but larger slice is:

1. Generate direct project-owned NPC assets for the 11 incomplete default NPCs.
2. Store them under `frontend/public/assets/npcs/`.
3. Wire `avatar` and expression `sprites` in `backend/src/fablemap_api/core/default_taverns.py`.
4. Add focused backend asset-existence tests.
5. Run `py -3 -m compileall -q backend/src`, focused pytest, and `npm --prefix .\frontend run build`.

## Files Likely To Modify

Small safe slice:

- `frontend/app/product/TavernEntryPanel.jsx`
- Optional frontend script test if an appropriate helper is introduced.

Larger NPC completion slice:

- `backend/src/fablemap_api/core/default_taverns.py`
- `backend/tests/test_default_public_welfare_taverns.py` or a new focused default NPC asset test
- `frontend/public/assets/npcs/*.png`

Place atmosphere slice:

- `frontend/public/place-atmosphere/*.png`
- A future frontend mapping/helper file once a concrete display surface is selected

## Verification Plan

For research/context only:

- Check task files exist and current task points to `04-27-art-upgrade-image-surfaces`.

For small frontend fallback fix:

- `npm --prefix .\frontend run build`

## Implementation Note

2026-04-27 small safe slice completed:

- `frontend/app/product/TavernEntryPanel.jsx` no longer references missing `/assets/default-avatar.png`.
- Entry character preview now resolves image URLs as `sprites.neutral || avatar || image_url || imageUrl || first sprite`.
- Characters with no image now render an existing project-local tavern-themed NPC fallback portrait in the existing avatar ring. This is display-only and does not write fallback art into `TavernCharacter`.
- Verified with `npm --prefix .\frontend run build` and `npm --prefix .\frontend run typecheck`.

2026-04-27 default public-welfare NPC neutral asset slice completed:

- Promoted existing project-local tavern-themed NPC portraits into stable public asset URLs under `frontend/public/assets/npcs/` for the 11 default public-welfare NPCs that previously had no direct seed art.
- `backend/src/fablemap_api/core/default_taverns.py` now fills `avatar` and `sprites.neutral` for those built-in NPC IDs.
- `backend/src/fablemap_api/core/tavern.py` backfills missing built-in public-welfare character art in old stores without overwriting custom avatar or sprite values.
- `tests/test_default_public_welfare_taverns.py` now verifies every default public-welfare character has a direct `avatar`, a direct `sprites.neutral`, and a repository PNG asset.
- The same test also enforces per-character neutral asset uniqueness by URL and SHA-256 hash, so different default NPCs cannot silently share one copied bitmap.
- This slice does not claim full expression completion for the 11 NPCs. Happy/angry/shy/curious expression variants remain a follow-up P0 gap unless generated as distinct project assets and wired into `sprites`.
- Verified with `py -3 -m compileall -q backend/src`, `py -3 -m pytest -q tests/test_default_public_welfare_taverns.py --tb=short`, and `npm --prefix .\frontend run build`.

2026-04-27 check continuation:

- Replaced the temporary letter-avatar entry-panel fallback with the existing `frontend/app/assets/npc-style-cast/portraits/merchant-a.png` portrait import so the no-image path also uses real tavern-themed NPC art.
- Re-verified current slice with `py -3 -m compileall -q backend/src`, `py -3 -m pytest -q tests/test_default_public_welfare_taverns.py --tb=short`, `npm --prefix .\frontend run typecheck`, and `npm --prefix .\frontend run build`.
- Asset audit confirmed all current `frontend/public/assets/npcs/*.png` files are valid PNGs; the 11 default public-welfare neutral assets are 256x256 and Mimi Nya's expression assets are 512x512.
- Recent files in `$env:USERPROFILE\.codex\generated_images` do not hash-match current project files because adopted deliverables were resized/optimized before being saved into repository paths. No runtime code references `.codex/generated_images`.

2026-04-28 expression asset completion slice completed:

- Added 52 project-local expression sprite PNGs under `frontend/public/assets/npcs/` for the 13 non-Mimi default public-welfare NPCs that already had direct neutral assets.
- `backend/src/fablemap_api/core/default_taverns.py` now derives and wires both semantic keys (`happy`, `angry`, `shy`, `curious`) and current expression-engine keys (`joy`, `anger`, `embarrassment`, `curiosity`) from each default NPC neutral asset URL.
- `tests/test_default_public_welfare_taverns.py` now fails if any default public-welfare NPC lacks direct expression assets, if semantic/engine aliases diverge, or if neutral/expression sprites hash to the same bitmap.
- Asset audit confirmed 13 default NPC groups each have `neutral`, `joy`, `anger`, `embarrassment`, and `curiosity` files, with no missing expressions and distinct hashes per character/expression set.
- This slice used deterministic project-local derivative sprites from existing approved neutral portraits; no new files from `$env:USERPROFILE\.codex\generated_images` were adopted in this session.
- Verified with `py -3 -m compileall -q backend/src`, `py -3 -m pytest -q tests/test_default_public_welfare_taverns.py --tb=short`, `npm --prefix .\frontend run typecheck`, and `npm --prefix .\frontend run build`.

For default NPC direct asset wiring:

- `py -3 -m compileall -q backend/src`
- Focused default NPC asset pytest
- `npm --prefix .\frontend run build`

For generated image tasks:

- Verify project path existence, dimensions/format, hashes or mtimes.
- Audit `$env:USERPROFILE\.codex\generated_images` and map adopted images to repository files.
