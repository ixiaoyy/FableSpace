# Design Audit Visual Polish

## Goal

把 `docs/设计参考_视觉与角色评估.md` 中可立即落地的体验问题收敛成一次小范围前端优化：保留 FableMap 真实坐标、店主主权和公益 NPC 边界，同时提升“赛博酒馆”视觉沉浸感。

## Requirements

- 优先处理低风险、前端展示层问题，不改 API、Schema、存储或 NPC 数据语义。
- Discover / Map Radar：改善小屏筛选体验，避免筛选控件吞掉移动端首屏。
- Tavern Chat Workbench：弱化 owner/roleplay 管理区的后台表单感，增强“店主控制台 / 全息面板”的视觉隐喻。
- Create Tavern Wizard：保留现有 owner-authored 表单和 AI 草稿边界，提升分步仪式感与当前步骤反馈。
- 不新增 UI 框架、状态管理库或地图依赖。
- 不移动、删除、重命名既有 docs 文档。

## Acceptance Criteria

- [x] Discover 小屏默认能看到简洁筛选入口与当前筛选摘要；完整筛选项可展开。
- [x] Tavern owner 管理区视觉上不再像裸后台表单，至少 Roleplay 面板有统一的控制台语气与说明。
- [x] Create 页面当前步骤与下一步动作更清晰，仍保持所有内容由店主确认后提交。
- [x] 修改范围限于前端路由/展示代码与本任务记录。
- [x] 运行 `npm --prefix .\frontend run build` 并记录结果。

## Technical Notes

- 参考文档：`docs/设计参考_视觉与角色评估.md`。
- 主要候选文件：
  - `frontend/app/routes/discover.tsx`
  - `frontend/app/routes/tavern.tsx`
  - `frontend/app/routes/create.tsx`
- 当前仓库已有大量未提交改动，本任务只在上述目标文件追加/调整小范围 UI，不做无关格式化。

