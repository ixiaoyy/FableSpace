from __future__ import annotations

import hashlib
import json
import mimetypes
import subprocess
from datetime import UTC, datetime
from pathlib import Path


IMAGE_EXTENSIONS = {
    ".avif",
    ".bmp",
    ".gif",
    ".ico",
    ".jpeg",
    ".jpg",
    ".png",
    ".svg",
    ".tif",
    ".tiff",
    ".webp",
}
MEDIA_BASE_URL = "https://img.pingxingxian.space/fablespace/media/v1"
MANIFEST_PATH = Path("deploy/cdn/media-manifest.json")


def _tracked_files() -> list[Path]:
    result = subprocess.run(
        ["git", "ls-files", "-z"],
        check=True,
        capture_output=True,
    )
    return [
        Path(item.decode("utf-8"))
        for item in result.stdout.split(b"\0")
        if item and Path(item.decode("utf-8")).suffix.lower() in IMAGE_EXTENSIONS
    ]


def _object_key(source: str) -> str | None:
    mappings = (
        ("apps/web/app/product/assets/", "app/product/assets/"),
        ("apps/web/app/assets/", "app/assets/"),
        ("apps/web/public/", "public/"),
        ("artifacts/", "references/"),
    )
    for prefix, target in mappings:
        if source.startswith(prefix):
            return f"{target}{source.removeprefix(prefix)}"
    return None


def main() -> None:
    entries: list[dict[str, object]] = []
    for path in sorted(_tracked_files(), key=lambda item: item.as_posix()):
        source = path.as_posix()
        content = path.read_bytes()
        object_key = _object_key(source)
        disposition = "migrate" if object_key else "delete"
        entry: dict[str, object] = {
            "source": source,
            "disposition": disposition,
            "bytes": len(content),
            "sha256": hashlib.sha256(content).hexdigest(),
            "content_type": mimetypes.guess_type(source)[0] or "application/octet-stream",
        }
        if object_key:
            entry["object_key"] = object_key
            entry["url"] = f"{MEDIA_BASE_URL}/{object_key}"
        else:
            entry["reason"] = "image is outside the approved media namespaces"
        entries.append(entry)

    migrate_count = sum(entry["disposition"] == "migrate" for entry in entries)
    payload = {
        "schema_version": 1,
        "generated_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "media_base_url": MEDIA_BASE_URL,
        "tracked_image_count": len(entries),
        "tracked_image_bytes": sum(int(entry["bytes"]) for entry in entries),
        "migrate_count": migrate_count,
        "delete_count": len(entries) - migrate_count,
        "entries": entries,
    }
    MANIFEST_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
