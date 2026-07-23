from __future__ import annotations

import base64
import re
from typing import Literal


PublicReferenceNamespace = Literal["space"]

PUBLIC_REFERENCE_NAMESPACES = frozenset({"space"})
PUBLIC_REFERENCE_CODE_LENGTH = 11
LEGACY_PUBLIC_REFERENCE_CODE_LENGTH = 20

_FNV1A_64_OFFSET_BASIS = 14695981039346656037
_FNV1A_64_PRIME = 1099511628211
_FNV1A_64_MASK = 0xFFFFFFFFFFFFFFFF
_PUBLIC_REFERENCE_CODE_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
_LEGACY_PUBLIC_REFERENCE_CODE_RE = re.compile(r"^[0-9]{20}$")


def _validated_namespace(namespace: str) -> str:
    safe_namespace = str(namespace or "").strip()
    if safe_namespace not in PUBLIC_REFERENCE_NAMESPACES:
        raise ValueError(f"Unsupported public reference namespace: {safe_namespace!r}")
    return safe_namespace


def fnv1a64(value: str) -> int:
    """Return the unsigned FNV-1a 64-bit hash of a UTF-8 string."""

    result = _FNV1A_64_OFFSET_BASIS
    for byte in str(value).encode("utf-8"):
        result ^= byte
        result = (result * _FNV1A_64_PRIME) & _FNV1A_64_MASK
    return result


def _compact_code(hash_value: int) -> str:
    if hash_value < 0 or hash_value > _FNV1A_64_MASK:
        raise ValueError("Public reference hash must fit in an unsigned 64-bit integer")
    encoded = base64.urlsafe_b64encode(hash_value.to_bytes(8, byteorder="big")).decode("ascii")
    return encoded.rstrip("=")


def public_reference_code(
    namespace: PublicReferenceNamespace | str,
    *identity_parts: str,
) -> str:
    """Derive a stable 11-character base64url code from an internal identity.

    The underlying value remains the full unsigned FNV-1a 64-bit hash.
    """

    safe_namespace = _validated_namespace(namespace)
    safe_parts = tuple(str(part or "") for part in identity_parts)
    if not safe_parts or any(not part for part in safe_parts):
        raise ValueError("Public reference identity parts cannot be empty")
    identity = ":".join((safe_namespace, *safe_parts))
    return _compact_code(fnv1a64(identity))


def build_public_reference(
    namespace: PublicReferenceNamespace | str,
    *identity_parts: str,
) -> str:
    """Build the bare 11-character public resource ID."""

    return public_reference_code(namespace, *identity_parts)


def parse_public_reference_code(value: str) -> str | None:
    """Parse public IDs and normalize transitional or legacy references."""

    safe_value = str(value or "")
    if _PUBLIC_REFERENCE_CODE_RE.fullmatch(safe_value):
        return safe_value
    if safe_value.startswith("~") and _PUBLIC_REFERENCE_CODE_RE.fullmatch(safe_value[1:]):
        return safe_value[1:]

    candidate = safe_value.rsplit("~", 1)
    if len(candidate) != 2 or not candidate[0]:
        return None
    legacy_code = candidate[1]
    if not _LEGACY_PUBLIC_REFERENCE_CODE_RE.fullmatch(legacy_code):
        return None
    legacy_hash = int(legacy_code)
    if legacy_hash > _FNV1A_64_MASK:
        return None
    return _compact_code(legacy_hash)


def public_reference_matches(
    value: str,
    namespace: PublicReferenceNamespace | str,
    *identity_parts: str,
) -> bool:
    code = parse_public_reference_code(value)
    return bool(code and code == public_reference_code(namespace, *identity_parts))
