# L3 任务认领：地点进入状态流

## 任务 ID
L3

## 任务名称
地点进入状态流：明确地图点击、地点激活、面板切换与上下文同步逻辑

## 认领时间
2026-04-13

## 任务目标
增强地点进入的状态流转体验：
1. 添加"地点激活时自动滚动聚焦"行为
2. 增强状态流转的视觉反馈（激活动画）
3. 明确并改进状态阶段转换的触发时机

## 当前分析

### 已实现
- handlePoiClick → setActivePoiId + setActivePoi + syncWritebackTarget
- PlaceStateSection 显示关系阶段、熟悉度、访问次数
- poi-filter-card.is-active 已有激活样式
- WorldStageActivePoiPanel 有 placeholder 当没有选中地点时

### 缺失项
1. **面板聚焦**：选择 POI 时不会自动滚动到右侧详情面板
2. **激活动画**：切换地点时缺少过渡反馈
3. **状态流转逻辑**：place entry flow 没有 hook 化管理，状态散落各处

## 实现计划
1. 在 WorldStageActivePoiPanel 中添加 ref，并在 POI 激活时滚动聚焦
2. 添加激活状态切换的 CSS 动画
3. 创建 placeEntryFlow.js 服务管理状态流转逻辑

## 依赖
- L1（地点协议）
- L2（地点详情面板）

## 状态
claimed