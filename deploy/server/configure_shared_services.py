"""Prepare FableSpace env values for ParallelLines shared infrastructure.

The script only reads the ParallelLines env file and writes FableSpace's env
file. It never prints database passwords or object-storage credentials.
"""

from __future__ import annotations

import argparse
import shutil
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

LEGACY_DATABASE_ENV_KEYS = {
    "FABLEMAP_DATABASE_URL",
    "FABLESPACE_MYSQL_URL",
    "FABLEMAP_MYSQL_URL",
}


def parse_env(path: Path) -> dict[str, str]:
    """Parse simple KEY=VALUE entries from one trusted server-side env file."""
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def database_url_for(source_url: str, database_name: str) -> str:
    """Reuse one MySQL server and credential pair with a new database name."""
    parsed = urlsplit(source_url)
    if not parsed.scheme.startswith("mysql+") or not parsed.netloc:
        raise ValueError("ParallelLines DATABASE_URL is not a supported MySQL URL")
    return urlunsplit(("mysql+pymysql", parsed.netloc, f"/{database_name}", parsed.query, ""))


def redis_url_for(source_url: str, database_number: int) -> str:
    """Reuse one Redis endpoint while selecting a separate logical database."""
    parsed = urlsplit(source_url)
    if parsed.scheme not in {"redis", "rediss"} or not parsed.netloc:
        raise ValueError("ParallelLines REDIS_URL is not a supported Redis URL")
    return urlunsplit((parsed.scheme, parsed.netloc, f"/{database_number}", parsed.query, ""))


def update_env_text(
    original: str,
    updates: dict[str, str],
    *,
    remove_keys: set[str] | None = None,
) -> str:
    """Apply env updates and remove explicitly obsolete keys while preserving unrelated lines."""
    remaining = dict(updates)
    removals = remove_keys or set()
    output: list[str] = []
    for line in original.splitlines():
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and "=" in stripped:
            key = stripped.split("=", 1)[0].strip()
            if key in removals:
                continue
            if key in remaining:
                output.append(f"{key}={remaining.pop(key)}")
                continue
        output.append(line)
    if remaining:
        if output and output[-1]:
            output.append("")
        output.append("# Shared ParallelLines infrastructure (managed by deploy/server/configure_shared_services.py)")
        output.extend(f"{key}={value}" for key, value in remaining.items())
    return "\n".join(output).rstrip() + "\n"


def build_updates(
    parallellines: dict[str, str],
    database_name: str,
    redis_db: int,
    prefix: str,
    generated_storage: str = "local",
) -> dict[str, str]:
    """Map shared services while keeping generated files private unless S3 is explicit."""
    required = [
        "DATABASE_URL",
        "REDIS_URL",
    ]
    missing = [key for key in required if not parallellines.get(key)]
    if missing:
        raise ValueError(f"ParallelLines env is missing: {', '.join(missing)}")
    updates = {
        "FABLESPACE_STORAGE_BACKEND": "database",
        "FABLESPACE_DATABASE_URL": database_url_for(parallellines["DATABASE_URL"], database_name),
        "FABLESPACE_REDIS_URL": redis_url_for(parallellines["REDIS_URL"], redis_db),
        "FABLESPACE_GENERATED_STORAGE_BACKEND": generated_storage,
    }
    if generated_storage != "s3":
        return updates

    s3_keys = [
        "UPLOAD_S3_BUCKET",
        "UPLOAD_S3_ENDPOINT_URL",
        "UPLOAD_S3_ACCESS_KEY_ID",
        "UPLOAD_S3_SECRET_ACCESS_KEY",
        "UPLOAD_CDN_BASE_URL",
    ]
    missing_s3 = [key for key in s3_keys if not parallellines.get(key)]
    if missing_s3:
        raise ValueError(f"ParallelLines env is missing: {', '.join(missing_s3)}")
    updates.update(
        {
            "FABLESPACE_S3_BUCKET": parallellines["UPLOAD_S3_BUCKET"],
            "FABLESPACE_S3_REGION": parallellines.get("UPLOAD_S3_REGION", "auto") or "auto",
            "FABLESPACE_S3_ENDPOINT_URL": parallellines["UPLOAD_S3_ENDPOINT_URL"],
            "FABLESPACE_S3_ACCESS_KEY_ID": parallellines["UPLOAD_S3_ACCESS_KEY_ID"],
            "FABLESPACE_S3_SECRET_ACCESS_KEY": parallellines["UPLOAD_S3_SECRET_ACCESS_KEY"],
            "FABLESPACE_S3_PREFIX": prefix.strip("/"),
            "FABLESPACE_CDN_BASE_URL": parallellines["UPLOAD_CDN_BASE_URL"],
        }
    )
    return updates


