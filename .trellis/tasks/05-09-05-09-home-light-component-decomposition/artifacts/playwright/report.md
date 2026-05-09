# Home Light Real-DOM Playwright Self Acceptance

Date: 2026-05-09
Base URL: http://127.0.0.1:4178

## Assertions

- Light theme homepage uses the real-DOM replacement contract: `data-home-light-reference="index-light-hybrid-dom"`.
- Runtime slice count is 2: the shared nav backing and full Hero backing remain to avoid stitched visual seams; lower body screenshot fragments are gone.
- Body exposes a full-image-backed Hero plus five lower real-DOM sections with owned hotspots: featured regions, AI roles, memory echoes, recommended coordinates, and CTA/footer.
- Primary CTA, featured-entry, AI role, memory, recommended-coordinate, final CTA, and theme-toggle controls remain accessible.
- Desktop and mobile viewports have no horizontal overflow.

## Screenshots

- `D:\work\ai-\.trellis\tasks\05-09-05-09-home-light-component-decomposition\artifacts\playwright\home-light-real-dom-desktop.png`
- `D:\work\ai-\.trellis\tasks\05-09-05-09-home-light-component-decomposition\artifacts\playwright\home-light-real-dom-mobile.png`
