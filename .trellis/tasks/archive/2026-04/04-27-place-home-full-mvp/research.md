# Research — Place/Home 未做项全量实现 MVP

## 读取依据

- `AGENTS.md`：Schema/API/前端改动必须按 Trellis 留痕；不能把未做项当完成；功能级改动要同步测试与文档。
- `docs/WORLD_SCHEMA.md`：Tavern/TavernCharacter/WorldInfoEntry 是当前核心 Schema；新增持久字段必须同步本文档。
- `docs/WHAT_NOT_TO_BUILD.md`：禁止无锚点自由空间、访客间社交、平台自动发布内容、传统地图 App/RPG 方向。
- `.trellis/tasks/04-27-place-type-discovery-mvp/*` 与父任务 `04-27-place-type-home-concept`：明确 Deferred：后端、WORLD_SCHEMA、持久字段、Home、家庭成员、学校同步、关系图。

## 现有代码结论

- 后端 `/api/v1/taverns` 由 `backend/src/fablemap_api/core/tavern.py` 的 `TavernService` 驱动，JSON `TavernStore` 与 optional `MySQLTavernStore` 均需 round-trip 新字段。
- V1 request contract 在 `backend/src/fablemap_api/contracts/taverns.py`；路由在 `backend/src/fablemap_api/api/v1/taverns.py`；application service 在 `backend/src/fablemap_api/application/services/management.py` 做委托。
- 前端新路由使用 `frontend/app/lib/taverns.ts`，发现页类型展示使用 `frontend/app/lib/place-types.js`。
- 现有发现页 helper 只能从公开 payload 派生类型；需要以后端 `place_type` 为事实来源，旧 payload 才回退关键词推断。

## 设计决策

- 不新建独立 Place 数据表/服务；采用 Tavern-compatible Place/Home MVP：`place_type`、`home_members`、`place_relationships` 作为 Tavern 兼容字段。
- `home` 仍必须有真实 `lat/lon`，默认私密且不进入公开发现；owner/private payload 才能读取 Home 细节。
- Home 家庭成员默认不是 NPC；`silent_member` / `display_object` 必须保持非对话，只有 `conversational_character` 结合显式角色配置才可能进入对话链路。
- 学校同步通过 `school_enrollment` relationship 实现：同主人自动 `approved`，跨主人先 `pending`，由目标 School owner 审批后才进入学校成员摘要。
- Relationship 是地点治理记录，不是好友/私信/动态墙/全局社交图谱。

## 验证策略

- TDD 后端：`backend/tests/test_v1_place_home_mvp.py` 覆盖默认类型、非法类型、Home 私密/发现边界、Home 成员沉默、学校关系审批。
- 持久兼容：`backend/tests/test_mysql_infrastructure.py::TestTavernCRUD::test_place_home_fields_round_trip` 覆盖 MySQL store round-trip。
- 前端 contract：`frontend/scripts/place-home-contract-test.mjs` 覆盖 create payload/Home member normalization；`frontend/scripts/place-types-test.mjs` 覆盖 persisted `place_type` 优先与 Home 不进公开 chips。
- 收尾验证：compileall、相关 pytest、frontend test/typecheck/build、Trellis task validate。
