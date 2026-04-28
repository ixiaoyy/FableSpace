# 外星便利店公益酒馆

## Goal

把本轮头脑风暴产出的《第三货架后面》落成一间内置可体验的默认公益酒馆：真实坐标锚定、公开营业、本地 rules 后端可聊、包含完整 NPC 阵容、WorldInfo 条目和一个轻量玩法，让新开发环境无需外部 API Key 也能体验“外星生命荒诞喜剧酒馆”。

## Requirements

- 新增一间默认公益酒馆《第三货架后面》，挂接真实坐标，并保持 `public` / `open` / `rules` 后端。
- 酒馆内容包含 4 个店主预设 NPC：社长 9-Delta、临时店员 Mu-Mu、样本保管员 V-17、地球礼仪实习生 Pi-Pi。
- 酒馆包含便利店、人类日常行为、危险词“随便”、马上到、第二件半价、关东煮、已读不回、回访档案等 WorldInfo。
- 酒馆包含至少 1 个 published 轻玩法“今日人类谜题”，可通过现有 Gameplay fallback 在无 LLM 时推进。
- 默认公益酒馆列表和种子修复逻辑应自动包含新酒馆，且不覆盖用户已有非公益数据。
- 补充 focused pytest，覆盖新酒馆可发现、角色/世界书完整、本地 rules 聊天可用、玩法可运行。

## Acceptance Criteria

- [x] `DEFAULT_PUBLIC_WELFARE_TAVERN_IDS` 包含 `pw_third_shelf_observatory`。
- [x] 新服务实例通过查询“外星”或“便利店”能发现《第三货架后面》。
- [x] 新酒馆至少有 4 个角色，且角色字段满足 `TavernCharacter` 现有结构。
- [x] 新酒馆 WorldInfo 至少覆盖 8 条人类日常行为知识。
- [x] 访客可进入新酒馆并通过 rules 后端与 `char_pw_9_delta` 对话，不消耗 token。
- [x] 新酒馆的 published gameplay 可开始并通过 fallback 推进。

## Definition of Done

- 后端语法检查通过：`py -3 -m compileall -q backend/src`
- focused tests 通过：`py -3 -m pytest -q tests/test_default_public_welfare_taverns.py tests/test_default_public_welfare_gameplays.py --tb=short`
- 未新增依赖、未改 Schema、未引入平台自动生成酒馆内容。

## Technical Notes

- 依据文档：`README.md`、`docs/PRODUCT_BRIEF.md`、`docs/ARCHITECTURE.md`、`docs/WORLD_SCHEMA.md`、`docs/WHAT_NOT_TO_BUILD.md`、`docs/AI参与开发协议.md`。
- 依据规范：`.trellis/spec/backend/index.md`、`directory-structure.md`、`database-guidelines.md`、`quality-guidelines.md`、`.trellis/spec/guides/index.md`、`code-reuse-thinking-guide.md`。
- 主要落点：`backend/src/fablemap_api/core/default_taverns.py`。
- 测试落点：`tests/test_default_public_welfare_taverns.py`、`tests/test_default_public_welfare_gameplays.py`。
- 当前选择：复用默认公益酒馆机制，而不是新增模板/API/Schema；这保持切片小且符合主人主权和最小平台原则。

## Verification

- `py -3 -m compileall -q backend/src`：通过。
- `py -3 -m pytest -q tests/test_default_public_welfare_taverns.py tests/test_default_public_welfare_gameplays.py --tb=short`：9 passed。

## Out of Scope

- 不新增或修改 Tavern / TavernCharacter / WorldInfo / Gameplay schema。
- 不新增前端页面、地图渲染能力、角色图片资产或 UI 框架。
- 不实现平台自动生成酒馆内容、平台 Token 计费、访客社交、战斗/等级/装备。
- 不改已有用户数据迁移策略，只复用现有默认公益酒馆 idempotent seed。
