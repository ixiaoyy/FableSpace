# Place/Home 未做项全量实现 MVP

## Goal

把 `04-27-place-type-discovery-mvp` 中明确 Deferred 的 Place/Home 能力补成一个可验证 MVP：地点类型成为后端持久字段，Home 成为受控真实坐标空间，家庭成员与学校同步以审批关系图方式落库，同时保持 Tavern 兼容、主人主权、真实地图锚点和负面清单边界。

## What I already know

- 用户要求“使用 Trellis 把未做的部分全部做完”。
- 直接来源：`.trellis/tasks/04-27-place-type-discovery-mvp/task.json.meta.deferred_not_done` 与父任务 `product-direction-decision.md`。
- 必须补齐的未做项包括：后端 API/contracts、`docs/WORLD_SCHEMA.md`、持久 `place_type`/Place/Home/Member/Relationship 字段或模型、创建/更新 payload 写入、Home MVP、家庭成员、学校同步、跨地点关系图。
- 权威边界来自 `AGENTS.md`、`docs/WORLD_SCHEMA.md`、`docs/WHAT_NOT_TO_BUILD.md`、`docs/FABLEMAP_TAVERN_PLATFORM.md`。
- 不能实现无锚点空间、无边界访客社交、平台自动发布内容、传统地图 App 功能或传统 RPG 系统。

## Assumptions

- 为了兼容现有 Tavern 主链路，本 MVP 不新建完全独立数据库表；优先在现有 Tavern JSON 持久模型上增加向后兼容字段，并用关系记录表达 Home/School 同步。
- `home` 是 `place_type` 的一种，但默认 `access=private`，不进入公开发现列表；可通过 owner/受控访问查看。
- “学校同步”不是自动改写他人学校公开名单，而是创建 `school_enrollment` 关系；只有同主人或目标 Place 主人批准后才出现在学校成员列表。
- “家庭成员”默认是 Home 内 `home_members`：`silent_member` 和 `display_object` 不进入 AI 对话；只有 `conversational_character` 且绑定/配置角色时才可对话。

## Requirements

- 后端 Tavern 持久模型增加 `place_type` 有限枚举，旧数据默认 `tavern`。
- 后端 Tavern 创建/更新 payload 支持 `place_type`，非法值返回验证错误或被拒绝。
- 后端支持 Home MVP 字段：Home 仍有真实 `lat/lon`；默认私密；公开 payload 不泄露不该泄露的 Home 成员/精确关系。
- 后端支持 Home 成员字段，成员类型包含 `conversational_character`、`silent_member`、`display_object`；非对话成员默认 `speech_mode=silent`。
- 后端支持跨地点关系图字段/接口，至少包含 Home member -> School place 的 `school_enrollment` 关系，状态 `pending/approved/rejected/revoked`。
- 同主人 Home/School enrollment 可自动 approved；跨主人必须 pending，不能自动出现在学校公开成员列表。
- 前端创建/编辑 Tavern payload 能保存地点类型，Home 有受控提示和默认私密策略。
- 前端发现页使用后端 `place_type` 为事实来源；保留 helper 仅做旧 payload 回退；Home 不进入公开筛选 chips。
- 前端提供最小 Home 成员/学校关系可见 UI，不做好友、私信、动态墙或陌生人社交。
- 更新 `docs/WORLD_SCHEMA.md` 和 Trellis spec，记录字段、状态、权限和验证矩阵。

## Acceptance Criteria

- [ ] 后端测试覆盖旧 Tavern 默认 `place_type=tavern`。
- [ ] 后端测试覆盖创建/更新 `place_type`，非法类型拒绝。
- [ ] 后端测试覆盖 Home 默认私密、公开列表不返回 Home。
- [ ] 后端测试覆盖 Home 成员默认沉默，非对话成员不进入 NPC 对话列表。
- [ ] 后端测试覆盖 school enrollment：同主人自动 approved；跨主人 pending；只有 approved 关系进入学校成员摘要。
- [ ] 前端测试覆盖创建 payload 写入 `place_type` 与 Home public-filter 边界。
- [ ] 发现页优先使用后端 `place_type`，旧 payload 仍回退推断。
- [ ] `docs/WORLD_SCHEMA.md` 更新 Place/Home/Member/Relationship Schema。
- [ ] `py -3 -m compileall -q backend/src` 通过。
- [ ] 相关 pytest 或全量 `py -3 -m pytest -q --tb=short` 通过。
- [ ] `npm --prefix .\frontend test` 通过。
- [ ] `npm --prefix .\frontend run build` 通过。

## Definition of Done

- Code + docs + tests + Trellis task notes 全部同步。
- 每个完成声明都有本轮验证输出支撑。
- Deferred 列表只剩明确非 MVP 且用户未要求的内容；本轮不得把未实现项写成完成。

## Out of Scope

- 不做好友系统、私信、动态墙、全局在线状态或陌生人匹配。
- 不做真实未成年人身份采集；学校成员公开展示只用 owner-authored nickname/display name。
- 不做传统地图路线规划、POI 评分、商家入驻。
- 不做战斗、等级、装备、排行榜。
- 不新增外部依赖。

## Technical Approach

- 兼容层：在 Tavern Schema 上增加 `place_type` 与可选 `home_members`、`place_relationships`，旧 JSON 缺失字段时归一化默认值。
- 权限层：public discover/list 排除 `place_type=home`；owner 读取仍可看到 Home。
- 关系层：用结构化 relationship 记录跨 Home/School 关系，审批后才生成 school member summary。
- 前端层：创建/编辑增加地点类型选择；发现/预览优先显示后端字段；Home 入口只做最小受控展示。

## Decision (ADR-lite)

**Context**: 用户要求补齐此前 Deferred 的后端 Schema、Home、成员、学校同步与关系图。完全新建 Place/Home 子系统风险过大且会破坏现有 Tavern 主链路。

**Decision**: 采用 “Tavern-compatible Place/Home MVP”：以现有 Tavern 为 Anchored Space 载体，新增向后兼容字段和关系记录，不引入独立数据库依赖，不改变真实坐标和主人主权原则。

**Consequences**: 能一次补齐 MVP 能力并保持旧 Tavern 可读；长期若要拆分独立 Place/Home 服务，可基于这些字段迁移。

## Technical Notes

- 任务父级：`04-27-place-type-home-concept`。
- 直接前置：`04-27-place-type-discovery-mvp`。
- 需要重点检查：`backend/src/fablemap_api/contracts/taverns.py`、`backend/src/fablemap_api/api/v1/taverns.py`、`backend/src/fablemap_api/application/services/taverns.py`、`backend/src/fablemap_api/core/tavern.py`、`frontend/app/routes/create.tsx`、`frontend/app/routes/discover.tsx`、`frontend/app/lib/taverns.ts`、`frontend/app/lib/place-types.js`。
