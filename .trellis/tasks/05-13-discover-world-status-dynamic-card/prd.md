# Discover world status dynamic card

## Goal
Make the discover right-rail “世界状态” card use dynamic DOM text derived from tavern data plus a project-local background image, matching the owner draft direction.

## Requirements
- Replace hardcoded world status numbers with values computed from the current `taverns` array.
- Use real DOM text for all labels/numbers.
- Replace the inline SVG orbit decoration with imported project-local PNG background art.
- Keep the card layout aligned with the provided design draft: text on the left, ambient orbit/bar background on the right.
- Do not run Playwright/browser screenshot self-tests unless explicitly requested.

## Acceptance Criteria
- [x] Card exposes dynamic text markers and no hardcoded `1,298`/`56`/`12` values.
- [x] Card imports and renders a PNG background image asset.
- [x] New image assets exist under `frontend/app/assets/...` with verified dimensions/hash.
- [x] Focused frontend tests and build pass.
