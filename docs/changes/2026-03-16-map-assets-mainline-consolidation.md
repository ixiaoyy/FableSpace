# 2026-03-16 map assets mainline consolidation

## 背景

仓库内已经存在 [`docs/MAP_ASSETS_PLAN.md`](docs/MAP_ASSETS_PLAN.md)、[`docs/MAP_ASSETS_GENERATION_GUIDE.md`](docs/MAP_ASSETS_GENERATION_GUIDE.md)、[`scripts/generate_map_assets.py`](scripts/generate_map_assets.py) 与已落盘的示例资源，但它们此前更多是分散存在于规划文档、生成说明、脚本与局部认领记录中，缺少一个明确的共享任务主线入口。

如果不先完成主线收束，后续推进资源生成、资源验收与前端接入时容易出现：

- 协作者直接跳到实现层，缺少统一的任务边界
- `Pack A / Pack B` 的 scene、icons、tiles 规范散落在不同文档里
- [`M2`](docs/AI_SHARED_TASKLIST.md:53) 与 [`M3`](docs/AI_SHARED_TASKLIST.md:54) 的协作顺序不够清晰
- 共享任务表与项目管理任务清单对 Map Assets 主线的表达不一致

## 本次变更

新增：

- [`docs/claims/2026-03-16-map-assets-mainline-consolidation.md`](docs/claims/2026-03-16-map-assets-mainline-consolidation.md)
- [`docs/changes/2026-03-16-map-assets-mainline-consolidation.md`](docs/changes/2026-03-16-map-assets-mainline-consolidation.md)

更新：

- [`docs/AI_SHARED_TASKLIST.md`](docs/AI_SHARED_TASKLIST.md)
- [`docs/CURRENT_TASKS.md`](docs/CURRENT_TASKS.md)

文档同步明确了：

- [`M1`](docs/AI_SHARED_TASKLIST.md:52) 已进入 `in_progress`
- `Map Assets` 主线以 [`docs/MAP_ASSETS_PLAN.md`](docs/MAP_ASSETS_PLAN.md) + [`docs/MAP_ASSETS_GENERATION_GUIDE.md`](docs/MAP_ASSETS_GENERATION_GUIDE.md) + [`scripts/generate_map_assets.py`](scripts/generate_map_assets.py) 为统一入口
- `Pack A / Pack B` 的 scene、icons、tiles 输出规范属于同一条主线资产口径
- 后续协作顺序按 `M1 -> M2 -> M3` 展开，其中生成、验收、前端接入继续拆分推进

## 影响范围

- 共享任务表状态同步
- 项目管理任务清单补充 Map Assets 主线补位说明
- 新增 M1 专属认领说明，避免与既有 [`docs/claims/2026-03-16-map-assets-task-sync.md`](docs/claims/2026-03-16-map-assets-task-sync.md) 和 [`docs/claims/2026-03-16-map-assets-frontend-baseline.md`](docs/claims/2026-03-16-map-assets-frontend-baseline.md) 发生边界混淆

## 明确没有改什么

- 没有修改 [`scripts/generate_map_assets.py`](scripts/generate_map_assets.py) 的实现逻辑
- 没有新生成图片资源或替换现有资源文件
- 没有修改 [`frontend/src/WorldMap.jsx`](frontend/src/WorldMap.jsx) 的前端渲染接入
- 没有调整写回协议主线或其他非 Map Assets 任务状态

## 验证方式

- 检查 [`docs/AI_SHARED_TASKLIST.md`](docs/AI_SHARED_TASKLIST.md) 中 [`M1`](docs/AI_SHARED_TASKLIST.md:52) 状态是否为 `in_progress`
- 检查 [`docs/CURRENT_TASKS.md`](docs/CURRENT_TASKS.md) 是否已补入 `Map Assets 主线补位（M1）`
- 检查是否已新增 [`docs/claims/2026-03-16-map-assets-mainline-consolidation.md`](docs/claims/2026-03-16-map-assets-mainline-consolidation.md)
- 确认后续协作者可以直接基于 [`M2`](docs/AI_SHARED_TASKLIST.md:53) / [`M3`](docs/AI_SHARED_TASKLIST.md:54) 继续拆分开发

## 结果

Map Assets 不再只是“已经有规划和脚本”，而是被正式纳入共享任务主线。后续生成执行、资产验收与前端接入可以在同一入口下继续协作推进。