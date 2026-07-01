from __future__ import annotations

import json
from collections.abc import Iterable
from typing import Any

from fastapi import FastAPI
from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send


ENVELOPE_VERSION = "data-meta.v1"


class ApiResponseEnvelopeMiddleware:
    """Add the transitional `{data, meta}` envelope to JSON API responses.

    Phase 1 intentionally keeps legacy top-level keys for dictionary payloads so
    existing frontend code/tests can migrate gradually while every JSON API
    response already exposes the canonical envelope.
    """

    def __init__(self, app: ASGIApp, *, path_prefixes: Iterable[str] = ("/api/v1",)) -> None:
        self.app = app
        self.path_prefixes = tuple(path_prefixes)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        should_buffer = False
        response_start: Message | None = None
        body_chunks: list[bytes] = []

        async def send_wrapper(message: Message) -> None:
            nonlocal response_start, should_buffer

            if message["type"] == "http.response.start":
                should_buffer = _should_envelope_scope(scope, message, self.path_prefixes)
                if should_buffer:
                    response_start = message
                    return
                await send(message)
                return

            if message["type"] != "http.response.body" or not should_buffer:
                await send(message)
                return

            body_chunks.append(message.get("body", b""))
            if message.get("more_body", False):
                return

            body = b"".join(body_chunks)
            wrapped, enveloped = _envelope_body(
                body,
                status_code=int(response_start["status"]) if response_start else 200,
                method=str(scope.get("method") or ""),
                path=str(scope.get("path") or ""),
            )

            assert response_start is not None
            headers = MutableHeaders(raw=response_start["headers"])
            headers["content-length"] = str(len(wrapped))
            if enveloped:
                headers["x-fablespace-response-envelope"] = ENVELOPE_VERSION
            await send(response_start)
            await send({"type": "http.response.body", "body": wrapped, "more_body": False})

        await self.app(scope, receive, send_wrapper)


def add_api_response_envelope_middleware(
    app: FastAPI,
    *,
    path_prefixes: Iterable[str] = ("/api/v1",),
) -> None:
    app.add_middleware(ApiResponseEnvelopeMiddleware, path_prefixes=tuple(path_prefixes))


def build_response_envelope(
    payload: Any,
    *,
    status_code: int,
    method: str,
    path: str,
) -> dict[str, Any]:
    ok = 200 <= status_code < 400
    meta: dict[str, Any] = {
        "ok": ok,
        "status": status_code,
        "envelope": ENVELOPE_VERSION,
        "method": method,
        "path": path,
    }

    if ok:
        data = payload
        if isinstance(payload, dict):
            body = dict(payload)
        else:
            body = {}
    else:
        data = None
        body = dict(payload) if isinstance(payload, dict) else {}
        meta["error"] = _error_meta(payload, status_code)

    body["data"] = data
    body["meta"] = meta
    return body


def _should_envelope_scope(scope: Scope, response_start: Message, path_prefixes: tuple[str, ...]) -> bool:
    if scope.get("method") == "HEAD":
        return False
    path = str(scope.get("path") or "")
    if not path.startswith(path_prefixes):
        return False
    status_code = int(response_start.get("status") or 200)
    if status_code in {204, 304}:
        return False
    headers = MutableHeaders(raw=response_start["headers"])
    content_type = headers.get("content-type", "").lower()
    return "application/json" in content_type


def _envelope_body(body: bytes, *, status_code: int, method: str, path: str) -> tuple[bytes, bool]:
    if not body:
        payload: Any = None
    else:
        try:
            payload = json.loads(body.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return body, False

    if _is_enveloped(payload):
        return _json_bytes(payload), True

    return (
        _json_bytes(
            build_response_envelope(payload, status_code=status_code, method=method, path=path)
        ),
        True,
    )


def _is_enveloped(payload: Any) -> bool:
    if not isinstance(payload, dict):
        return False
    meta = payload.get("meta")
    return "data" in payload and isinstance(meta, dict) and meta.get("envelope") == ENVELOPE_VERSION


def _error_meta(payload: Any, status_code: int) -> dict[str, Any]:
    message = _extract_error_message(payload) or f"HTTP {status_code}"
    return {
        "code": f"HTTP_{status_code}",
        "message": message,
        "detail": payload,
    }


def _extract_error_message(payload: Any) -> str | None:
    if isinstance(payload, dict):
        for key in ("error", "detail"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value
        detail = payload.get("detail")
        if isinstance(detail, list):
            return "请求参数无效"
    if isinstance(payload, str) and payload.strip():
        return payload
    return None


def _json_bytes(payload: Any) -> bytes:
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
