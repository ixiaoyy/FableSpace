"""Create or reconcile the ignored production environment for Mirror Island services."""

from __future__ import annotations

import argparse
import os
import re
import secrets
import tempfile
from pathlib import Path
from urllib.parse import urlsplit


DATABASE_NAME = "mirror_island_keycloak"
DATABASE_USER = "mirror_keycloak"


def parse_env(text: str) -> dict[str, str]:
    """Parse simple KEY=VALUE lines while ignoring comments and malformed records."""
    values: dict[str, str] = {}
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if re.fullmatch(r"[A-Z][A-Z0-9_]*", key):
            values[key] = value
    return values


def new_secret() -> str:
    """Generate one URL-safe production secret with at least 256 bits of entropy."""
    return secrets.token_urlsafe(48)


def existing_shared_secret(existing: dict[str, str], keys: tuple[str, ...], label: str) -> str:
    """Return one consistent existing secret across alias keys or fail before rewriting the file."""
    values = {existing[key] for key in keys if existing.get(key)}
    if len(values) > 1:
        raise ValueError(f"Existing {label} values do not match")
    value = next(iter(values), "")
    if value and len(value) < 32:
        raise ValueError(f"Existing {label} is shorter than 32 characters")
    return value


def managed_values(existing: dict[str, str], public_origin: str) -> tuple[dict[str, str], int]:
    """Return the complete managed environment while preserving existing valid secrets."""
    generated = 0
    database_password = existing_shared_secret(
        existing,
        ("POSTGRES_PASSWORD", "KC_DB_PASSWORD"),
        "Mirror Island database password",
    )
    if not database_password:
        database_password = new_secret()
        generated += 1
    admin_password = existing_shared_secret(
        existing,
        ("KC_BOOTSTRAP_ADMIN_PASSWORD", "MIRROR_ISLAND_KEYCLOAK_ADMIN_PASSWORD"),
        "Mirror Island Keycloak administrator password",
    )
    if not admin_password:
        admin_password = new_secret()
        generated += 1

    identity_path = "/identity"
    issuer = f"{public_origin}{identity_path}/realms/mirror-island"
    return {
        "POSTGRES_DB": DATABASE_NAME,
        "POSTGRES_USER": DATABASE_USER,
        "POSTGRES_PASSWORD": database_password,
        "KC_DB": "postgres",
        "KC_DB_URL_HOST": "mirror-identity-db",
        "KC_DB_URL_PORT": "5432",
        "KC_DB_URL_DATABASE": DATABASE_NAME,
        "KC_DB_USERNAME": DATABASE_USER,
        "KC_DB_PASSWORD": database_password,
        "KC_BOOTSTRAP_ADMIN_USERNAME": "mirror-admin",
        "KC_BOOTSTRAP_ADMIN_PASSWORD": admin_password,
        "KC_HOSTNAME": f"{public_origin}{identity_path}",
        "KC_HTTP_ENABLED": "true",
        "KC_HTTP_RELATIVE_PATH": identity_path,
        "KC_PROXY_HEADERS": "xforwarded",
        "KC_HEALTH_ENABLED": "true",
        "KEYCLOAK_ISSUER": issuer,
        "KEYCLOAK_AUDIENCE": "mirror-island-game",
        "KEYCLOAK_JWKS_URI": "http://keycloak:8080/identity/realms/mirror-island/protocol/openid-connect/certs",
        "KEYCLOAK_ALLOW_HTTP_JWKS": "true",
        "MIRROR_ISLAND_KEYCLOAK_ADMIN": "mirror-admin",
        "MIRROR_ISLAND_KEYCLOAK_ADMIN_PASSWORD": admin_password,
        "MIRROR_ISLAND_KEYCLOAK_ADMIN_URL": "http://keycloak:8080/identity",
        "PORT": "3001",
    }, generated


def render_env(values: dict[str, str]) -> str:
    """Render managed variables deterministically without quoting or exposing them to stdout."""
    return "# Managed by deploy/server/configure_mirror_island.py\n" + "".join(
        f"{key}={value}\n" for key, value in values.items()
    )


def write_private_env(path: Path, text: str) -> None:
    """Atomically replace the exact environment file with owner-only permissions."""
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary, 0o600)
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def main() -> None:
    """Reconcile the production identity environment without connecting to any service or database."""
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--env-file",
        type=Path,
        default=Path("apps/mirror-island/.env.production"),
    )
    parser.add_argument(
        "--public-origin",
        default="https://fable.pingxingxian.space",
    )
    args = parser.parse_args()
    parsed_origin = urlsplit(args.public_origin)
    if (
        parsed_origin.scheme != "https"
        or not parsed_origin.netloc
        or parsed_origin.username is not None
        or parsed_origin.password is not None
        or parsed_origin.path not in {"", "/"}
        or parsed_origin.query
        or parsed_origin.fragment
    ):
        raise SystemExit("Mirror Island public origin must use HTTPS")
    origin = f"https://{parsed_origin.netloc}"

    existing = parse_env(args.env_file.read_text(encoding="utf-8")) if args.env_file.exists() else {}
    values, generated = managed_values(existing, origin)
    write_private_env(args.env_file, render_env(values))
    print(f"mirror_island_env=ready generated_secrets={generated}")


if __name__ == "__main__":
    main()
