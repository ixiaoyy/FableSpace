"""Redis-backed JSON cache with a process-local availability fallback."""

from __future__ import annotations

import json
import logging
import threading
import time
from typing import Any

logger = logging.getLogger(__name__)


class SharedJsonCache:
    """Cache JSON values in Redis when configured, otherwise in local memory."""

    def __init__(self, namespace: str, redis_url: str = "") -> None:
        """Create a lazy cache for one namespace without opening a Redis connection."""
        self.namespace = namespace.strip(":") or "default"
        self.redis_url = redis_url.strip()
        self._redis: Any | None = None
        self._redis_failed = False
        self._lock = threading.Lock()
        self._local: dict[str, tuple[Any, float]] = {}

    def get(self, key: str) -> Any | None:
        """Return a fresh cached JSON value from Redis or the local fallback."""
        client = self._redis_client()
        if client is not None:
            try:
                payload = client.get(self._key(key))
                return json.loads(payload) if payload is not None else None
            except Exception:
                self._disable_redis()
        with self._lock:
            entry = self._local.get(key)
            if entry is None:
                return None
            value, expires_at = entry
            if time.time() > expires_at:
                self._local.pop(key, None)
                return None
            return value

    def set(self, key: str, value: Any, ttl: int) -> None:
        """Store a JSON value for a bounded TTL in Redis or local memory."""
        client = self._redis_client()
        if client is not None:
            try:
                client.set(self._key(key), json.dumps(value, ensure_ascii=False), ex=max(1, int(ttl)))
                return
            except Exception:
                self._disable_redis()
        with self._lock:
            self._local[key] = (value, time.time() + max(1, int(ttl)))

    def invalidate(self, key: str) -> None:
        """Delete one cache key from Redis and the process-local fallback."""
        client = self._redis_client()
        if client is not None:
            try:
                client.delete(self._key(key))
            except Exception:
                self._disable_redis()
        with self._lock:
            self._local.pop(key, None)

    def clear(self) -> None:
        """Delete this namespace only, leaving other applications and Redis DBs intact."""
        client = self._redis_client()
        if client is not None:
            try:
                cursor = 0
                pattern = self._key("*")
                while True:
                    cursor, keys = client.scan(cursor=cursor, match=pattern, count=100)
                    if keys:
                        client.delete(*keys)
                    if cursor == 0:
                        break
            except Exception:
                self._disable_redis()
        with self._lock:
            self._local.clear()

    def _key(self, key: str) -> str:
        """Prefix one logical cache key with the FableSpace namespace."""
        return f"fablespace:{self.namespace}:{key}"

    def _redis_client(self) -> Any | None:
        """Lazily construct a synchronous Redis client after environment loading."""
        if not self.redis_url or self._redis_failed:
            return None
        if self._redis is None:
            try:
                from redis import Redis

                self._redis = Redis.from_url(
                    self.redis_url,
                    decode_responses=True,
                    socket_connect_timeout=2,
                    socket_timeout=2,
                )
            except Exception:
                self._disable_redis()
        return self._redis

    def _disable_redis(self) -> None:
        """Disable Redis for this process after a connection failure and log safely once."""
        if not self._redis_failed:
            logger.warning("Shared Redis cache is unavailable; using process-local cache")
        self._redis_failed = True
        self._redis = None
