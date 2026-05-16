from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from .common import taverns_service

router = APIRouter(prefix="/platform", tags=["platform"])


@router.get("/stats")
def get_platform_stats(request: Request) -> dict[str, Any]:
    return taverns_service(request).get_platform_stats()


@router.get("/recent-memories")
def get_platform_recent_memories(request: Request, limit: int = 5) -> dict[str, Any]:
    return taverns_service(request).get_platform_recent_memories(limit=limit)
