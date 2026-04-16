# L1 Place Protocol — 地点协议收束

## 概述

定义地点的前后端数据结构规范（Place Summary / Detail / State / Memory 四层），并在前端面板中展示地点统计与地点状态。

## 变更内容

### 后端 (fablemap/api_service.py)

- `build_nearby_payload()` 增加 `poi_states` 字段，包含:
  - `total`: POI 总数
  - `by_type`: 按 fantasy_type 分组计数
  - `by_faction`: 按 faction_alignment 分组计数
  - `by_osm_type`: 按 osm_type 分组计数

### 前端 (frontend/src/services/placeProtocol.js)

新增文件，定义:

- **TypeScript JSDoc 接口**: PlaceSummary, PlaceDetail, PlaceState, PlaceStats, PlaceMemory
- **字段命名规则**: real_前缀(真实数据), fantasy_前缀(幻想语义), player_前缀(玩家状态)
- **辅助函数**:
  - `getRelationshipStage(familiarity, visit_count)` — 计算关系阶段
  - `formatFamiliarity(familiarity)` — 格式化熟悉度为可读标签
  - `formatDwellTime(seconds)` — 格式化驻足时长
  - `computePlaceStats(pois)` — 聚合地点统计
  - `enrichPlaceDetail(poi, poi_state, player_familiarity)` — 合并静态/动态数据
  - `getPlaceTypeEmoji(fantasy_type)` — emoji 映射
  - `getRelationshipStageLabel(stage)` — 阶段标签
  - `getRelationshipColor(strength)` — 关系强度颜色

### WorldSliceResultPanel.jsx

- 新增 `PlaceStatsSection` 组件，显示 POI 统计（按类型 top5 + 按阵营 top4）
- 使用 `computePlaceStats()` 聚合 world.json 中的 POI 数据

### WorldStageActivePoiPanel.jsx

- 新增 `PlaceStateSection` 组件，显示:
  - 关系阶段标签（带颜色）
  - 熟悉度（家/熟悉/有痕/来过/新到）
  - 访问次数
  - 驻足时长
  - 痕迹数

### styles.css

- 新增 `.place-stats-grid`, `.place-stats-section`, `.place-stats-section-label`, `.place-stats-chips`, `.place-stats-chip`
- 新增 `.world-result-panel__card--place-stats` (带蓝色渐变背景)
- 新增 `.poi-state-bar`, `.poi-state-chip`

## 影响范围

- WorldSliceResultPanel: 新增地点统计展示
- WorldStageActivePoiPanel: 新增地点状态展示
- api_service.py: 增加 poi_states 计算

## 相关文件

- `fablemap/api_service.py`
- `frontend/src/services/placeProtocol.js` (新文件)
- `frontend/src/WorldSliceResultPanel.jsx`
- `frontend/src/WorldStageActivePoiPanel.jsx`
- `frontend/src/styles.css`
