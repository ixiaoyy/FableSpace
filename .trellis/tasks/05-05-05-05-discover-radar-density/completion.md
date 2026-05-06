# Completion

## Summary

- Reduced `/discover` radar result density by changing radar cards from a two-column dense grid to a single scan column.
- Removed nested `EntrySignalGrid`, `DiscoveryLivelinessStrip`, and short-drama teaser blocks from radar cards; replaced them with compact text summary chips for NPC / activity / signal.
- Added `CharacterAvatarBadge` fallback: missing or failed character image URLs fall back to initial badges instead of rendering broken/empty image icons.
- Changed side preview tiles from bare `<img>` blocks to background art with luminous fallback layers, so unloaded image regions do not look empty.

## Verification

- `node .\frontend\scripts\discover-pc-polish-test.mjs` — passed.
- `npm --prefix .\frontend test` — passed.
- `npm --prefix .\frontend run typecheck` — passed.
- `npm --prefix .\frontend run build` — passed.
- Playwright desktop/mobile self-acceptance — passed.
  - Report: `.trellis/tasks/05-05-05-05-discover-radar-density/artifacts/playwright-report.json`
  - Desktop screenshot: `.trellis/tasks/05-05-05-05-discover-radar-density/artifacts/desktop.png`
  - Mobile screenshot: `.trellis/tasks/05-05-05-05-discover-radar-density/artifacts/mobile.png`

## Notes

Playwright fixture intentionally included missing avatar URLs. The final report recorded `missingAvatarImgCount: 0`, `brokenImages: []`, stacked single-column radar cards, no horizontal overflow, and no console errors for both desktop and mobile.
