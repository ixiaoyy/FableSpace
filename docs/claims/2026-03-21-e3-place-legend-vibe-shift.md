# 认领：E3 · 地点传说与地点气质演化（基线）

## 认领信息

- **任务 ID**：E3
- **认领时间**：2026-03-21
- **认领者**：Claude Sonnet 4.6
- **状态**：in_progress

## 任务边界

本次认领范围：

1. **后端生成 place_legend**：mark 事件后，当 mark_count >= 3 时，聚合该 POI 的 marks（tag 频率统计 + dominant_vibe）生成 place_legend 结构，附加到 place_state 返回
2. **前端展示 place_legend**：写回结果面板中，当 place_state.place_legend 存在时，显示地点传说文字与气质标签

## 不在本次范围内

- 玩家命名权（自定义 POI 名称）
- 社区投票或多玩家共识机制
- 地点气质影响地图渲染（如颜色变化）

## 上游依赖

- P6 done：mark 写回已接入
- writeback.py：_ALLOWED_MARK_TAGS 已定义，mark_count 已累计
- scene_capsule.py：legend_fragment 胶囊类型已定义（参考但不直接复用）

## 关键文件

- fablemap/writeback.py：添加 place_legend 生成逻辑
- frontend/src/App.jsx：展示 place_legend
