# Tavern Chat Visitor-first Layout Consolidation Plan

> **For agentic workers:** Execute inline in this session. Do not dispatch subagents unless the user explicitly asks. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the tavern chat page from a three-column function workbench into a visitor-first chat surface where ordinary users see NPC selection and conversation first, while owner/public secondary tools no longer stretch the page or create large blank columns.

**Architecture:** Keep `TavernChatWorkbench` as the route-level composition boundary, but change its desktop layout to two primary columns: NPC rail + chat mainline. Move secondary public/owner tools into compact details surfaces below/around the chat mainline rather than a permanent right rail. Owner tools remain owner-gated and available, but no longer participate in the primary grid height.

**Tech Stack:** React Router route modules, React 18, TypeScript, Tailwind CSS, existing Playwright self-acceptance script.

---

## Task 1: Static regression guard

**Files:**
- Modify: `frontend/scripts/tavern-chat-workbench-test.mjs`

- [ ] Add assertions that the workbench no longer declares a permanent `lg:grid-cols-[18rem_minmax(0,1fr)_21rem]` three-column layout.
- [ ] Add assertions that secondary tools use `data-secondary-tools="visitor-folded"` and owner tools use `data-owner-management-entry="folded"`.
- [ ] Run `node .\frontend\scripts\tavern-chat-workbench-test.mjs` and verify it fails before code changes.

## Task 2: Visitor-first workbench layout

**Files:**
- Modify: `frontend/app/features/tavern-chat-workbench/index.tsx`

- [ ] Replace the desktop three-column grid with two primary columns: `lg:grid-cols-[18rem_minmax(0,1fr)]`.
- [ ] Keep NPC rail and chat mainline as the only always-visible primary surfaces.
- [ ] Move `ChatConversationSidecar`, `publicPanel`, and owner panel into folded secondary details below the chat composer.
- [ ] Ensure ordinary visitors do not see owner controls.
- [ ] Ensure public/share/feedback/creator conversion tools do not occupy a permanent right rail.

## Task 3: Verification and visual acceptance

**Files:**
- Modify: `.trellis/tasks/05-06-05-06-design-audit-visual-polish/playwright-visual-self-acceptance.mjs`

- [ ] Update Playwright assertions to expect folded secondary tools instead of a right-side owner rail.
- [ ] Run `node .\frontend\scripts\tavern-chat-workbench-test.mjs` and expect pass.
- [ ] Run `npm --prefix .\frontend run build` and expect pass.
- [ ] Run `node .\.trellis\tasks\05-06-05-06-design-audit-visual-polish\playwright-visual-self-acceptance.mjs` and expect pass with updated screenshots.
