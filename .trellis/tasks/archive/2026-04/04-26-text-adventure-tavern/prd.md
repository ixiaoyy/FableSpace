# 文游类公益酒馆

## Goal

新增一间默认公益酒馆《午夜委托板》，用现有 `gameplay_definitions` 展示“酒馆不只是聊天，也可以是结构化轻文字互动”。新酒馆应在无外部 API Key 的开发环境中可发现、可进入、可对话，并可直接开始多个 published 文游玩法。

## Requirements

- 新增一间默认公益酒馆《午夜委托板》，挂接真实坐标，并保持 `public` / `open` / `rules` 后端。
- 酒馆包含 2 个 NPC：委托板值夜员“墨栈”和异常登记员“栀灯”。
- 酒馆包含文游相关 WorldInfo：委托板、线索调查、社区小委托、异常值班、结算方式、安全边界等。
- 酒馆包含 3 个 published gameplay：
  - 线索调查：整理线索并给出低风险推理。
  - 社区小委托：把小事拆成可执行行动。
  - 异常值班：处理一段轻都市传说式异常，但不进入恐怖伤害或战斗。
- rules 后端对委托/线索/异常等主题给出本地文游式回复，不消耗 token。
- 补充 focused pytest，覆盖新酒馆可发现、3 个 published gameplay、fallback 推进、rules 回复。

## Acceptance Criteria

- [x] `DEFAULT_PUBLIC_WELFARE_TAVERN_IDS` 包含 `pw_midnight_commission_board`。
- [x] 查询“文游”或“委托”能发现《午夜委托板》。
- [x] 新酒馆至少有 2 个角色，且角色字段满足现有 `TavernCharacter` 结构。
- [x] 新酒馆至少有 3 个 published gameplay，标题分别覆盖线索调查、社区小委托、异常值班。
- [x] 访客可启动并 fallback 推进每个 gameplay。
- [x] 访客可进入新酒馆并通过 rules 后端获得文游主题回复，不消耗 token。

## Definition of Done

- 后端语法检查通过：`py -3 -m compileall -q backend/src`
- focused tests 通过：`py -3 -m pytest -q tests/test_default_public_welfare_taverns.py tests/test_default_public_welfare_gameplays.py --tb=short`
- 未新增依赖、未改 Schema、未新增 API、未引入战斗/等级/装备或访客社交。

## Technical Notes

- 主要落点：`backend/src/fablemap_api/core/default_taverns.py`。
- rules 回复落点：`backend/src/fablemap_api/core/web/service.py`。
- 测试落点：`tests/test_default_public_welfare_taverns.py`、`tests/test_default_public_welfare_gameplays.py`。
- 复用现有 `_tavern` / `_character` / `_world_info` / `_gameplay` helper，不抽新结构。

## Verification

- `py -3 -m compileall -q backend/src`：通过。
- `py -3 -m pytest -q tests/test_default_public_welfare_taverns.py tests/test_default_public_welfare_gameplays.py --tb=short`：12 passed。

## Out of Scope

- 不做新的游戏引擎、脚本引擎或节点编辑器。
- 不新增 schema 字段或 API 路由。
- 不做战斗、等级、装备、排行榜、跨酒馆社交。
- 不改前端 UI；前端已能展示 published gameplay。
