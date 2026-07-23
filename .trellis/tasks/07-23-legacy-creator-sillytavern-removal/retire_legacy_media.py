from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit, urlunsplit
from urllib.request import Request, urlopen


REPO_ROOT = Path(__file__).resolve().parents[3]
API_SOURCE_ROOT = REPO_ROOT / "apps" / "api" / "src"
if str(API_SOURCE_ROOT) not in sys.path:
    sys.path.insert(0, str(API_SOURCE_ROOT))

from fablespace_api.infrastructure.generated_storage import S3GeneratedStorage


BATCH_ID = "2026-07-23-retire-all-legacy-product-media"
EXPECTED_COUNT = 333
EXPECTED_BYTES = 139_007_917
REMOTE_ATTEMPTS = 4
RETRYABLE_HTTP_CODES = {429, 500, 502, 503, 504}
ALLOWED_PREFIXES = (
    "app/assets/fable-space-05-10/",
    "app/assets/fable-space-scenes/",
    "app/assets/identity-onboarding/",
    "app/assets/npc-style-cast/",
    "app/assets/place-atmosphere-hd/",
    "app/product/assets/map-packs/",
    "public/assets/characters/",
    "public/assets/map-snapshots/",
    "public/assets/npcs/public-welfare/",
    "public/assets/scenes/",
    "public/faction-emblems/",
    "public/place-atmosphere-hd/",
    "public/place-atmosphere/",
    "references/",
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Retire the exact legacy media snapshot after source references are removed.",
    )
    parser.add_argument(
        "command",
        choices=("prepare", "delete", "update-manifest", "verify"),
    )
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--ledger", type=Path, required=True)
    parser.add_argument("--env-file", type=Path)
    parser.add_argument("--apply", action="store_true")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    if args.command == "prepare":
        return prepare(args.manifest, args.ledger)
    if args.command == "delete":
        if not args.apply:
            raise ValueError("remote deletion requires --apply")
        if not args.env_file:
            raise ValueError("remote deletion requires --env-file")
        return delete(args.ledger, args.env_file)
    if args.command == "update-manifest":
        return update_manifest(args.manifest, args.ledger)
    if not args.env_file:
        raise ValueError("verification requires --env-file")
    return verify(args.manifest, args.ledger, args.env_file)


def prepare(manifest_path: Path, ledger_path: Path) -> int:
    if ledger_path.exists():
        raise ValueError(f"refusing to overwrite ledger: {ledger_path}")
    manifest = read_json(manifest_path)
    entries = entry_list(manifest)
    validate_manifest(manifest, entries)
    validate_exact_batch(entries)
    now = utc_now()
    ledger = {
        "schema_version": 1,
        "batch_id": BATCH_ID,
        "prepared_at": now,
        "deleted_at": None,
        "media_base_url": str(manifest["media_base_url"]).rstrip("/"),
        "batch_totals": {
            "entry_count": len(entries),
            "bytes": sum(int(entry["bytes"]) for entry in entries),
        },
        "remote_verification": {
            "namespace_matches_manifest": False,
            "preflight_expected_size_count": 0,
            "delete_confirmed_count": 0,
            "preflight_at": None,
            "postflight_at": None,
        },
        "entries": [
            {
                **entry,
                "remote_status": "pending",
            }
            for entry in sorted(entries, key=lambda item: str(item["object_key"]))
        ],
    }
    validate_ledger(ledger)
    write_json_atomic(ledger_path, ledger)
    print(json.dumps(ledger["batch_totals"], ensure_ascii=False))
    return 0


def delete(ledger_path: Path, env_path: Path) -> int:
    ledger = read_json(ledger_path)
    validate_ledger(ledger)
    if ledger.get("deleted_at"):
        raise ValueError("ledger already records completed deletion")
    storage = create_storage(read_env_file(env_path))
    validate_namespace(storage, str(ledger["media_base_url"]))
    entries = entry_list(ledger)
    ledger["remote_verification"]["namespace_matches_manifest"] = True

    verified = 0
    for entry in entries:
        state, size = head_object(storage, entry)
        if state != "present" or size != int(entry["bytes"]):
            raise ValueError(
                f"remote preflight failed for {entry['object_key']}: {state}, size={size}",
            )
        entry["remote_status"] = "verified_present"
        verified += 1
        ledger["remote_verification"]["preflight_expected_size_count"] = verified
        if verified % 20 == 0:
            write_json_atomic(ledger_path, ledger)
    ledger["remote_verification"]["preflight_at"] = utc_now()
    write_json_atomic(ledger_path, ledger)

    confirmed = 0
    for entry in entries:
        delete_object(storage, entry)
        state, _ = head_object(storage, entry)
        if state != "missing":
            entry["remote_status"] = "delete_not_confirmed"
            write_json_atomic(ledger_path, ledger)
            raise ValueError(f"remote object still exists: {entry['object_key']}")
        entry["remote_status"] = "deleted"
        confirmed += 1
        ledger["remote_verification"]["delete_confirmed_count"] = confirmed
        if confirmed % 10 == 0:
            write_json_atomic(ledger_path, ledger)

    ledger["deleted_at"] = utc_now()
    ledger["remote_verification"]["postflight_at"] = ledger["deleted_at"]
    write_json_atomic(ledger_path, ledger)
    print(json.dumps({"deleted": confirmed}, ensure_ascii=False))
    return 0


