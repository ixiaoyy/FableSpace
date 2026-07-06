from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Any


def default_cache_dir() -> Path:
    local_app_data = os.environ.get("LOCALAPPDATA")
    if local_app_data:
        return Path(local_app_data) / "FableSpace" / "cache"
    xdg_cache = os.environ.get("XDG_CACHE_HOME")
    if xdg_cache:
        return Path(xdg_cache) / "fablespace"
    return Path.home() / ".cache" / "fablespace"


def cache_key_for_request(lat: float, lon: float, radius: int) -> str:
    raw = f"{lat:.5f}|{lon:.5f}|{radius}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


def cache_path_for_request(cache_dir: str | Path, lat: float, lon: float, radius: int) -> Path:
    return Path(cache_dir) / "overpass" / f"{cache_key_for_request(lat, lon, radius)}.json"


def load_cached_json(cache_path: str | Path) -> dict[str, Any] | None:
    path = Path(cache_path)
    if not path.exists():
        return None
    payload = json.loads(path.read_text(encoding="utf-8"))
    return payload if isinstance(payload, dict) else None


def write_cached_json(cache_path: str | Path, payload: dict[str, Any]) -> Path:
    path = Path(cache_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return path
