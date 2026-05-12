# Implementation Notes

## 2026-05-12

### Done
- Fixed stale frontend regression expectations that blocked the full `npm --prefix .\frontend test` chain after the mini-game and owner gameplay template catalogs expanded.
- Kept template source files as the source of truth and updated tests to assert the current catalogs and priority behavior.
- Added missing explicit safety/family-friendly boundaries to the newer mini-game and owner gameplay templates.
- Restored the `#discover-mainline` mobile critical-flow anchor in the shared SoulLink discover artboard after the route delegated to `SoulLinkDiscoverReference`.

### Files changed
- `D:\work\ai-\frontend\app\product\tavernMiniGames.js`
- `D:\work\ai-\frontend\scripts\mini-games-test.mjs`
- `D:\work\ai-\frontend\app\product\ownerGameplayTemplates.js`
- `D:\work\ai-\frontend\scripts\gameplay-test.mjs`
- `D:\work\ai-\frontend\app\components\soul-link-reference-artboards.tsx`
- `D:\work\ai-\frontend\scripts\mobile-critical-flow-test.mjs`

### Validation
- `node .\frontend\scripts\mini-games-test.mjs` — PASS
- `node .\frontend\scripts\gameplay-test.mjs` — PASS
- `node .\frontend\scripts\mobile-critical-flow-test.mjs` — PASS
- `npm --prefix .\frontend test` — PASS
- `npm --prefix .\frontend run build` — PASS
- `git diff --check` — PASS (only existing CRLF normalization warnings)

### Risks / Not done
- No browser visual pass was run for this task because the code change is a route-anchor/test-contract repair, not a visual redesign. The discover visual Playwright pass remains recorded in `D:\work\ai-\artifacts\playwright\discover-visual-audit\report.md` from the preceding visual audit task.
