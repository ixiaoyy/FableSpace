# 模块认领说明

- 模块名 / 区域名：Map Assets 双资源包主线收束（M1）
- 负责人：OpenClaw
- 改动类型：文档
- 当前状态：in_progress

## 目标

本次准备把双资源包地图资产主线正式收束为一个可继续协作的统一入口，围绕 [`docs/MAP_ASSETS_PLAN.md`](docs/MAP_ASSETS_PLAN.md) 与 [`docs/MAP_ASSETS_GENERATION_GUIDE.md`](docs/MAP_ASSETS_GENERATION_GUIDE.md) 明确 Pack A / Pack B 的 scene、icons、tiles 输出规范，以及后续资源生成、验收、前端接入的拆分边界。

## 计划修改范围

- [`docs/claims/2026-03-16-map-assets-mainline-consolidation.md`](docs/claims/2026-03-16-map-assets-mainline-consolidation.md)
- [`docs/AI_SHARED_TASKLIST.md`](docs/AI_SHARED_TASKLIST.md)
- [`docs/CURRENT_TASKS.md`](docs/CURRENT_TASKS.md)
- 如有必要，补充对应的 [`docs/changes/`](docs/changes/) 文档说明

## 明确不改范围

- 不修改 [`scripts/generate_map_assets.py`](scripts/generate_map_assets.py) 的实现逻辑
- 不直接生成新的图片资源文件
- 不修改 [`frontend/src/WorldMap.jsx`](frontend/src/WorldMap.jsx) 的渲染实现
- 不调整 P3 / P5 主协议与写回主线实现

## 依据的协议文档

- [`README.md`](README.md)
- [`CONTRIBUTING.md`](CONTRIBUTING.md)
- [`docs/AI_SHARED_TASKLIST.md`](docs/AI_SHARED_TASKLIST.md)
- [`docs/CURRENT_TASKS.md`](docs/CURRENT_TASKS.md)
- [`docs/MAP_ASSETS_PLAN.md`](docs/MAP_ASSETS_PLAN.md)
- [`docs/MAP_ASSETS_GENERATION_GUIDE.md`](docs/MAP_ASSETS_GENERATION_GUIDE.md)

## 预期产出

- 一份 M1 主线认领说明
- 共享任务表中 M1 状态与描述同步
- 项目管理任务清单中补入 Map Assets 主线的当前位置与协作顺序说明

## 验证方式

- [`docs/AI_SHARED_TASKLIST.md`](docs/AI_SHARED_TASKLIST.md) 中可明确看到 M1 已被认领并处于推进状态
- [`docs/CURRENT_TASKS.md`](docs/CURRENT_TASKS.md) 中可看到 Map Assets 主线与 M1/M2/M3 的顺序关系
- 后续协作者可据此继续认领资源生成、验收、前端接入等子任务

## 风险与备注

- M1 是主线收束任务，应避免和已有 [`docs/claims/2026-03-16-map-assets-task-sync.md`](docs/claims/2026-03-16-map-assets-task-sync.md) 与 [`docs/claims/2026-03-16-map-assets-frontend-baseline.md`](docs/claims/2026-03-16-map-assets-frontend-baseline.md) 发生边界混淆
- 本次重点是统一入口与任务边界，不应越界到资源生成执行或前端大规模接入
