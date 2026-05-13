# Discover top status bar

## Goal
Implement the missing discover top status area shown in the owner design: world time panel, standalone notification bell, and user identity card.

## Requirements
- Add a real DOM top status bar to the discover desktop artboard.
- Include a world time panel with Chinese label, English `WORLD TIME`, dynamic time, and dropdown chevron.
- Include a standalone notification bell with unread dot.
- Include a user card with avatar, `USER_07`, ID line, and dropdown chevron.
- Apply the same structure to light and black variants, with theme-specific colors.
- Do not run Playwright/browser screenshot self-tests unless explicitly requested.

## Acceptance Criteria
- [x] Discover desktop renders the top status bar as real DOM.
- [x] Existing hidden user cluster no longer causes the discover user area to disappear.
- [x] Focused SoulLink contract test covers the status bar markers.
- [x] Focused frontend tests and build pass.

