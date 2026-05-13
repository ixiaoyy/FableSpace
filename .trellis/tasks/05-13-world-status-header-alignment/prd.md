# World status header alignment

## Goal
Align the discover world-status card header with the owner reference: Chinese title on the left, English label in the middle, and live update text separated on the right, including the light/white theme.

## Requirements
- Apply the three-part header structure to both light and black variants.
- Add `WORLD STATUS` as visible real DOM text.
- Keep `实时更新` visually separated on the right.
- Preserve existing dynamic metric text and background image behavior.
- Do not run Playwright/browser screenshot self-tests unless explicitly requested.

## Acceptance Criteria
- [x] World status header renders left Chinese, middle English, right live label.
- [x] Focused SoulLink contract test covers new header text markers.
- [x] Focused frontend tests and build pass.
