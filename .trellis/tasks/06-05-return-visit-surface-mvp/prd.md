# Return visit surface MVP

## Goal

Make `我的回访` feel like a place to continue private space relationships, not only a wallet/shortcut page.

## Source

- Parent brainstorm: `.trellis/tasks/06-04-sillytavern-entry-experience-brainstorm/`
- Product brief priority: memory, relationship, and private revisit.
- Boundary: no proactive notification sending; no new API/Schema/database.

## Scope

- Frontend-only `home-me` route plus `/tavern/:id` handling for `revisit=continue`.
- Use existing tavern list and current visitor identity to build return links.
- Keep all controls visitor-scoped and explicit.

## Implemented UX

- A return-visit panel near the top of `home-me`.
- Each card shows real coordinate anchor, NPC count, visit signal, and a short private cue.
- Actions:
- `继续回访`: enter `/tavern/:id` with current visitor id.
- `从入口重开`: enter with a local restart query marker.
- `临时试游`: enter with a local trial query marker and separate trial visitor id.
- `revisit=continue` skips the doorway beat; restart/trial keep the doorway.
- Empty state points to `/discover`.

## Implementation Notes

- `home-me` now shows current-visitor return cards before the visitor asset summary.
- The panel calls existing read APIs only: `listTaverns` and `listMemories`.
- Tavern cards render immediately after the tavern list returns; private memory cues hydrate in the background to avoid blocking first paint on slow memory endpoints.
- `/tavern/:id?revisit=continue` initializes the chat workbench past the doorway. Restart and trial links still begin at the doorway.
- Copy was compacted after visual review so the new panel is not dominated by explanatory prose.

## Non-goals

- No proactive push/email/SMS/in-app delivery.
- No cross-visitor memory or social feed.
- No platform-authored story publishing.
- No backend contract changes.

## Validation

- `npm --prefix .\frontend run typecheck` passed.
- `npm --prefix .\frontend run build` passed.
- Playwright probe on `http://127.0.0.1:8950/home-me?user_id=return-visit-visual-check`: `data-return-visit-loaded` appeared in about 6079 ms with 4 cards and no loading text.
- Playwright visual acceptance passed:
- Desktop screenshot: `.trellis/tmp/return-visit-surface-evidence/home-desktop.png`
- Mobile screenshot: `.trellis/tmp/return-visit-surface-evidence/home-mobile.png`
- Report: `.trellis/tmp/return-visit-surface-evidence/return-visit-surface-visual-acceptance-report.json`
- Both desktop and mobile runs rendered 4 cards, had no horizontal overflow, and `继续回访` reached `/tavern/mainline-golden-path-tavern?visitor_id=return-visit-visual-check&revisit=continue` with `doorwayVisible = 0`.
