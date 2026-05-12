# Implementation Notes

## Research / Source of Truth
- Task PRD: buildable Search/Discover route first, then visual self-check before handoff.
- Frontend specs: `.trellis/spec/frontend/quality-guidelines.md`, `.trellis/spec/frontend/component-guidelines.md`, `.trellis/spec/frontend/type-safety.md`.
- Current implementation source: `frontend/app/routes/discover.tsx` delegates to `SoulLinkDiscoverReference` in `frontend/app/components/soul-link-reference-artboards.tsx`.

## Changes
- Removed the stale dead `discover-mainline` JSX fragment after `DiscoverRoute`'s return path by keeping the route delegated to `SoulLinkDiscoverReference`; this restored TSX parsing/build.
- Updated `frontend/scripts/discover-pc-polish-test.mjs` so the guardrail checks the current shared SoulLink reference DOM instead of requiring retired duplicate route JSX.
- Added `data-soul-link-discover-card="real-card"` to mobile discover result cards so desktop and mobile Playwright checks can use one stable card selector.
- Hardened `frontend/scripts/playwright-discover-visual-audit.mjs`:
  - installs API fixtures before navigation,
  - selects desktop/mobile title nodes without strict-mode ambiguity,
  - forces light/dark theme by localStorage per audit label,
  - uses visible result-card selectors for responsive layouts.

## Validation
- `node .\frontend\scripts\discover-view-mode-test.mjs` — passed.
- `node .\frontend\scripts\discover-pc-polish-test.mjs` — passed.
- `npm --prefix .\frontend run build` — passed.
- `FABLEMAP_PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175 node .\frontend\scripts\playwright-discover-visual-audit.mjs` — passed; report at `artifacts/playwright/discover-visual-audit/report.md` and screenshots:
  - `artifacts/playwright/discover-visual-audit/desktop-light-discover-initial.png`
  - `artifacts/playwright/discover-visual-audit/desktop-black-discover-initial.png`
  - `artifacts/playwright/discover-visual-audit/mobile-light-discover-initial.png`
- `npm --prefix .\frontend test` — failed before reaching discover checks at known unrelated `frontend/scripts/mini-games-test.mjs:12`, `9 !== 6`.

## Grill-Me Verdict
Verdict: PASS for this task's scoped build/visual self-check; BLOCKED for claiming full frontend test suite health.

Source of truth:
- `AGENTS.md` frontend visual validation rule.
- This task PRD acceptance criteria.
- Current shared SoulLink Discover implementation in `frontend/app/components/soul-link-reference-artboards.tsx`.
- Fresh Playwright screenshots under `artifacts/playwright/discover-visual-audit/`.

Evidence:
- Build passed after removing the stale route fragment.
- Focused discover script guards passed.
- Playwright verified desktop light, desktop black, and mobile light viewports with visible title/timeline/filter/results and captured screenshots.

Problems / Risks:
1. [P2] Full `npm --prefix .\frontend test` still fails before discover tests at `frontend/scripts/mini-games-test.mjs:12` (`9 !== 6`); this is outside the task scope but blocks suite-level green status.
2. [P2] This audit validates current DOM/reference behavior; it does not prove pixel-perfect 1:1 against a separate owner-supplied design image.
3. [P3] Workspace still contains unrelated uncommitted env/backend/OpenCode changes from previous tasks; avoid mixing final commit scope.

Smallest safe next step:
- If continuing this task: review screenshots visually with the owner or provide an explicit design source of truth for stricter comparison.
- Otherwise: create/claim a separate mini-games test repair task before relying on full frontend test status.
