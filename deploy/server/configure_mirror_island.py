"""Create or reconcile the ignored production environment for Mirror Island services."""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import secrets
import shutil
import tempfile
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import quote, urlsplit


IDENTITY_DATABASE_NAME = "mirror_island_keycloak"
IDENTITY_DATABASE_USER = "mirror_keycloak"
GAME_DATABASE_NAME = "mirror_island_game"
GAME_DATABASE_USER = "mirror_game"
P256_PRIME = 0xFFFFFFFF00000001000000000000000000000000FFFFFFFFFFFFFFFFFFFFFFFF
P256_A = P256_PRIME - 3
P256_ORDER = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551
P256_G = (
    0x6B17D1F2E12C4247F8BCE6E563A440F277037D812DEB33A0F4A13945D898C296,
    0x4FE342E2FE1A7F9B8EE7EB4A7C0F9E162BCE33576B315ECECBB6406837BF51F5,
)


def parse_env(text: str) -> dict[str, str]:
    """Parse simple KEY=VALUE lines while ignoring comments and malformed records."""
    values: dict[str, str] = {}
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if re.fullmatch(r"[A-Z][A-Z0-9_]*", key):
            values[key] = value.strip().strip('"').strip("'")
    return values


def new_secret() -> str:
    """Generate one URL-safe production secret with at least 256 bits of entropy."""
    return secrets.token_urlsafe(48)


def _p256_add(
    left: tuple[int, int] | None,
    right: tuple[int, int] | None,
) -> tuple[int, int] | None:
    """Add two P-256 curve points for one-time signing-key generation."""
    if left is None:
        return right
    if right is None:
        return left
    x1, y1 = left
    x2, y2 = right
    if x1 == x2 and (y1 + y2) % P256_PRIME == 0:
        return None
    if left == right:
        slope = ((3 * x1 * x1 + P256_A) * pow(2 * y1, -1, P256_PRIME)) % P256_PRIME
    else:
        slope = ((y2 - y1) * pow(x2 - x1, -1, P256_PRIME)) % P256_PRIME
    x3 = (slope * slope - x1 - x2) % P256_PRIME
    y3 = (slope * (x1 - x3) - y1) % P256_PRIME
    return x3, y3


def _p256_multiply(scalar: int) -> tuple[int, int]:
    """Multiply the standard P-256 generator by one validated private scalar."""
    result: tuple[int, int] | None = None
    addend: tuple[int, int] | None = P256_G
    remaining = scalar
    while remaining:
        if remaining & 1:
            result = _p256_add(result, addend)
        addend = _p256_add(addend, addend)
        remaining >>= 1
    if result is None:
        raise ValueError("Generated P-256 point is invalid")
    return result


def _jwk_coordinate(value: int) -> str:
    """Encode one fixed-width P-256 coordinate using unpadded base64url."""
    return base64.urlsafe_b64encode(value.to_bytes(32, "big")).rstrip(b"=").decode("ascii")


