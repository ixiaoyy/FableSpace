# Discover recommended echoes favorites

## Goal
Add the missing favorite affordance to the discover right-rail “推荐回响” panel so it matches the provided design reference.

## Requirements
- Add a visible favorite/collection column on each recommended echo row.
- Use a heart-style icon plus readable count text.
- Keep each row as real DOM text and links.
- Keep changes scoped to the shared SoulLink artboard component and its focused contract test.
- Do not run Playwright/browser screenshot self-tests unless explicitly requested.

## Acceptance Criteria
- [x] Each recommended echo row renders a favorite heart/count area.
- [x] Contract test checks for favorite DOM/text markers.
- [x] Focused frontend tests and build pass.
