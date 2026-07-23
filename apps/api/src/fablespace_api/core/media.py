from __future__ import annotations

import os
from urllib.parse import urlparse


DEFAULT_MEDIA_BASE_URL = "https://img.pingxingxian.space/fablespace/media/v1"


def media_base_url() -> str:
    value = os.environ.get("FABLESPACE_MEDIA_BASE_URL", "").strip() or DEFAULT_MEDIA_BASE_URL
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError("FABLESPACE_MEDIA_BASE_URL must be an absolute HTTPS URL")
    return value.rstrip("/")


def public_media_url(value: str) -> str:
    trimmed = str(value or "").strip()
    if not trimmed or trimmed.startswith(("https://", "http://", "data:", "blob:", "/generated/")):
        return trimmed

    normalized = trimmed.replace("\\", "/").lstrip("/")
    if normalized.startswith("apps/web/app/assets/"):
        normalized = f"app/assets/{normalized.removeprefix('apps/web/app/assets/')}"
    return f"{media_base_url()}/{normalized}"
