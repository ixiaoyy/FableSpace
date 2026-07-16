from __future__ import annotations

import argparse
import json
import mimetypes
import sys
import uuid
import webbrowser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Sequence
from urllib.parse import parse_qs, unquote, urlparse

from .nearby import generate_nearby_preview


REPO_ROOT = Path(__file__).resolve().parents[5]
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8765
DEFAULT_OUTPUT_ROOT = REPO_ROOT / ".fablespace-page"


def add_arguments(parser: argparse.ArgumentParser) -> argparse.ArgumentParser:
    parser.add_argument("--host", default=DEFAULT_HOST, help="Host for the local page server.")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="Port for the local page server.")
    parser.add_argument(
        "--output-root",
        type=Path,
        default=DEFAULT_OUTPUT_ROOT,
        help="Directory where page-generated previews will be written.",
    )
    parser.add_argument(
        "--no-open",
        action="store_true",
        help="Do not auto-open the page URL in the default browser.",
    )
    return parser


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m fablespace_api.core.page",
        description="Start the local page-driven nearby preview experience.",
    )
    return add_arguments(parser)


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return run_page(args)


def run_page(args: argparse.Namespace) -> int:
    try:
        server = create_server(
            args.host,
            args.port,
            output_root=args.output_root.resolve(),
        )
        page_url = f"{_public_base_url(args.host, server.server_address[1])}/"
        print(
            json.dumps(
                {
                    "status": "ready",
                    "page_url": page_url,
                    "host": args.host,
                    "port": server.server_address[1],
                    "output_root": str(args.output_root.resolve()),
                },
                ensure_ascii=False,
                indent=2,
            ),
            flush=True,
        )
        if not args.no_open:
            webbrowser.open(page_url)
        try:
            server.serve_forever()
        except KeyboardInterrupt:  # pragma: no cover - manual stop path
            print("page server stopped", file=sys.stderr)
        finally:
            server.server_close()
        return 0
    except Exception as exc:  # pragma: no cover - exercised by smoke tests
        print(f"error: {exc}", file=sys.stderr)
        return 1


def create_server(
    host: str,
    port: int,
    *,
    output_root: Path = DEFAULT_OUTPUT_ROOT,
) -> ThreadingHTTPServer:
    resolved_output_root = output_root.resolve()
    resolved_output_root.mkdir(parents=True, exist_ok=True)
    handler_class = _build_handler(REPO_ROOT, resolved_output_root)
    return ThreadingHTTPServer((host, port), handler_class)


def _build_handler(repo_root: Path, output_root: Path) -> type[BaseHTTPRequestHandler]:
    class PageHandler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:  # noqa: N802
            parsed = urlparse(self.path)
            if parsed.path in {"/", "/index.html"}:
                self._serve_root_page(repo_root / "index.html")
                return
            if parsed.path == "/api/health":
                self._write_json(
                    HTTPStatus.OK,
                    {
                        "status": "ok",
                        "output_root": str(output_root),
                    },
                )
                return
            if parsed.path.startswith("/generated/"):
                relative_path = Path(unquote(parsed.path.removeprefix("/generated/")))
                candidate = (output_root / relative_path).resolve()
                if not _is_within_root(candidate, output_root) or not candidate.is_file():
                    self.send_error(HTTPStatus.NOT_FOUND, "generated file not found")
                    return
                self._serve_file(candidate)
                return
            self.send_error(HTTPStatus.NOT_FOUND, "not found")

        def do_POST(self) -> None:  # noqa: N802
            parsed = urlparse(self.path)
            if parsed.path != "/api/nearby":
                self.send_error(HTTPStatus.NOT_FOUND, "not found")
                return
            try:
                form = self._read_form()
                lat = float(_form_value(form, "lat"))
                lon = float(_form_value(form, "lon"))
                radius = int(_form_value(form, "radius", "300"))
                if radius <= 0:
                    raise ValueError("radius must be a positive integer")
                seed = _form_value(form, "seed", "") or None
                refresh = _form_value(form, "refresh", "false").lower() == "true"
                run_id = f"run-{uuid.uuid4().hex[:12]}"
                result = generate_nearby_preview(
                    lat=lat,
                    lon=lon,
                    radius=radius,
                    output_dir=output_root / run_id,
                    seed=seed,
                    refresh=refresh,
                )
                base_url = self._base_url()
                result.update(
                    {
                        "mode": "live",
                        "run_id": run_id,
                        "preview_url": f"{base_url}/generated/{run_id}/bundle/index.html",
                        "manifest_url": f"{base_url}/generated/{run_id}/bundle/manifest.json",
                        "world_url": f"{base_url}/generated/{run_id}/world.json",
                        "page_url": f"{base_url}/",
                    }
                )
                self._write_json(HTTPStatus.OK, result)
            except ValueError as exc:
                self._write_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
            except Exception as exc:
                self._write_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(exc)})

        def do_OPTIONS(self) -> None:  # noqa: N802
            if self.path.startswith("/api/"):
                self.send_response(HTTPStatus.NO_CONTENT)
                self._send_api_headers()
                self.end_headers()
                return
            self.send_error(HTTPStatus.NOT_FOUND, "not found")

        def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
            return

        def _read_form(self) -> dict[str, list[str]]:
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length).decode("utf-8")
            return parse_qs(body, keep_blank_values=True)

        def _base_url(self) -> str:
            host_header = self.headers.get("Host")
            if host_header:
                return f"http://{host_header}"
            return _public_base_url(self.server.server_address[0], self.server.server_address[1])

        def _serve_file(self, path: Path) -> None:
            content = path.read_bytes()
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", _content_type_for(path))
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)

        def _serve_root_page(self, path: Path) -> None:
            if path.exists():
                self._serve_file(path)
                return
            content = _fallback_root_page_html().encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)

        def _send_api_headers(self) -> None:
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")

        def _write_json(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
            encoded = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
            self.send_response(status)
            self._send_api_headers()
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)

    return PageHandler


def _content_type_for(path: Path) -> str:
    content_type = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
    if content_type.startswith("text/") or content_type in {"application/json", "application/javascript"}:
        return f"{content_type}; charset=utf-8"
    return content_type


def _fallback_root_page_html() -> str:
    """Small built-in shell used when the compatibility root index.html is absent."""
    return """<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>附近地图变异世界</title>
</head>
<body>
  <main>
    <h1>附近地图变异世界</h1>
    <label for="language-select">Language / 语言</label>
    <select id="language-select" name="language">
      <option value="zh-CN">中文</option>
      <option value="en">English</option>
    </select>
    <button id="use-location" type="button">使用当前位置</button>
    <form id="nearby-form" method="post" action="/api/nearby">
      <input name="lat" value="35.6580" />
      <input name="lon" value="139.7016" />
      <input name="radius" value="300" />
      <button type="submit">生成预览</button>
    </form>
  </main>
</body>
</html>
"""


def _form_value(form: dict[str, list[str]], key: str, default: str | None = None) -> str:
    values = form.get(key)
    if not values:
        if default is not None:
            return default
        raise ValueError(f"missing required field '{key}'")
    return values[0]


def _is_within_root(candidate: Path, root: Path) -> bool:
    try:
        candidate.relative_to(root)
        return True
    except ValueError:
        return False


def _public_base_url(host: str, port: int) -> str:
    public_host = "127.0.0.1" if host in {"0.0.0.0", "::"} else host
    return f"http://{public_host}:{port}"


if __name__ == "__main__":
    raise SystemExit(main())
