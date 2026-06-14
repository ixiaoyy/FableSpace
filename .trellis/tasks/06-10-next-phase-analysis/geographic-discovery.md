# P2-1: 地理发现优化

## 任务概述

| 字段 | 内容 |
|------|------|
| 任务ID | `06-10-geographic-discovery` |
| 标题 | 地理发现优化 |
| 阶段 | brainstorm |
| 类型 | frontend + backend |
| 优先级 | P2 |
| 关联需求 | 提升发现效率，增强地理位置感知 |

## 背景与问题

### 当前状态
- `discover.tsx` 支持按关键词搜索
- 支持 `lat/lon/radius` 参数查询
- 缺少地图可视化和距离感知

### 问题分析
1. **地图弱**: 只有列表，没有地图展示
2. **距离感知弱**: 用户不知道空间离自己多远
3. **区域探索难**: 无法按区域/城市发现空间
4. **导航缺失**: 无法导航到目标空间

### 用户故事
```
作为 探索者
我希望 在地图上看到附近的空间分布
以便 选择离我近的空间进入
```

## 需求预期

### 功能需求

| 需求点 | 预期效果 | 优先级 |
|--------|----------|--------|
| 地图视图 | 在地图上展示空间位置 | P0 |
| 距离显示 | 显示空间与用户距离 | P0 |
| 区域筛选 | 按城市/区域筛选空间 | P1 |
| 热力图 | 展示空间密度分布 | P2 |
| 外部地图打开坐标 | 可选跳转外部地图查看坐标，不做路线规划 | P2 |

### 数据模型

```typescript
type GeoTavern = Tavern & {
  distance?: number        // 距离（米）
  bearing?: string         // 方向
  walkingTime?: number     // 步行时间（分钟）
}

type MapViewport = {
  center: { lat: number; lon: number }
  zoom: number
  bounds: {
    north: number
    south: number
    east: number
    west: number
  }
}
```

## 设计方案

### 方案一: 列表 + 地图双视图

**核心思路**: Discover 页面增加地图视图切换

```
┌─────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────┐   │
│  │  🔍 搜索坐标、区域、角色或记忆线索              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [雷达视图] [卡片视图] [🗺️ 地图视图]                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  【地图视图】                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                   │   │
│  │    📍 ────── 🏠 ── 📍                           │   │
│  │         │      │     │                           │   │
│  │         │      │     └─ 便利店 (800m)            │   │
│  │         │      │                                 │   │
│  │         │      └───── 树洞咖啡 (1.2km)           │   │
│  │         │                                        │   │
│  │         └──────── 📍 ── 委托社 (500m)            │   │
│  │                                                   │   │
│  │              📍 你在这里                          │   │
│  │                                                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  附近空间 (3)                                    │   │
│  │  ┌─────────────────────────────────────────┐   │   │
│  │  │ 📍 便利店        800m        [进入]     │   │   │
│  │  │ 📍 委托社        500m        [进入]     │   │   │
│  │  │ 📍 树洞咖啡      1.2km       [进入]     │   │   │
│  │  └─────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**实现要点**:
1. 新增 `MapView` 组件集成地图 SDK
2. 新增 `TavernMarker` 地图标记
3. 新增 `DistanceDisplay` 距离显示
4. 支持地图视图和列表视图切换

### 方案二: 全屏地图探索

**核心思路**: 全屏地图为核心，列表为辅助

```
┌─────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────┐   │
│  │  [全屏地图]                                      │   │
│  │                                                   │   │
│  │      📍        🏠                               │   │
│  │             📍                                  │   │
│  │                    📍                           │   │
│  │        📍                                       │   │
│  │                                                   │   │
│  │  ┌───────────────────────────────────────────┐ │   │
│  │  │ 📍 便利店 · 800m · [进入]                 │ │   │
│  │  └───────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**问题**: 改动较大，需要地图 SDK 集成

### 推荐方案

**分阶段实施**:
- **Phase 1**: 方案一 - 列表 + 地图双视图
- **Phase 2**: 方案二 - 全屏地图探索

## 技术实现

### 地图 SDK 集成

