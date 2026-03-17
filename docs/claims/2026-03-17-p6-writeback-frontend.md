# P6 写回闭环前端接入认领

## 认领时间
2026-03-17

## 任务描述
在前端接入 `observe / dwell / mark` 三种动作入口，对接 `POST /api/world/event`，显示结构化状态变化，并验证同一 slice 回访时仍能看到写回痕迹。

## 实现范围

### 最小化实现
1. 在 WorldMap 组件增加三个交互入口
2. 调用 `/api/world/event` API
3. 显示写回结果状态
4. 验证回访时能看到痕迹

### 不包含
- 复杂 UI 面板
- 动画效果
- 完整的玩家状态面板

## 参考协议
- `docs/WORLD_WRITEBACK_PROTOCOL.md`
- `docs/WORLD_WRITEBACK_GOVERNANCE.md`
- `docs/PLAYER_STATE.md`
