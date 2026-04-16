# 变更记录

## 变更日期

2026-04-13

## 变更类型

- [x] 新功能 (New Feature)
- [x] 重构 (Refactor)
- [x] 前端 (Frontend)

## 变更概述

完成以下工作：

1. **后端 Web 服务层重构** (`fablemap/web/`)
   - 新增 GhostTrace API：`/api/ghost/trace` 记录玩家轨迹，`/api/ghost/traces/{player_id}` 查询轨迹
   - 新增 Map Snapshot API：`/api/map/snapshot/{snapshot_id}` 保存地图瓦片快照
   - 新增 Disturbance API：`/api/world/disturbance` 注入/清除/查询动态扰动信号
   - 新增 Landmark Honor API：`/api/world/landmark/honor/{slice_id}` 查询地标修复荣誉榜
   - 整合 Memory Graph 到 WebService，writeback 事件写入记忆图谱

2. **前端 WorldMap 重写** (`frontend/src/WorldMap.jsx`)
   - 从自绘 Canvas 2D 地图完全迁移到高德地图 (AMap) SDK
   - 动态加载 AMap 脚本，支持安全配置
   - POI 标记和地标标记渲染
   - 地图快照抓取与本地存储功能
   - 支持离线快照回退显示

3. **前端面板与 Hook 更新**
   - `App.jsx` 简化，添加 `buildStageStatusViewModel`
   - 各面板组件适配新地图 API
   - Hooks 更新配合新数据流

## 变更影响文件

### 后端
- `fablemap/web/config.py` - 新增配置项
- `fablemap/web/router.py` - 新增 API 路由
- `fablemap/web/service.py` - 新增 WebService 方法

### 前端
- `frontend/src/WorldMap.jsx` - 完全重写 (844 行变化)
- `frontend/src/App.jsx` - 简化与状态更新
- `frontend/src/AdminDebugPanel.jsx`
- `frontend/src/WorldDensityIndicator.jsx`
- `frontend/src/WorldEntryPanel.jsx`
- `frontend/src/WorldSliceResultPanel.jsx`
- `frontend/src/WorldStageActivePoiPanel.jsx`
- `frontend/src/WorldStageDisturbancePanel.jsx`
- `frontend/src/WorldStageMapLayerToolbar.jsx`
- `frontend/src/WorldStagePanel.jsx`
- `frontend/src/WorldStagePoiFilterLane.jsx`
- `frontend/src/WorldStageWritebackActionPanel.jsx`
- `frontend/src/WorldStageWritebackInsightsPanel.jsx`
- `frontend/src/appShellConfig.js`
- `frontend/src/hooks/useNearbySession.js`
- `frontend/src/hooks/usePoiFilters.js`
- `frontend/src/hooks/useWorldSession.js`
- `frontend/src/services/appDisplay.js`
- `frontend/src/services/appPanelProps.js`
- `frontend/src/services/appShellViewModel.js`
- `frontend/src/services/worldSessionViewState.js`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/tsconfig.json`

## 验证方式

1. 启动后端服务：`python -m fablemap api`
2. 启动前端：`cd frontend && npm run dev`
3. 访问首页，验证高德地图加载
4. 测试地图快照抓取功能
5. 测试 GhostTrace 轨迹记录
6. 测试 Disturbance 扰动注入

## 风险提示

- 依赖高德地图 SDK，需要有效的 VITE_AMAP_KEY
- 地图快照功能依赖前端可见瓦片，可能受跨域限制
- Memory Graph 为内存存储，重启服务后数据丢失（后续应持久化）

## 相关协议文档

- `docs/CURRENT_TASKS.md` - P0 真实底图入口
- `docs/AI_SHARED_TASKLIST.md` - P0-R1~R3 MapAdapter 抽象
- `docs/AI_SHARED_TASKLIST.md` - E4 玩家据点与幽灵回放

## 关联任务

- AI_SHARED_TASKLIST: P0-R2 (首个底图 provider 接入)
- AI_SHARED_TASKLIST: E4 (玩家据点、幽灵回放与城市身份系统)
