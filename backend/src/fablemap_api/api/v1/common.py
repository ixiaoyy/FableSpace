from __future__ import annotations

from fastapi import Request

from ...application.taverns import TavernApplicationService


def taverns_service(request: Request) -> TavernApplicationService:
    return request.app.state.taverns


def get_user_id(request: Request) -> str:
    return str(
        request.headers.get("X-User-Id")
        or request.query_params.get("user_id")
        or request.query_params.get("owner_id")
        or ""
    ).strip()
