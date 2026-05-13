# Discover sort controls polish

## Goal
Polish the discover results sort/view controls to match the provided design reference more closely and remove the crude glyph implementation.

## Requirements
- Replace text glyph view controls with proper inline SVG icons.
- Match the design draft's compact spacing, subdued text, and soft active grid pill.
- Keep the control as static presentational DOM for now; no new state/API changes.
- Keep changes scoped to the SoulLink reference artboard component and focused test.
- Do not run Playwright/browser screenshot self-tests unless explicitly requested.

## Acceptance Criteria
- [x] Sort/view control uses dedicated real-DOM component with SVG icons.
- [x] Crude glyphs `▦` and `☰` are removed from the desktop sort control.
- [x] Focused frontend tests and build pass.
