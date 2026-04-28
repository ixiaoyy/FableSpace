# Notification System Implementation Plan

## Task: 04-28-notification-system

## Current State Analysis

### Existing Backend
- FastAPI application in `core/api.py`
- API router in `api/v1/router.py`
- No existing WebSocket or notification support

### Existing Frontend
- React Router based SPA
- API client in `lib/api-client.ts`
- No existing notification system

## Implementation Plan

### MVP Scope (Without Redis)

For MVP, we'll implement a simpler notification system without Redis:
1. In-memory notification store (per-process)
2. WebSocket for real-time delivery
3. REST API for notification list and read status

### Phase 1: Backend

#### 1.1 Notification Store
**New File**: `backend/src/fablemap_api/core/notifications.py`

```python
from dataclasses import dataclass
from datetime import datetime
from typing import Any

@dataclass
class Notification:
    id: str
    user_id: str
    notification_type: str  # new_visitor, new_message, etc.
    title: str
    content: str
    data: dict[str, Any]
    created_at: datetime
    read: bool = False

class NotificationStore:
    """In-memory notification store (MVP)"""
    notifications: dict[str, list[Notification]]
    connections: dict[str, set[WebSocket]]
```

#### 1.2 WebSocket Endpoint
**New File**: `backend/src/fablemap_api/api/v1/notifications.py`

```python
@router.websocket("/ws/notifications/{user_id}")
async def websocket_notifications(websocket: WebSocket, user_id: str):
    # 1. Accept connection
    # 2. Register user connection
    # 3. Send pending notifications
    # 4. Listen for messages (ping/pong)
    # 5. Cleanup on disconnect
```

#### 1.3 REST API Endpoints
```python
GET  /api/v1/notifications                    # List notifications
POST /api/v1/notifications/{id}/read         # Mark as read
POST /api/v1/notifications/read-all          # Mark all as read
DELETE /api/v1/notifications/{id}            # Delete notification
```

#### 1.4 Trigger Points
- `enter_tavern` -> notify owner: new_visitor
- `send_chat` -> notify owner: new_message
- `create_tavern_message` -> notify owner: new_guest_message
- `reply_tavern_message` -> notify original author: guest_reply

### Phase 2: Frontend

#### 2.1 WebSocket Hook
**New File**: `frontend/app/hooks/useNotifications.ts`

```typescript
export function useNotifications(userId: string) {
  // WebSocket connection
  // Notification state
  // Read/unread management
}
```

#### 2.2 Notification Bell Component
**New File**: `frontend/app/components/NotificationBell.tsx`

Display:
- Bell icon with unread count badge
- Click to open notification dropdown
- Links to relevant pages

#### 2.3 Notification Center Component
**New File**: `frontend/app/components/NotificationCenter.tsx`

Display:
- Full notification list
- Filter by type
- Mark as read/delete actions

## Files to Create

### Backend
| File | Purpose |
|------|---------|
| `core/notifications.py` | Notification data model and store |
| `api/v1/notifications.py` | WebSocket and REST API endpoints |

### Frontend
| File | Purpose |
|------|---------|
| `hooks/useNotifications.ts` | WebSocket hook for notifications |
| `components/NotificationBell.tsx` | Bell icon with badge |
| `components/NotificationCenter.tsx` | Full notification center |

## Files to Modify

### Backend
| File | Changes |
|------|---------|
| `core/api.py` | Add notification router |
| `api/v1/router.py` | Include notifications router |
| `application/taverns.py` | Trigger notifications on events |

### Frontend
| File | Changes |
|------|---------|
| `app/root.tsx` | Add notification provider |
| `app/lib/taverns.ts` | Add notification API functions |

## Notification Types

| Type | Trigger | Recipient | Content |
|------|---------|-----------|---------|
| new_visitor | visitor enters tavern | tavern owner | "{visitor} 进入了你的酒馆" |
| new_message | visitor sends message | tavern owner | "有人在和 NPC 对话" |
| new_guest_message | visitor posts message | tavern owner | "有人给你的酒馆留言" |
| guest_reply | owner receives reply | tavern owner | "有人回复了你的留言" |

## Verification

1. **Backend**: WebSocket connects successfully
2. **Backend**: REST API returns notifications
3. **Frontend**: Notification bell shows unread count
4. **Frontend**: Notifications appear in real-time
5. **Frontend**: `npm run typecheck` passes
6. **Frontend**: `npm run build` succeeds

## Notes

- MVP uses in-memory store (lost on server restart)
- For production: add Redis Pub/Sub
- CORS must allow WebSocket connections
- Need to handle reconnection on frontend
