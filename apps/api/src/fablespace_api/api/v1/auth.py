from __future__ import annotations

import asyncio
import base64
import binascii
import hashlib
import hmac
import json
import logging
import re
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Annotated, Any

import httpx
from fastapi import APIRouter, HTTPException, Query, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from starlette.requests import HTTPConnection

from ...infrastructure.settings import ApiSettings

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)
ACCESS_CAPABILITY = "fablespace.access"
AUTHORIZATION_LOCK_STRIPES = 64
LOGIN_RETURN_COOKIE = "fablespace_login_return"
LOGIN_RETURN_TTL_SECONDS = 10 * 60
STORY_RETURN_PATH_PATTERN = re.compile(
    r"^/story-worlds/[A-Za-z0-9_-]+/characters/[A-Za-z0-9_-]+$"
)


class SessionIdentity(BaseModel):
    """Minimal trusted identity copied from ParallelLines into a signed local session."""

    id: str
    username: str
    display_name: str | None = None
    avatar_url: str | None = None
    role: str
    locale: str = "zh-CN"
    capabilities: list[str] = Field(default_factory=list)
    authorization_version: int
    access_expires_at: datetime | None = None


class AccessStatus(BaseModel):
    """Public session-gate status consumed by the FableSpace application shell."""

    access_allowed: bool
    auth_mode: str
    parallellines_url: str
    user: SessionIdentity | None = None


@dataclass(frozen=True)
class _CachedAuthorization:
    """One short-lived introspection result stored only inside the current API process."""

    identity: SessionIdentity | None
    expires_at_monotonic: float


class ParallelLinesAccessVerifier:
    """Revalidate signed FableSpace sessions against ParallelLines with a bounded TTL cache."""

    def __init__(self, settings: ApiSettings) -> None:
        """Capture service credentials and initialize an in-process authorization cache."""
        self.settings = settings
        self._cache: dict[tuple[str, int], _CachedAuthorization] = {}
        self._locks = tuple(asyncio.Lock() for _ in range(AUTHORIZATION_LOCK_STRIPES))

    async def remember(self, identity: SessionIdentity) -> None:
        """Seed a fresh ticket-exchange identity so the first redirect avoids a duplicate call."""
        if not has_capability(identity, ACCESS_CAPABILITY) or _is_access_expired(identity):
            return
        key = (identity.id, identity.authorization_version)
        async with self._lock_for(key):
            self._store(identity, identity)

    async def verify(self, identity: SessionIdentity) -> SessionIdentity | None:
        """Return current authorization or fail closed after the cached result expires."""
        if not has_capability(identity, ACCESS_CAPABILITY):
            return None
        key = (identity.id, identity.authorization_version)
        cached = self._cached(key)
        if cached is not None:
            return cached.identity

        async with self._lock_for(key):
            cached = self._cached(key)
            if cached is not None:
                return cached.identity
            current = await self._request_introspection(identity.id)
            if (
                current is None
                or current.id != identity.id
                or not has_capability(current, ACCESS_CAPABILITY)
                or _is_access_expired(current)
            ):
                self._store(identity, None, negative=True)
                return None
            if current.authorization_version < identity.authorization_version:
                logger.warning(
                    "ParallelLines authorization version moved backwards for user %s",
                    identity.id,
                )
                self._store(identity, None, negative=True)
                return None
            self._store(identity, current)
            return current

    def _lock_for(self, key: tuple[str, int]) -> asyncio.Lock:
        """Map one user/version to a bounded lock stripe for refresh deduplication."""
        return self._locks[hash(key) % len(self._locks)]

    def _cached(self, key: tuple[str, int]) -> _CachedAuthorization | None:
        """Read one unexpired cache entry and discard it immediately when stale."""
        cached = self._cache.get(key)
        if cached is None:
            return None
        if cached.expires_at_monotonic <= time.monotonic():
            self._cache.pop(key, None)
            return None
        if cached.identity is not None and _is_access_expired(cached.identity):
            self._cache.pop(key, None)
            return None
        return cached

    def _store(
        self,
        source_identity: SessionIdentity,
        current_identity: SessionIdentity | None,
        *,
        negative: bool = False,
    ) -> None:
        """Store a bounded positive or short negative result without persisting user data."""
        now = time.monotonic()
        self._cache = {
            key: value
            for key, value in self._cache.items()
            if value.expires_at_monotonic > now
        }
        ttl_seconds = _introspection_cache_ttl_seconds(self.settings)
        if negative:
            ttl_seconds = min(ttl_seconds, 5)
        key = (source_identity.id, source_identity.authorization_version)
        self._cache[key] = _CachedAuthorization(
            identity=current_identity,
            expires_at_monotonic=now + ttl_seconds,
        )

    async def _request_introspection(self, user_id: str) -> SessionIdentity | None:
        """Call the backend-only ParallelLines endpoint and validate its authorization payload."""
        introspection_url = (
            f"{self.settings.parallellines_api_base_url.rstrip('/')}"
            "/auth/fablespace/introspect"
        )
        try:
            async with httpx.AsyncClient(
                timeout=float(_introspection_timeout_seconds(self.settings))
            ) as client:
                response = await client.post(
                    introspection_url,
                    headers={
                        "X-FableSpace-SSO-Secret": (
                            self.settings.parallellines_sso_service_secret
                        ),
                    },
                    json={"user_id": user_id},
                )
        except httpx.HTTPError:
            logger.warning("ParallelLines authorization introspection is unavailable")
            return None

        if response.status_code != 200:
            logger.warning(
                "ParallelLines authorization introspection returned HTTP %s",
                response.status_code,
            )
            return None
        try:
            payload = response.json()
            data = payload["data"]
            if not isinstance(data, dict) or data.get("active") is not True:
                return None
            return _identity_from_authorization_payload(data)
        except (KeyError, TypeError, ValueError):
            logger.warning("ParallelLines authorization introspection returned invalid data")
            return None


