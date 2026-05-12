# Search Page Visual Quality Self-Check

## Goal
Claim and prepare the Search/Discover page visual quality self-check task, then make the smallest scoped fixes needed to restore the page to a buildable, reviewable state before any visual acceptance.

## Requirements
- Treat current `frontend/app/routes/discover.tsx` syntax/build failure as the first blocker to resolve for this task.
- Keep scope to the search/discover page and task records; do not mix unrelated env/backend/OpenCode task changes into this task's implementation notes.
- Follow frontend route/component guidelines and the visual QA rule: build first, then browser/Playwright self-check if the page can run.
- If visual fidelity or source-of-truth claims are made, run `$grill-me` before final handoff and record PASS/FAIL/BLOCKED evidence.

## Acceptance Criteria
- [x] Task is set as current Trellis task with relevant frontend context files.
- [x] `frontend/app/routes/discover.tsx` parses successfully; no stray JSX fragments remain outside the route component.
- [x] `npm --prefix .\frontend run build` is rerun; result recorded.
- [x] If build succeeds and a local route is available, run a desktop + narrow viewport self-check or explicitly record why it is blocked.
- [x] Done / Not Done / Risk is recorded in task notes.

## Technical Notes
- Existing workspace has uncommitted changes from other tasks. Do not revert or rewrite those files unless they are explicitly in this task's scope.
- Known pre-existing full frontend test blocker: `frontend/scripts/mini-games-test.mjs` assertion `9 !== 6`; do not fix unless this task is expanded.
