from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Sequence
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit, urlunsplit
from urllib.request import Request, urlopen


REPO_ROOT = Path(__file__).resolve().parents[3]
API_SOURCE_ROOT = REPO_ROOT / "apps" / "api" / "src"
if str(API_SOURCE_ROOT) not in sys.path:
    sys.path.insert(0, str(API_SOURCE_ROOT))

from fablespace_api.infrastructure.generated_storage import S3GeneratedStorage


BATCH_ID = "2026-07-23-unused-npc-style-cast"
EXPECTED_KEYS = {
    "app/assets/npc-style-cast/space-npc-style-cast.png",
    *{
        f"app/assets/npc-style-cast/{size}/{stem}.png"
        for size in ("portraits", "portraits-hd")
        for stem in (
            "alien-9-delta",
            "alien-mu-mu",
            "alien-pi-pi",
            "alien-v17",
            "cat-accountant-yinpiao",
            "commission-chimao",
            "commission-mozhan",
            "commission-zhideng",
            "mist-bartender-lanbo",
            "neon-oracle-iris-zero",
            "starport-boxing",
            "terminal-repair-luotong",
        )
    },
}
EXPECTED_COUNT = 25
EXPECTED_BYTES = 9_514_852
REMOTE_ATTEMPTS = 4
RETRYABLE_HTTP_CODES = {429, 500, 502, 503, 504}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Retire one exact, audited batch of legacy CDN media.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    prepare = subparsers.add_parser("prepare", help="Create the deletion ledger from the current manifest.")
    prepare.add_argument("--manifest", type=Path, required=True)
    prepare.add_argument("--ledger", type=Path, required=True)

    delete = subparsers.add_parser("delete", help="Delete only the ledger's exact remote objects.")
    delete.add_argument("--ledger", type=Path, required=True)
    delete.add_argument("--env-file", type=Path, required=True)
    delete.add_argument("--apply", action="store_true", help="Required acknowledgement for irreversible deletion.")

    update = subparsers.add_parser("update-manifest", help="Remove confirmed-deleted entries from the manifest.")
    update.add_argument("--manifest", type=Path, required=True)
    update.add_argument("--ledger", type=Path, required=True)

    verify = subparsers.add_parser("verify", help="Verify repository and remote retirement invariants.")
    verify.add_argument("--manifest", type=Path, required=True)
    verify.add_argument("--ledger", type=Path, required=True)
    verify.add_argument("--env-file", type=Path, required=True)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.command == "prepare":
        return prepare_ledger(args.manifest, args.ledger)
    if args.command == "delete":
        if not args.apply:
            raise ValueError("remote deletion requires the explicit --apply flag")
        return delete_remote_objects(args.ledger, args.env_file)
    if args.command == "update-manifest":
        return update_manifest(args.manifest, args.ledger)
    if args.command == "verify":
        return verify_retirement(args.manifest, args.ledger, args.env_file)
    raise AssertionError(f"unhandled command: {args.command}")


def prepare_ledger(manifest_path: Path, ledger_path: Path) -> int:
    if ledger_path.exists():
        raise ValueError(f"refusing to overwrite existing ledger: {ledger_path}")

    manifest = read_json_object(manifest_path)
    entries = require_entry_list(manifest)
    validate_manifest_summary(manifest, entries)

    selected = [entry for entry in entries if str(entry.get("object_key")) in EXPECTED_KEYS]
    validate_exact_selection(selected)
    ledger_entries: list[dict[str, Any]] = []
    for entry in sorted(selected, key=lambda item: str(item["object_key"])):
        sidecar = sidecar_for_entry(entry)
        sidecar_text = sidecar.read_text(encoding="utf-8")
        if str(entry["url"]) not in sidecar_text:
            raise ValueError(f"sidecar does not contain the manifest URL: {sidecar}")
        if str(entry["sha256"]) not in sidecar_text:
            raise ValueError(f"sidecar does not contain the manifest SHA-256: {sidecar}")
        ledger_entries.append(
            {
                **entry,
                "sidecar": sidecar.relative_to(REPO_ROOT).as_posix(),
                "remote_status": "pending",
            }
        )

    now = utc_now()
    ledger = {
        "schema_version": 1,
        "batch_id": BATCH_ID,
        "reason": "No active code, configuration, seed, or maintained-document reference remains.",
        "prepared_at": now,
        "deleted_at": None,
        "media_base_url": str(manifest["media_base_url"]),
        "manifest_before": {
            "tracked_image_count": int(manifest["tracked_image_count"]),
            "tracked_image_bytes": int(manifest["tracked_image_bytes"]),
            "migrate_count": int(manifest["migrate_count"]),
            "delete_count": int(manifest["delete_count"]),
        },
        "batch_totals": {
            "entry_count": len(ledger_entries),
            "bytes": sum(int(entry["bytes"]) for entry in ledger_entries),
            "sidecar_count": len({str(entry["sidecar"]) for entry in ledger_entries}),
        },
        "remote_verification": {
            "namespace_matches_manifest": None,
            "preflight_expected_size_count": 0,
            "delete_confirmed_count": 0,
            "preflight_at": None,
            "postflight_at": None,
        },
        "entries": ledger_entries,
    }
    validate_ledger(ledger)
    write_json_atomic(ledger_path, ledger)
    print(
        json.dumps(
            {
                "prepared": len(ledger_entries),
                "bytes": ledger["batch_totals"]["bytes"],
                "sidecars": ledger["batch_totals"]["sidecar_count"],
            },
            ensure_ascii=False,
        )
    )
    return 0


