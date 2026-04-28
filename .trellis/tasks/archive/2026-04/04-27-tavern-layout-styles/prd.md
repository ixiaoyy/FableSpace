# 酒馆页面多布局样式

## Goal
基于 `设计参考/` 中的酒馆页参考图，在现有 React Router 酒馆详情页实现多种可切换的酒馆体验布局，让页面能覆盖大厅、NPC 会话、任务/玩法、混合房间等场景。

## Requirements
- 保留现有 tavern loader、角色选择、聊天、分享、创建引导与 roleplay 管理能力。
- 在 `frontend/app/routes/tavern.tsx` 内增加多布局入口与视觉结构，优先复用现有 `TavernNpcStage`、`TavernChat`、`TavernShareCard`、`CreatorConversionCard`、`RoleplayPanel`。
- 实现至少 4 种布局样式：大厅型、NPC 会话型、任务/玩法型、混合房间型。
- 视觉参考 `设计参考/image.png` 与 `设计参考/企业微信截图_*.png`：沉浸式背景、顶部酒馆信息、功能卡、NPC 列表/对话、委托/线索/记忆/店内事件模块、底部模式切换。
- 按用户确认，新增 Tavern 级 `layout_style` 字段作为酒馆页默认布局偏好；不修改 Character schema、不引入新依赖。
- 窄屏可用：布局在移动端堆叠，横向功能项可换行/滚动。

## Acceptance Criteria
- [ ] 酒馆页顶部出现多布局切换，并能在同一页切换 4 种布局。
- [ ] 每种布局都有与参考图对应的结构重点：大厅入口、NPC 侧栏+聊天、委托线索、混合房间事件。
- [ ] 现有聊天、NPC 选择、分享复制、开店引导、roleplay 面板仍可访问。
- [ ] `layout_style` 在后端创建、读取、更新、JSON/MySQL 持久化、前端类型与页面初始化之间保持一致；旧数据缺省为 `lobby`。
- [ ] `npm --prefix .\frontend run build` 通过；如触及可测试规则则运行 `npm --prefix .\frontend test`。

## Technical Notes
- 类型：fullstack schema + frontend UI。
- 允许修改范围：`frontend/app/routes/tavern.tsx`、`frontend/app/features/tavern-layout-showcase/`、`frontend/app/lib/`、`frontend/scripts/`、`backend/src/fablemap_api/core/tavern.py`、`backend/src/fablemap_api/contracts/taverns.py`、可选 MySQL infrastructure、相关测试与 schema 文档。
- 不改范围：Character schema、酒馆内容生成逻辑、依赖、图片资源目录结构。
- `layout_style` 合法值：`lobby`、`npc-chat`、`quest-play`、`hybrid-room`；缺失或非法值归一到 `lobby`。
- 依据：AGENTS.md、README.md、docs/PRODUCT_BRIEF.md、docs/FABLEMAP_TAVERN_PLATFORM.md、docs/ARCHITECTURE.md、docs/WORLD_SCHEMA.md、docs/WHAT_NOT_TO_BUILD.md、.trellis/spec/frontend/*。