def main() -> None:
    """Validate shared settings, back up the FableSpace env, and apply mapped values."""
    parser = argparse.ArgumentParser(description="Configure FableSpace to reuse ParallelLines infrastructure")
    parser.add_argument("--parallellines-env", type=Path, default=Path("/opt/parallellines/apps/api/.env"))
    parser.add_argument("--fablespace-env", type=Path, default=Path("/opt/fablespace/apps/api/.env"))
    parser.add_argument("--compose-env", type=Path, default=Path("/opt/fablespace/.env"))
    parser.add_argument("--database-name", default="fablespace")
    parser.add_argument("--redis-db", type=int, default=1)
    parser.add_argument("--prefix", default="fablespace")
    parser.add_argument("--generated-storage", choices=("local", "s3"), default="local")
    parser.add_argument("--cors-origin", default="https://fable.pingxingxian.space")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not args.database_name.replace("_", "").isalnum():
        raise SystemExit("database name must contain only letters, digits, and underscores")
    if args.redis_db < 0:
        raise SystemExit("redis db must be non-negative")
    if args.generated_storage == "s3" and (
        not args.prefix.strip("/") or ".." in args.prefix
    ):
        raise SystemExit("prefix must be a non-empty object-key directory")
    cors_origin = args.cors_origin.rstrip("/")
    parsed_origin = urlsplit(cors_origin)
    if parsed_origin.scheme not in {"http", "https"} or not parsed_origin.netloc or parsed_origin.path:
        raise SystemExit("cors origin must be an HTTP(S) origin without a path")

    shared_values = parse_env(args.parallellines_env)
    original = args.fablespace_env.read_text(encoding="utf-8") if args.fablespace_env.exists() else ""
    updates = build_updates(
        shared_values,
        args.database_name,
        args.redis_db,
        args.prefix,
        args.generated_storage,
    )
    updates["FABLESPACE_CORS_ORIGINS"] = cors_origin
    compose_original = args.compose_env.read_text(encoding="utf-8") if args.compose_env.exists() else ""
    compose_updates = {
        "FABLESPACE_API_BIND": "127.0.0.1:8950",
        "FABLESPACE_SHARED_NETWORK": "parallellines_default",
    }
    if args.dry_run:
        print(
            f"validated database={args.database_name} redis_db={args.redis_db} "
            f"generated_storage={args.generated_storage} prefix={args.prefix.strip('/')} "
            f"cors_origin={cors_origin} mapped_keys={len(updates)}"
        )
        return

    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    backup_path = args.fablespace_env.with_name(f"{args.fablespace_env.name}.pre-shared-{timestamp}")
    args.fablespace_env.parent.mkdir(parents=True, exist_ok=True)
    if args.fablespace_env.exists():
        shutil.copy2(args.fablespace_env, backup_path)
    args.fablespace_env.write_text(
        update_env_text(original, updates, remove_keys=LEGACY_DATABASE_ENV_KEYS),
        encoding="utf-8",
    )
    args.fablespace_env.chmod(0o600)
    args.compose_env.parent.mkdir(parents=True, exist_ok=True)
    args.compose_env.write_text(update_env_text(compose_original, compose_updates), encoding="utf-8")
    args.compose_env.chmod(0o600)
    print(
        f"configured database={args.database_name} redis_db={args.redis_db} "
        f"generated_storage={args.generated_storage} prefix={args.prefix.strip('/')} "
        f"cors_origin={cors_origin} "
        f"api_backup={backup_path if backup_path.exists() else 'none'} "
        f"compose_env={args.compose_env}"
    )


if __name__ == "__main__":
    main()