def get_session_identity(connection: HTTPConnection) -> SessionIdentity | None:
    """Read and verify the local HttpOnly session cookie; returns no identity when invalid."""
    verified_identity = _verified_session_identity(connection)
    if verified_identity is not None:
        return verified_identity
    settings: ApiSettings = connection.app.state.settings
    raw_cookie = connection.cookies.get(settings.session_cookie_name, "")
    return _decode_session_cookie(raw_cookie, settings)


def require_story_session_identity(connection: HTTPConnection) -> SessionIdentity:
    """Resolve one trusted account for StoryWorld runtime routes or fail before state access."""
    settings: ApiSettings = connection.app.state.settings
    identity = (
        _verified_session_identity(connection)
        if settings.auth_mode == "parallellines"
        else get_session_identity(connection)
    )
    if (
        identity is None
        or not has_capability(identity, ACCESS_CAPABILITY)
        or _is_access_expired(identity)
    ):
        raise HTTPException(
            status_code=401,
            detail="尚未登录或登录已过期",
            headers={"Cache-Control": "no-store"},
        )
    return identity


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
        or ""
    ).strip()


async def is_private_access_allowed(connection: HTTPConnection) -> bool:
    """Allow standalone mode or introspect a capability-bearing session in linked mode."""
    settings: ApiSettings = connection.app.state.settings
    if settings.auth_mode != "parallellines":
        return True
    raw_cookie = connection.cookies.get(settings.session_cookie_name, "")
    identity = _decode_session_cookie(raw_cookie, settings)
    verifier = getattr(connection.app.state, "access_verifier", None)
    if identity is None or not isinstance(verifier, ParallelLinesAccessVerifier):
        return False
    current_identity = await verifier.verify(identity)
    if current_identity is None:
        return False
    connection.state.fablespace_session_identity = current_identity
    return True


def has_capability(identity: SessionIdentity | None, capability: str) -> bool:
    """Check one explicit product capability."""
    if identity is None:
        return False
    return capability in set(identity.capabilities)


