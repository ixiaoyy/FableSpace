# 首页真实布局重做

## Goal
把当前首页从整张参考图 + 绝对定位热点的“切图贴片”实现，改为更接近参考图观感的高保真 React/Tailwind 布局；图片作为 hero/banner/模块封面/背景氛围使用。

## Requirements
- 首页正文必须由真实 DOM 内容组成：导航、标题、CTA、统计、酒馆卡片、NPC/记忆说明等都用组件/文本渲染。
- 可继续使用现有赛博酒馆参考图，但只能作为装饰性 banner、背景或氛围图，不再作为整页截图承载内容。
- 保持 FableMap 主线：真实地点锚定、店主创作酒馆、AI NPC 对话、记忆回访。
- 保持入口可用：`/discover` 用于进入/探索酒馆，`/create` 用于开店。
- 窄屏可用：内容应自然堆叠，不依赖 729px 截图比例或绝对定位热点。

## Acceptance Criteria
- [x] `frontend/app/routes/home.tsx` 不再渲染整张首页截图和绝对定位 hotspot 链接。
- [x] 首页包含合理布局：顶部导航、hero、核心指标、热门酒馆/体验模块、价值条或流程说明。
- [x] 使用拆出的 banner 与模块图片作为 hero、酒馆卡片、NPC 对话、记忆模块的视觉素材，而不是完整贴图页面。
- [x] 不新增大型 UI/状态/地图依赖，不修改 API、Schema、后端或生成内容规则。
- [x] `npm --prefix .\\frontend run build` 通过。

## Technical Notes
- 主要修改范围：`frontend/app/routes/home.tsx`。
- 复用并拆分：`frontend/app/assets/homepage-reference/neon-cyber-tavern-reference.png` → `frontend/app/assets/homepage-reference/modules/*.png`，用于 banner/模块氛围图。
- 不改范围：后端、数据模型、路由 API、`docs/` 既有权威文档、未关联的 NPC portrait 任务。

## Verification
- 2026-04-24: `npm --prefix .\frontend run typecheck` passed after the image2/design-driven homepage pass.
- 2026-04-24: `npm --prefix .\frontend run build` passed after the image2/design-driven homepage pass.
- 2026-04-24: `npm --prefix .\frontend test` passed.
- 2026-04-24: `curl.exe --noproxy * -sS -D - http://127.0.0.1:8950/ -o NUL` returned 200 OK.
- 2026-04-24: `git diff --check -- frontend/app/routes/home.tsx .trellis/tasks/04-24-homepage-layout-polish` passed.

- 2026-04-24: 
pm --prefix .\frontend run build passed after /discover, /create, /tavern/:tavernId, and ProductShell layout polish.
