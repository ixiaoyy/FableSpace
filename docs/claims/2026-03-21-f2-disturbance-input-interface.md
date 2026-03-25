# 认领：F2 · 现实行为输入与人为扰动接口（基线）

## 认领信息

- **任务 ID**：F2
- **认领时间**：2026-03-21
- **认领者**：Claude Sonnet 4.6
- **状态**：in_progress

## 任务边界

本次认领范围：

1. **dynamic_signals.py**：添加内存扰动覆盖缓存，`get_mock_signals` 优先使用注入信号；新增 `inject_disturbance`、`clear_disturbance`、`get_disturbance` 函数
2. **后端**：新增 `POST /api/world/disturbance`（注入扰动）和 `DELETE /api/world/disturbance/{slice_id}`（清除扰动）端点
3. **前端**：在写回面板附近添加扰动注入面板（天气/人群密度/特殊事件标签选择 + 提交）

## 不在本次范围内

- 持久化扰动到磁盘
- 真实天气/交通 API 接入
- 扰动影响地图渲染视觉效果

## 上游依赖

- AIO1 done：RuleBasedOrchestrator 已消费 dynamic_signals
- dynamic_signals.py：get_mock_signals 已实现，可在此基础上添加覆盖层

## 关键文件

- fablemap/dynamic_signals.py：添加注入层
- fablemap/web/service.py：新增 disturbance 方法
- fablemap/web/router.py：新增端点
- frontend/src/App.jsx：扰动注入面板
