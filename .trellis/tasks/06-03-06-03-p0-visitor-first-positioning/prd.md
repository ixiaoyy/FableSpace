# P0 Visitor-first Mirror Spaces Positioning

## Goal

把 P0 产品口径从“地图/创建控件优先”收束为“探索者游玩优先”：FableMap 是世界的镜像面，基于地理位置组织不同类型的 AI 空间，让不同喜好的人进入、游玩、回访，并找到属于自己的私密空间。

## Known facts

- 用户确认：不是纯地图产品；已改成基于地理位置的各个空间。
- 用户确认：游客来游玩，不是让游客自己创建控件。
- 用户确认：不同人想法和喜好不同，因此空间类型应多样，不只是聊天。
- 用户确认：角色只保留探索者、店主、NPC。

## Requirements

- 更新权威产品文档中的定位、角色和主链路口径。
- 更新游客可见前端文案/导航，降低“创建/管理”在游客主路径中的显眼程度。
- 保持地理位置作为组织空间的锚点，但不强调纯地图难度高的交互。
- 保留店主作为后台供给侧角色，不删除创建/管理功能。
- 不改后端 Schema、不新增 API、不引入依赖。

## Acceptance Criteria

- README / PRODUCT_BRIEF 明确新定位：世界镜像面、地理位置空间、多类型游玩、私密空间。
- 文档角色为探索者 / 店主 / NPC，不再把 NPC 扮演者作为主角色。
- 前端 title/核心文案不再优先呈现 SoulLink。
- 前端主导航更偏探索者游玩，创建/管理入口降级或改名为后台语义。
- 前端 build 通过，或如失败则记录失败原因。

## Out of Scope

- 不做视觉大改版。
- 不做地图引擎/定位能力。
- 不做后端权限、认证、Schema 或数据库迁移。
- 不恢复/新增完整测试体系。

## Technical Notes

Likely files:
- README.md
- docs/PRODUCT_BRIEF.md
- frontend/app/root.tsx
- frontend/app/shell/product-shell.tsx
- frontend/app/components/fable-map-reference-artboards.tsx
