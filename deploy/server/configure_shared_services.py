"""Prepare both services for FableSpace on ParallelLines shared infrastructure.

The script maps shared storage settings and reconciles the private SSO settings
in both server-side env files. It never prints credentials or generated secrets.
"""

from __future__ import annotations

import argparse
import secrets
import shutil
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

LEGACY_DATABASE_ENV_KEYS = {
    "FABLEMAP_DATABASE_URL",
    "FABLESPACE_MYSQL_URL",
    "FABLEMAP_MYSQL_URL",
}

MIN_SECRET_LENGTH = 32


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


def shared_sso_secret(
    parallellines: dict[str, str],
    fablespace: dict[str, str],
) -> tuple[str, str]:
    """Reuse one valid cross-service secret or generate it when both sides are unconfigured.

    The return value contains the secret and a non-sensitive source label. A conflicting
    pair of valid secrets is rejected instead of silently rotating either running service.
    """

    parallellines_secret = parallellines.get("FABLESPACE_SSO_SERVICE_SECRET", "").strip()
    fablespace_secret = fablespace.get(
        "FABLESPACE_PARALLELLINES_SSO_SERVICE_SECRET",
        "",
    ).strip()
    parallellines_valid = len(parallellines_secret) >= MIN_SECRET_LENGTH
    fablespace_valid = len(fablespace_secret) >= MIN_SECRET_LENGTH
    if parallellines_valid and fablespace_valid and parallellines_secret != fablespace_secret:
        raise ValueError("ParallelLines and FableSpace contain different valid SSO secrets")
    if parallellines_valid:
        return parallellines_secret, "existing"
    if fablespace_valid:
        return fablespace_secret, "existing"
    return secrets.token_urlsafe(48), "generated"


def session_secret(fablespace: dict[str, str]) -> tuple[str, str]:
    """Preserve a valid FableSpace session secret or create a new independent value."""

    existing = fablespace.get("FABLESPACE_SESSION_SECRET", "").strip()
    if len(existing) >= MIN_SECRET_LENGTH:
        return existing, "existing"
    return secrets.token_urlsafe(48), "generated"


def validate_http_url(value: str, label: str, *, allow_path: bool) -> str:
    """Normalize and validate one HTTP(S) deployment URL without making a request."""

    normalized = value.rstrip("/")
    parsed = urlsplit(normalized)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError(f"{label} must be an HTTP(S) URL")
    if not allow_path and parsed.path:
        raise ValueError(f"{label} must not include a path")
    return normalized