```typescript
// frontend/app/lib/map-integrations.ts

// 支持的地图 SDK
type MapProvider = "amap" | "google" | "mapbox" | "leaflet"

interface MapConfig {
  provider: MapProvider
  apiKey?: string
  defaultCenter: { lat: number; lon: number }
  defaultZoom: number
}

// 使用高德地图（国内）
const AMAP_CONFIG: MapConfig = {
  provider: "amap",
  apiKey: import.meta.env.VITE_AMAP_KEY,
  defaultCenter: { lat: 31.2304, lon: 121.4737 },
  defaultZoom: 13,
}
```

### 组件清单

```typescript
// frontend/app/features/geographic-discovery/

MapView/
├── index.tsx              // 地图容器
├── TavernMarker.tsx       // 空间标记
├── UserLocationMarker.tsx // 用户位置标记
├── MapControls.tsx        // 地图控制
└── NearbyList.tsx         // 附近列表

// TavernMarker.tsx
function TavernMarker({
  tavern,
  onClick
}: {
  tavern: GeoTavern
  onClick: (tavern: Tavern) => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <Marker
      position={[tavern.lat, tavern.lon]}
      onClick={() => onClick(tavern)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <TavernMarkerIcon type={tavern.place_type} active={hovered} />
      {hovered && (
        <TavernMarkerPopup tavern={tavern} />
      )}
    </Marker>
  )
}
```

### API 改动

```python
# backend/src/fablemap_api/api/v1/taverns.py

@router.get("")
def list_taverns(
    request: Request,
    lat: float | None = None,
    lon: float | None = None,
    radius: float = 5000,
    # ... existing params
) -> dict[str, Any]:
    """列表查询支持地理位置参数"""
    result = taverns_service(request).list_taverns(
        lat=lat,
        lon=lon,
        radius=radius,
        # ...
    )

    # 如果提供了位置，计算距离
    if lat is not None and lon is not None:
        result = add_distance_info(result, lat, lon)

    return result

def add_distance_info(result, user_lat, user_lon):
    """为每个空间添加距离信息"""
    for tavern in result.get("taverns", []):
        if tavern.get("lat") and tavern.get("lon"):
            tavern["distance"] = haversine(
                user_lat, user_lon,
                tavern["lat"], tavern["lon"]
            )
    return result
```

## 验收标准

### 功能验收

- [ ] 地图正确加载
- [ ] 空间标记显示正确
- [ ] 点击标记显示详情
- [ ] 距离计算正确
- [ ] 可切换视图模式

### 性能验收

- [ ] 地图加载 < 3s
- [ ] 标记渲染流畅
- [ ] 支持 100+ 标记

### 兼容性验收

- [ ] 桌面端正常
- [ ] 移动端正常
- [ ] 地图 SDK 兼容

## 风险与依赖

### 风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 地图 SDK 依赖 | 加载慢/不可用 | 提供降级方案 |
| 地理数据缺失 | 标记不准确 | 提示用户补充 |

### 依赖

- 地图 SDK（高德/Google/Mapbox）
- `list_taverns` API

## 校准补充

### 已核对事实

- `GET /api/v1/taverns` 已支持 `lat/lon/radius` 参数，地理查询不需要新增基础 API。
- `README.md` 中已有 `VITE_AMAP_KEY / VITE_AMAP_SECURITY_CODE` 可选配置，但引入或强化地图 SDK 仍需按前端规范谨慎评估。

### 边界修正

- “导航入口”不应作为 FableMap 主功能；可以最多提供“在外部地图打开坐标”的弱出口，不能做路线规划/实时导航。
- 地图视图服务于空间发现，不应为地图炫技持续堆渲染细节。
- 若新增大型地图依赖，需要用户确认；优先复用现有地图能力或做无 SDK 的距离/列表增强。

### 建议 MVP

1. 先在 Discover 卡片显示距离和“附近/同城”分组。
2. 视图切换先做“列表/雷达/紧凑附近”而不是立即接入全屏地图 SDK。
3. 地图标记作为后续任务，前置问题是 SDK、密钥、国内/海外可用性和移动端性能。

### 需要确认的问题

- 目标用户主要在国内还是海外？这会影响高德/Google/Mapbox/Leaflet 的选择。
- 距离是否要精确到米，还是“附近/步行可达/同城”这种氛围化表达更符合产品？
- 私密/Home 空间是否永远不进入地图发现？

## 下一步

1. **research**: 选择合适的地图 SDK
2. **implement**: 实现地图视图
3. **check**: 跨端测试
4. **update-spec**: 更新文档
5. **record-session**: 记录开发过程

---

*创建时间: 2026-06-10*
*状态: brainstorm*
