# Territory API Contract

> Territory system API for claiming map territories, collision detection, and map visualization.

## Overview

The Territory system allows tavern owners to claim territories on real map coordinates. Each territory has a center point, radius, and type. Same-type territories cannot overlap (collision detection). Different types can coexist.

## Territory Types

| Type | Value | Icon | Default Radius | Min | Max |
|------|-------|------|----------------|-----|-----|
| Tavern | `tavern` | 🍺 | 50m | 20m | 200m |
| Pet Shop | `pet_shop` | 🐱 | 50m | 20m | 200m |
| Garden | `garden` | 🌱 | 100m | 50m | 500m |
| Game Workshop | `game_workshop` | 🎮 | 50m | 20m | 200m |
| Gacha | `gacha` | 🎰 | 50m | 20m | 200m |
| Cultivation | `cultivation` | 🏔️ | 80m | 30m | 300m |
| Shop | `shop` | 🏪 | 30m | 10m | 100m |
| Warehouse | `warehouse` | 📦 | 20m | 10m | 100m |

## Territory Status

| Status | Value | Description |
|--------|-------|-------------|
| Available | `available` | Can be claimed |
| Claimed | `claimed` | Claimed, under construction |
| Active | `active` | Open for business |
| Paused | `paused` | Temporarily closed |
| Abandoned | `abandoned` | Abandoned, can be reclaimed |

## API Endpoints

### Check Territory Availability

```
GET /api/v1/territories/check
```

**Query Parameters:**
- `lat` (float, required): Latitude
- `lon` (float, required): Longitude
- `radius` (float, required): Territory radius in meters
- `type` (string, required): Territory type
- `exclude_territory_id` (string, optional): Exclude this territory from collision check

**Response:**
```json
{
  "available": true,
  "message": "该位置可以申领",
  "conflicting_territories": []
}
```

### Claim Territory

```
POST /api/v1/territories
```

**Headers:**
- `X-User-Id` or `user_id` query param: User ID (required)

**Request Body:**
```json
{
  "type": "tavern",
  "center_lat": 39.9042,
  "center_lon": 116.4074,
  "radius": 50,
  "tavern_id": "tavern_xxx",
  "name": "我的酒馆"
}
```

**Response:**
```json
{
  "id": "territory_abc123",
  "owner_id": "user_xxx",
  "type": "tavern",
  "center_lat": 39.9042,
  "center_lon": 116.4074,
  "radius": 50,
  "status": "claimed",
  "tavern_id": "tavern_xxx",
  "name": "我的酒馆",
  "created_at": "2026-05-08T10:00:00Z",
  "updated_at": "2026-05-08T10:00:00Z"
}
```

**Error Cases:**
- 400: Invalid type, radius out of range, location collision
- 401: Missing user ID

### Get Territory

```
GET /api/v1/territories/{territory_id}
```

**Response:** Territory object or 404

### Update Territory

```
PUT /api/v1/territories/{territory_id}
```

**Headers:** `X-User-Id` (required)

**Request Body:**
```json
{
  "radius": 80,
  "status": "active",
  "name": "新名称"
}
```

**Error Cases:**
- 400: Invalid radius (collision or out of range)
- 403: Not the owner
- 404: Territory not found

### Delete Territory

```
DELETE /api/v1/territories/{territory_id}
```

**Headers:** `X-User-Id` (required)

**Response:**
```json
{
  "ok": true,
  "territory_id": "territory_abc123"
}
```

**Note:** This marks the territory as `abandoned`, not hard delete.

### List Territories

```
GET /api/v1/territories
```

**Query Parameters:**
- `owner_id` (string, optional)
- `tavern_id` (string, optional)
- `type` (string, optional)
- `status` (string, optional)
- `limit` (int, default 100)
- `offset` (int, default 0)

**Response:**
```json
{
  "territories": [...],
  "count": 10
}
```

### Query Nearby Territories

```
GET /api/v1/territories/nearby
```

**Query Parameters:**
- `lat` (float, required)
- `lon` (float, required)
- `radius` (float, default 5000): Search radius in meters
- `types` (string, optional): Comma-separated type list
- `statuses` (string, optional): Comma-separated status list
- `limit` (int, default 100)

**Response:**
```json
{
  "territories": [
    {
      "id": "territory_xxx",
      "type": "tavern",
      "center_lat": 39.9042,
      "center_lon": 116.4074,
      "radius": 50,
      "status": "active",
      "name": "酒馆名称",
      "distance": 123.45
    }
  ],
  "count": 1
}
```

## Collision Detection

### Algorithm

Uses Haversine formula for spherical distance calculation:

```python
import math

EARTH_RADIUS_M = 6371000

def haversine_distance(lat1, lon1, lat2, lon2):
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return EARTH_RADIUS_M * c

def check_collision(t1, t2):
    if t1.type != t2.type:
        return False  # Different types can coexist
    distance = haversine_distance(t1.center_lat, t1.center_lon, t2.center_lat, t2.center_lon)
    return distance < (t1.radius + t2.radius)
```

### Rules

1. **Same type cannot overlap**: Two territories of the same type with overlapping circles cannot coexist.
2. **Different types can overlap**: A tavern territory and a garden territory at the same location are allowed (functional zoning).
3. **Only active/claimed territories check collision**: Abandoned or available territories don't block claims.

## Map Visualization

### Frontend Service

```javascript
import {
  TERRITORY_TYPE_META,
  TERRITORY_DEFAULT_RADIUS,
  TERRITORY_RADIUS_LIMITS,
  checkTerritoryAvailability,
  claimTerritory,
  getTerritory,
  updateTerritory,
  deleteTerritory,
  listTerritories,
  queryNearbyTerritories,
  territoriesToCircles,
} from '@/lib/territoryService.js'
```

### MapAdapter Interface

```typescript
interface TerritoryCircle {
  id: string
  center: [number, number]  // [lon, lat]
  radius: number  // meters
  type: string
  status: string
  name: string
  color: string
}

class MapAdapter {
  setTerritoryCircles(circles: TerritoryCircle[]): void
  removeTerritoryCircles(ids: string[]): void
  clearTerritoryCircles(): void
}
```

### Territory Colors

| Type | Color |
|------|-------|
| tavern | #FFD700 |
| pet_shop | #FF69B4 |
| garden | #32CD32 |
| game_workshop | #4169E1 |
| gacha | #9932CC |
| cultivation | #8B4513 |
| shop | #FFD700 |
| warehouse | #808080 |

## Error Responses

All endpoints return consistent error shapes:

```json
{
  "error": "错误描述"
}
```

### Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (invalid params, collision) |
| 401 | Unauthorized (missing user ID) |
| 403 | Forbidden (not owner) |
| 404 | Not found |
| 500 | Internal server error |

## Implementation Files

| Layer | File |
|-------|------|
| Core | `backend/src/fablemap_api/core/territory.py` |
| Storage | `backend/src/fablemap_api/infrastructure/territory_store.py` |
| Application | `backend/src/fablemap_api/application/territories.py` |
| API Contract | `backend/src/fablemap_api/contracts/territories.py` |
| Router | `backend/src/fablemap_api/api/v1/territories.py` |
| Frontend Service | `frontend/app/lib/territoryService.js` |
| Map Adapter | `frontend/app/product/mapAdapter/MapAdapter.js` |
| Map Adapter Impl | `frontend/app/product/mapAdapter/AMapAdapter.js` |