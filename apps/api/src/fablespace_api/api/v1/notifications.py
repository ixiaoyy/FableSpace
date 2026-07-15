"""
Notification System - API Endpoints

Provides WebSocket and REST API endpoints for notifications.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect

from ...core.notifications import (
    get_notification_store,
)
from .auth import is_private_access_allowed, resolve_request_user_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications"])


class ConnectionManager:
    """Manages WebSocket connections per user."""

    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info("WebSocket connected: %s", user_id)

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info("WebSocket disconnected: %s", user_id)

    async def send_to_user(self, user_id: str, message: dict[str, Any]):
        if user_id in self.active_connections:
            disconnected = []
            for websocket in self.active_connections[user_id]:
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.warning("Failed to send to websocket: %s", e)
                    disconnected.append(websocket)
            for ws in disconnected:
                self.disconnect(ws, user_id)


manager = ConnectionManager()


@router.websocket("/ws/{user_id}")
async def websocket_notifications(websocket: WebSocket, user_id: str):
    """
    WebSocket endpoint for real-time notifications.

    - Validates path user_id against the same header/query identity used by REST
    - Sends pending notifications on connect
    - Listens for ping messages
    - Broadcasts new notifications in real-time
    """
    if not await is_private_access_allowed(websocket):
        await websocket.accept()
        await websocket.close(code=1008, reason="FableSpace 访问资格无效或已过期")
        return

    claimed_user_id = _get_websocket_user_id(websocket)
    if not claimed_user_id or claimed_user_id != user_id:
        await websocket.accept()
        await websocket.close(code=1008, reason="用户身份不匹配")
        return

    store = get_notification_store()
    await manager.connect(websocket, user_id)
    queue = await store.register_connection(user_id)

    # Send pending notifications
    notifications, _, unread_count = await store.get_notifications(user_id, limit=20)

    try:
        # Send initial connection message with pending notifications
        await websocket.send_json({
            "type": "connected",
            "unread_count": unread_count,
            "notifications": notifications,
        })

        # Keep connection alive, listen for client messages, and push new notifications.
        while True:
            receive_task = asyncio.create_task(websocket.receive_text())
            notification_task = asyncio.create_task(queue.get())
            done, pending = await asyncio.wait(
                {receive_task, notification_task},
                timeout=30.0,
                return_when=asyncio.FIRST_COMPLETED,
            )

            for task in pending:
                task.cancel()

            if not await is_private_access_allowed(websocket):
                await websocket.close(code=1008, reason="FableSpace 访问资格无效或已过期")
                return

            if not done:
                await websocket.send_json({"type": "ping"})
                continue

            if notification_task in done:
                await websocket.send_json({
                    "type": "notification",
                    "data": notification_task.result(),
                })
                continue

            try:
                data = receive_task.result()
                message = json.loads(data)

                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                elif message.get("type") == "mark_read":
                    notif_id = message.get("notification_id")
                    if notif_id:
                        await store.mark_as_read(user_id, notif_id)
                        await websocket.send_json({
                            "type": "notification_read",
                            "notification_id": notif_id,
                        })
                elif message.get("type") == "mark_all_read":
                    await store.mark_all_as_read(user_id)
                    await websocket.send_json({
                        "type": "all_notifications_read",
                    })
                elif message.get("type") == "get_unread_count":
                    count = await store.get_unread_count(user_id)
                    await websocket.send_json({
                        "type": "unread_count",
                        "count": count,
                    })

            except json.JSONDecodeError:
                logger.warning("Invalid notification websocket JSON received")

    except WebSocketDisconnect:
        pass
    finally:
        await store.unregister_connection(user_id, queue)
        manager.disconnect(websocket, user_id)


@router.get("")
async def list_notifications(
    request: Request,
    limit: int = 20,
    offset: int = 0,
    unread_only: bool = False,
) -> dict[str, Any]:
    """Get notification list for a user."""
    user_id = _get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="未提供用户ID")

    store = get_notification_store()
    notifications, total, unread_count = await store.get_notifications(
        user_id, limit=limit, offset=offset, unread_only=unread_only
    )

    return {
        "notifications": notifications,
        "total": total,
        "unread_count": unread_count,
    }


@router.post("/{notification_id}/read")
async def mark_notification_read(
    request: Request,
    notification_id: str,
) -> dict[str, Any]:
    """Mark a notification as read."""
    user_id = _get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="未提供用户ID")

    store = get_notification_store()
    success = await store.mark_as_read(user_id, notification_id)

    if not success:
        raise HTTPException(status_code=404, detail="通知不存在")

    unread_count = await store.get_unread_count(user_id)
    return {"ok": True, "notification_id": notification_id, "unread_count": unread_count}


@router.post("/read-all")
async def mark_all_notifications_read(request: Request) -> dict[str, Any]:
    """Mark all notifications as read."""
    user_id = _get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="未提供用户ID")

    store = get_notification_store()
    count = await store.mark_all_as_read(user_id)

    return {"ok": True, "marked_count": count}


@router.delete("/{notification_id}")
async def delete_notification(
    request: Request,
    notification_id: str,
) -> dict[str, Any]:
    """Delete a notification."""
    user_id = _get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="未提供用户ID")

    store = get_notification_store()
    success = await store.delete_notification(user_id, notification_id)

    if not success:
        raise HTTPException(status_code=404, detail="通知不存在")

    unread_count = await store.get_unread_count(user_id)
    return {"ok": True, "notification_id": notification_id, "unread_count": unread_count}


@router.get("/unread-count")
async def get_unread_count(request: Request) -> dict[str, Any]:
    """Get unread notification count."""
    user_id = _get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="未提供用户ID")

    store = get_notification_store()
    count = await store.get_unread_count(user_id)

    return {"unread_count": count}


def _get_user_id(request: Request) -> str | None:
    """Resolve notification identity through the shared signed-session policy."""
    return resolve_request_user_id(request) or None


def _get_websocket_user_id(websocket: WebSocket) -> str | None:
    """Resolve WebSocket identity from the same cookie or legacy policy as REST."""
    return resolve_request_user_id(websocket) or None
