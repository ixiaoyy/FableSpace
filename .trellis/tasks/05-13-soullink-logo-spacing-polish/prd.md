# SoulLink logo spacing polish

## Goal
Adjust the shared SoulLink sidebar logo to better match the owner design draft: larger star image and more breathing room between the SoulLink title and subtitle.

## Requirements
- Use the existing PNG logo assets, not SVG.
- Increase visible logo mark size for both light and black variants.
- Add vertical spacing between title and subtitle so the stack matches the design draft more closely.
- Keep the change scoped to the shared SoulLink reference artboard component.
- Do not run Playwright/browser screenshot self-tests unless the user explicitly asks.

## Acceptance Criteria
- [x] Shared sidebar logo uses larger PNG image dimensions.
- [x] Title/subtitle stack has explicit top spacing for the subtitle.
- [x] Frontend static/build verification passes.