def write_env_if_changed(path: Path, text: str, timestamp: str) -> tuple[bool, Path | None]:
    """Back up and atomically replace one env file only when its rendered content changed."""

    current = path.read_text(encoding="utf-8") if path.exists() else None
    if current == text:
        path.chmod(0o600)
        return False, None

    backup_path: Path | None = None
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        backup_path = path.with_name(f"{path.name}.pre-shared-{timestamp}")
        shutil.copy2(path, backup_path)
    temporary_path = path.with_name(f".{path.name}.tmp-{timestamp}")
    temporary_path.write_text(text, encoding="utf-8")
    temporary_path.chmod(0o600)
    temporary_path.replace(path)
    path.chmod(0o600)
    return True, backup_path


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
    """Validate shared settings, back up changed env files, and apply mapped values."""
    parser = argparse.ArgumentParser(description="Configure FableSpace to reuse ParallelLines infrastructure")
    parser.add_argument("--parallellines-env", type=Path, default=Path("/opt/parallellines/apps/api/.env"))
    parser.add_argument("--fablespace-env", type=Path, default=Path("/opt/fablespace/apps/api/.env"))
    parser.add_argument("--compose-env", type=Path, default=Path("/opt/fablespace/.env"))
    parser.add_argument("--database-name", default="fablespace")
    parser.add_argument("--redis-db", type=int, default=1)
    parser.add_argument("--prefix", default="fablespace")
    parser.add_argument("--generated-storage", choices=("local", "s3"), default="local")
    parser.add_argument("--auth-mode", choices=("parallellines", "legacy"), default="parallellines")
    parser.add_argument("--cors-origin", default="https://fable.pingxingxian.space")
    parser.add_argument("--fablespace-public-url", default="https://fable.pingxingxian.space")
    parser.add_argument("--parallellines-public-url", default="https://pingxingxian.space")
    parser.add_argument(
        "--parallellines-api-url",
        default="http://api:8000/api/v1",
        help="ParallelLines API URL reachable from the FableSpace backend container",
    )
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
    if args.auth_mode == "parallellines" and args.generated_storage != "local":
        raise SystemExit("ParallelLines authentication requires local generated storage")
    try:
        cors_origin = validate_http_url(args.cors_origin, "cors origin", allow_path=False)
        fablespace_public_url = validate_http_url(
            args.fablespace_public_url,
            "FableSpace public URL",
            allow_path=False,
        )
        parallellines_public_url = validate_http_url(
            args.parallellines_public_url,
            "ParallelLines public URL",
            allow_path=False,
        )
        parallellines_api_url = validate_http_url(
            args.parallellines_api_url,
            "ParallelLines API URL",
            allow_path=True,
        )
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc

    shared_values = parse_env(args.parallellines_env)
    parallellines_original = args.parallellines_env.read_text(encoding="utf-8")
    fablespace_original = (
        args.fablespace_env.read_text(encoding="utf-8") if args.fablespace_env.exists() else ""
    )
    fablespace_values = parse_env(args.fablespace_env) if args.fablespace_env.exists() else {}
    updates = build_updates(
        shared_values,
        args.database_name,
        args.redis_db,
        args.prefix,
        args.generated_storage,
    )
    updates["FABLESPACE_CORS_ORIGINS"] = cors_origin
    parallellines_updates: dict[str, str] = {}
    sso_secret_source = "not-managed"
    cookie_secret_source = "not-managed"
    if args.auth_mode == "parallellines":
        try:
            sso_secret, sso_secret_source = shared_sso_secret(shared_values, fablespace_values)
            cookie_secret, cookie_secret_source = session_secret(fablespace_values)
        except ValueError as exc:
            raise SystemExit(str(exc)) from exc

        parallellines_updates = {
            "FABLESPACE_BASE_URL": fablespace_public_url,
            "FABLESPACE_SSO_SERVICE_SECRET": sso_secret,
            "FABLESPACE_SSO_TICKET_TTL_SECONDS": "60",
        }
        updates.update(
            {
                "FABLESPACE_AUTH_MODE": "parallellines",
                "FABLESPACE_GENERATED_STORAGE_BACKEND": "local",
                "FABLESPACE_PARALLELLINES_API_BASE_URL": parallellines_api_url,
                "FABLESPACE_PARALLELLINES_PUBLIC_BASE_URL": parallellines_public_url,
                "FABLESPACE_PARALLELLINES_SSO_SERVICE_SECRET": sso_secret,
                "FABLESPACE_SESSION_SECRET": cookie_secret,
                "FABLESPACE_SESSION_COOKIE_SECURE": "true",
                "FABLESPACE_SESSION_TTL_SECONDS": "3600",
                "FABLESPACE_AUTH_INTROSPECTION_CACHE_TTL_SECONDS": "30",
                "FABLESPACE_AUTH_INTROSPECTION_TIMEOUT_SECONDS": "5",
            }
        )
    else:
        updates["FABLESPACE_AUTH_MODE"] = "legacy"
    compose_original = args.compose_env.read_text(encoding="utf-8") if args.compose_env.exists() else ""
    compose_updates = {
        "FABLESPACE_API_BIND": "127.0.0.1:8950",
        "FABLESPACE_SHARED_NETWORK": "parallellines_default",
    }
    if args.dry_run:
        print(
            f"validated database={args.database_name} redis_db={args.redis_db} "
            f"generated_storage={args.generated_storage} prefix={args.prefix.strip('/')} "
            f"cors_origin={cors_origin} fablespace_keys={len(updates)} "
            f"parallellines_keys={len(parallellines_updates)} "
            f"sso_secret={sso_secret_source} session_secret={cookie_secret_source}"
        )
        return

    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    if parallellines_updates:
        parallellines_changed, parallellines_backup = write_env_if_changed(
            args.parallellines_env,
            update_env_text(parallellines_original, parallellines_updates),
            timestamp,
        )
    else:
        parallellines_changed, parallellines_backup = False, None
    fablespace_changed, fablespace_backup = write_env_if_changed(
        args.fablespace_env,
        update_env_text(fablespace_original, updates, remove_keys=LEGACY_DATABASE_ENV_KEYS),
        timestamp,
    )
    compose_changed, _ = write_env_if_changed(
        args.compose_env,
        update_env_text(compose_original, compose_updates),
        timestamp,
    )
    print(
        f"configured database={args.database_name} redis_db={args.redis_db} "
        f"generated_storage={args.generated_storage} prefix={args.prefix.strip('/')} "
        f"cors_origin={cors_origin} "
        f"parallellines_changed={str(parallellines_changed).lower()} "
        f"fablespace_changed={str(fablespace_changed).lower()} "
        f"compose_changed={str(compose_changed).lower()} "
        f"parallellines_backup={parallellines_backup or 'none'} "
        f"fablespace_backup={fablespace_backup or 'none'} "
        f"compose_env={args.compose_env}"
    )


if __name__ == "__main__":
    main()
