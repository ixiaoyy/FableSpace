# 变更记录：E4 · 幽灵回放前端接入基线

## 变更时间

2026-03-20

## 任务 ID

E4（部分）

## 变更范围

### frontend/src/App.jsx

1. 添加 `useRef` import
2. 添加 `pendingWaypointsRef`（`useRef([])`）存储待提交的 waypoint 队列
3. 添加 `useEffect`：在 `result.world_id` 或 `writebackForm.playerId` 变化时自动从 `/api/ghost/traces/{player_id}` 拉取当前玩家的 ghost traces，填充 `ghostTraces` state
4. 在 `submitWriteback` 成功后，若 `event_type === 'observe'`，将当前 POI 作为 waypoint 追加到 `pendingWaypointsRef`；当积累到 3 个时自动调用 `postGhostTrace` 提交，成功后将新 trace 追加到 `ghostTraces` state

### frontend/src/WorldMap.jsx

修复 ghost trace 渲染逻辑：
- 原实现错误地读取 `trace.x/trace.y`（不存在的字段）
- 新实现：构建 `poiNodeMap`（`poi_id → node`），将每个 waypoint 的 `poi_id` 映射到实际 tile 坐标，用 `tileToCanvas` 转为 canvas 坐标，绘制虚线路径 + 起点圆点 + 终点圆点
- 单条 trace 少于 2 个有效位置时跳过渲染

## 上游依赖

- `P6` · done：写回闭环已接入，`submitWorldEvent` 可正常触发
- `AIO3` · done：`GhostTrace` 数据结构（`waypoints: [{poi_id, timestamp, action_state}]`）已落地
- `/api/ghost/trace`（POST）和 `/api/ghost/traces/{player_id}`（GET）路由已在 `fablemap/web/router.py` 实现

## 验证方式

1. 加载世界后，`GET /api/ghost/traces/{player_id}` 若有历史 trace 则自动显示在地图 ghostTraces 图层
2. 对同一或不同 POI 连续提交 3 次 `observe` 写回后，地图上出现虚线轨迹路径
3. 关闭 ghost traces 图层开关后轨迹消失，再次开启后重现

## 不包含

- 玩家据点 UI、城市身份称谓、幽灵回放动画等 E4 完整产品设计的其余部分
- Ghost trace 磁盘持久化（当前为内存存储，服务重启后清空）
