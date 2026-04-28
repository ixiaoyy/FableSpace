# Place 关系图泛化 MVP

## Goal

把上一轮 Place/Home MVP 中过度特化的 `school_enrollment` 关系改成可扩展的 Place Relationship：学生-学校只是 `relation_type` 的一种，系统应支持 owner-authored、审批型、跨地点/成员关系记录，同时不引入好友/私信/动态墙等访客社交功能。

## Requirements

- 后端保留 `school_enrollment` 兼容路径与学校成员摘要。
- 后端新增通用关系创建入口，允许 Home owner 为 Home member 发起不同 `relation_type` 的目标地点关系。
- `relation_type` 必须是有限枚举或受控可扩展集合，不能任意自由文本污染持久 Schema。
- 非 school 关系也要支持 same-owner 自动 approved、cross-owner pending、target owner 审批。
- 目标地点可以是任意非 Home / Home 均可，但公开摘要只对 target owner 或受控 API 可见，不能变成公开社交图谱。
- 文档与 Trellis spec 要把 `school_enrollment` 描述为示例/特例，而非唯一关系类型。
- 前端服务类型与 Home UI 文案要支持选择/展示通用关系类型，School UI 仍可展示学校成员摘要。

## Acceptance Criteria

- [ ] 后端测试证明 `care_link` / 非学校关系可创建、跨 owner pending、target owner 可批准。
- [ ] 后端测试证明非法 `relation_type` 被拒绝。
- [ ] 后端现有 school enrollment 测试仍通过。
- [ ] 前端脚本测试覆盖通用关系 draft normalization，不再只有 school_tavern_id。
- [ ] `docs/WORLD_SCHEMA.md` 把 Relationship 类型泛化，并保留学生-学校示例。
- [ ] Trellis backend/frontend specs 同步泛化契约。
- [ ] `py -3 -m compileall -q backend/src` 通过。
- [ ] 相关 pytest 通过。
- [ ] `npm --prefix .\frontend test` / typecheck / build 通过。

## Out of Scope

- 不做好友、私信、动态墙、全局访客社交图谱。
- 不开放任意用户关系写入；仍由 source owner 发起、target owner 审批。
- 不新增外部依赖或独立迁移系统。
