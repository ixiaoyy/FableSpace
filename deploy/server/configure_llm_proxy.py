"""Render the root-owned Mihomo config used only by FableSpace LLM traffic."""

from __future__ import annotations

import argparse
import ipaddress
import json
import os
import sys
from pathlib import Path
from urllib.parse import urlsplit

DEFAULT_CONFIG_DIR = Path("/opt/fablespace-secrets/llm-proxy")
MAX_SUBSCRIPTION_URL_LENGTH = 4096


def validate_subscription_url(value: str) -> str:
    """Validate one administrator-supplied HTTPS subscription without resolving it."""

    normalized = value.strip()
    if not normalized or len(normalized) > MAX_SUBSCRIPTION_URL_LENGTH:
        raise ValueError("LLM proxy subscription URL is empty or too long")
    if any(ord(character) < 32 for character in normalized):
        raise ValueError("LLM proxy subscription URL contains control characters")
    try:
        parsed = urlsplit(normalized)
        hostname = parsed.hostname
        parsed.port
    except ValueError as exc:
        raise ValueError("LLM proxy subscription URL is malformed") from exc
    if (
        parsed.scheme != "https"
        or not hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.fragment
    ):
        raise ValueError("LLM proxy subscription must be an HTTPS URL without credentials or fragment")
    hostname = hostname.lower()
    if hostname == "localhost" or hostname.endswith(".localhost"):
        raise ValueError("LLM proxy subscription host must not be local")
    try:
        address = ipaddress.ip_address(hostname)
    except ValueError:
        return normalized
    if not address.is_global:
        raise ValueError("LLM proxy subscription IP must be globally routable")
    return normalized


def render_mihomo_config(subscription_url: str) -> str:
    """Render the fixed provider, health-check, and LLM-only proxy policy."""

    quoted_url = json.dumps(subscription_url, ensure_ascii=True)
    return f"""mixed-port: 7890
allow-lan: true
bind-address: \"*\"
mode: rule
log-level: warning
ipv6: false
unified-delay: true
tcp-concurrent: true
global-ua: clash.meta

proxy-providers:
  fablespace-subscription:
    type: http
    url: {quoted_url}
    path: ./providers/fablespace-subscription.yaml
    interval: 3600
    proxy: DIRECT
    header:
      User-Agent:
        - clash.meta
    health-check:
      enable: true
      url: https://www.gstatic.com/generate_204
      interval: 600
      timeout: 5000
      lazy: false
      expected-status: 204

proxy-groups:
  - name: FableSpace-LLM
    type: url-test
    use:
      - fablespace-subscription
    url: https://www.gstatic.com/generate_204
    interval: 600
    timeout: 5000
    lazy: false
    expected-status: 204

rules:
  - MATCH,FableSpace-LLM
"""


def write_config_if_changed(config_dir: Path, rendered: str) -> bool:
    """Atomically install the proxy config with root-only host permissions."""

    config_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
    config_dir.chmod(0o700)
    config_path = config_dir / "config.yaml"
    current = config_path.read_text(encoding="utf-8") if config_path.exists() else None
    if current == rendered:
        config_path.chmod(0o600)
        return False
    temporary_path = config_dir / f".config.yaml.tmp-{os.getpid()}"
    temporary_path.write_text(rendered, encoding="utf-8")
    temporary_path.chmod(0o600)
    temporary_path.replace(config_path)
    config_path.chmod(0o600)
    return True


def main() -> None:
    """Read the protected subscription from standard input and reconcile config."""

    parser = argparse.ArgumentParser()
    parser.add_argument("--config-dir", type=Path, default=DEFAULT_CONFIG_DIR)
    parser.add_argument("--subscription-url-stdin", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if not args.subscription_url_stdin:
        raise SystemExit("LLM proxy subscription must be supplied through standard input")
    try:
        subscription_url = validate_subscription_url(sys.stdin.read())
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc
    rendered = render_mihomo_config(subscription_url)
    if args.dry_run:
        print("llm_proxy_config=validated")
        return
    changed = write_config_if_changed(args.config_dir, rendered)
    print(f"llm_proxy_config={'written' if changed else 'existing'}")


if __name__ == "__main__":
    main()
