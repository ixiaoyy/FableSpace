# Frontend Quality Guidelines

> Code quality standards for React/Vite frontend changes.

---

## Overview

Frontend quality means preserving the space-first product direction, keeping API/service boundaries clear, staying mobile-aware, and verifying with typecheck/build when relevant.

---

## Required patterns

- API calls go through `apps/web/app/lib/` for new route modules or `apps/web/app/product/services/` for product parity source.
- Reusable stateful workflows go through `apps/web/app/product/hooks/`.
- Owner-editable payloads are normalized before save.
- UI errors are readable and do not reveal secrets.
- Space and gameplay UI must respect owner-authored content boundaries.
- Mobile/narrow screens must remain usable for visual/interaction changes.
- User-facing pages must meet the global visual quality bar in `component-guidelines.md`: no bare admin-form MVP UI for primary flows; use designed hierarchy, polished panels/cards, visible interaction states, and mobile-safe touch targets.

---

## Forbidden patterns

- Adding additional large UI frameworks, state managers, or map rendering dependencies without approval.
- Adding direct `fetch` calls in many components.
- Logging or displaying owner `api_key`, private LLM config, password hashes, or visitor private memory to the wrong user.
- Implementing platform-generated space/NPC/story content as if it were owner-authored.
- Adding combat/level/equipment/ranking or visitor-to-visitor social features.
- Editing `apps/web/dist/` as source.
- Mixing unrelated style refactors into feature/bug changes.

---

## Verification requirements

For the target React Router Framework frontend, use:

```powershell
npm --prefix .\apps\web run typecheck
npm --prefix .\apps\web run build
```

Generated React Router artifacts (`apps/web/.react-router/`) and build output (`apps/web/build/`) are not source and must stay ignored.

For frontend changes, run the smallest real verification:

```powershell
# Build React/Vite frontend
npm --prefix .\apps\web run build

# Type/API client changes
npm --prefix .\apps\web run typecheck
```

Current `apps/web/package.json` intentionally has no `test` script. Do not add frontend test entry points unless the user explicitly restores a test workflow.

### Playwright self-acceptance before human visual review

For any user-facing visual / interaction change that needs browser visual acceptance, run a Playwright self-acceptance pass before asking the human reviewer to inspect it.

Required minimum:

```powershell
# 1) Start a local frontend server for the changed surface.
# 2) Run a Playwright script/spec against the changed route.
# 3) Capture desktop and mobile/narrow screenshots into a task/evidence path.
```

The Playwright pass must check:

- the changed route loads without uncaught page errors;
- the primary changed UI text/states are visible;
- at least one desktop viewport and one narrow/mobile viewport;
- no obvious horizontal overflow on the narrow viewport;
- screenshot paths are recorded in the Trellis task notes or final report.

Playwright self-acceptance does **not** replace `npm --prefix .\apps\web run build`; it is an additional browser sanity pass before human visual acceptance. If Playwright cannot run, explicitly report the failure command and reason instead of claiming visual acceptance.

---

## Code review checklist

- Does the UI support the current space chain rather than old map-game priorities?
- Are API calls centralized in services?
- Are owner/visitor identity boundaries still clear?
- Are schema fields aligned with backend and `docs/WORLD_SCHEMA.md`?
- Are loading, busy, empty, and error states visible?
- Does it work on narrow screens?
- Does the page look like a polished FableSpace product surface rather than an internal/admin prototype?
- Are primary flows represented with designed cards/panels/previews instead of only raw form controls?
- Was the appropriate typecheck/build command run and reported?

---

## Real examples to follow

1. `apps/web/app/lib/spaces.ts`: typed `/api/v1/spaces` methods and user ID headers for new route modules.
2. `apps/web/app/product/services/spaceService.js`: centralized product-parity service methods and user ID headers.
3. `apps/web/app/product/spaceCreateReadiness.js`: business/readiness rules kept outside components.
4. `apps/web/app/product/spaceMiniGames.js`: static gameplay templates kept outside route code.
5. `apps/web/app/product/personalityTemplates.js`: template/filter logic kept in reusable modules.

---

## Common mistakes

- Skipping `typecheck` after frontend service/API changes.
- Changing UI labels/constants in several files instead of centralizing or reusing helpers.
- Treating a Vite dev server manual check as a substitute for `npm --prefix .\apps\web run build`.
- Reintroducing deleted script tests for narrow service/helper changes.
- Shipping UI that works only with a configured external LLM, despite the project maintaining no-key/fallback demo flows.

---

## Scenario: Owner Dialogue Preview Dry-run UI

- Owner dialogue preview UI must call the centralized `apps/web/app/lib/spaces.ts` dry-run service instead of sending chat messages or using direct `fetch` in the component.
- Copy must distinguish backend prompt dry-run from real visitor chat: default no LLM call, no chat history, no memory, no writeback, and `persisted=false`.
- Any model test action must be explicit owner confirmation because it may consume owner provider tokens.
- Display dry-run flags (`dry_run`, `persisted`, `model_called`, `history_written`, `memory_written`, `writeback_written`) and readable model error/status.
- Keep the local simulator helper only as a degraded fallback when space/owner identity is unavailable; it must not be presented as a real AI response.

Required checks:

```powershell
npm --prefix .\apps\web run typecheck
npm --prefix .\apps\web run build
```
