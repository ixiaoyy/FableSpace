# Hydration Errors Reproduce and Fix

## Parent
`05-12-onsite-visitor-brutal-audit-issues` — Issue #8

## Goal
Reproduce React hydration errors #418 and #423 in local browser. Find root cause. Fix or document root-cause blocker with evidence.

## Background
Build passes (`npm --prefix .\frontend run build`), but browser console reports React minified errors `#418` and `#423` repeatedly after page reload on `/`, `/discover`, and `/tavern/pw_lantern_helpdesk` routes.

## Requirements
1. Reproduce the errors locally:
   - Start backend: `py -3 -m fablemap_api api` (PYTHONPATH=backend/src)
   - Start frontend dev server: `npm --prefix .\frontend run dev`
   - Open browser DevTools console on each route
   - Record exact error messages and which route triggers them
2. Identify root cause:
   - Common causes: SSR/mismatch in dynamic content, time-dependent rendering, localStorage state vs server state, conditional rendering based on client-only APIs
   - Check each route's SSR/render logic for potential mismatches
3. Fix the root cause:
   - Use `suppressHydrationWarning` sparingly where appropriate
   - Or fix the data source mismatch (use client-only rendering for dynamic content)
   - Or use `useEffect` to hydrate dynamic content after mount
4. Verify fix: no hydration errors on `/`, `/discover`, `/tavern/{id}` after reload

## Acceptance Criteria
- [ ] Errors #418/#423 reproduced and documented with evidence
- [ ] Root cause identified and documented
- [ ] Root cause fixed or recorded as blocker with evidence
- [ ] No hydration errors on main routes after fix
- [ ] `npm --prefix .\frontend run build` passes

## Completion Note (2026-05-16)

Closed as no-repro with evidence rather than code fix: erification.md records dev/backend-served/production-preview checks on /, /discover, and /tavern/pw_lantern_helpdesk; React #418/#423 was not reproduced. Current remaining blocker is the exact failing user browser/environment if the issue reappears.
