# Research: image asset and layout size mismatch

## Relevant Specs
- `docs/IMAGE_ASSETS_SPEC.md`: NPC portraits are square PNG assets; place/homepage atmosphere images are landscape 16:9 style assets; deliverable assets must live inside the repository.
- `.trellis/spec/frontend/image-asset-guidelines.md`: image replacements must update actual project paths and verify dimensions/build.
- `.trellis/spec/frontend/component-guidelines.md`: visual UI changes must stay component-local, mobile-aware, and avoid unrelated refactors.
- `.trellis/spec/frontend/quality-guidelines.md`: frontend visual changes require `npm --prefix .\frontend run build`.

## Evidence Gathered
- `frontend/app/assets/homepage-reference/modules/hero-banner.png` is `1003x1568` (portrait, aspect ~0.64).
- The same portrait asset is rendered with `object-cover` inside landscape/wide containers:
  - `frontend/app/routes/home.tsx`: main ProductPreview hero panel uses `absolute inset-0 h-full w-full object-cover` in a wide grid card.
  - `frontend/app/features/tavern-layout-showcase/index.tsx`: `hybrid-room` background and room card use the portrait asset as full-cover landscape background.
- Landscape module assets (`tavern-neon`, `tavern-night`, `tavern-street`, `npc-dialogue`, `memory-module`) are all `1672x941` (~16:9) and match those full-cover landscape surfaces.
- NPC fallback/seed portraits are square:
  - `frontend/app/assets/npc-style-cast/portraits/*.png`: `256x256`.
  - most `frontend/public/assets/npcs/char_pw_*.png`: `256x256` expressions/neutral.
- `frontend/app/features/tavern-npc-stage/index.tsx` currently renders NPC portraits in `h-44 w-full` landscape-ish frames. This crops square 256x256 NPC portraits in the stage cards, especially on wider cards.
- Two newly referenced public NPC neutral assets are oversized square files rather than spec-sized runtime files:
  - `frontend/public/assets/npcs/char_pw_aheng-neutral.png`: `1254x1254`.
  - `frontend/public/assets/npcs/char_pw_zhijian-neutral.png`: `1254x1254`.

## Root Cause
The visual degradation comes from two related mismatches:
1. A portrait homepage asset is reused as a landscape cover background, so `object-cover` must aggressively crop it.
2. Square NPC portraits are placed into wide stage frames, so the top/bottom or face/body composition is cropped instead of showing the intended square portrait.

## Files to Modify
- `frontend/app/features/tavern-npc-stage/index.tsx`: make NPC portrait frames square and capped to the canonical 256px-ish display size.
- `frontend/app/routes/home.tsx`: stop using portrait `hero-banner.png` as the full-cover landscape image; use a 16:9 tavern module image for the background and keep layout stable.
- `frontend/app/features/tavern-layout-showcase/index.tsx`: stop using portrait `hero-banner.png` for `hybrid-room` full-cover landscape surfaces.
- `frontend/public/assets/npcs/char_pw_aheng-neutral.png` and `char_pw_zhijian-neutral.png`: resize to `256x256` PNG to match the current public NPC runtime asset set.
