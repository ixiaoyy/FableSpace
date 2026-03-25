# 变更记录：E2 · 公共地标修复任务与城市荣誉榜（基线）

## 变更时间

2026-03-21

## 任务 ID

E2（部分）

## 变更范围

### fablemap/writeback.py

1. `_ALLOWED_EVENT_TYPES` 新增 `repair`
2. `_ALLOWED_TARGET_TYPES` 新增 `landmark`
3. 错误消息同步更新
4. `_apply_event` 新增 `repair` 分支：
   - 累计 `repair_count`
   - 记录 `player_contributions`（player_id → 贡献次数）
   - repair_count >= 2 时生成 `honor_board`（按贡献排序）
5. `place_state` 返回结构新增 `repair_count` 和 `honor_board`

### fablemap/web/service.py

新增 `landmark_honor_payload(slice_id)`：通过 `store.load()` 读取 slice 状态，汇总所有 landmark 目标的修复数据，返回按 repair_count 排序的荣誉榜

### fablemap/web/router.py

新增 `GET /api/world/landmark/honor/{slice_id}` 端点

### frontend/src/App.jsx

1. `WRITEBACK_ACTIONS` 新增 `repair` 动作（label: 修复）
2. 地点状态卡片：repair_count > 0 时显示修复次数
3. 新增 `honorBoard` 变量
4. 写回结果面板底部：honor_board 非空时显示「城市荣誉榜」卡片（排名 + player_id + 贡献次数）

## 触发条件

- 对 landmark 目标提交 `repair` 事件
- 同一地标累计 2 次修复后生成荣誉榜

## 验证方式

1. 选择写回目标类型为 landmark，事件类型为 repair，提交两次
2. 第 2 次响应的 `place_state.honor_board` 包含贡献排名
3. 前端显示「城市荣誉榜」卡片
4. `GET /api/world/landmark/honor/{slice_id}` 返回该切片所有地标修复数据

## 不包含

- 地标修复影响地图渲染
- 修复任务时间限制 / 冷却
- 多玩家实时协同
