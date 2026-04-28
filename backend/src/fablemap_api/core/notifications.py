"""
Notification System - Core Module

Provides notification data model and in-memory store for MVP.
"""

from __future__ import annotations

import secrets
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable
import asyncio
import logging

logger = logging.getLogger(__name__)


class NotificationType(str, Enum):
    NEW_VISITOR = "new_visitor"
    NEW_MESSAGE = "new_message"
    QUEST_COMPLETED = "quest_completed"
    HOME_VISIT_REQUEST = "home_visit_request"
    NEW_GUEST_MESSAGE = "new_guest_message"
    GUEST_REPLY = "guest_reply"


@dataclass
class Notification:
    id: str
    user_id: str
    notification_type: str
    title: str
    content: str
    data: dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    read: bool = False
    tavern_id: str | None = None
    tavern_name: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "notification_type": self.notification_type,
            "title": self.title,
            "content": self.content,
            "data": self.data,
            "created_at": self.created_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "read": self.read,
            "tavern_id": self.tavern_id,
            "tavern_name": self.tavern_name,
        }


class NotificationStore:
    """
    In-memory notification store for MVP.

    Stores notifications per user and manages WebSocket connections.
    Note: Data is lost on server restart.
    """

    def __init__(self):
        self._notifications: dict[str, list[Notification]] = {}
        self._connections: dict[str, set[asyncio.Queue]] = {}
        self._lock = asyncio.Lock()

    @staticmethod
    def _generate_id() -> str:
        return f"notif_{secrets.token_hex(8)}"

    async def add_notification(
        self,
        user_id: str,
        notification_type: str,
        title: str,
        content: str,
        data: dict[str, Any] | None = None,
        tavern_id: str | None = None,
        tavern_name: str | None = None,
    ) -> Notification:
        """Add a notification and broadcast to connected clients."""
        notification = Notification(
            id=self._generate_id(),
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            content=content,
            data=data or {},
            created_at=datetime.utcnow(),
            read=False,
            tavern_id=tavern_id,
            tavern_name=tavern_name,
        )

        async with self._lock:
            if user_id not in self._notifications:
                self._notifications[user_id] = []
            self._notifications[user_id].insert(0, notification)

            # Keep only last 100 notifications per user
            if len(self._notifications[user_id]) > 100:
                self._notifications[user_id] = self._notifications[user_id][:100]

            # Broadcast to connected clients
            await self._broadcast(user_id, notification)

        logger.info(f"Notification sent to {user_id}: {notification_type} - {title}")
        return notification

    async def _broadcast(self, user_id: str, notification: Notification) -> None:
        """Broadcast notification to all connected clients for this user."""
        if user_id in self._connections:
            for queue in self._connections[user_id]:
                try:
                    await queue.put(notification.to_dict())
                except Exception as e:
                    logger.warning(f"Failed to queue notification: {e}")

    async def register_connection(self, user_id: str) -> asyncio.Queue:
        """Register a new WebSocket connection for a user."""
        queue: asyncio.Queue = asyncio.Queue()
        async with self._lock:
            if user_id not in self._connections:
                self._connections[user_id] = set()
            self._connections[user_id].add(queue)
        return queue

    async def unregister_connection(self, user_id: str, queue: asyncio.Queue) -> None:
        """Unregister a WebSocket connection."""
        async with self._lock:
            if user_id in self._connections and queue in self._connections[user_id]:
                self._connections[user_id].discard(queue)
                if not self._connections[user_id]:
                    del self._connections[user_id]

    async def get_notifications(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0,
        unread_only: bool = False,
    ) -> tuple[list[dict[str, Any]], int, int]:
        """Get notifications for a user."""
        async with self._lock:
            notifications = self._notifications.get(user_id, [])
            if unread_only:
                filtered = [n for n in notifications if not n.read]
            else:
                filtered = notifications

            total = len(filtered)
            unread_count = sum(1 for n in notifications if not n.read)
            paginated = filtered[offset : offset + limit]

            return [n.to_dict() for n in paginated], total, unread_count

    async def mark_as_read(self, user_id: str, notification_id: str) -> bool:
        """Mark a notification as read."""
        async with self._lock:
            notifications = self._notifications.get(user_id, [])
            for n in notifications:
                if n.id == notification_id:
                    n.read = True
                    return True
        return False

    async def mark_all_as_read(self, user_id: str) -> int:
        """Mark all notifications as read."""
        count = 0
        async with self._lock:
            notifications = self._notifications.get(user_id, [])
            for n in notifications:
                if not n.read:
                    n.read = True
                    count += 1
        return count

    async def delete_notification(self, user_id: str, notification_id: str) -> bool:
        """Delete a notification."""
        async with self._lock:
            notifications = self._notifications.get(user_id, [])
            for i, n in enumerate(notifications):
                if n.id == notification_id:
                    notifications.pop(i)
                    return True
        return False

    async def get_unread_count(self, user_id: str) -> int:
        """Get count of unread notifications."""
        async with self._lock:
            notifications = self._notifications.get(user_id, [])
            return sum(1 for n in notifications if not n.read)


# Global notification store instance
_notification_store: NotificationStore | None = None


def get_notification_store() -> NotificationStore:
    """Get or create the global notification store."""
    global _notification_store
    if _notification_store is None:
        _notification_store = NotificationStore()
    return _notification_store


# Convenience functions for triggering notifications
async def notify_new_visitor(tavern_id: str, tavern_name: str, owner_id: str, visitor_name: str) -> Notification:
    """Notify tavern owner when a visitor enters."""
    return await get_notification_store().add_notification(
        user_id=owner_id,
        notification_type=NotificationType.NEW_VISITOR.value,
        title="新访客进入",
        content=f"{visitor_name} 进入了你的酒馆",
        data={"tavern_id": tavern_id, "visitor_name": visitor_name},
        tavern_id=tavern_id,
        tavern_name=tavern_name,
    )


async def notify_new_message(tavern_id: str, tavern_name: str, owner_id: str, character_name: str) -> Notification:
    """Notify tavern owner when there's a new chat message."""
    return await get_notification_store().add_notification(
        user_id=owner_id,
        notification_type=NotificationType.NEW_MESSAGE.value,
        title="新对话消息",
        content=f"有人在和 {character_name} 对话",
        data={"tavern_id": tavern_id, "character_name": character_name},
        tavern_id=tavern_id,
        tavern_name=tavern_name,
    )


async def notify_new_guest_message(tavern_id: str, tavern_name: str, owner_id: str, visitor_name: str) -> Notification:
    """Notify tavern owner when there's a new guest message."""
    return await get_notification_store().add_notification(
        user_id=owner_id,
        notification_type=NotificationType.NEW_GUEST_MESSAGE.value,
        title="新留言",
        content=f"{visitor_name} 给你的酒馆留言了",
        data={"tavern_id": tavern_id, "visitor_name": visitor_name},
        tavern_id=tavern_id,
        tavern_name=tavern_name,
    )


async def notify_guest_reply(
    tavern_id: str, tavern_name: str, owner_id: str, replier_name: str
) -> Notification:
    """Notify when someone replies to a message."""
    return await get_notification_store().add_notification(
        user_id=owner_id,
        notification_type=NotificationType.GUEST_REPLY.value,
        title="新回复",
        content=f"{replier_name} 回复了你的留言",
        data={"tavern_id": tavern_id, "replier_name": replier_name},
        tavern_id=tavern_id,
        tavern_name=tavern_name,
    )
