# 活跃任务优先级

更新时间：2026-07-28

本清单只排序仍需继续执行的任务。已完成基线、被当前产品合同取代或不再需要的
任务移入 `.trellis/tasks/archive/2026-07/`，保留历史证据但不再出现在活跃任务板。

## 执行队列

1. `00-bootstrap-guidelines`（P1，流程前置）
   - 补全仍为空模板的后端与前端规范；在下一项大型实现前完成。
2. `07-23-system-llm-runtime`（P0）
   - 收敛部署级模型配置，删除新运行链路对 owner、Space 私有配置和 Token 统计的依赖。
3. `07-24-player-continuity-integration`（P0）
   - 完成登录恢复、跨设备续玩、会话失效和重复提交保护。
4. `07-23-legacy-map-removal`（P0）
   - 删除地图、坐标、AMap 配置和可达入口，保留历史地点作为内容事实。
5. `07-23-legacy-space-contract-removal`（P0）
   - 删除旧 Space 类型、API、路由和运行入口，确保新主链路不再依赖兼容层。
6. `07-23-legacy-schema-config-removal`（P0）
   - 在引用审计、备份和显式迁移边界内清退旧 Schema、环境变量与部署引用。
   - 数据库检查或迁移执行仍需用户明确授权。
7. `07-23-story-platform-integration`（P0，最终门）
   - 验证两个 P0 故事的真实闭环、移动端、文档一致性与旧能力残留。
8. `07-24-character-life-guidance-gameplay`（P2）
   - P0 稳定后再扩展多故事、跨角色拜访和 Character 自主决定。

## 保留的协调父任务

- `07-22-product-mainline-rebuild`
- `07-23-story-world-domain`
- `07-23-character-first-player-flow`
- `07-23-story-continuity-ui`
- `07-23-legacy-space-removal`

父任务只维护需求、子任务关系与最终验收，不直接作为实现任务启动。

## 本轮归档口径

- **被合同取代**：三世界六角色、全局乞丐/性别、坐标 Space、店主案件、
  NPC/VisitorState 驱逐机制和故事内批量表情图方向。
- **基线已落地，后续由保留任务验收**：角色短路由、雪夜封宫内容与双身份、
  StoryWorld 运行时 API、角色发现、故事互动 UI、Home 社交公开面清退。
- 归档不表示旧 PRD 仍是当前合同；当前产品与 Schema 以 `AGENTS.md`、
  `docs/PRODUCT_BRIEF.md` 和 `docs/WORLD_SCHEMA.md` 为准。
