# 模块认领说明

- 模块名 / 区域名：D3 · 玩家参与感与城市神话共创主线文档化收束（续推进）
- 负责人：Roo
- 改动类型：协议 / 功能 / 文档 / 测试
- 当前状态：in_progress

## 目标

本次准备在既有 [`docs/claims/2026-03-12-d3-city-myth-co-creation.md`](docs/claims/2026-03-12-d3-city-myth-co-creation.md) 的基础上继续推进 D3，把“玩家如何参与城市神话共创”收束为更清晰、可检查、可继续实现的主线文档与运行时出口，重点对齐当前仓库中已经出现的 `world.co_creation`、`mythline_threads`、`participation_entries`、bundle 预览页入口与共享任务表口径，避免 D3 与后续 E1/E2/E3/E4 社区化任务边界重叠。

## 计划修改范围

- 会补充或更新 [`docs/AI_SHARED_TASKLIST.md`](docs/AI_SHARED_TASKLIST.md) 中 D3 的状态描述（如有必要）
- 会补充或更新 [`docs/CURRENT_TASKS.md`](docs/CURRENT_TASKS.md) 中与 D3 主线相关的短期执行口径（如有必要）
- 会检查并按需修改 [`fablemap/world_builder.py`](fablemap/world_builder.py)、[`fablemap/showcase.py`](fablemap/showcase.py)、[`fablemap/bundle.py`](fablemap/bundle.py) 中与共创主线数据出口直接相关的部分
- 会补充对应的 [`tests/`](tests/) 用例与 [`docs/changes/`](docs/changes/) 变更说明

## 明确不改范围

- 不实现联网社区、账号系统、多人同步、审核后台或 moderation 工作流
- 不直接落地 E1 / E2 / E3 / E4 的完整玩法系统
- 不修改 P3 / P4 / P5 协议正文的核心定义
- 不涉及地图资源包 M1 / M2 / M3 的资产生成与前端贴图接入
- 不改 Overpass 抓取、缓存层或外部运行时接入

## 依据的协议文档

- [`README.md`](README.md)
- [`CONTRIBUTING.md`](CONTRIBUTING.md)
- [`docs/AI_SHARED_TASKLIST.md`](docs/AI_SHARED_TASKLIST.md)
- [`docs/CURRENT_TASKS.md`](docs/CURRENT_TASKS.md)
- [`docs/LONG_TERM_EXPERIENCE.md`](docs/LONG_TERM_EXPERIENCE.md)
- [`docs/WORLD_WRITEBACK_PLAN.md`](docs/WORLD_WRITEBACK_PLAN.md)
- [`docs/claims/2026-03-12-d3-city-myth-co-creation.md`](docs/claims/2026-03-12-d3-city-myth-co-creation.md)

## 预期产出

- 一份新的 D3 续推进认领说明，明确当前协作边界
- 必要的 D3 文档口径对齐
- 如存在缺口，则补齐最小代码与测试，使城市神话共创主线在输出数据与预览入口中可验证
- 一份对应的 [`docs/changes/`](docs/changes/) 变更说明

## 验证方式

- 检查 [`docs/AI_SHARED_TASKLIST.md`](docs/AI_SHARED_TASKLIST.md) 与 [`docs/CURRENT_TASKS.md`](docs/CURRENT_TASKS.md) 中 D3 任务口径是否一致
- 执行受影响的 [`tests/test_bundle.py`](tests/test_bundle.py)、[`tests/test_showcase.py`](tests/test_showcase.py)、[`tests/test_demo.py`](tests/test_demo.py) 或相关测试
- 如改动运行时输出，则验证 bundle / showcase 产物中能够看到 D3 相关字段或入口

## 风险与备注

- 仓库中已存在较早的 D3 认领说明，本次续推进需保持兼容，不覆盖其历史背景，只补充当前这一轮协作边界
- D3 的目标是“主线文档化收束与最小出口对齐”，不能过度扩展为完整社区系统开发
- 若发现现有实现已覆盖 D3 大部分目标，本次将以文档对齐、状态同步和缺口补齐为主