def delete_remote_objects(ledger_path: Path, env_path: Path) -> int:
    ledger = read_json_object(ledger_path)
    validate_ledger(ledger)
    if ledger.get("deleted_at"):
        raise ValueError("ledger already records a completed deletion")

    env = read_env_file(env_path)
    storage = create_storage(env)
    expected_media_base = f"{storage.cdn_base_url}/{storage.prefix}/media/v1"
    if expected_media_base != str(ledger["media_base_url"]):
        raise ValueError("configured CDN base and S3 prefix do not match the ledger namespace")

    ledger["remote_verification"]["namespace_matches_manifest"] = True
    entries = require_entry_list(ledger)
    for entry in entries:
        state, size = head_object(storage, entry)
        if state != "present" or size != int(entry["bytes"]):
            raise ValueError(f"remote preflight failed for {entry['object_key']}: {state}, size={size}")
        entry["remote_status"] = "verified_present"
    ledger["remote_verification"]["preflight_expected_size_count"] = len(entries)
    ledger["remote_verification"]["preflight_at"] = utc_now()
    write_json_atomic(ledger_path, ledger)

    confirmed = 0
    for entry in entries:
        delete_object(storage, entry)
        state, _ = head_object(storage, entry)
        if state != "missing":
            entry["remote_status"] = "delete_not_confirmed"
            write_json_atomic(ledger_path, ledger)
            raise ValueError(f"remote object still exists after DELETE: {entry['object_key']}")
        entry["remote_status"] = "deleted"
        confirmed += 1
        ledger["remote_verification"]["delete_confirmed_count"] = confirmed
        write_json_atomic(ledger_path, ledger)

    ledger["deleted_at"] = utc_now()
    ledger["remote_verification"]["postflight_at"] = ledger["deleted_at"]
    write_json_atomic(ledger_path, ledger)
    print(json.dumps({"deleted": confirmed, "postflight_missing": confirmed}, ensure_ascii=False))
    return 0


def update_manifest(manifest_path: Path, ledger_path: Path) -> int:
    manifest = read_json_object(manifest_path)
    ledger = read_json_object(ledger_path)
    validate_ledger(ledger)
    entries = require_entry_list(manifest)
    validate_manifest_summary(manifest, entries)

    if not ledger.get("deleted_at"):
        raise ValueError("cannot update the manifest before remote deletion is confirmed")
    if int(ledger["remote_verification"]["delete_confirmed_count"]) != EXPECTED_COUNT:
        raise ValueError("ledger does not confirm every expected remote deletion")

    ledger_by_key = {str(entry["object_key"]): entry for entry in require_entry_list(ledger)}
    manifest_by_key = {str(entry["object_key"]): entry for entry in entries}
    if set(ledger_by_key) != EXPECTED_KEYS:
        raise ValueError("ledger keys differ from the exact retirement allowlist")
    for key, ledger_entry in ledger_by_key.items():
        manifest_entry = manifest_by_key.get(key)
        if manifest_entry is None:
            raise ValueError(f"manifest entry is already absent: {key}")
        for field in ("source", "disposition", "bytes", "sha256", "content_type", "object_key", "url"):
            if manifest_entry.get(field) != ledger_entry.get(field):
                raise ValueError(f"manifest entry changed after ledger preparation: {key} field={field}")

    retained = [entry for entry in entries if str(entry["object_key"]) not in EXPECTED_KEYS]
    manifest["generated_at"] = utc_now()
    manifest["tracked_image_count"] = len(retained)
    manifest["tracked_image_bytes"] = sum(int(entry["bytes"]) for entry in retained)
    manifest["migrate_count"] = sum(1 for entry in retained if entry.get("disposition") == "migrate")
    manifest["delete_count"] = sum(1 for entry in retained if entry.get("disposition") == "delete")
    manifest["entries"] = retained
    validate_manifest_summary(manifest, retained)
    write_json_atomic(manifest_path, manifest)
    print(
        json.dumps(
            {
                "retained": manifest["tracked_image_count"],
                "bytes": manifest["tracked_image_bytes"],
                "migrate": manifest["migrate_count"],
                "delete": manifest["delete_count"],
            },
            ensure_ascii=False,
        )
    )
    return 0


