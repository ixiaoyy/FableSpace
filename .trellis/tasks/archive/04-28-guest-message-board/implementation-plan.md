# Guest Message Board Implementation Plan

## Task: 04-28-guest-message-board

## Current State Analysis

### Existing Backend
- MySQL models exist in `models.py` with: TavernModel, CharacterModel, VisitorModel, ChatMessageModel
- No existing message board model
- API router structure in `api/v1/taverns.py`

### Existing Frontend
- TavernDetailPanel shows tavern info
- TavernOwnerPanel for owner management
- No existing message board UI

### PRD Requirements
| Feature | Priority |
|---------|----------|
| Visitor leaves public message | P1 |
| Owner replies to message | P2 |
| Message display with pagination | P2 |
| Pin important messages | P3 |
| Owner delete messages | P1 |

## Implementation Plan

### Phase 1: Backend

#### 1.1 Add Database Model
**File**: `backend/src/fablemap_api/infrastructure/models.py`

```python
class TavernMessageModel(Base):
    """酒馆留言模型"""
    __tablename__ = "tavern_messages"

    id = Column(String(64), primary_key=True)
    tavern_id = Column(String(64), ForeignKey("taverns.id", ondelete="CASCADE"), nullable=False)
    visitor_id = Column(String(64), nullable=False)
    visitor_nickname = Column(String(64), default="匿名")
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    is_pinned = Column(Boolean, default=False)
    parent_id = Column(String(64), nullable=True)  # 回复用
```

#### 1.2 Add API Contract
**File**: `backend/src/fablemap_api/contracts/taverns.py`

```python
class TavernMessageCreateRequest
class TavernMessageReplyRequest
class TavernMessageListResponse
```

#### 1.3 Add API Endpoints
**File**: `backend/src/fablemap_api/api/v1/taverns.py`

```
POST   /api/v1/taverns/{tavern_id}/messages      - 创建留言
GET    /api/v1/taverns/{tavern_id}/messages      - 获取留言列表
DELETE /api/v1/taverns/{tavern_id}/messages/{mid} - 删除留言
PUT    /api/v1/taverns/{tavern_id}/messages/{mid}/pin - 置顶/取消置顶
POST   /api/v1/taverns/{tavern_id}/messages/{mid}/reply - 回复留言
```

#### 1.4 Add Application Service Methods
**File**: `backend/src/fablemap_api/application/taverns.py`

- `create_message()`
- `list_messages()`
- `delete_message()`
- `toggle_pin_message()`
- `reply_message()`

### Phase 2: Frontend

#### 2.1 Update TypeScript Types
**File**: `frontend/app/lib/taverns.ts`

```typescript
export type TavernMessage = {
  id: string
  tavern_id: string
  visitor_id: string
  visitor_nickname: string
  content: string
  created_at: string
  is_pinned: boolean
  parent_id: string | null
}
```

#### 2.2 Add API Client Functions
**File**: `frontend/app/lib/taverns.ts`

```typescript
export function createTavernMessage(tavernId: string, data, userId)
export function listTavernMessages(tavernId: string, userId)
export function deleteTavernMessage(tavernId: string, messageId: string, userId)
export function togglePinTavernMessage(tavernId: string, messageId: string, userId)
export function replyTavernMessage(tavernId: string, messageId: string, data, userId)
```

#### 2.3 Create Message Board Component
**New File**: `frontend/app/components/TavernMessageBoard.tsx`

Features:
- Message input form (max 500 characters)
- Message list with pagination
- Pin indicator
- Reply thread display
- Owner actions (delete, pin, reply)

#### 2.4 Integrate into TavernDetailPanel
**Modify**: `frontend/app/product/TavernDetailPanel.jsx`

Add message board section below tavern info

## Files to Modify

| File | Changes |
|------|---------|
| `backend/src/fablemap_api/infrastructure/models.py` | Add TavernMessageModel |
| `backend/src/fablemap_api/contracts/taverns.py` | Add message contracts |
| `backend/src/fablemap_api/api/v1/taverns.py` | Add message endpoints |
| `backend/src/fablemap_api/application/taverns.py` | Add service methods |
| `frontend/app/lib/taverns.ts` | Add message types and API functions |
| `frontend/app/product/TavernDetailPanel.jsx` | Integrate message board |

## Files to Create

| File | Purpose |
|------|---------|
| `frontend/app/components/TavernMessageBoard.tsx` | Message board component |

## Database Migration

```sql
CREATE TABLE tavern_messages (
    id VARCHAR(64) PRIMARY KEY,
    tavern_id VARCHAR(64) NOT NULL,
    visitor_id VARCHAR(64) NOT NULL,
    visitor_nickname VARCHAR(64) DEFAULT '匿名',
    content TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_pinned BOOLEAN DEFAULT FALSE,
    parent_id VARCHAR(64) NULL,
    INDEX idx_tm_tavern_created (tavern_id, created_at DESC),
    FOREIGN KEY (tavern_id) REFERENCES taverns(id) ON DELETE CASCADE
);
```

## Verification

1. **Backend**: API endpoints return correct responses
2. **Frontend**: `npm run typecheck` passes
3. **Frontend**: `npm run build` succeeds
4. **Manual**: Message board displays and functions correctly

## Notes

- Keep messages short (max 500 chars) per PRD
- Support anonymous posting (visitor_nickname optional)
- Owner can delete any message
- Only message owner can delete their own messages (or owner)
- Messages ordered by is_pinned DESC, created_at DESC
