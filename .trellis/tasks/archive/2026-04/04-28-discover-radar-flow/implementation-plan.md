# Discover Radar/Card Hybrid Implementation Plan

> **For agentic workers:** Execute inline in the current workspace because the user asked to continue here and the repository already contains unrelated dirty work. Do not run broad git staging commands.

**Goal:** Upgrade `/discover` into an A+B hybrid: default radar-style discovery, with efficient card results when searching/filtering or when the user manually switches views.

**Architecture:** Keep all behavior inside `frontend/app/routes/discover.tsx`. Reuse existing loader, filters, `filteredTaverns`, preview modal, place-type helpers, and tavern route links. Add a small local `DiscoverViewMode` state and local presentation subcomponents only; do not change backend/API/schema.

**Tech Stack:** React Router route module, React hooks, TypeScript, Tailwind utility classes, existing `Button`, existing `TavernPreviewModal`.

---

## Files

- Modify: `frontend/app/routes/discover.tsx` — A+B hybrid UI, view-mode state, radar/cards presentation.
- Create: `frontend/scripts/discover-view-mode-test.mjs` — static regression test for agreed UX contract.
- Modify: `frontend/package.json` — include the new script in `npm --prefix .\frontend test`.
- Update: `.trellis/tasks/04-28-discover-radar-flow/prd.md` and `task.json` — implementation notes/status.

## Task 1: RED test

- [ ] Create `frontend/scripts/discover-view-mode-test.mjs` asserting:
  - discover source has `DiscoverViewMode` with `radar` and `cards`.
  - source includes labels `雷达视图` and `卡片视图`.
  - source includes `附近坐标正在发光`.
  - source includes a manual view state like `manualViewMode`.
  - source does not include old hero copy `发现附近的赛博酒馆` or old placeholder `搜索酒馆名称…`.
- [ ] Add the script to `frontend/package.json` test chain.
- [ ] Run `node .\frontend\scripts\discover-view-mode-test.mjs`; expected failure before implementation.

## Task 2: Implement A+B hybrid

- [ ] Add view-mode state:
  - `type DiscoverViewMode = "radar" | "cards"`.
  - `manualViewMode` state.
  - `activeViewMode = manualViewMode ?? (hasFilters ? "cards" : "radar")`.
  - Clear filters resets manual view to `null`.
- [ ] Reframe hero copy:
  - title `附近坐标正在发光`.
  - concise explanatory copy focused on coordinates/regions, not tavern-only framing.
  - create CTA `创建我的空间`.
- [ ] Add view toggle buttons `雷达视图` / `卡片视图`.
- [ ] Keep filters searchable and existing filter semantics.
- [ ] Keep modal preview and existing `/tavern/:id` link/entry contract.
- [ ] Add card result layout for `cards` mode using the same `filteredTaverns`.
- [ ] Keep radar layout for `radar` mode with signal/list styling and no fake map dependency.

## Task 3: Verify

- [ ] Run `node .\frontend\scripts\discover-view-mode-test.mjs`; expected pass.
- [ ] Run `npm --prefix .\frontend run typecheck`; expected exit 0.
- [ ] Run `npm --prefix .\frontend test`; expected exit 0.
- [ ] Run `npm --prefix .\frontend run build`; expected exit 0.
- [ ] Browser/headless screenshots for `/discover` desktop and mobile; verify default radar and no obvious narrow-screen break.
- [ ] Update Trellis PRD with actual verification output and known follow-ups.
