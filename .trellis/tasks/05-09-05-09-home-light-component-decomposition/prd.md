# Home light component decomposition

## Goal

Assess and finish the homepage bright-theme decomposition after `/discover` reached complete real-DOM replacement.

The practical target is not another broad slicing pass. The homepage should no longer depend on full-page/body screenshot slices at runtime, while preserving the approved `设计参考/index_light.png` visual direction and keeping focused bitmap content where it is legitimate page imagery.

2026-05-09 follow-up decision after hero visual feedback: the Hero should not be split into a left DOM column plus right cropped stage image, because that stitched composition makes the baked source lighting/panel residue read as a vertical seam. The Hero now uses the complete Hero slice as one visual backing and keeps only transparent, accessible click hotspots on top. Lower sections remain real DOM.

## Decision

After inspecting the current result and running Playwright screenshots, the homepage should **not continue broad decomposition/slicing right now**.

Current state is already beyond the previous section-boundary slice pass:

- Runtime homepage body is a real DOM replacement: `data-home-light-body="complete-dom-replacement"`.
- Runtime slice count is `2`: the shared top-nav backing plus the full Hero backing remain as reference slices.
- Body sections are first-class DOM sections with owned hotspots:
  - `hero`
  - `featured-regions`
  - `ai-roles`
  - `memory-echoes`
  - `recommended-coordinates`
  - `cta-footer`
- Focused extracted images remain only for actual visual content/decorations such as card covers, portraits, memory thumbnails, and CTA/footer decorations; Hero no longer stitches separate content/stage fragments at runtime.

## Scope Completed

- Fixed the light homepage route so it passes `toggleTheme` into `HomeLightRealDom`.
- Kept the new real-DOM homepage component as the light-mode surface.
- Tightened the hero headline sizing/width after screenshot review so the key promise stays readable in two lines.
- Corrected Hero layout overlap: moved CTA buttons below subtitle, cropped metric thumbnails to remove baked duplicate text/numbers, moved the featured-section bunny so it no longer covers the "查看全部" link, and hid visible DOM text/chrome overlays where the nav/hero backing already contains text to remove ghosting.
- Updated homepage static tests from the older body-slice contract to the new real-DOM contract.
- Updated Playwright self-acceptance to assert the new runtime contract and save desktop/mobile screenshots under this Trellis task.

## Acceptance Criteria

- [x] Homepage light mode renders through `HomeLightRealDom`.
- [x] Body screenshot slices/fragments are not required by runtime code.
- [x] Runtime slice count is `2` with only the shared nav backing and full Hero backing remaining.
- [x] Six body sections expose section markers and owned hotspots; Hero is image-backed, lower five sections are real DOM.
- [x] Featured/recommended card links still derive from real featured tavern IDs.
- [x] Project-local element images have 1x/2x files and same-directory base prompt sidecars.
- [x] Homepage static checks pass.
- [x] Typecheck and frontend build pass.
- [x] Playwright desktop + mobile self-acceptance pass with screenshots.

## Validation

Passed on 2026-05-09:

```powershell
node .\frontend\scripts\home-visual-density-test.mjs
node .\frontend\scripts\home-pc-polish-test.mjs
node .\frontend\scripts\homepage-dynamic-entry-test.mjs
node .\frontend\scripts\home-links-test.mjs
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
node .\frontend\scripts\playwright-home-light-reference-check.mjs
```

2026-05-09 follow-up layout correction after human screenshot feedback reran the same focused scripts, typecheck, build, and Playwright check successfully.

Playwright artifacts:

- Report: `D:\work\ai-\.trellis\tasks\05-09-05-09-home-light-component-decomposition\artifacts\playwright\report.md`
- Desktop screenshot: `D:\work\ai-\.trellis\tasks\05-09-05-09-home-light-component-decomposition\artifacts\playwright\home-light-real-dom-desktop.png`
- Mobile screenshot: `D:\work\ai-\.trellis\tasks\05-09-05-09-home-light-component-decomposition\artifacts\playwright\home-light-real-dom-mobile.png`

Additional attempted validation:

```powershell
py -3 artifacts/04-30-image-asset-prompt-sidecars/validate_image_prompt_sidecars.py
```

This failed on pre-existing/global prompt-sidecar inventory assumptions, mainly because the validator expects separate `-2x.prompt.md` sidecars and also reports older homepage/discover light assets with path/hash formatting mismatches. The focused homepage test now checks each runtime homepage element has its base same-directory prompt sidecar plus 2x sibling.

## Recommendation / Remaining Optional Work

Do **not** continue another broad homepage split before human visual acceptance.

Optional later refinements should be narrow and user-approved:

1. Replace the remaining nav backing slice with fully real DOM/CSS if the goal becomes absolute zero runtime slices.
2. Further tune pixel-level visual parity for nav typography after manual review.
3. Consider deleting or archiving obsolete intermediate body slices only after confirming no route/test imports them and after explicit user approval.

## Not Done / Deferred

- Did not remove old intermediate homepage slice assets from the repository.
- Did not convert the shared nav backing to full DOM.
- Did not run full `npm --prefix .\frontend test`; ran focused homepage scripts, typecheck, build, and Playwright for the changed surface.
