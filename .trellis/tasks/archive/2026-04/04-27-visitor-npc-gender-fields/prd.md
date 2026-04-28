# 游客与 NPC 性别字段

## Goal
为 FableMap 增加受控的游客（VisitorState）与 NPC（TavernCharacter）性别字段，使店主可为 NPC 标注性别，游客可在入场/对话时声明性别，并保证 JSON/MySQL/API/前端/文档同步。

## Requirements
- 新增统一 `Gender` 枚举：`unspecified | female | male | nonbinary | other`。
- NPC 性别保存到 `TavernCharacter.gender`，随角色创建、更新、读取、导入/导出 payload 传递。
- 游客性别保存到 tavern-scoped `VisitorState.gender`，通过进入酒馆和聊天请求写入/更新。
- 缺失、空值、旧数据读取时默认 `unspecified`；常见中英文别名归一化为受控枚举。
- 前端新增共享 gender helper、类型字段、游客聊天 UI 选择和 NPC 编辑器选择。
- MySQL 可选持久层和 JSON 持久层均需 round-trip。
- 更新 `docs/WORLD_SCHEMA.md` 和 `.trellis/spec/`，避免后续“字段已做但文档/测试未做”的漂移。

## Non-goals / Boundaries
- 不新增全局用户资料、好友匹配、推荐或社交筛选。
- 不做真实性校验或敏感身份采集；游客性别仅为自声明的 tavern-scoped 体验上下文。
- 不让 AI 自动推断或覆盖游客/NPC 性别。
- 不改变 SillyTavern 标准字段语义；`gender` 是 FableMap 扩展字段，导入旧卡默认 `unspecified`。

## Acceptance Criteria
- [ ] 后端 API 创建/更新 NPC 时可保存 `gender`，旧数据默认 `unspecified`。
- [ ] 进入酒馆与发送聊天可写入 `visitor_gender`，返回 `visitor_state.gender`。
- [ ] JSON 和 MySQL 持久化均能 round-trip NPC/Visitor 性别。
- [ ] 前端 `npm test` 覆盖 gender helper/角色 payload 归一化。
- [ ] `docs/WORLD_SCHEMA.md` 定义 Gender、TavernCharacter.gender、VisitorState.gender。
- [ ] 所有本任务新增/修改验收项都有新鲜验证输出。

## Technical Design
- 后端单点归一化函数 `_normalize_gender(value)` 放在 `core/tavern.py`，dataclass `to_dict/from_dict`、payload 构造、入场和聊天触点复用。
- API 入参字段：NPC 使用 `gender`；游客使用 `visitor_gender`，避免和 NPC 字段混淆。
- 前端 helper `frontend/app/lib/gender.js` 作为 UI 与脚本测试的共享常量/归一化/标签来源。
- 游客性别写入只更新当前 `tavern_id + visitor_id` 的 `VisitorState`，不进入公开发现筛选。

## Verification Plan
- RED：先添加 backend/frontend 失败测试并确认失败。
- GREEN 后运行：
  - `py -3 -m compileall -q backend/src`
  - `py -3 -m pytest -q backend/tests/test_v1_gender_fields.py backend/tests/test_mysql_infrastructure.py::TestCharacterCRUD::test_character_gender_round_trip backend/tests/test_mysql_infrastructure.py::TestVisitorState::test_update_and_get_visitor_state --tb=short`
  - `npm --prefix .\frontend test`
  - `npm --prefix .\frontend run typecheck`
  - `npm --prefix .\frontend run build`
  - 必要时全量 `py -3 -m pytest -q --tb=short`（localhost 相关测试需清空代理环境）。