def verify_retirement(manifest_path: Path, ledger_path: Path, env_path: Path) -> int:
    manifest = read_json_object(manifest_path)
    ledger = read_json_object(ledger_path)
    manifest_entries = require_entry_list(manifest)
    ledger_entries = require_entry_list(ledger)
    validate_manifest_summary(manifest, manifest_entries)
    validate_ledger(ledger)

    if not ledger.get("deleted_at"):
        raise ValueError("ledger does not record a completed deletion")
    if int(ledger["remote_verification"]["preflight_expected_size_count"]) != EXPECTED_COUNT:
        raise ValueError("ledger preflight count is incomplete")
    if int(ledger["remote_verification"]["delete_confirmed_count"]) != EXPECTED_COUNT:
        raise ValueError("ledger postflight count is incomplete")
    if any(entry.get("remote_status") != "deleted" for entry in ledger_entries):
        raise ValueError("not every ledger entry is marked deleted")

    manifest_keys = {str(entry["object_key"]) for entry in manifest_entries}
    if manifest_keys & EXPECTED_KEYS:
        raise ValueError("retired keys remain in the current media manifest")
    if len(manifest_entries) != 333 or sum(int(entry["bytes"]) for entry in manifest_entries) != 139_007_917:
        raise ValueError("post-retirement manifest totals differ from the approved batch arithmetic")

    remaining_sidecars = list(
        (REPO_ROOT / "apps" / "web" / "app" / "assets" / "npc-style-cast").rglob("*.prompt.md")
    )
    retired_sidecars = [REPO_ROOT / str(entry["sidecar"]) for entry in ledger_entries]
    if any(path.exists() for path in retired_sidecars):
        raise ValueError("one or more retired prompt sidecars still exist")
    if len(remaining_sidecars) != 24:
        raise ValueError(f"expected 24 protected npc-style-cast sidecars, found {len(remaining_sidecars)}")

    env = read_env_file(env_path)
    storage = create_storage(env)
    expected_media_base = f"{storage.cdn_base_url}/{storage.prefix}/media/v1"
    if expected_media_base != str(ledger["media_base_url"]):
        raise ValueError("configured CDN base and S3 prefix do not match the ledger namespace")
    for entry in ledger_entries:
        state, _ = head_object(storage, entry)
        if state != "missing":
            raise ValueError(f"retired remote object is still present: {entry['object_key']}")

    print(
        json.dumps(
            {
                "manifest_entries": len(manifest_entries),
                "manifest_bytes": sum(int(entry["bytes"]) for entry in manifest_entries),
                "retired_remote_missing": len(ledger_entries),
                "retired_sidecars_missing": len(retired_sidecars),
                "protected_sidecars": len(remaining_sidecars),
            },
            ensure_ascii=False,
        )
    )
    return 0


def validate_manifest_summary(manifest: dict[str, Any], entries: list[dict[str, Any]]) -> None:
    expected = {
        "tracked_image_count": len(entries),
        "tracked_image_bytes": sum(int(entry["bytes"]) for entry in entries),
        "migrate_count": sum(1 for entry in entries if entry.get("disposition") == "migrate"),
        "delete_count": sum(1 for entry in entries if entry.get("disposition") == "delete"),
    }
    actual = {name: int(manifest.get(name, -1)) for name in expected}
    if actual != expected:
        raise ValueError(f"manifest summary mismatch: actual={actual}, expected={expected}")


