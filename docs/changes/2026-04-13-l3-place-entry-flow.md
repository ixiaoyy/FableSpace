# L3 Place Entry Flow — 地点进入状态流

## 概述

增强地点进入的状态流转体验：添加地点激活时的自动滚动聚焦和视觉反馈动画。

## 变更内容

### WorldStagePanel.jsx

- 导入 `useEffect` 和 `useRef` from React
- 添加 `activePoiPanelRef` ref
- 添加 `useEffect` hook：当 `activePoiId` 变化时，自动滚动到活动 POI 面板
- 将 `panelRef` 传递给 WorldStageActivePoiPanel

### WorldStageActivePoiPanel.jsx

- 接收 `panelRef` prop
- 将 ref 附加到根元素 `.storyboard-lane`

### styles.css

- 添加 `.poi-detail-section` 样式
- 添加 `placeCardActivate` 关键帧动画
- 添加 `.storyboard-stage-stack > *` 过渡动画

## 影响范围

- WorldStagePanel: 添加滚动聚焦逻辑
- WorldStageActivePoiPanel: 添加 ref 支持
- styles.css: 新增动画样式

## 验证方式

1. 生成地点切片
2. 点击一个 POI
3. 确认页面自动滚动到右侧活动 POI 面板
4. 确认面板内容有淡入动画

## 相关文件

- `frontend/src/WorldStagePanel.jsx`
- `frontend/src/WorldStageActivePoiPanel.jsx`
- `frontend/src/styles.css`