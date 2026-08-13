from __future__ import annotations

import argparse
import hashlib
import json
import struct
import time
from pathlib import Path
from typing import Any, Sequence
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
EXPECTED_CACHE_DIRECTIVES = {"public", "max-age=31536000", "immutable"}


def build_parser() -> argparse.ArgumentParser:
    """Build the CDN verification command-line contract used by deployment."""
    parser = argparse.ArgumentParser(description="Verify every adopted game image through the public CDN.")
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--timeout-seconds", type=int, default=20)
    parser.add_argument("--attempts", type=int, default=6)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    """Download every manifest entry and verify bytes, hash, MIME, cache policy, and PNG dimensions."""
    args = build_parser().parse_args(argv)
    manifest = _read_manifest(args.manifest)
    entries = manifest.get("entries")
    if not isinstance(entries, list) or not entries:
        raise ValueError("CDN verification requires at least one manifest entry")

    verified: list[str] = []
    for raw_entry in entries:
        if not isinstance(raw_entry, dict):
            raise ValueError("CDN verification encountered a non-object manifest entry")
        _verify_entry(raw_entry, max(1, args.timeout_seconds), max(1, args.attempts))
        verified.append(str(raw_entry["object_key"]))

    print(json.dumps({"verified": len(verified), "object_keys": verified}, ensure_ascii=False))
    return 0


def _read_manifest(path: Path) -> dict[str, Any]:
    """Read the UTF-8 game media manifest and require an object document root."""
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("media manifest must be a JSON object")
    return payload


def _verify_entry(entry: dict[str, Any], timeout_seconds: int, attempts: int) -> None:
    """Fetch one immutable CDN object with retries and compare it with every recorded delivery field."""
    url = str(entry.get("url") or "")
    parsed = urlsplit(url)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError(f"CDN asset URL must be absolute HTTPS: {url}")

    body, headers = _download(url, timeout_seconds, attempts)
    expected_bytes = int(entry["bytes"])
    if len(body) != expected_bytes:
        raise ValueError(f"CDN byte count mismatch for {entry['object_key']}")
    if hashlib.sha256(body).hexdigest() != entry["sha256"]:
        raise ValueError(f"CDN SHA-256 mismatch for {entry['object_key']}")

    content_type = str(headers.get("Content-Type") or "").split(";", 1)[0].strip().lower()
    if content_type != str(entry["content_type"]).lower():
        raise ValueError(f"CDN Content-Type mismatch for {entry['object_key']}")

    cache_directives = {
        directive.strip().lower()
        for directive in str(headers.get("Cache-Control") or "").split(",")
        if directive.strip()
    }
    if not EXPECTED_CACHE_DIRECTIVES.issubset(cache_directives):
        raise ValueError(f"CDN Cache-Control is not immutable for {entry['object_key']}")

    width, height = _png_dimensions(body)
    if width != int(entry["width"]) or height != int(entry["height"]):
        raise ValueError(f"CDN PNG dimensions mismatch for {entry['object_key']}")


def _download(url: str, timeout_seconds: int, attempts: int) -> tuple[bytes, Any]:
    """Download one public object, retrying transient network and HTTP failures before raising."""
    request = Request(url, headers={"User-Agent": "Mossfield-Cottage-CDN-Verifier/1.0"})
    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            with urlopen(request, timeout=timeout_seconds) as response:
                return response.read(), response.headers
        except (HTTPError, URLError, TimeoutError, OSError) as error:
            last_error = error
            if attempt + 1 < attempts:
                time.sleep(5)

    raise RuntimeError(f"CDN asset remained unavailable after {attempts} attempts: {url}") from last_error


def _png_dimensions(content: bytes) -> tuple[int, int]:
    """Read PNG width and height from the mandatory IHDR chunk without image-library dependencies."""
    if len(content) < 24 or content[:8] != PNG_SIGNATURE or content[12:16] != b"IHDR":
        raise ValueError("CDN asset is not a valid PNG with an IHDR header")
    return struct.unpack(">II", content[16:24])


if __name__ == "__main__":
    raise SystemExit(main())
