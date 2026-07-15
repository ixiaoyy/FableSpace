from __future__ import annotations

from fastapi import Request

from ...application.spaces import TavernApplicationService
from .auth import resolve_request_user_id


def spaces_service(request: Request) -> TavernApplicationService:
    return request.app.state.spaces


def get_user_id(request: Request) -> str:
    """Return signed-session identity in SSO mode, retaining legacy claims for standalone use."""
    return resolve_request_user_id(request)