def update_manifest(manifest_path: Path, ledger_path: Path) -> int:
    manifest = read_json(manifest_path)
    ledger = read_json(ledger_path)
    entries = entry_list(manifest)
    validate_manifest(manifest, entries)
    validate_exact_batch(entries)
    validate_ledger(ledger)
    require_completed_deletion(ledger)

    manifest_by_key = {str(entry["object_key"]): entry for entry in entries}
    for ledger_entry in entry_list(ledger):
        current = manifest_by_key.get(str(ledger_entry["object_key"]))
        if current is None:
            raise ValueError(f"manifest entry disappeared: {ledger_entry['object_key']}")
        for field in (
            "source",
            "disposition",
            "bytes",
            "sha256",
            "content_type",
            "object_key",
            "url",
        ):
            if current.get(field) != ledger_entry.get(field):
                raise ValueError(
                    f"manifest entry changed: {ledger_entry['object_key']} field={field}",
                )

    manifest.update(
        {
            "generated_at": utc_now(),
            "tracked_image_count": 0,
            "tracked_image_bytes": 0,
            "migrate_count": 0,
            "delete_count": 0,
            "entries": [],
        },
    )
    validate_manifest(manifest, [])
    write_json_atomic(manifest_path, manifest)
    print(json.dumps({"retained": 0, "bytes": 0}, ensure_ascii=False))
    return 0


def verify(manifest_path: Path, ledger_path: Path, env_path: Path) -> int:
    manifest = read_json(manifest_path)
    ledger = read_json(ledger_path)
    validate_manifest(manifest, entry_list(manifest))
    validate_ledger(ledger)
    require_completed_deletion(ledger)
    if entry_list(manifest):
        raise ValueError("legacy entries remain in media manifest")

    storage = create_storage(read_env_file(env_path))
    validate_namespace(storage, str(ledger["media_base_url"]))
    checked = 0
    for entry in entry_list(ledger):
        state, _ = head_object(storage, entry)
        if state != "missing":
            raise ValueError(f"retired object is still present: {entry['object_key']}")
        checked += 1
    print(
        json.dumps(
            {
                "manifest_entries": 0,
                "retired_remote_missing": checked,
                "retired_bytes": EXPECTED_BYTES,
            },
            ensure_ascii=False,
        ),
    )
    return 0


def validate_manifest(manifest: dict[str, Any], entries: list[dict[str, Any]]) -> None:
    expected = {
        "tracked_image_count": len(entries),
        "tracked_image_bytes": sum(int(entry["bytes"]) for entry in entries),
        "migrate_count": sum(1 for entry in entries if entry.get("disposition") == "migrate"),
        "delete_count": sum(1 for entry in entries if entry.get("disposition") == "delete"),
    }
    actual = {name: int(manifest.get(name, -1)) for name in expected}
    if actual != expected:
        raise ValueError(f"manifest summary mismatch: actual={actual}, expected={expected}")


def validate_exact_batch(entries: list[dict[str, Any]]) -> None:
    keys = [str(entry.get("object_key") or "") for entry in entries]
    if len(keys) != EXPECTED_COUNT or len(set(keys)) != EXPECTED_COUNT:
        raise ValueError(f"expected {EXPECTED_COUNT} unique legacy media keys")
    if sum(int(entry["bytes"]) for entry in entries) != EXPECTED_BYTES:
        raise ValueError("legacy media byte total changed")
    unexpected = [
        key for key in keys
        if not any(key.startswith(prefix) for prefix in ALLOWED_PREFIXES)
    ]
    if unexpected:
        raise ValueError(f"batch contains non-legacy keys: {unexpected[:3]}")


def validate_ledger(ledger: dict[str, Any]) -> None:
    if ledger.get("batch_id") != BATCH_ID:
        raise ValueError("unexpected retirement batch")
    entries = entry_list(ledger)
    validate_exact_batch(entries)
    totals = ledger.get("batch_totals") or {}
    if int(totals.get("entry_count", -1)) != EXPECTED_COUNT:
        raise ValueError("ledger entry count mismatch")
    if int(totals.get("bytes", -1)) != EXPECTED_BYTES:
        raise ValueError("ledger byte total mismatch")


def require_completed_deletion(ledger: dict[str, Any]) -> None:
    verification = ledger.get("remote_verification") or {}
    if not ledger.get("deleted_at"):
        raise ValueError("remote deletion is not complete")
    if int(verification.get("preflight_expected_size_count", -1)) != EXPECTED_COUNT:
        raise ValueError("remote preflight is incomplete")
    if int(verification.get("delete_confirmed_count", -1)) != EXPECTED_COUNT:
        raise ValueError("remote postflight is incomplete")
    if any(entry.get("remote_status") != "deleted" for entry in entry_list(ledger)):
        raise ValueError("one or more remote objects are not confirmed deleted")