def new_forum_signing_jwk() -> str:
    """Generate one stable ES256 private JWK and return its compact base64url JSON encoding."""
    private_scalar = secrets.randbelow(P256_ORDER - 1) + 1
    public_x, public_y = _p256_multiply(private_scalar)
    jwk = {
        "alg": "ES256",
        "crv": "P-256",
        "d": _jwk_coordinate(private_scalar),
        "kid": "parallellines-es256",
        "kty": "EC",
        "use": "sig",
        "x": _jwk_coordinate(public_x),
        "y": _jwk_coordinate(public_y),
    }
    encoded = json.dumps(jwk, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return base64.urlsafe_b64encode(encoded).rstrip(b"=").decode("ascii")


def validate_forum_signing_jwk(value: str) -> str:
    """Validate the persisted compact ES256 JWK before preserving it across deployments."""
    try:
        padding = "=" * (-len(value) % 4)
        payload = json.loads(base64.urlsafe_b64decode(value + padding).decode("utf-8"))
    except (ValueError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError("Existing Mirror Island forum signing JWK is invalid") from exc
    required = {"kty": "EC", "crv": "P-256", "alg": "ES256", "use": "sig"}
    if any(payload.get(key) != expected for key, expected in required.items()):
        raise ValueError("Existing Mirror Island forum signing JWK has the wrong algorithm")
    if any(not isinstance(payload.get(key), str) or len(payload[key]) < 40 for key in ("x", "y", "d")):
        raise ValueError("Existing Mirror Island forum signing JWK is incomplete")
    return value


def existing_shared_secret(existing: dict[str, str], keys: tuple[str, ...], label: str) -> str:
    """Return one consistent existing secret across alias keys or fail before rewriting the file."""
    values = {existing[key] for key in keys if existing.get(key)}
    if len(values) > 1:
        raise ValueError(f"Existing {label} values do not match")
    value = next(iter(values), "")
    if value and len(value) < 32:
        raise ValueError(f"Existing {label} is shorter than 32 characters")
    return value


def managed_values(
    existing: dict[str, str],
    public_origin: str,
    forum_service_secret: str = "",
    forum_public_origin: str = "https://pingxingxian.space",
    forum_api_base_url: str = "http://api:8000/api/v1",
) -> tuple[dict[str, str], int]:
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
    game_database_password = existing_shared_secret(
        existing,
        ("MIRROR_GAME_POSTGRES_PASSWORD",),
        "Mirror Island game database password",
    )
    if not game_database_password:
        game_database_password = new_secret()
        generated += 1
    mirror_forum_secret = existing_shared_secret(
        existing,
        ("PARALLELLINES_SSO_SERVICE_SECRET",),
        "ParallelLines SSO service secret",
    )
    if mirror_forum_secret and forum_service_secret and mirror_forum_secret != forum_service_secret:
        raise ValueError("Mirror Island and ParallelLines contain different SSO service secrets")
    forum_secret = mirror_forum_secret or forum_service_secret
    if not forum_secret:
        forum_secret = new_secret()
        generated += 1
    oidc_client_secret = existing_shared_secret(
        existing,
        ("MIRROR_ISLAND_FORUM_OIDC_CLIENT_SECRET",),
        "Mirror Island forum OIDC client secret",
    )
    if not oidc_client_secret:
        oidc_client_secret = new_secret()
        generated += 1
    forum_entry_client_secret = existing_shared_secret(
        existing,
        ("MIRROR_ISLAND_FORUM_ENTRY_CLIENT_SECRET",),
        "Mirror Island forum entry client secret",
    )
    if not forum_entry_client_secret:
        forum_entry_client_secret = new_secret()
        generated += 1
    oidc_cookie_keys = existing.get("MIRROR_ISLAND_FORUM_OIDC_COOKIE_KEYS", "").split(",")
    if any(oidc_cookie_keys) and (
        len(oidc_cookie_keys) != 2 or any(len(key.strip()) < 32 for key in oidc_cookie_keys)
    ):
        raise ValueError("Existing Mirror Island OIDC cookie keys are invalid")
    if not any(oidc_cookie_keys):
        oidc_cookie_keys = [new_secret(), new_secret()]
        generated += 2
    signing_jwk = existing.get("MIRROR_ISLAND_FORUM_OIDC_SIGNING_JWK_B64", "").strip()
    if not signing_jwk:
        signing_jwk = new_forum_signing_jwk()
        generated += 1
    else:
        signing_jwk = validate_forum_signing_jwk(signing_jwk)

    identity_path = "/identity"
    issuer = f"{public_origin}{identity_path}/realms/mirror-island"
    return {
        "POSTGRES_DB": IDENTITY_DATABASE_NAME,
        "POSTGRES_USER": IDENTITY_DATABASE_USER,
        "POSTGRES_PASSWORD": database_password,
        "KC_DB": "postgres",
        "KC_DB_URL_HOST": "mirror-identity-db",
        "KC_DB_URL_PORT": "5432",
        "KC_DB_URL_DATABASE": IDENTITY_DATABASE_NAME,
        "KC_DB_USERNAME": IDENTITY_DATABASE_USER,
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
        "MIRROR_GAME_POSTGRES_DB": GAME_DATABASE_NAME,
        "MIRROR_GAME_POSTGRES_USER": GAME_DATABASE_USER,
        "MIRROR_GAME_POSTGRES_PASSWORD": game_database_password,
        "MIRROR_ISLAND_DATABASE_URL": (
            f"postgresql://{GAME_DATABASE_USER}:{quote(game_database_password, safe='')}"
            f"@mirror-game-db:5432/{GAME_DATABASE_NAME}"
        ),
        "MIRROR_ISLAND_PUBLIC_ORIGIN": public_origin,
        "PARALLELLINES_PUBLIC_BASE_URL": forum_public_origin,
        "PARALLELLINES_API_BASE_URL": forum_api_base_url,
        "PARALLELLINES_SSO_SERVICE_SECRET": forum_secret,
        "MIRROR_ISLAND_FORUM_OIDC_CLIENT_ID": "mirror-island-forum-bridge",
        "MIRROR_ISLAND_FORUM_OIDC_CLIENT_SECRET": oidc_client_secret,
        "MIRROR_ISLAND_FORUM_OIDC_COOKIE_KEYS": ",".join(oidc_cookie_keys),
        "MIRROR_ISLAND_FORUM_OIDC_SIGNING_JWK_B64": signing_jwk,
        "MIRROR_ISLAND_FORUM_ENTRY_CLIENT_ID": "mirror-island-forum-entry",
        "MIRROR_ISLAND_FORUM_ENTRY_CLIENT_SECRET": forum_entry_client_secret,
        "MIRROR_ISLAND_KEYCLOAK_INTERNAL_URL": (
            "http://keycloak:8080/identity/realms/mirror-island/protocol/openid-connect/token"
        ),
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


def update_env_text(original: str, updates: dict[str, str]) -> str:
    """Update exact environment keys while preserving unrelated ParallelLines configuration."""
    remaining = dict(updates)
    output: list[str] = []
    for line in original.splitlines():
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and "=" in stripped:
            key = stripped.split("=", 1)[0].strip()
            if key in remaining:
                output.append(f"{key}={remaining.pop(key)}")
                continue
        output.append(line)
    if remaining:
        if output and output[-1]:
            output.append("")
        output.append("# Mirror Island forum SSO (managed by configure_mirror_island.py)")
        output.extend(f"{key}={value}" for key, value in remaining.items())
    return "\n".join(output).rstrip() + "\n"


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
    parser.add_argument(
        "--parallellines-env",
        type=Path,
        default=Path("/opt/parallellines/apps/api/.env"),
    )
    parser.add_argument(
        "--parallellines-public-origin",
        default="https://pingxingxian.space",
    )
    parser.add_argument(
        "--parallellines-api-base-url",
        default="http://api:8000/api/v1",
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

    parsed_forum_origin = urlsplit(args.parallellines_public_origin)
    if (
        parsed_forum_origin.scheme != "https"
        or not parsed_forum_origin.netloc
        or parsed_forum_origin.username is not None
        or parsed_forum_origin.password is not None
        or parsed_forum_origin.path not in {"", "/"}
        or parsed_forum_origin.query
        or parsed_forum_origin.fragment
    ):
        raise SystemExit("ParallelLines public origin must use HTTPS")
    forum_origin = f"https://{parsed_forum_origin.netloc}"
    parsed_forum_api = urlsplit(args.parallellines_api_base_url)
    if (
        parsed_forum_api.scheme != "http"
        or not parsed_forum_api.hostname
        or "." in parsed_forum_api.hostname
        or parsed_forum_api.username is not None
        or parsed_forum_api.password is not None
    ):
        raise SystemExit("ParallelLines API must use an internal HTTP service name")
    if not args.parallellines_env.is_file():
        raise SystemExit("ParallelLines environment file is missing")

    existing = parse_env(args.env_file.read_text(encoding="utf-8")) if args.env_file.exists() else {}
    forum_original = args.parallellines_env.read_text(encoding="utf-8")
    forum_existing = parse_env(forum_original)
    try:
        values, generated = managed_values(
            existing,
            origin,
            forum_existing.get("FABLESPACE_SSO_SERVICE_SECRET", ""),
            forum_origin,
            args.parallellines_api_base_url.rstrip("/"),
        )
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc
    forum_updates = {
        "FABLESPACE_BASE_URL": origin,
        "FABLESPACE_SSO_SERVICE_SECRET": values["PARALLELLINES_SSO_SERVICE_SECRET"],
        "FABLESPACE_SSO_TICKET_TTL_SECONDS": "60",
    }
    forum_rendered = update_env_text(forum_original, forum_updates)
    if forum_rendered != forum_original:
        timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
        backup = args.parallellines_env.with_name(f"{args.parallellines_env.name}.pre-mirror-island-{timestamp}")
        shutil.copy2(args.parallellines_env, backup)
        write_private_env(args.parallellines_env, forum_rendered)
        forum_changed = True
    else:
        forum_changed = False
    write_private_env(args.env_file, render_env(values))
    print(
        f"mirror_island_env=ready generated_secrets={generated} "
        f"parallellines_changed={str(forum_changed).lower()}"
    )


if __name__ == "__main__":
    main()
