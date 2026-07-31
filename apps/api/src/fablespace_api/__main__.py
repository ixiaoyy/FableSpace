from __future__ import annotations

import argparse
from typing import Sequence

from .infrastructure.env import load_env_file


def main(argv: Sequence[str] | None = None) -> int:
    """Parse optional CLI arguments, run the native ASGI app, and return zero after shutdown."""
    parser = argparse.ArgumentParser(
        prog="python -m fablespace_api",
        description="Start the FableSpace backend API server.",
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8950)
    args = parser.parse_args(argv)

    load_env_file()
    import uvicorn

    uvicorn.run(
        "fablespace_api.main:app",
        host=args.host,
        port=args.port,
        log_level="warning",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
