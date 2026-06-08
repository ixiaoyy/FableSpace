# Discover Mobile Card Density

## Goal

Make discover mobile cards easier to scan by removing right-side explanatory copy and giving the thumbnail more visual weight.

## Change

- Removed the visitor-first explanatory paragraph above mobile discover cards.
- Removed mobile card description text and `Why here` block.
- Increased mobile discover card thumbnail size to 96x96.
- Removed the inner outline from the mobile discover header logo container.
- Increased mobile filter chips and owner-entry link to touch-safe height.
- Shifted the mobile dark theme to a reference-style dark cyber gradient with cyan HUD lines and violet-magenta glow accents.

## Validation

- Playwright mobile screenshot saved at `artifacts/discover-card-compact-20260608/discover-mobile-390-large-image.png`.
- Reference dark-gradient screenshot saved at `artifacts/discover-card-compact-20260608/discover-mobile-390-reference-dark-gradient.png`.
- Metrics: no horizontal overflow, no small touch targets, discover card images measured 96x96.
- `npm --prefix .\frontend run build` passed on 2026-06-08.