def _verified_session_identity(connection: HTTPConnection) -> SessionIdentity | None:
    """Read the live identity attached by the HTTP or WebSocket authorization gate."""
    identity = getattr(connection.state, "fablespace_session_identity", None)
    return identity if isinstance(identity, SessionIdentity) else None


@router.get("/parallellines/callback")
async def parallellines_callback(
    code: Annotated[str, Query(min_length=20, max_length=256)],
    request: Request,
) -> RedirectResponse:
    """Redeem one ParallelLines ticket and establish a short-lived FableSpace session."""
    settings: ApiSettings = request.app.state.settings
    if (
        len(settings.parallellines_sso_service_secret.strip()) < 32
        or len(settings.session_secret.strip()) < 32
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
        identity = _identity_from_authorization_payload(payload["data"])
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=502, detail="主站返回了无效的用户信息") from exc
    if not has_capability(identity, ACCESS_CAPABILITY) or _is_access_expired(identity):
        raise HTTPException(status_code=403, detail="当前账号没有 FableSpace 访问资格")

    verifier = getattr(request.app.state, "access_verifier", None)
    if isinstance(verifier, ParallelLinesAccessVerifier):
        await verifier.remember(identity)

    return_path = _decode_login_return_cookie(
        request.cookies.get(LOGIN_RETURN_COOKIE, ""),
        settings,
    )
    response = RedirectResponse(url=return_path, status_code=303)
    response.set_cookie(
        key=settings.session_cookie_name,
        value=_encode_session_cookie(identity, settings),
        max_age=_session_ttl_seconds(settings),
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        path="/",
    )
    response.delete_cookie(
        key=LOGIN_RETURN_COOKIE,
        path="/api/v1/auth/parallellines/callback",
        secure=settings.session_cookie_secure,
        httponly=True,
        samesite="lax",
    )
    response.headers["Cache-Control"] = "no-store"
    return response


