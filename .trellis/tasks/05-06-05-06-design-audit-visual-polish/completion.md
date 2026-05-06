# Completion

## Implemented

- Created this Trellis task from `docs/设计参考_视觉与角色评估.md` and scoped it to frontend visual polish only.
- `frontend/app/routes/discover.tsx`: added mobile-first signal tuning. Search remains visible; advanced place/category/open/public filters collapse behind a touch-safe "展开调谐" control with an active-filter summary.
- `frontend/app/routes/tavern.tsx`: restyled the Roleplay owner panel as a secondary owner console with stronger cyber-tavern visual hierarchy and clearer boundaries: owner-only, tavern-scoped, not public social.
- `frontend/app/routes/create.tsx`: added a current-step status band and next-step cue above the existing create form, reinforcing the ritual/stepper flow without changing submit semantics.

## Verification

- `npm --prefix .\frontend run build` — passed.
- `node .\frontend\scripts\create-wizard-route-test.mjs` — passed.
- `node .\frontend\scripts\discover-view-mode-test.mjs` — passed.
- `node .\frontend\scripts\discover-pc-polish-test.mjs` — passed.
- `node .\frontend\scripts\mobile-single-mainline-test.mjs` — passed.
- `node .\frontend\scripts\tavern-chat-workbench-test.mjs` — passed.

## Not done / risks

- No API, schema, persistence, NPC data, or image assets were changed.
- Browser/Playwright visual self-acceptance was not run in this pass; only build and route/script checks were run.
- The repository already had many uncommitted changes before this task; this task intentionally stayed within the target frontend route files and Trellis task files.

## Browser / Playwright visual self-acceptance (2026-05-06)

- Started local frontend dev server at `http://127.0.0.1:5173`.
- Ran `node .\.trellis\tasks\05-06-05-06-design-audit-visual-polish\playwright-visual-self-acceptance.mjs` — passed.
- Checked Chromium desktop viewport `1440x1100` and mobile/narrow viewport `390x920`.
- Assertions covered Discover collapsed/expanded mobile filters, Create current-step status band, and Tavern owner console reveal.
- Report: `.trellis/tasks/05-06-05-06-design-audit-visual-polish/artifacts/playwright/report.md`.
- Console errors captured during checked pages: none.

## Visual feedback follow-up (2026-05-06)

Feedback addressed:

- Mobile Discover was too dark: raised the brightness of the Discover hero/filter surfaces with stronger cyan/violet translucent layers and a lifted mobile filter shell marker.
- Tavern owner right rail was too tall and visually unbalanced: bounded owner-management content with an internal scroll container, compacted Roleplay claim rows, and removed side-by-side form grids that were squeezing labels in the narrow rail.

TDD / regression evidence:

- Added Playwright assertions for the lifted mobile Discover filter shell, bounded owner panel scroll area, and compact Roleplay claims before implementation.
- Verified the updated Playwright self-acceptance passed after the changes.

Verification:

- `node .\.trellis\tasks\05-06-05-06-design-audit-visual-polish\playwright-visual-self-acceptance.mjs` — passed.
- `npm --prefix .\frontend run build` — passed.
- `node .\frontend\scripts\discover-pc-polish-test.mjs` — passed.
- `node .\frontend\scripts\mobile-single-mainline-test.mjs` — passed.
- `node .\frontend\scripts\tavern-chat-workbench-test.mjs` — passed.

## Layout root-cause follow-up (2026-05-06)

Root cause:

- The right owner panel still participated in normal document flow.
- The three-column workbench grid stretched columns to the tallest right rail, which made the left/center columns show a large blank vertical area.
- Limiting the owner panel with `max-height` alone did not solve the page-height problem because the right rail still determined the grid row height.

Fix:

- `frontend/app/features/tavern-chat-workbench/index.tsx`: desktop grid now uses `lg:items-start` so columns do not stretch to the tallest rail.
- Owner management content now opens as a fixed desktop floating drawer (`data-owner-panel-drawer="floating"`) instead of inline content that stretches the page.
- The compact right rail keeps only the summary in normal flow; detailed owner tools scroll inside the drawer.

Verification:

- `node .\.trellis\tasks\05-06-05-06-design-audit-visual-polish\playwright-visual-self-acceptance.mjs` — passed.
- `npm --prefix .\frontend run build` — passed.
- `node .\frontend\scripts\mobile-single-mainline-test.mjs` — passed.
- `node .\frontend\scripts\tavern-chat-workbench-test.mjs` — passed.

## Visitor-first tavern layout consolidation (2026-05-06)

Product decision captured from review:

- The problem was not just that the right panel was long; the page mixed visitor chat with management/share/feedback tooling.
- Ordinary visitors need a chat-first tavern surface, not a three-column feature showcase.
- Secondary and owner tools should remain available but should not be permanently visible or define the primary page height.

Implementation:

- `frontend/app/features/tavern-chat-workbench/index.tsx`: replaced the desktop three-column workbench with two primary columns (`NPC rail + chat mainline`).
- Moved chat helper and public/more tools into folded secondary sections under the chat mainline (`data-secondary-tools="visitor-folded"`).
- Kept owner tools owner-gated behind a folded entry (`data-owner-management-entry="folded"`); opening it shows a bounded floating drawer instead of stretching the page/grid.
- `frontend/scripts/tavern-chat-workbench-test.mjs`: added regression checks that the permanent desktop right rail is not reintroduced and folded secondary/owner entries exist.
- `.trellis/tasks/05-06-05-06-design-audit-visual-polish/playwright-visual-self-acceptance.mjs`: updated visual assertions for folded secondary tools and owner drawer.

Verification:

- Red check before implementation: `node .\frontend\scripts\tavern-chat-workbench-test.mjs` failed on the permanent right-rail assertion.
- `node .\frontend\scripts\tavern-chat-workbench-test.mjs` — passed after implementation.
- `npm --prefix .\frontend run build` — passed.
- `node .\frontend\scripts\mobile-single-mainline-test.mjs` — passed.
- `node .\.trellis\tasks\05-06-05-06-design-audit-visual-polish\playwright-visual-self-acceptance.mjs` — passed.
