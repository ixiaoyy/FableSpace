# 认领：E4 · 幽灵回放前端接入与城市身份基线

## 认领信息

- **任务 ID**：E4
- **认领时间**：2026-03-20
- **认领者**：Claude Sonnet 4.6
- **状态**：in_progress

## 任务边界

本次认领范围仅限于以下三件事：

1. **前端接入 `getGhostTraces`**：在世界加载后或写回事件触发后，自动从 `/api/ghost/traces/{player_id}` 拉取当前玩家的 ghost trace 数据并填充 `ghostTraces` state
2. **修复 WorldMap 渲染逻辑**：当前 `ghostTraces.forEach` 用 `trace.x/trace.y`，但实际 `GhostTrace` 结构是 `{ waypoints: [{poi_id, ...}] }`，需要将 waypoints 映射到 POI 坐标并绘制轨迹路径
3. **自动记录玩家轨迹**：在 `observe` 写回事件成功后，将当前 poi 作为 waypoint 追加，当 waypoints 积累到一定数量时自动调用 `postGhostTrace` 提交

## 不在本次范围内

- 玩家据点（home anchor）UI 扩展
- 城市身份系统（称谓、徽章等）
- Ghost trace 持久化到磁盘（当前内存存储已足够验证）
- E4 完整产品设计的其他部分

## 上游依赖

- `P6` · done：写回闭环前端接入（`observe/dwell/mark` 动作已接入）
- `AIO1` · done：世界编排器协议（memory_graph 已实现）
- `AIO3` · done：world memory graph（GhostTrace 数据结构已落地）

## 关键文件

- `frontend/src/App.jsx`：加载 ghost traces、触发记录
- `frontend/src/WorldMap.jsx`：渲染 ghost trace 路径
- `fablemap/web/router.py`：`/api/ghost/trace` 和 `/api/ghost/traces/{player_id}`
- `fablemap/memory_graph.py`：`GhostTrace` 数据结构
