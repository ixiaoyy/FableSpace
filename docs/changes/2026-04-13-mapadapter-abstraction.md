# 变更记录

## 变更日期

2026-04-13

## 变更类型

- [x] 重构 (Refactor)
- [x] 前端 (Frontend)

## 变更概述

完成 MapAdapter 抽象（AI_SHARED_TASKLIST P0-R1）。

### 新增文件

- `frontend/src/mapAdapter/MapAdapter.js` — 抽象接口，定义统一底图能力
- `frontend/src/mapAdapter/AMapAdapter.js` — AMap（高德地图）实现
- `frontend/src/mapAdapter/index.js` — 工厂函数 `createMapAdapter()`

### 重构文件

- `frontend/src/WorldMap.jsx` — 移除所有 AMap 特定代码，改用 MapAdapter 接口

## 接口定义

MapAdapter 接口方法：

- `loadSdk()` — 加载地图 SDK
- `createMap(container, options)` — 创建地图实例
- `setCenter(lon, lat)` — 设置中心点
- `setZoom(zoom)` — 设置缩放级别
- `setMarkers(markers, type, opts)` — 设置 POI 或地标标记
- `fitBounds(positions, padding, zoom)` — 适应视图边界
- `collectTiles(container)` — 收集可见瓦片
- `getMapState()` — 获取地图状态
- `isReady()` — SDK 就绪状态
- `getProviderName()` — 提供商名称
- `destroy()` — 清理资源

## 变更影响

### 不兼容变更

无。WorldMap.jsx 的 props 接口保持不变。

### 依赖方

- `WorldMap.jsx` 现在依赖 `mapAdapter` 模块
- 其他需要直接操作地图的组件应通过 `createMapAdapter()` 获取 adapter

## 后续扩展

如需接入其他地图供应商（如 Mapbox、Google Maps、Leaflet）：

1. 创建新的 adapter 类继承 `MapAdapter`
2. 在 `index.js` 的 `createMapAdapter()` 中根据 `VITE_MAP_PROVIDER` 选择
3. WorldMap.jsx 无需改动

## 验证方式

1. `cd frontend && npm run build` — 前端构建成功
2. 启动应用后验证高德地图正常加载
3. 验证 POI 标记、地标标记、快照抓取功能正常

## 相关任务

- AI_SHARED_TASKLIST: P0-R1 (MapAdapter 抽象)
- AI_SHARED_TASKLIST: P0-R2 (首个底图 provider 接入)