def create_storage(env: dict[str, str]) -> S3GeneratedStorage:
    required = (
        "FABLESPACE_S3_BUCKET",
        "FABLESPACE_S3_ENDPOINT_URL",
        "FABLESPACE_S3_ACCESS_KEY_ID",
        "FABLESPACE_S3_SECRET_ACCESS_KEY",
        "FABLESPACE_CDN_BASE_URL",
    )
    missing = [name for name in required if not env.get(name, "").strip()]
    if missing:
        raise ValueError(f"missing S3/CDN settings: {', '.join(missing)}")
    settings = SimpleNamespace(
        s3_bucket=env["FABLESPACE_S3_BUCKET"],
        s3_region=env.get("FABLESPACE_S3_REGION", "auto") or "auto",
        s3_endpoint_url=env["FABLESPACE_S3_ENDPOINT_URL"],
        s3_access_key_id=env["FABLESPACE_S3_ACCESS_KEY_ID"],
        s3_secret_access_key=env["FABLESPACE_S3_SECRET_ACCESS_KEY"],
        s3_prefix=(env.get("FABLESPACE_S3_PREFIX", "fablespace") or "fablespace").strip("/"),
        cdn_base_url=env["FABLESPACE_CDN_BASE_URL"].rstrip("/"),
        s3_request_timeout_seconds=20,
    )
    return S3GeneratedStorage(settings)


def validate_namespace(storage: S3GeneratedStorage, media_base_url: str) -> None:
    expected = f"{storage.cdn_base_url}/{storage.prefix}/media/v1"
    if expected != media_base_url.rstrip("/"):
        raise ValueError("configured S3/CDN namespace does not match the manifest")


def head_object(
    storage: S3GeneratedStorage,
    entry: dict[str, Any],
) -> tuple[str, int | None]:
    last_error: BaseException | None = None
    for attempt in range(REMOTE_ATTEMPTS):
        try:
            with urlopen(signed_request(storage, "HEAD", entry), timeout=storage.timeout) as response:
                response.read()
                return "present", int(response.headers.get("Content-Length", "-1"))
        except HTTPError as exc:
            if exc.code == 404:
                return "missing", None
            if exc.code not in RETRYABLE_HTTP_CODES:
                raise RuntimeError(f"remote HEAD failed with HTTP {exc.code}") from exc
            last_error = exc
        except (TimeoutError, URLError, OSError) as exc:
            last_error = exc
        if attempt + 1 < REMOTE_ATTEMPTS:
            time.sleep(0.5 * (2**attempt))
    raise RuntimeError("remote HEAD failed after bounded retries") from last_error


def delete_object(storage: S3GeneratedStorage, entry: dict[str, Any]) -> None:
    last_error: BaseException | None = None
    for attempt in range(REMOTE_ATTEMPTS):
        try:
            with urlopen(signed_request(storage, "DELETE", entry), timeout=storage.timeout) as response:
                response.read()
                if response.status not in {200, 202, 204}:
                    raise RuntimeError(f"remote DELETE returned HTTP {response.status}")
                return
        except HTTPError as exc:
            if exc.code not in RETRYABLE_HTTP_CODES:
                raise RuntimeError(f"remote DELETE failed with HTTP {exc.code}") from exc
            last_error = exc
        except (TimeoutError, URLError, OSError) as exc:
            last_error = exc
        if attempt + 1 < REMOTE_ATTEMPTS:
            time.sleep(0.5 * (2**attempt))
    raise RuntimeError("remote DELETE failed after bounded retries") from last_error


def signed_request(
    storage: S3GeneratedStorage,
    method: str,
    entry: dict[str, Any],
) -> Request:
    remote_key = "/".join((storage.prefix, "media", "v1", str(entry["object_key"])))
    endpoint = urlsplit(storage.endpoint_url)
    object_path = (
        f"{endpoint.path.rstrip('/')}/{quote(storage.bucket, safe='')}/"
        f"{quote(remote_key, safe='/-_.~')}"
    )
    url = urlunsplit((endpoint.scheme, endpoint.netloc, object_path, "", ""))
    headers = storage._signed_headers(method, url, b"", str(entry["content_type"]))
    return Request(url, headers=headers, method=method)


def entry_list(payload: dict[str, Any]) -> list[dict[str, Any]]:
    entries = payload.get("entries")
    if not isinstance(entries, list) or not all(isinstance(entry, dict) for entry in entries):
        raise ValueError("entries must be a list of objects")
    return entries


def read_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip("\"'")
    return values


def read_json(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"expected JSON object: {path}")
    return payload


def write_json_atomic(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(f"{path.suffix}.tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    temporary.replace(path)


def utc_now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


if __name__ == "__main__":
    raise SystemExit(main())
