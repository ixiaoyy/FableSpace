"""
Notification System - Core Module

Provides notification data model plus in-memory and database-backed stores.
"""

from __future__ import annotations

import secrets
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum
from typing import Any
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
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    read: bool = False
    space_id: str | None = None
    space_name: str | None = None

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
            "space_id": self.space_id,
            "space_name": self.space_name,
        }


class NotificationStore:
    """In-memory notification store used only when explicit JSON/dev storage is selected."""

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
        space_id: str | None = None,
        space_name: str | None = None,
    ) -> Notification:
        """Add a notification and broadcast to connected clients."""
        notification = Notification(
            id=self._generate_id(),
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            content=content,
            data=data or {},
            created_at=datetime.now(UTC),
            read=False,
            space_id=space_id,
            space_name=space_name,
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

        logger.info("Notification sent to %s: %s - %s", user_id, notification_type, title)
        return notification

    async def _broadcast(self, user_id: str, notification: Notification) -> None:
        """Broadcast notification to all connected clients for this user."""
        if user_id in self._connections:
            for queue in self._connections[user_id]:
                try:
                    await queue.put(notification.to_dict())
                except Exception as e:
                    logger.warning("Failed to queue notification: %s", e)

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


class SQLAlchemyNotificationStore(NotificationStore):
    """Database-backed notification store with in-memory WebSocket queues."""

    def __init__(self, database: Any):
        self.database = database
        self._connections: dict[str, set[asyncio.Queue]] = {}
        self._lock = asyncio.Lock()

    @staticmethod
    def _model_to_notification(model: Any) -> Notification:
        created_at = model.created_at
        if created_at and created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=UTC)
        return Notification(
            id=model.id,
            user_id=model.user_id,
            notification_type=model.notification_type,
            title=model.title,
            content=model.content,
            data=model.data if isinstance(model.data, dict) else {},
            created_at=created_at or datetime.now(UTC),
            read=bool(model.read),
            space_id=model.space_id,
            space_name=model.space_name,
        )

    async def add_notification(
        self,
        user_id: str,
        notification_type: str,
        title: str,
        content: str,
        data: dict[str, Any] | None = None,
        space_id: str | None = None,
        space_name: str | None = None,
    ) -> Notification:
        from fablespace_api.infrastructure.models import NotificationModel

        notification = Notification(
            id=self._generate_id(),
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            content=content,
            data=data or {},
            created_at=datetime.now(UTC),
            read=False,
            space_id=space_id,
            space_name=space_name,
        )
        async with self._lock:
            with self.database.session_scope() as session:
                session.add(NotificationModel(
                    id=notification.id,
                    user_id=notification.user_id,
                    notification_type=notification.notification_type,
                    title=notification.title,
                    content=notification.content,
                    data=notification.data,
                    created_at=notification.created_at.replace(tzinfo=None),
                    read=notification.read,
                    space_id=notification.space_id,
                    space_name=notification.space_name,
                ))
                # Keep only the latest 100 notifications per user.
                old_models = (
                    session.query(NotificationModel)
                    .filter_by(user_id=user_id)
                    .order_by(NotificationModel.created_at.desc())
                    .offset(100)
                    .all()
                )
                for old in old_models:
                    session.delete(old)
            await self._broadcast(user_id, notification)
        logger.info("Notification sent to %s: %s - %s", user_id, notification_type, title)
        return notification

    async def get_notifications(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0,
        unread_only: bool = False,
    ) -> tuple[list[dict[str, Any]], int, int]:
        from fablespace_api.infrastructure.models import NotificationModel

        safe_limit = max(1, min(int(limit or 20), 100))
        safe_offset = max(0, int(offset or 0))
        with self.database.session_scope() as session:
            base = session.query(NotificationModel).filter_by(user_id=user_id)
            unread_count = base.filter_by(read=False).count()
            query = base.filter_by(read=False) if unread_only else base
            total = query.count()
            models = query.order_by(NotificationModel.created_at.desc()).offset(safe_offset).limit(safe_limit).all()
            return [self._model_to_notification(model).to_dict() for model in models], total, unread_count

    async def mark_as_read(self, user_id: str, notification_id: str) -> bool:
        from fablespace_api.infrastructure.models import NotificationModel

        with self.database.session_scope() as session:
            model = session.query(NotificationModel).filter_by(user_id=user_id, id=notification_id).first()
            if not model:
                return False
            model.read = True
            return True

    async def mark_all_as_read(self, user_id: str) -> int:
        from fablespace_api.infrastructure.models import NotificationModel

        with self.database.session_scope() as session:
            models = session.query(NotificationModel).filter_by(user_id=user_id, read=False).all()
            for model in models:
                model.read = True
            return len(models)

    async def delete_notification(self, user_id: str, notification_id: str) -> bool:
        from fablespace_api.infrastructure.models import NotificationModel

        with self.database.session_scope() as session:
            count = session.query(NotificationModel).filter_by(user_id=user_id, id=notification_id).delete()
            return count > 0

    async def get_unread_count(self, user_id: str) -> int:
        from fablespace_api.infrastructure.models import NotificationModel

        with self.database.session_scope() as session:
            return session.query(NotificationModel).filter_by(user_id=user_id, read=False).count()


# Global notification store instance
_notification_store: NotificationStore | None = None


def set_notification_store(store: NotificationStore) -> None:
    """Configure the process-wide notification store for route helpers."""
    global _notification_store
    _notification_store = store


def get_notification_store() -> NotificationStore:
    """Get or create the global notification store."""
    global _notification_store
    if _notification_store is None:
        _notification_store = NotificationStore()
    return _notification_store


# Convenience functions for triggering notifications
async def notify_new_visitor(space_id: str, space_name: str, owner_id: str, visitor_name: str) -> Notification:
    """Notify tavern owner when a visitor enters."""
    return await get_notification_store().add_notification(
        user_id=owner_id,
        notification_type=NotificationType.NEW_VISITOR.value,
        title="新访客进入",
        content=f"{visitor_name} 进入了你的空间",
        data={"space_id": space_id, "visitor_name": visitor_name},
        space_id=space_id,
        space_name=space_name,
    )


async def notify_new_message(space_id: str, space_name: str, owner_id: str, character_name: str) -> Notification:
    """Notify tavern owner when there's a new chat message."""
    return await get_notification_store().add_notification(
        user_id=owner_id,
        notification_type=NotificationType.NEW_MESSAGE.value,
        title="新对话消息",
        content=f"有人在和 {character_name} 对话",
        data={"space_id": space_id, "character_name": character_name},
        space_id=space_id,
        space_name=space_name,
    )


async def notify_new_guest_message(space_id: str, space_name: str, owner_id: str, visitor_name: str) -> Notification:
    """Notify tavern owner when there's a new owner-visible visitor note."""
    return await get_notification_store().add_notification(
        user_id=owner_id,
        notification_type=NotificationType.NEW_GUEST_MESSAGE.value,
        title="新回访反馈",
        content=f"{visitor_name} 给你的空间留下了回访反馈",
        data={"space_id": space_id, "visitor_name": visitor_name},
        space_id=space_id,
        space_name=space_name,
    )


async def notify_guest_reply(
    space_id: str, space_name: str, owner_id: str, replier_name: str
) -> Notification:
    """Notify when someone replies to a message."""
    return await get_notification_store().add_notification(
        user_id=owner_id,
        notification_type=NotificationType.GUEST_REPLY.value,
        title="新回复",
        content=f"{replier_name} 回复了你的留言",
        data={"space_id": space_id, "replier_name": replier_name},
        space_id=space_id,
        space_name=space_name,
    )
