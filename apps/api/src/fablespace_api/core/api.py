from __future__ import annotations

import argparse
import json
import sys
import webbrowser
from pathlib import Path
from typing import Sequence

from fastapi import FastAPI

from .web.app import create_web_app
from .web.config import (
    DEFAULT_FRONTEND_ROOT,
    DEFAULT_HOST,
    DEFAULT_OUTPUT_ROOT,
    DEFAULT_PORT,
    ApiSettings,
)


def add_arguments(parser: argparse.ArgumentParser) -> argparse.ArgumentParser:
    parser.add_argument("--host", default=DEFAULT_HOST, help="Host for the local API server.")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="Port for the local API server.")
    parser.add_argument(
        "--output-root",
        type=Path,
        default=DEFAULT_OUTPUT_ROOT,
        help="Directory where API-generated previews will be written.",
    )
    parser.add_argument(
        "--frontend-root",
        type=Path,
        default=DEFAULT_FRONTEND_ROOT,
        help="Optional frontend directory or React project root to serve at the web root.",
    )
    parser.add_argument(
        "--no-open",
        action="store_true",
        help="Do not auto-open the frontend URL in the default browser.",
    )
    return parser


class ApiServerHandle:
    def __init__(self, app: FastAPI, host: str, port: int):
        self.app = app
        self.host = host
        self.port = port

    @property
    def server_address(self) -> tuple[str, int]:
        return (self.host, self.port)



def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m fablespace_api.core.api",
        description="Start the separated FableSpace backend API server.",
    )
    return add_arguments(parser)



def main(argv: Sequence[str] | None = None) -> int:
    from fablespace_api.infrastructure.env import load_env_file

    load_env_file()
    parser = build_parser()
    args = parser.parse_args(argv)
    return run_api(args)



def run_api(args: argparse.Namespace) -> int:
    try:
        import uvicorn

        settings = ApiSettings(
            output_root=args.output_root,
            frontend_root=args.frontend_root,
        ).resolved()
        app = create_web_app(settings)
        base_url = _public_base_url(args.host, args.port)
        frontend_available = bool(settings.frontend_dist and settings.frontend_dist.exists()) or bool(
            settings.frontend_root and settings.frontend_root.exists()
        )
        print(
            json.dumps(
                {
                    "status": "ready",
                    "api_url": base_url,
                    "frontend_url": f"{base_url}/",
                    "host": args.host,
                    "port": args.port,
                    "output_root": str(settings.output_root),
                    "frontend_available": frontend_available,
                    "meta_url": f"{base_url}/api/meta",
                },
                ensure_ascii=False,
                indent=2,
            ),
            flush=True,
        )
        if not args.no_open and frontend_available:
            webbrowser.open(f"{base_url}/")
        uvicorn.run(app, host=args.host, port=args.port, log_level="warning")
        return 0
    except Exception as exc:  # pragma: no cover - exercised by smoke tests later
        print(f"error: {exc}", file=sys.stderr)
        return 1



def create_server(
    host: str,
    port: int,
    *,
    output_root: Path = DEFAULT_OUTPUT_ROOT,
    frontend_root: Path | None = DEFAULT_FRONTEND_ROOT,
) -> ApiServerHandle:
    app = create_app(
        output_root=output_root,
        frontend_root=frontend_root,
    )
    return ApiServerHandle(app=app, host=host, port=port)



def create_app(
    *,
    output_root: Path = DEFAULT_OUTPUT_ROOT,
    frontend_root: Path | None = DEFAULT_FRONTEND_ROOT,
) -> FastAPI:
    settings = ApiSettings(
        output_root=output_root,
        frontend_root=frontend_root,
        storage_backend="json",
    )
    return create_web_app(settings)



def _public_base_url(host: str, port: int) -> str:
    public_host = "127.0.0.1" if host in {"0.0.0.0", "::"} else host
    return f"http://{public_host}:{port}"
