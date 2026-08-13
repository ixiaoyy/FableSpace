from __future__ import annotations

import argparse
import json
import posixpath
import re
from pathlib import Path
from typing import Any, Sequence
from urllib.parse import urlsplit

ADMIN_UPLOAD_PREFIX = "admin/"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Verify every media manifest entry against an S3 object listing.")
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--objects", type=Path, required=True)
    parser.add_argument("--s3-prefix", required=True)
    parser.add_argument("--media-base-url", required=True)
    parser.add_argument("--samples-output", type=Path, required=True)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    manifest = _read_json(args.manifest)
    objects_payload = _read_json(args.objects)

    entries = _validate_manifest(manifest, args.media_base_url)
    if objects_payload.get("IsTruncated"):
        raise ValueError("S3 object listing was truncated; verification requires the complete media namespace")

    remote_objects = {
        str(item.get("Key") or ""): int(item.get("Size") or 0)
        for item in objects_payload.get("Contents", [])
        if item.get("Key")
    }
    prefix = args.s3_prefix.strip("/")
    if not entries:
        unexpected = sorted(
            key
            for key in remote_objects
            if key == prefix or key.startswith(f"{prefix}/")
            if not key.startswith(f"{prefix}/{ADMIN_UPLOAD_PREFIX}")
        )
        if unexpected:
            raise ValueError(
                "empty media manifest still has remote objects: "
                + json.dumps(unexpected[:20], ensure_ascii=False)
            )
        args.samples_output.write_text("", encoding="utf-8")
        print(json.dumps({"verified": 0, "cdn_samples": []}, ensure_ascii=False))
        return 0

    missing: list[str] = []
    wrong_size: list[str] = []
    expected_remote_keys: set[str] = set()
    for entry in entries:
        object_key = str(entry["object_key"])
        remote_key = f"{prefix}/{object_key}"
        expected_remote_keys.add(remote_key)
        if remote_key not in remote_objects:
            missing.append(object_key)
        elif remote_objects[remote_key] != int(entry["bytes"]):
            wrong_size.append(object_key)

    unexpected = sorted(
        key
        for key in remote_objects
        if (key == prefix or key.startswith(f"{prefix}/"))
        and key not in expected_remote_keys
        and not key.startswith(f"{prefix}/{ADMIN_UPLOAD_PREFIX}")
    )

    if missing or wrong_size or unexpected:
        details = {
            "expected": len(entries),
            "missing": missing[:20],
            "wrong_size": wrong_size[:20],
            "unexpected": unexpected[:20],
        }
        raise ValueError(f"media storage verification failed: {json.dumps(details, ensure_ascii=False)}")

    sample_indexes = sorted({0, len(entries) // 2, len(entries) - 1})
    samples = [str(entries[index]["url"]) for index in sample_indexes]
    args.samples_output.write_text("\n".join(samples) + "\n", encoding="utf-8")
    print(json.dumps({"verified": len(entries), "cdn_samples": samples}, ensure_ascii=False))
    return 0


def _validate_manifest(manifest: dict[str, Any], expected_media_base_url: str) -> list[dict[str, Any]]:
    """Validate manifest totals, immutable URL mapping, hashes, dimensions, and unique object keys."""
    if manifest.get("schema_version") != 1:
        raise ValueError("media manifest schema_version must be 1")

    media_base_url = str(manifest.get("media_base_url") or "").rstrip("/")
    expected_base = expected_media_base_url.rstrip("/")
    parsed_base = urlsplit(media_base_url)
    if parsed_base.scheme != "https" or not parsed_base.netloc:
        raise ValueError("media manifest base URL must be absolute HTTPS")
    if media_base_url != expected_base:
        raise ValueError("media manifest base URL does not match the reviewed deployment origin")

    raw_entries = manifest.get("entries")
    if not isinstance(raw_entries, list):
        raise ValueError("media manifest entries must be a list")

    entries: list[dict[str, Any]] = []
    object_keys: set[str] = set()
    total_bytes = 0
    for index, raw_entry in enumerate(raw_entries):
        if not isinstance(raw_entry, dict):
            raise ValueError(f"media manifest entry {index} must be an object")

        object_key = str(raw_entry.get("object_key") or "")
        object_parts = object_key.split("/")
        if (
            not object_key
            or object_key.startswith("/")
            or "\\" in object_key
            or ".." in object_parts
            or posixpath.normpath(object_key) != object_key
        ):
            raise ValueError(f"media manifest entry {index} has an invalid object_key")
        if object_key in object_keys:
            raise ValueError(f"media manifest has a duplicate object_key: {object_key}")
        object_keys.add(object_key)

        byte_count = raw_entry.get("bytes")
        width = raw_entry.get("width")
        height = raw_entry.get("height")
        if not isinstance(byte_count, int) or byte_count <= 0:
            raise ValueError(f"media manifest entry {index} has invalid bytes")
        if not isinstance(width, int) or width <= 0 or not isinstance(height, int) or height <= 0:
            raise ValueError(f"media manifest entry {index} has invalid dimensions")
        if not re.fullmatch(r"[0-9a-f]{64}", str(raw_entry.get("sha256") or "")):
            raise ValueError(f"media manifest entry {index} has invalid sha256")
        if str(raw_entry.get("content_type") or "") != "image/png":
            raise ValueError(f"media manifest entry {index} must use image/png")

        expected_url = f"{media_base_url}/{object_key}"
        if raw_entry.get("url") != expected_url:
            raise ValueError(f"media manifest entry {index} URL does not match object_key")

        total_bytes += byte_count
        entries.append(raw_entry)

    if manifest.get("tracked_image_count") != len(entries):
        raise ValueError("media manifest tracked_image_count does not match entries")
    if manifest.get("tracked_image_bytes") != total_bytes:
        raise ValueError("media manifest tracked_image_bytes does not match entries")
    return entries


def _read_json(path: Path) -> dict[str, Any]:
    """Read one UTF-8 JSON file and require an object at the document root."""
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"expected a JSON object in {path}")
    return payload


if __name__ == "__main__":
    raise SystemExit(main())
