# Implementation Note: Visual Asset Rework

Date: 2026-04-29

## Implemented

- Added 10 project-local place atmosphere PNGs under `frontend/public/place-atmosphere/`.
- Added 5 project-local faction emblem SVGs under `frontend/public/faction-emblems/`.
- Added `frontend/app/product/services/atmosphereAssets.js` to resolve tavern/place types to served atmosphere URLs.
- Updated `frontend/app/product/TavernInterior.jsx` and `frontend/app/product/styles.css` so the interior shell uses project-local atmosphere imagery first, with CSS gradient as fallback.
- Added `frontend/scripts/visual-assets-test.mjs` and wired it into `npm --prefix .\frontend test`.
- Added regression coverage in `tests/test_default_public_welfare_taverns.py` for regenerated rejected public-welfare NPC asset hashes and 256×256 expression dimensions.
- Wrote review contact sheets to `artifacts/04-29-npc-expression-art-quality-rebuild/`:
  - `place-atmosphere-contact-sheet.png`
  - `forced-npc-expressions-contact-sheet.png`

## Asset source / target audit

This implementation generated the new atmosphere PNGs and faction SVGs directly into repository paths; no deliverable image remains only in `.codex/generated_images` or a temp directory.

Existing recent files under `%USERPROFILE%\.codex\generated_images` were audited during verification and are not referenced by runtime code in this change.

## Verification run

- `py -3 -m compileall -q backend/src`
- `py -3 -m pytest -q tests/test_default_public_welfare_taverns.py --tb=short` → 19 passed
- `npm --prefix .\frontend run build`
- `npm --prefix .\frontend test` → includes `visual-assets-test: ok`

## 2026-04-29 Trellis check continuation

- Ran `npm --prefix .\frontend run typecheck`; it initially failed on an existing `Button size="icon"` usage in `frontend/app/routes/home-me.tsx` because `frontend/app/ui/button.tsx` did not declare an `icon` size variant.
- Applied a minimal shared Button contract fix: added `icon: "h-11 w-11 p-0"` to `frontend/app/ui/button.tsx`.
- Re-ran validation:
  - `npm --prefix .\frontend run typecheck` → passed
  - `npm --prefix .\frontend run build` → passed
  - `npm --prefix .\frontend test` → passed, includes `visual-assets-test: ok`
  - `py -3 -m pytest -q tests/test_default_public_welfare_taverns.py --tb=short` → 19 passed
  - `py -3 -m compileall -q backend/src` → passed

## Open cleanup note

- `.claude/settings.local.json` has unrelated local changes and was not modified or reverted during this task check.

## 2026-04-29 Quality rejection note

The current `frontend/public/place-atmosphere/*.png` batch is rejected for visual quality. Although the files are project-local 512x288 PNGs and pass mechanical checks, they are procedurally drawn / icon-like scene placeholders, not high-quality fantasy watercolor or digital-painting atmosphere illustrations required by `docs/IMAGE_ASSETS_SPEC.md` and `AGENTS.md`.

Do not count this batch as accepted deliverables. The task remains open until all 10 place atmosphere assets are replaced with high-quality generated/illustrated scene art and re-verified in `TavernInterior.jsx`.

Rejected batch evidence:
- `artifacts/04-29-npc-expression-art-quality-rebuild/place-atmosphere-contact-sheet.png`
- `artifacts/04-29-npc-expression-art-quality-rebuild/place-atmosphere-assets.json`

Required correction:
1. Regenerate all 10 place atmosphere images as real tavern/place scene illustrations, not icon or CSS-like gradient art.
2. Save only accepted 512x288 PNG deliverables in `frontend/public/place-atmosphere/`.
3. Keep rejected drafts only as artifacts/reference, clearly labelled rejected.
4. Re-run asset checks and frontend build after replacement.

## 2026-04-29 Accepted atmosphere replacement

After rejecting the procedural/icon-like placeholder batch, all 10 `frontend/public/place-atmosphere/*.png` files were replaced with built-in `image_gen` outputs using explicit high-quality scene prompts. The accepted files are real fantasy watercolor / digital-painting style environment illustrations, then center-cropped/resized to the required 512×288 PNG runtime format.

Accepted deliverables:
- `frontend/public/place-atmosphere/atmosphere-healing.png`
- `frontend/public/place-atmosphere/atmosphere-supply.png`
- `frontend/public/place-atmosphere/atmosphere-judgement.png`
- `frontend/public/place-atmosphere/atmosphere-ember.png`
- `frontend/public/place-atmosphere/atmosphere-lore.png`
- `frontend/public/place-atmosphere/atmosphere-grove.png`
- `frontend/public/place-atmosphere/atmosphere-spirit.png`
- `frontend/public/place-atmosphere/atmosphere-shrine.png`
- `frontend/public/place-atmosphere/atmosphere-market.png`
- `frontend/public/place-atmosphere/atmosphere-transit.png`

Evidence:
- Source-to-target mapping, dimensions, bytes, and SHA256: `artifacts/04-29-npc-expression-art-quality-rebuild/place-atmosphere-assets.json`
- Human review contact sheet: `artifacts/04-29-npc-expression-art-quality-rebuild/place-atmosphere-contact-sheet.png`

Important: the earlier placeholder rejection remains documented as a failure mode, but those files have now been overwritten by the accepted high-quality image generation outputs.
