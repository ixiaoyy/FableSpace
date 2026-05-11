# Completion — Tavern owner and visitor view separation

Date: 2026-05-06

## Done

- Added dedicated owner management route `/tavern/:tavernId/manage`.
- Kept `/tavern/:tavernId` as visitor-first chat route only.
- Removed `ownerPanel` from `TavernChatWorkbench`; no owner management drawer/entry is rendered in the chat workbench.
- Extracted owner management panels into `frontend/app/features/tavern-owner-management/index.tsx`.
- Split visitor feedback: visitor route keeps a folded private feedback form; owner management route keeps only owner review/load/delete controls.
- Added shared `fallbackRoleplayState(...)` helper in `frontend/app/lib/roleplay-state.ts`.
- Updated `/owner` dashboard links so tavern actions route to `/tavern/:id/manage?owner_id=...`.
- Updated mobile single-mainline spec and static regression tests to enforce the split.
- Added Playwright self-acceptance script and desktop/mobile screenshots.

## Not Done / Deferred

- No backend API, Schema, persistence, or permission model changes.
- No full redesign of individual owner tools (Roleplay / Home / Visitor Notes); this task only moved them out of the chat route.
- No new LLM config editor or character editor was added to the management page.

## Verification

### RED test evidence

Initial focused regression failed before implementation, as expected:

```text
node frontend\scripts\tavern-chat-workbench-test.mjs
AssertionError [ERR_ASSERTION]: dedicated tavern owner management route should exist
```

### Automated checks

```powershell
node frontend\scripts\tavern-chat-workbench-test.mjs; if ($LASTEXITCODE -eq 0) { node frontend\scripts\mobile-single-mainline-test.mjs }
# pass: tavern-chat-workbench-test: ok; mobile-single-mainline-test: ok

npm --prefix .\frontend test
# pass: all configured frontend script tests, ending with Affinity helpers ok

npm --prefix .\frontend run typecheck
# pass: react-router typegen && tsc --noEmit

npm --prefix .\frontend run build
# pass: React Router/Vite production build succeeded
```

### Playwright visual self-acceptance

```powershell
$env:FABLEMAP_PLAYWRIGHT_BASE_URL='http://127.0.0.1:5174'
node .trellis\tasks\05-06-tavern-owner-visitor-view-separation\playwright-view-separation-self-acceptance.mjs
# pass: tavern-owner-visitor-view-separation-playwright: ok
```

Report:

- `.trellis/tasks/05-06-tavern-owner-visitor-view-separation/artifacts/playwright/report.md`

Screenshots:

- `.trellis/tasks/05-06-tavern-owner-visitor-view-separation/artifacts/playwright/desktop-visitor-chat-only.png`
- `.trellis/tasks/05-06-tavern-owner-visitor-view-separation/artifacts/playwright/desktop-owner-management-only.png`
- `.trellis/tasks/05-06-tavern-owner-visitor-view-separation/artifacts/playwright/mobile-visitor-chat-only.png`
- `.trellis/tasks/05-06-tavern-owner-visitor-view-separation/artifacts/playwright/mobile-owner-management-only.png`

## Risk / Notes

- The workspace already had many unrelated uncommitted changes before this task; this task only claims the files listed in the PRD/completion.
- Existing owner panels are still form-heavy; now they are at least isolated from the visitor chat surface, which makes the next redesign smaller and safer.
