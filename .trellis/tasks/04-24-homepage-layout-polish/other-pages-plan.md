# 其他页面布局优化补充计划

## Goal
在首页已完成高保真布局后，把原生 React Router 页面 `/discover`、`/create`、`/tavern/:tavernId` 与共享 `ProductShell` 统一到同一套赛博酒馆视觉语言。

## Scope
- 修改：`frontend/app/shell/product-shell.tsx`
- 修改：`frontend/app/routes/discover.tsx`
- 修改：`frontend/app/routes/create.tsx`
- 修改：`frontend/app/routes/tavern.tsx`
- 允许复用现有 `frontend/app/assets/homepage-reference/modules/*.png` 与 NPC portrait 资产。

## Non-goals
- 不改 API、后端、Schema、服务层契约。
- 不新增依赖。
- 不做平台生成酒馆/NPC/故事内容。
- 不改首页已确认的主布局方向。

## Acceptance Criteria
- [x] 共享壳层背景、导航、页脚与首页视觉一致。
- [x] 发现页更像地图发现/酒馆列表入口，保留现有 loader 与 API 读取逻辑。
- [x] 开店页更像创作者工作台，强调真实坐标、店主创作、访问边界。
- [x] 酒馆页更像沉浸式入口，保留 NPC 舞台和对话能力。
- [x] `npm --prefix .\frontend run build` 通过。

## Verification
- 2026-04-24: `npm --prefix .\frontend run build` passed after other native pages layout polish.

