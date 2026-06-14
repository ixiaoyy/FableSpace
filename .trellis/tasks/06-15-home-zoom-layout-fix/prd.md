# Home Zoom Layout Fix

## Goal
Keep the FableMap home/discover shell stable when desktop viewport width changes or the browser is slightly zoomed.

## Scope
- Fix the shared reference artboard responsiveness in `frontend/app/components/fable-map-reference-artboards.tsx`.
- Do not change API calls, tavern data, copy strategy, or assets.
- Preserve the mobile path and the existing desktop visual composition.

## Acceptance Criteria
- [x] No horizontal clipping or panel overlap at common desktop widths around `1280px`, `1366px`, and `1536px`.
- [x] Mobile/narrow viewport still uses the mobile layout.
- [x] `npm --prefix .\frontend run build` passes.
- [x] Browser verification records desktop and narrow/mobile checks.

## Notes
The user screenshot shows the sidebar cropped and right rail/main content overlapping after a small screen zoom.

## Completion Note - 2026-06-15
- Patched `ArtboardShell` so the desktop 1536x1024 artboard renders as a fixed internal canvas and scales as one unit inside the viewport.
- The final scale is constrained by both viewport width and viewport height, so large screens stay centered and browser zoom does not make the artboard overflow vertically.
- Verified with Edge/Playwright screenshots at `1024`, `1280`, and `390` widths plus bounding-box checks at `1536`, `1366`, `1280`, `1024`, and `390`.
- Follow-up route audit covered `/`, `/discover`, `/create`, `/owner`, `/quests`, `/notifications`, `/territory`, `/home-me`, tavern detail/manage, NPC detail, and prompt editor at desktop-zoom, laptop, and mobile viewports. No horizontal overflow was detected.
