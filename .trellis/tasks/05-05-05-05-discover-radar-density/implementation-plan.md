# Implementation plan

1. Add a failing static regression test for discover radar density and avatar fallback behavior.
2. Refactor `discover.tsx`:
   - add avatar badge fallback with image `onError` handling;
   - add text-only radar summary rows;
   - remove dense nested signal grid/teaser blocks from radar cards;
   - make the radar result list single-column and more spacious.
3. Run focused script tests, frontend typecheck/build, and Playwright desktop/mobile self-acceptance.
4. Record verification evidence in this task.
