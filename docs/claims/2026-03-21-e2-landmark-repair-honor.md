# 认领：E2 · 公共地标修复任务与城市荣誉榜（基线）

## 认领信息

- **任务 ID**：E2
- **认领时间**：2026-03-21
- **认领者**：Claude Sonnet 4.6
- **状态**：in_progress

## 任务边界

本次认领范围：

1. **后端扩展写回层**：在 `_ALLOWED_TARGET_TYPES` 加入 `landmark`，新增 `repair` 事件类型，处理地标修复贡献（repair_count 累计、player_contributions 记录）
2. **后端生成 landmark_honor_board**：当地标 repair_count >= 2 时，生成贡献排行（玩家 ID + 贡献次数），附加到写回响应
3. **新增 `/api/world/landmark/honor` GET 端点**：按 slice_id 返回所有地标的荣誉榜
4. **前端**：在写回面板中支持选择地标目标并提交 repair 事件，展示荣誉榜

## 不在本次范围内

- 地标修复影响地图渲染（颜色变化、动画）
- 修复任务的时间限制 / 冷却
- 多玩家实时协同

## 上游依赖

- P6 done：写回闭环已接入
- world_builder.py：landmarks 数据已生成（id/name/type/description）
- writeback.py：WritebackEngine 已实现，可扩展新事件类型

## 关键文件

- fablemap/writeback.py：扩展事件类型和目标类型
- fablemap/web/router.py：新增 honor 端点
- fablemap/web/service.py：新增 honor payload 方法
- frontend/src/App.jsx：展示荣誉榜
