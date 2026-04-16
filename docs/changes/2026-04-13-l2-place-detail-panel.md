# L2 Place Detail Panel — 地点详情面板

## 概述

扩展 WorldStageActivePoiPanel，添加 PlaceDetailSection 组件，展示与当前地点关联的势力、历史回声、记忆锚点和精灵信息。

## 变更内容

### WorldStagePanel.jsx

- 将 `result?.world` 作为 `world` prop 传递给 WorldStageActivePoiPanel

### WorldStageActivePoiPanel.jsx

- 新增 `PlaceDetailSection` 组件，接收 `poi` 和 `world` props，展示：
  - **势力关联**：当前地点所属势力的名称和信条
  - **历史回声**：与该 POI 关联的历史碎片（按 `linked_pois` 匹配）
  - **记忆锚点**：与该 POI 关联的情绪容器（按 `linked_pois` 匹配）
  - **精灵**：与该 POI 关联的都市精灵（按 `linked_poi`/`linked_pois` 匹配）

### styles.css

新增样式：
- `.poi-detail-section` — 详情区容器
- `.poi-detail-row` — 详情行布局
- `.poi-detail-label` — 标签文字
- `.poi-detail-value` — 值文字
- `.poi-detail-note` — 备注文字
- `.poi-detail-list` — 标签列表
- `.poi-detail-chip` — 通用标签样式
- `.faction-tag` — 势力标签（紫色）
- `.echo-chip` — 历史回声标签（黄色）
- `.anchor-chip` — 记忆锚点标签（绿色）
- `.sprite-chip` — 精灵标签（紫色）

## 影响范围

- WorldStagePanel: 新增 world prop 传递
- WorldStageActivePoiPanel: 新增 PlaceDetailSection 组件
- styles.css: 新增 10 个 CSS 规则

## 验证方式

1. 生成地点切片并选中一个地点
2. 确认地点详情面板显示该地点所属势力（如 Trade Guild）
3. 确认显示相关历史回声和记忆锚点（如果有）
4. 确认样式显示正确

## 相关文件

- `frontend/src/WorldStagePanel.jsx`
- `frontend/src/WorldStageActivePoiPanel.jsx`
- `frontend/src/styles.css`