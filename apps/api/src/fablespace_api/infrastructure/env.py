from __future__ import annotations

import os
from pathlib import Path


API_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_ENV_FILE = API_ROOT / ".env"


def parse_env_file(path: Path) -> dict[str, str]:
    """Parse a minimal dotenv file without adding a runtime dependency."""

    if not path.exists():
        return {}

    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if not key:
            continue
        values[key] = _strip_quotes(_strip_inline_comment(value))
    return values


def load_env_file(path: Path | None = None, *, override: bool = False) -> dict[str, str]:
    """Load `.env` values into `os.environ`.

    Existing environment variables win by default so Docker/CI/PowerShell
    overrides remain authoritative. Returned values are the parsed file values,
    not a list of effective environment variables.
    """

    env_path = path or DEFAULT_ENV_FILE
    values = parse_env_file(env_path)
    for key, value in values.items():
        if override or key not in os.environ:
            os.environ[key] = value
    return values


def _strip_quotes(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        return value[1:-1]
    return value


def _strip_inline_comment(value: str) -> str:
    quote: str | None = None
    for index, char in enumerate(value):
        if char in {"'", '"'}:
            quote = None if quote == char else char if quote is None else quote
        if char == "#" and quote is None and index > 0 and value[index - 1].isspace():
            return value[:index].rstrip()
    return value
