# discover: 城市雷达探索页升级

## Goal

把 `/discover` 从普通酒馆列表升级为更有吸引力的探索页：默认有城市雷达/发光坐标的沉浸感，同时在搜索和筛选时提供更高效的卡片结果视图。

## Requirements

* 设计方向采用 A+B 结合：默认雷达视图，查找/筛选时可切换到卡片瀑布流结果视图。
* 前期不采用 C 的全屏伪地图作为主实现，因为铺成城市地表难度高且使用效率较低。
* 不改后端、Schema、API，不引入新地图或 UI 依赖。
* 保持真实坐标、AI 角色、回访记忆、主人空间边界等产品语义。

## Design References

* `设计参考/discover-A-city-radar-flow.png` — A: 城市雷达 / 发光坐标流。
* `设计参考/discover-B-map-card-waterfall.png` — B: 地图卡片瀑布流。
* `设计参考/discover-C-fullscreen-cyber-map.png` — C: 全屏伪地图 / 赛博城市地表。

## Decision

采用 A+B 混合：默认进入 A 的雷达氛围；当用户搜索、筛选或主动切换视图时，进入 B 的卡片结果模式。C 保留为远期视觉参考，不进入本轮实现。

## Acceptance Criteria

* [ ] 三张对比设计稿已保存到仓库 `设计参考/` 目录。
* [ ] `/discover` 默认呈现雷达探索感。
* [ ] `/discover` 在查找/筛选场景能以卡片结果流承载高效浏览。
* [ ] 移动端不依赖复杂地图交互。
* [ ] `npm --prefix .\frontend run build` 通过。

## Out of Scope

* 不接入真实地图 SDK。
* 不实现全屏伪地图节点拖拽/缩放/空间地表。
* 不新增地点类型 Schema 或改 `/tavern/:id` 路由契约。

## Technical Notes

* Primary file likely: `frontend/app/routes/discover.tsx`.
* Existing route already has `search`, `activePlaceTypes`, `activeCategories`, `publicOnly`, `openOnly`, `filteredTaverns` and preview modal state，可复用为视图切换条件。

## Implementation Notes (2026-04-28)

* Implemented the approved A+B hybrid in `frontend/app/routes/discover.tsx`.
* Default mode is `radar`: the page opens with “附近坐标正在发光” and a signal/radar-style coordinate stream.
* Search/filter/manual switch uses `cards`: `DiscoverViewMode = "radar" | "cards"`, `manualViewMode`, and `activeViewMode` preserve the view-mode contract.
* Search and filters reuse the existing loader data and `filteredTaverns`; no backend/API/schema/dependency changes.
* Updated the shared product shell copy to broader coordinate-space positioning: `Cyber life on real coordinates`, `创建空间`, `主人`.
* Added `frontend/scripts/discover-view-mode-test.mjs` and wired it into `npm --prefix .\frontend test`.
* Design references saved in `设计参考/`:
  * `discover-A-city-radar-flow.png`
  * `discover-B-map-card-waterfall.png`
  * `discover-C-fullscreen-cyber-map.png`
* Verification:
  * RED: `node .\frontend\scripts\discover-view-mode-test.mjs` failed before implementation on missing `DiscoverViewMode` contract.
  * GREEN: `node .\frontend\scripts\discover-view-mode-test.mjs`: exit 0, `discover-view-mode-test: ok`.
  * `npm --prefix .\frontend run typecheck`: exit 0.
  * `npm --prefix .\frontend test`: exit 0; all script tests ok including `discover-view-mode-test`.
  * `npm --prefix .\frontend run build`: exit 0; React Router/Vite production build completed.
  * Browser screenshots with backend + frontend running:
    * `artifacts/dev-server/discover-radar-desktop.png`
    * `artifacts/dev-server/discover-cards-desktop.png`
    * `artifacts/dev-server/discover-mobile.png`
* Known follow-up: real map SDK/full-screen city地表 remains out of scope; C is reference-only for later.

## High-quality Runtime Asset Pass (2026-04-28)

Follow-up to the approved A+B discover direction: user asked to use high-quality visual material to restore the design reference as much as possible.

Assets copied from the generation tool output into project-local runtime paths:

* `frontend/app/assets/discover-reference/discover-radar-surface.png` — radar/city surface, `1672x941`, SHA256 `027996A79CD31F8D93BC884CCC49D4196E20656962D6078C3F41FC4B17C351E6`.
* `frontend/app/assets/discover-reference/discover-cover-neon-alley.png` — neon alley card cover.
* `frontend/app/assets/discover-reference/discover-cover-cozy-shop.png` — warm indoor cover.
* `frontend/app/assets/discover-reference/discover-cover-quiet-sanctuary.png` — quiet street/sanctuary cover.

Implementation:

* `frontend/app/routes/discover.tsx` now imports and renders the project-local radar surface and cover assets instead of the older homepage module images.
* `frontend/scripts/discover-view-mode-test.mjs` now asserts the high-quality radar/cover asset contract.

Verification:

* `node .\frontend\scripts\discover-view-mode-test.mjs`: exit 0.
* `npm --prefix .\frontend run typecheck`: exit 0.
* `npm --prefix .\frontend test`: exit 0.
* `npm --prefix .\frontend run build`: exit 0 and emitted `discover-radar-surface-*.png`, `discover-cover-*.png` assets.
