# Grill-Me Verdict: home light/black layout unification

Verdict: PASS

Source of truth:
- User instruction: light and black homepage must not maintain two different layouts; geometry should be common and only materials/colors differ.
- Runtime component: `D:\work\ai-\frontend\app\components\soul-link-reference-artboards.tsx`.
- Focused contract tests: `D:\work\ai-\frontend\scripts\home-visual-density-test.mjs`, `D:\work\ai-\frontend\scripts\soul-link-reference-artboards-test.mjs`.

Evidence:
- Removed black-only home geometry constants: `HOME_BLACK_LAYOUT`, `HOME_BLACK_RIGHT_RAIL`, `HOME_BLACK_BOTTOM_RAIL`, `homeBlackCardBoxes`.
- `HOME_LAYOUT` is now the single source for home hero, title, recommended header, search, cards, right rail, bottom rail, and hero actions.
- Playwright measured desktop light vs black and exact-matched bounding boxes for: search, feed panel, recent panel, guide panel, stats panel, and four coordinate cards.
- Playwright screenshots:
  - `D:\work\ai-\.trellis\workspace\lijin\frontend-layout-unification-check\home-light-shared-layout-desktop.png`
  - `D:\work\ai-\.trellis\workspace\lijin\frontend-layout-unification-check\home-black-shared-layout-desktop.png`
  - `D:\work\ai-\.trellis\workspace\lijin\frontend-layout-unification-check\home-light-shared-layout-mobile.png`
  - `D:\work\ai-\.trellis\workspace\lijin\frontend-layout-unification-check\home-black-shared-layout-mobile.png`
- Playwright report: `D:\work\ai-\.trellis\workspace\lijin\frontend-layout-unification-check\layout-unification-report.json`.

Problems:
1. [Fixed] The previous implementation said shared layout in comments but still kept black-only constants and selected them by `variant === "black"`. This caused mismatched module x/y/w/h between themes.
2. [Remaining caveat] Black/light still use different visual assets and text labels by design. Geometry is unified; pixel appearance is not intended to be identical.

Validation:
- `node .\frontend\scripts\home-visual-density-test.mjs` PASS
- `node .\frontend\scripts\soul-link-reference-artboards-test.mjs` PASS
- `npm --prefix .\frontend run build` PASS
- Playwright desktop/mobile layout check PASS
