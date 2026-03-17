# 模块认领说明

- 模块名 / 区域名：Map Assets 资源生成与落盘（M2）
- 负责人：OpenClaw
- 改动类型：功能 / 工具 / 资源 / 文档
- 当前状态：in_progress

## 目标

本次准备沿着 [`M1`](docs/AI_SHARED_TASKLIST.md) 已收束的主线，正式推进双资源包地图资产的生成与落盘，围绕 [`scripts/generate_map_assets.py`](scripts/generate_map_assets.py) 与 [`fablemap/demo_assets/new_map_assets/`](fablemap/demo_assets/new_map_assets/) 完成 Pack A / Pack B 的 scene、icons、tiles 生成执行入口与输出交付边界说明。

## 计划修改范围

- [`docs/claims/2026-03-16-map-assets-generation-pack-a-b.md`](docs/claims/2026-03-16-map-assets-generation-pack-a-b.md)
- [`scripts/generate_map_assets.py`](scripts/generate_map_assets.py)
- [`docs/MAP_ASSETS_GENERATION_GUIDE.md`](docs/MAP_ASSETS_GENERATION_GUIDE.md)
- [`docs/LOCAL_GPU_MAP_ASSETS_GUIDE.md`](docs/LOCAL_GPU_MAP_ASSETS_GUIDE.md)
- [`fablemap/demo_assets/new_map_assets/`](fablemap/demo_assets/new_map_assets/)
- 如有必要，补充对应的 [`docs/changes/`](docs/changes/) 说明

## 明确不改范围

- 不修改 [`frontend/src/WorldMap.jsx`](frontend/src/WorldMap.jsx) 的前端渲染逻辑
- 不推进 [`M3`](docs/AI_SHARED_TASKLIST.md:54) 的资源验收映射与前端接入基线实现
- 不调整写回协议、世界规则或其他非 Map Assets 主线任务
- 不重构现有浏览器 2D 地图交互层

## 依据的协议文档

- [`README.md`](README.md)
- [`CONTRIBUTING.md`](CONTRIBUTING.md)
- [`docs/AI_SHARED_TASKLIST.md`](docs/AI_SHARED_TASKLIST.md)
- [`docs/CURRENT_TASKS.md`](docs/CURRENT_TASKS.md)
- [`docs/MAP_ASSETS_PLAN.md`](docs/MAP_ASSETS_PLAN.md)
- [`docs/MAP_ASSETS_GENERATION_GUIDE.md`](docs/MAP_ASSETS_GENERATION_GUIDE.md)
- [`docs/LOCAL_GPU_MAP_ASSETS_GUIDE.md`](docs/LOCAL_GPU_MAP_ASSETS_GUIDE.md)

## 预期产出

- 一份 `M2` 认领说明
- 如有需要，对 [`scripts/generate_map_assets.py`](scripts/generate_map_assets.py) 做最小生成流程增强
- Pack A / Pack B 资源生成与落盘说明
- 一份对应的变更说明文档

## 验证方式

- [`scripts/generate_map_assets.py`](scripts/generate_map_assets.py) 的输出路径、目录结构与 prompt 口径与主线文档一致
- [`fablemap/demo_assets/new_map_assets/`](fablemap/demo_assets/new_map_assets/) 中的 Pack A / Pack B 资源结构完整可检查
- 若使用本地 GPU 方案，生成流程与 [`docs/LOCAL_GPU_MAP_ASSETS_GUIDE.md`](docs/LOCAL_GPU_MAP_ASSETS_GUIDE.md) 保持一致
- 后续协作者可在不重读散落上下文的前提下继续进入 [`M3`](docs/AI_SHARED_TASKLIST.md:54)

## 风险与备注

- 当前资源生成受本地 GPU / API / 模型能力影响，实际结果可能需要分批生成与人工筛选
- 若执行环境无法直接出图，允许先补生成入口与执行说明，再由后续机器完成正式落盘
- 本次重点是“生成与落盘主线”，不应越界到资源化渲染接入或大规模前端改造
