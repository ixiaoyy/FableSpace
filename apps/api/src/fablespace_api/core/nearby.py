from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Sequence

from .bundle import export_bundle
from .cache import default_cache_dir
from .world_builder import build_world, write_world


def add_arguments(parser: argparse.ArgumentParser) -> argparse.ArgumentParser:
    parser.add_argument("--lat", type=float, required=True, help="Latitude")
    parser.add_argument("--lon", type=float, required=True, help="Longitude")
    parser.add_argument("--radius", type=_positive_int, default=300, help="Search radius in meters")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("nearby-output"),
        help="Directory where world.json and bundle output will be written.",
    )
    parser.add_argument("--seed", help="Optional stable seed override")
    parser.add_argument(
        "--request-timeout",
        type=_positive_int,
        default=30,
        help="Timeout in seconds for live Overpass requests.",
    )
    parser.add_argument(
        "--request-retries",
        type=_non_negative_int,
        default=1,
        help="Retry count for live Overpass requests.",
    )
    parser.add_argument(
        "--cache-dir",
        type=Path,
        help="Optional local cache directory for live Overpass payloads.",
    )
    parser.add_argument(
        "--refresh",
        action="store_true",
        help="Ignore cached live payloads and fetch fresh Overpass data.",
    )
    return parser


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m fablespace_api.core.nearby",
        description="Generate a nearby FableSpace world and export a preview bundle.",
    )
    return add_arguments(parser)


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return run_nearby(args)


def run_nearby(args: argparse.Namespace) -> int:
    try:
        result = generate_nearby_preview(
            lat=args.lat,
            lon=args.lon,
            radius=args.radius,
            output_dir=args.output_dir,
            seed=args.seed,
            request_timeout=args.request_timeout,
            request_retries=args.request_retries,
            cache_dir=args.cache_dir,
            refresh=args.refresh,
        )
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except Exception as exc:  # pragma: no cover - exercised by smoke tests
        print(f"error: {exc}", file=sys.stderr)
        return 1


def generate_nearby_preview(
    *,
    lat: float,
    lon: float,
    radius: int,
    output_dir: Path,
    seed: str | None = None,
    request_timeout: int = 30,
    request_retries: int = 1,
    cache_dir: Path | None = None,
    refresh: bool = False,
) -> dict[str, Any]:
    provider = "overpass"
    resolved_cache_dir = cache_dir or default_cache_dir()
    cache_status = "refreshed" if refresh else "enabled"

    world = build_world(
        lat=lat,
        lon=lon,
        radius=radius,
        seed=seed,
        source_data=None,
        provider=provider,
        fetch_timeout_seconds=request_timeout,
        fetch_max_retries=request_retries,
        fetch_cache_dir=resolved_cache_dir,
        refresh_cache=refresh,
    )

    output_dir.mkdir(parents=True, exist_ok=True)
    world_path = output_dir / "world.json"
    bundle_dir = output_dir / "bundle"

    write_world(world_path, world)
    bundle_result = export_bundle(world, bundle_dir)

    source = world.get("source") or {}
    region = world.get("region") or {}
    state = world.get("state") or {}
    signal_snapshot = state.get("signal_snapshot") or {}
    source_lat = source.get("lat")
    source_lon = source.get("lon")

    return {
        "world_id": world["world_id"],
        "title": bundle_result.get("title") or region.get("name") or world["world_id"],
        "provider": source.get("provider", provider),
        "seed": world.get("seed"),
        "source_lat": source_lat,
        "source_lon": source_lon,
        "source_radius_m": source.get("radius_m"),
        "osm_url": _openstreetmap_url(source_lat, source_lon) if source_lat is not None and source_lon is not None else None,
        "region_name": region.get("name"),
        "region_theme": region.get("theme"),
        "region_summary": region.get("narrative_summary"),
        "dominant_faction": region.get("dominant_faction"),
        "source_element_count": signal_snapshot.get("source_element_count"),
        "poi_count": len(world.get("pois") or []),
        "road_count": len(world.get("roads") or []),
        "landmark_count": len(world.get("landmarks") or []),
        "cache_status": cache_status,
        "cache_dir": str(resolved_cache_dir) if resolved_cache_dir is not None else None,
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "output_dir": str(output_dir),
        "world": str(world_path),
        "bundle_dir": str(bundle_dir),
        "manifest": bundle_result["manifest"],
        "preview": bundle_result["preview"],
        "bundle_version": bundle_result["bundle_version"],
    }


def _positive_int(value: str) -> int:
    parsed = int(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("value must be a positive integer")
    return parsed


def _non_negative_int(value: str) -> int:
    parsed = int(value)
    if parsed < 0:
        raise argparse.ArgumentTypeError("value must be a non-negative integer")
    return parsed


def _openstreetmap_url(lat: float, lon: float) -> str:
    return f"https://www.openstreetmap.org/?mlat={lat:.6f}&mlon={lon:.6f}#map=18/{lat:.6f}/{lon:.6f}"


if __name__ == "__main__":
    raise SystemExit(main())
