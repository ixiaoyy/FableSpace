# Relationship Graph Owner UI Playwright Self Acceptance

Date: 2026-05-07

Base URL: http://127.0.0.1:4173
Route: /tavern/tavern-owner-graph-demo/manage?owner_id=owner-alpha

## Assertions

- Owner management route renders the relationship graph panel on desktop and mobile viewports.
- Existing pending cross-owner edge is visibly labeled as a one-sided perspective.
- Desktop flow can create a new edge and approve a pending edge through mocked owner APIs.
- Narrow/mobile viewport has no obvious horizontal overflow.

## Screenshots

- `D:\work\ai-\.trellis\tasks\05-06-relationship-graph-owner-ui\artifacts\playwright\desktop-relationship-graph-owner-ui.png`
- `D:\work\ai-\.trellis\tasks\05-06-relationship-graph-owner-ui\artifacts\playwright\desktop-relationship-graph-owner-ui-after-actions.png`
- `D:\work\ai-\.trellis\tasks\05-06-relationship-graph-owner-ui\artifacts\playwright\mobile-relationship-graph-owner-ui.png`

## Limits

- Playwright uses mocked API fixtures; it validates frontend behavior, not backend persistence.
- Chromium only.
