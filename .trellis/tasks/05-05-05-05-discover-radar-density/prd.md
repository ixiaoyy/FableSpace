# Discover radar density and empty avatar cleanup

## Problem

User reported that the `/discover` radar view is visually too crowded and contains many empty/broken images. The screenshot shows each radar result card rendering too many nested blocks (entry signal grid, liveliness strip, teaser card) and NPC avatars that can appear as broken image icons when a character asset URL is missing or unavailable.

## Scope

- Adjust `frontend/app/routes/discover.tsx` only for the discover page radar/card presentation.
- Keep real-coordinate discovery, owner-authored tavern content, and existing API contracts unchanged.
- Do not generate or replace bitmap assets.
- Do not touch unrelated tavern chat worktree changes.

## Acceptance

- Radar cards use a more breathable single-column scan layout.
- Radar cards summarize NPC/activity/visit information with compact text chips instead of multiple nested mini cards.
- Character avatars fall back to initial badges on missing or failed image loads; no broken image icons remain in discover cards.
- Desktop and narrow viewport Playwright self-acceptance captures screenshots and checks for no broken images / no horizontal overflow.
