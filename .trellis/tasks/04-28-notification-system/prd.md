# Notification System - 通知系统

## 目的

通过 WebSocket 实时向用户推送重要事件通知，提升用户参与度和留存。

## 通知类型

| 类型 | 触发条件 | 接收人 |
|------|----------|--------|
| new_visitor | 有人进入酒馆 | 酒馆主人 |
| new_message | AI 生成新消息 | 访客 |
| quest_completed | 任务达成 | 访客 |
| home_visit_request | 有人想拜访 Home | Home 主人 |
| new_guest_message | 新留言 | 酒馆主人 |
| guest_reply | 主人回复留言 | 访客 |

## 技术方案

### WebSocket 架构

```
Client (Web)  <--WebSocket-->  FastAPI Server
                                    |
                                    v
                               Redis Pub/Sub
                                    |
                                    v
                               Notification Service
```

### API 设计

```python
# WebSocket 端点
@router.websocket("/ws/notifications/{user_id}")
async def websocket_notifications(websocket, user_id: str):
    # 1. 验证用户身份
    # 2. 订阅用户通知频道
    # 3. 推送实时通知
    pass

# 通知列表 API
@router.get("/api/notifications")
async def get_notifications(user_id: str, limit: int = 20):
    # 获取历史通知
    pass

# 已读标记 API
@router.post("/api/notifications/{id}/read")
async def mark_notification_read(notification_id: str):
    # 标记通知为已读
    pass
```

## 实现步骤

1. [ ] 添加 WebSocket 支持到 FastAPI
2. [ ] 实现通知频道管理
3. [ ] 实现新访客通知
4. [ ] 实现通知列表 API
5. [ ] 实现已读标记功能
6. [ ] 前端 WebSocket 连接
7. [ ] 通知中心组件

## 验收标准

- [ ] WebSocket 连接稳定
- [ ] 新访客时主人收到通知
- [ ] 通知列表正确显示
- [ ] 已读标记功能正常
