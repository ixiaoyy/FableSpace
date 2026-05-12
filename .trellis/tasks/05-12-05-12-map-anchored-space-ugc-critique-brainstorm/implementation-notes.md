# Implementation Notes

## 2026-05-12

### Done
- Implemented the Anti-bullshit MVP as a frontend-only slice: Visitor First Minute + Location Anchor Proof.
- Added `buildTavernFirstMinuteGuide()` in `frontend/app/lib/tavern-first-minute.ts`; it derives why-here copy, experience type, and first prompts from existing Tavern fields and shared anchor/place-type helpers.
- Added first-minute guide surfaces to discover cards, SoulLink desktop/mobile discover cards, tavern preview modal, and tavern chat workbench.
- Added authoring guidance to `frontend/app/routes/create.tsx` and `frontend/app/product/TavernCreatePanel.jsx` so owners write why-here / first-minute content instead of generic chatroom copy.
- Added `frontend/scripts/first-minute-guide-test.mjs` and wired it into `frontend/package.json`.
- Updated Playwright discovery visual audit to assert visible first-minute guides and record evidence.
- Fixed frontend typecheck blockers encountered during validation in `CharacterEditor.jsx` and existing chat workbench typings.

### Validation
- `node .\frontend\scripts\first-minute-guide-test.mjs` — PASS
- `node .\frontend\scripts\discover-pc-polish-test.mjs; node .\frontend\scripts\mobile-critical-flow-test.mjs; node .\frontend\scripts\tavern-chat-workbench-test.mjs; node .\frontend\scripts\map-anchor-copy-test.mjs; node .\frontend\scripts\create-wizard-route-test.mjs` — PASS
- `npm --prefix .\frontend run typecheck` — PASS
- `npm --prefix .\frontend test` — PASS
- `npm --prefix .\frontend run build` — PASS
- `git diff --check` — PASS (CRLF warnings only)
- Playwright: `node .\frontend\scripts\playwright-discover-visual-audit.mjs` with `FABLEMAP_PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175` — PASS

### Evidence
- `D:\work\ai-\artifacts\playwright\discover-visual-audit\report.md`
- `D:\work\ai-\artifacts\playwright\discover-visual-audit\desktop-light-discover-initial.png`
- `D:\work\ai-\artifacts\playwright\discover-visual-audit\desktop-black-discover-initial.png`
- `D:\work\ai-\artifacts\playwright\discover-visual-audit\mobile-light-discover-initial.png`

### Not done / deferred
- No schema/API persistence for first-minute fields; this MVP is derived and UI-only.
- No token payment platform, visitor social graph, ranking/combat, or traditional map app features.