@router.get("/parallellines/start")
def start_parallellines_login(
    request: Request,
    return_to: Annotated[str, Query(max_length=512)] = "/",
) -> RedirectResponse:
    """Bind a safe story return path before sending the browser to the existing main-site entry."""
    settings: ApiSettings = request.app.state.settings
    if len(settings.session_secret.strip()) < 32:
        raise HTTPException(status_code=503, detail="联动登录尚未配置")

    return_path = _safe_story_return_path(return_to)
    response = RedirectResponse(
        url=f"{settings.parallellines_public_base_url.rstrip('/')}/play",
        status_code=303,
    )
    response.set_cookie(
        key=LOGIN_RETURN_COOKIE,
        value=_encode_login_return_cookie(return_path, settings),
        max_age=LOGIN_RETURN_TTL_SECONDS,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        path="/api/v1/auth/parallellines/callback",
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
    if settings.auth_mode == "parallellines":
        access_allowed = await is_private_access_allowed(request)
        identity = _verified_session_identity(request) if access_allowed else None
    else:
        identity = get_session_identity(request)
        access_allowed = (
            identity is not None
            and has_capability(identity, ACCESS_CAPABILITY)
            and not _is_access_expired(identity)
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
        "capabilities": identity.capabilities,
        "authorization_version": identity.authorization_version,
        "access_expires_at": (
            identity.access_expires_at.isoformat()
            if identity.access_expires_at is not None
            else None
        ),
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


def _encode_login_return_cookie(return_path: str, settings: ApiSettings) -> str:
    """Sign one short-lived same-origin story return path with a distinct token purpose."""
    issued_at = int(time.time())
    claims = {
        "purpose": "story-login-return",
        "path": _safe_story_return_path(return_path),
        "iat": issued_at,
        "exp": issued_at + LOGIN_RETURN_TTL_SECONDS,
    }
    payload = _base64url_encode(json.dumps(claims, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(
        settings.session_secret.encode("utf-8"),
        payload.encode("ascii"),
        hashlib.sha256,
    ).digest()
    return f"{payload}.{_base64url_encode(signature)}"


def _decode_login_return_cookie(raw_cookie: str, settings: ApiSettings) -> str:
    """Verify the server-bound login return token and fall back to the public homepage."""
    if not raw_cookie or not settings.session_secret:
        return "/"
    try:
        payload, supplied_signature = raw_cookie.split(".", 1)
        expected_signature = hmac.new(
            settings.session_secret.encode("utf-8"),
            payload.encode("ascii"),
            hashlib.sha256,
        ).digest()
        if not hmac.compare_digest(expected_signature, _base64url_decode(supplied_signature)):
            return "/"
        claims = json.loads(_base64url_decode(payload))
        if not isinstance(claims, dict):
            return "/"
        if (
            claims.get("purpose") != "story-login-return"
            or int(claims.get("exp", 0)) <= int(time.time())
        ):
            return "/"
        return _safe_story_return_path(str(claims.get("path") or ""))
    except (AttributeError, binascii.Error, TypeError, ValueError):
        return "/"


def _safe_story_return_path(raw_path: str) -> str:
    """Allow only canonical StoryWorld character paths, rejecting encoded redirect tricks."""
    raw_candidate = str(raw_path or "")
    candidate = raw_candidate.strip()
    if (
        not candidate
        or candidate != raw_candidate
        or len(candidate) > 512
        or "%" in candidate
        or "\\" in candidate
        or any(ord(character) < 0x20 or ord(character) == 0x7F for character in candidate)
        or STORY_RETURN_PATH_PATTERN.fullmatch(candidate) is None
    ):
        return "/"
    return candidate


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
        identity = SessionIdentity(
            id=str(claims["sub"]),
            username=str(claims["username"]),
            display_name=claims.get("display_name"),
            avatar_url=claims.get("avatar_url"),
            role=str(claims["role"]),
            locale=str(claims.get("locale") or "zh-CN"),
            capabilities=claims["capabilities"],
            authorization_version=claims["authorization_version"],
            access_expires_at=claims.get("access_expires_at"),
        )
        return identity
    except (binascii.Error, KeyError, TypeError, ValueError):
        return None


def _session_ttl_seconds(settings: ApiSettings) -> int:
    """Clamp configured session lifetime to a safe range of five minutes through eight hours."""
    return max(300, min(settings.session_ttl_seconds, 8 * 60 * 60))


def _introspection_cache_ttl_seconds(settings: ApiSettings) -> int:
    """Clamp successful authorization caching to one through sixty seconds."""
    return max(1, min(settings.auth_introspection_cache_ttl_seconds, 60))


def _introspection_timeout_seconds(settings: ApiSettings) -> int:
    """Clamp each backend introspection attempt to one through ten seconds."""
    return max(1, min(settings.auth_introspection_timeout_seconds, 10))


def _identity_from_authorization_payload(payload: dict[str, Any]) -> SessionIdentity:
    """Build one identity from exchange or introspection data without trusting extra fields."""
    raw_user = payload.get("user")
    if not isinstance(raw_user, dict):
        raise ValueError("missing user")
    identity_data = dict(raw_user)
    for field_name in (
        "capabilities",
        "authorization_version",
        "access_expires_at",
    ):
        if field_name in payload:
            identity_data[field_name] = payload[field_name]
    return SessionIdentity.model_validate(identity_data)


def _is_access_expired(identity: SessionIdentity) -> bool:
    """Treat a configured product-access expiry as UTC and reject it once reached."""
    expires_at = identity.access_expires_at
    if expires_at is None:
        return False
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    return expires_at <= datetime.now(UTC)


def _base64url_encode(value: bytes) -> str:
    """Encode bytes as unpadded URL-safe base64 for cookie-safe signing input."""
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _base64url_decode(value: str) -> bytes:
    """Decode unpadded URL-safe base64, restoring padding before validation."""
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)