def validate_exact_selection(entries: list[dict[str, Any]]) -> None:
    keys = [str(entry.get("object_key")) for entry in entries]
    if len(keys) != EXPECTED_COUNT or len(set(keys)) != EXPECTED_COUNT or set(keys) != EXPECTED_KEYS:
        raise ValueError("manifest does not contain the exact 25-key retirement allowlist")
    total_bytes = sum(int(entry["bytes"]) for entry in entries)
    if total_bytes != EXPECTED_BYTES:
        raise ValueError(f"retirement byte total changed: {total_bytes}")


def validate_ledger(ledger: dict[str, Any]) -> None:
    if ledger.get("batch_id") != BATCH_ID:
        raise ValueError("unexpected retirement batch id")
    entries = require_entry_list(ledger)
    validate_exact_selection(entries)
    totals = ledger.get("batch_totals")
    if not isinstance(totals, dict):
        raise ValueError("ledger batch_totals must be an object")
    expected_totals = {
        "entry_count": EXPECTED_COUNT,
        "bytes": EXPECTED_BYTES,
        "sidecar_count": EXPECTED_COUNT,
    }
    actual_totals = {name: int(totals.get(name, -1)) for name in expected_totals}
    if actual_totals != expected_totals:
        raise ValueError(f"ledger totals mismatch: actual={actual_totals}, expected={expected_totals}")


def sidecar_for_entry(entry: dict[str, Any]) -> Path:
    source = Path(str(entry["source"]))
    if source.suffix.lower() != ".png":
        raise ValueError(f"retirement source is not a PNG: {source}")
    sidecar = REPO_ROOT / source.with_suffix(".prompt.md")
    if not sidecar.is_file():
        raise ValueError(f"missing prompt sidecar: {sidecar}")
    resolved = sidecar.resolve()
    asset_root = (REPO_ROOT / "apps" / "web" / "app" / "assets" / "npc-style-cast").resolve()
    if asset_root not in resolved.parents:
        raise ValueError(f"sidecar escaped the npc-style-cast directory: {sidecar}")
    return resolved


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
        raise ValueError(f"env file is missing required S3/CDN settings: {', '.join(missing)}")
    if not env["FABLESPACE_S3_ENDPOINT_URL"].startswith("https://"):
        raise ValueError("S3 endpoint must use HTTPS")
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


def head_object(storage: S3GeneratedStorage, entry: dict[str, Any]) -> tuple[str, int | None]:
    last_error: BaseException | None = None
    for attempt in range(REMOTE_ATTEMPTS):
        request = signed_request(storage, "HEAD", entry)
        try:
            with urlopen(request, timeout=storage.timeout) as response:
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
    raise RuntimeError("remote HEAD request failed after bounded retries") from last_error


def delete_object(storage: S3GeneratedStorage, entry: dict[str, Any]) -> None:
    last_error: BaseException | None = None
    for attempt in range(REMOTE_ATTEMPTS):
        request = signed_request(storage, "DELETE", entry)
        try:
            with urlopen(request, timeout=storage.timeout) as response:
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
    raise RuntimeError("remote DELETE request failed after bounded retries") from last_error


def signed_request(storage: S3GeneratedStorage, method: str, entry: dict[str, Any]) -> Request:
    remote_key = "/".join((storage.prefix, "media", "v1", str(entry["object_key"])))
    endpoint = urlsplit(storage.endpoint_url)
    object_path = (
        f"{endpoint.path.rstrip('/')}/{quote(storage.bucket, safe='')}/"
        f"{quote(remote_key, safe='/-_.~')}"
    )
    url = urlunsplit((endpoint.scheme, endpoint.netloc, object_path, "", ""))
    headers = storage._signed_headers(method, url, b"", str(entry["content_type"]))
    return Request(url, headers=headers, method=method)


def require_entry_list(payload: dict[str, Any]) -> list[dict[str, Any]]:
    entries = payload.get("entries")
    if not isinstance(entries, list) or not all(isinstance(entry, dict) for entry in entries):
        raise ValueError("entries must be a list of objects")
    return entries


def read_json_object(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"expected a JSON object in {path}")
    return payload


def read_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        name = name.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]
        values[name] = value
    return values


def write_json_atomic(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def utc_now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


if __name__ == "__main__":
    raise SystemExit(main())
