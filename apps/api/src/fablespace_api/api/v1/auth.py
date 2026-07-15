from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import json
import time
from typing import Annotated, Any

import httpx
from fastapi import APIRouter, HTTPException, Query, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from starlette.requests import HTTPConnection

from ...infrastructure.settings import ApiSettings

router = APIRouter(prefix="/auth", tags=["auth"])


class SessionIdentity(BaseModel):
    """Minimal trusted identity copied from ParallelLines into a signed local session."""

    id: str
    username: str
    display_name: str | None = None
    avatar_url: str | None = None
    role: str
    locale: str = "zh-CN"


class AccessStatus(BaseModel):
    """Public session-gate status consumed by the FableSpace application shell."""

    access_allowed: bool
    auth_mode: str
    parallellines_url: str
    user: SessionIdentity | None = None


def get_session_identity(connection: HTTPConnection) -> SessionIdentity | None:
    """Read and verify the local HttpOnly session cookie; returns no identity when invalid."""
    settings: ApiSettings = connection.app.state.settings
    raw_cookie = connection.cookies.get(settings.session_cookie_name, "")
    return _decode_session_cookie(raw_cookie, settings)


def resolve_request_user_id(connection: HTTPConnection) -> str:
    """Resolve trusted user ID, falling back to legacy claims only in standalone mode."""
    identity = get_session_identity(connection)
    if identity:
        return identity.id
    settings: ApiSettings = connection.app.state.settings
    if settings.auth_mode == "parallellines":
        return ""
    return str(
        connection.headers.get("X-User-Id")
        or connection.headers.get("X-User-ID")
        or connection.query_params.get("user_id")
        or connection.query_params.get("owner_id")
        or ""
    ).strip()


def is_private_access_allowed(connection: HTTPConnection) -> bool:
    """Allow standalone mode or require a signed administrator session in linked mode."""
    settings: ApiSettings = connection.app.state.settings
    if settings.auth_mode != "parallellines":
        return True
    identity = get_session_identity(connection)
    return bool(identity and identity.role == "admin")


@router.get("/parallellines/callback")
async def parallellines_callback(
    code: Annotated[str, Query(min_length=20, max_length=256)],
    request: Request,
) -> RedirectResponse:
    """Redeem one ParallelLines ticket and establish a short-lived FableSpace session."""
    settings: ApiSettings = request.app.state.settings
    if (
        len(settings.parallellines_sso_service_secret) < 32
        or len(settings.session_secret) < 32
    ):
        raise HTTPException(status_code=503, detail="联动登录尚未配置")

    exchange_url = (
        f"{settings.parallellines_api_base_url.rstrip('/')}/auth/fablespace/exchange"
    )
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            exchange_response = await client.post(
                exchange_url,
                headers={
                    "X-FableSpace-SSO-Secret": settings.parallellines_sso_service_secret,
                },
                json={"code": code},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail="暂时无法连接主站完成登录") from exc

    if exchange_response.status_code != 200:
        raise HTTPException(status_code=401, detail="登录票据无效或已过期")
    try:
        payload = exchange_response.json()
        identity = SessionIdentity.model_validate(payload["data"]["user"])
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="主站返回了无效的用户信息") from exc
    if identity.role != "admin":
        raise HTTPException(status_code=403, detail="私密空间仅对管理员开放")

    response = RedirectResponse(url="/", status_code=303)
    response.set_cookie(
        key=settings.session_cookie_name,
        value=_encode_session_cookie(identity, settings),
        max_age=_session_ttl_seconds(settings),
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        path="/",
    )
    response.headers["Cache-Control"] = "no-store"
    return response


@router.get("/me")
async def current_identity(request: Request) -> dict[str, Any]:
    """Return the trusted FableSpace session identity without exposing cookie contents."""
    identity = get_session_identity(request)
    if not identity:
        raise HTTPException(status_code=401, detail="尚未登录")
    return {"user": identity.model_dump()}


@router.get("/status", response_model=AccessStatus)
async def access_status(request: Request, response: Response) -> AccessStatus:
    """Report whether this browser may enter, without exposing secrets or accepting claims."""
    settings: ApiSettings = request.app.state.settings
    identity = get_session_identity(request)
    access_allowed = settings.auth_mode != "parallellines" or bool(
        identity and identity.role == "admin"
    )
    response.headers["Cache-Control"] = "no-store"
    return AccessStatus(
        access_allowed=access_allowed,
        auth_mode=settings.auth_mode,
        parallellines_url=settings.parallellines_public_base_url.rstrip("/"),
        user=identity if access_allowed else None,
    )


@router.post("/logout")
async def logout(request: Request, response: Response) -> dict[str, bool]:
    """Remove the local FableSpace session cookie; no ParallelLines session is changed."""
    settings: ApiSettings = request.app.state.settings
    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
        secure=settings.session_cookie_secure,
        httponly=True,
        samesite="lax",
    )
    response.headers["Cache-Control"] = "no-store"
    return {"ok": True}


def _encode_session_cookie(identity: SessionIdentity, settings: ApiSettings) -> str:
    """Sign a minimal identity payload; the cookie is authenticated but not encrypted."""
    issued_at = int(time.time())
    claims = {
        "iss": "parallellines",
        "sub": identity.id,
        "username": identity.username,
        "display_name": identity.display_name,
        "avatar_url": identity.avatar_url,
        "role": identity.role,
        "locale": identity.locale,
        "iat": issued_at,
        "exp": issued_at + _session_ttl_seconds(settings),
    }
    payload = _base64url_encode(json.dumps(claims, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(
        settings.session_secret.encode("utf-8"),
        payload.encode("ascii"),
        hashlib.sha256,
    ).digest()
    return f"{payload}.{_base64url_encode(signature)}"


def _decode_session_cookie(raw_cookie: str, settings: ApiSettings) -> SessionIdentity | None:
    """Verify signature, issuer and expiry, returning the trusted identity when valid."""
    if not raw_cookie or not settings.session_secret:
        return None
    try:
        payload, supplied_signature = raw_cookie.split(".", 1)
        expected_signature = hmac.new(
            settings.session_secret.encode("utf-8"),
            payload.encode("ascii"),
            hashlib.sha256,
        ).digest()
        if not hmac.compare_digest(expected_signature, _base64url_decode(supplied_signature)):
            return None
        claims = json.loads(_base64url_decode(payload))
        if claims.get("iss") != "parallellines" or int(claims.get("exp", 0)) <= int(time.time()):
            return None
        return SessionIdentity(
            id=str(claims["sub"]),
            username=str(claims["username"]),
            display_name=claims.get("display_name"),
            avatar_url=claims.get("avatar_url"),
            role=str(claims["role"]),
            locale=str(claims.get("locale") or "zh-CN"),
        )
    except (binascii.Error, KeyError, TypeError, ValueError):
        return None


def _session_ttl_seconds(settings: ApiSettings) -> int:
    """Clamp configured session lifetime to a safe range of five minutes through eight hours."""
    return max(300, min(settings.session_ttl_seconds, 8 * 60 * 60))


def _base64url_encode(value: bytes) -> str:
    """Encode bytes as unpadded URL-safe base64 for cookie-safe signing input."""
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _base64url_decode(value: str) -> bytes:
    """Decode unpadded URL-safe base64, restoring padding before validation."""
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)
