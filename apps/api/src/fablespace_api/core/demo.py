from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Sequence

from .cache import default_cache_dir
from .cli import _build_inspect_summary, _validate_world_schema
from .world_builder import build_world, write_world


DEMO_LAT = 35.6580
DEMO_LON = 139.7016
DEMO_RADIUS = 300

# 离线 fixture 路径，仅在传入 --source-file 时使用
_FIXTURE_PATH = Path(__file__).resolve().parent / "demo_assets" / "overpass_demo.json"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m fablespace_api.core.demo",
        description="Generate a FableSpace demo output from real OpenStreetMap data.",
    )
    parser.add_argument(
        "--lat",
        type=float,
        default=DEMO_LAT,
        help=f"Latitude of the demo location (default: {DEMO_LAT})",
    )
    parser.add_argument(
        "--lon",
        type=float,
        default=DEMO_LON,
        help=f"Longitude of the demo location (default: {DEMO_LON})",
    )
    parser.add_argument(
        "--radius",
        type=int,
        default=DEMO_RADIUS,
        help=f"Search radius in metres (default: {DEMO_RADIUS})",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("demo-output"),
        help="Directory where demo world.json and summary.json will be written.",
    )
    parser.add_argument(
        "--cache-dir",
        type=Path,
        help="Local cache directory for Overpass payloads (default: system cache dir).",
    )
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Ignore cached Overpass payload and fetch fresh data.",
    )
    parser.add_argument(
        "--request-timeout",
        type=int,
        default=30,
        help="Timeout in seconds for Overpass requests (default: 30).",
    )
    parser.add_argument(
        "--source-file",
        type=Path,
        help="Use a local Overpass-style JSON fixture instead of fetching live data (offline mode).",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        args.output_dir.mkdir(parents=True, exist_ok=True)

        source_data: dict[str, Any] | None = None
        provider = "overpass"
        cache_dir: Path | None = None

        if args.source_file:
            source_data = json.loads(args.source_file.read_text(encoding="utf-8"))
            provider = "fixture"
        else:
            cache_dir = args.cache_dir or default_cache_dir()

        world = build_world(
            lat=args.lat,
            lon=args.lon,
            radius=args.radius,
            source_data=source_data,
            provider=provider,
            fetch_timeout_seconds=args.request_timeout,
            fetch_cache_dir=cache_dir,
            refresh_cache=args.refresh,
        )
        _validate_world_schema(world)

        world_path = args.output_dir / "world.json"
        summary_path = args.output_dir / "summary.json"

        write_world(world_path, world)
        summary = _build_inspect_summary(world, world_path)
        summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")

        print(
            json.dumps(
                {
                    "world_id": world["world_id"],
                    "provider": world["source"]["provider"],
                    "theme": world["region"]["theme"],
                    "poi_count": len(world.get("pois") or []),
                    "output_dir": str(args.output_dir),
                    "world": str(world_path),
                    "summary": str(summary_path),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 0
    except Exception as exc:  # pragma: no cover - exercised by smoke tests
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
