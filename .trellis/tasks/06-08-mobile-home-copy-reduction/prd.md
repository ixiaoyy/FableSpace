# Mobile Home Copy Reduction

## Goal

Make the current mobile home page feel concise. The mobile first screen should prioritize entry actions and scannable space names, not long descriptive copy.

## Change

- Mobile hero copy now uses a shorter label and title.
- Mobile hero description paragraph was removed.
- Mobile recommendation cards no longer show description text.
- Mobile recommendation cards show image, space name, type tag, and status only.
- Mobile `全部` link and main CTAs keep touch-safe target sizes.
- Mobile dark theme colors were shifted to a reference-style dark cyber gradient with cyan HUD lines and violet-magenta glow accents.

## Validation

- `npm --prefix .\frontend run build` passed on 2026-06-08.
- Playwright screenshots and metrics saved at `artifacts/mobile-compact-20260608-final/`.
- Reference dark-gradient screenshot saved at `artifacts/discover-card-compact-20260608/home-mobile-390-reference-dark-gradient.png`.
- Checked 390x844, 320x568, and 1280x720 viewports.

## Remaining Risk

Desktop still intentionally keeps the richer descriptive layout. If product direction also wants desktop to be less descriptive, handle that separately.
