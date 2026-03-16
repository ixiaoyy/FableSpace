from __future__ import annotations

import argparse
from html import escape
import hashlib
import json
import sys
from pathlib import Path
from typing import Any, Callable, Sequence

from .cli import _build_inspect_summary, _validate_world_schema
from .showcase import _build_showcase, _render_showcase_markdown
from .world_builder import write_world


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m fablemap.bundle",
        description="Export a fixed-structure static bundle from a FableMap world JSON.",
    )
    parser.add_argument("--input", type=Path, required=True, help="Path to an existing world.json file.")
    parser.add_argument(
        "--output-dir",
        type=Path,
        help="Directory where the bundle will be written. Defaults to <input-dir>/bundle.",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        input_path = args.input
        output_dir = args.output_dir or (input_path.parent / "bundle")
        world = _load_world(input_path)
        print(json.dumps(export_bundle(world, output_dir), ensure_ascii=False, indent=2))
        return 0
    except Exception as exc:  # pragma: no cover - exercised by smoke tests
        print(f"error: {exc}", file=sys.stderr)
        return 1


def _load_world(input_path: Path) -> dict[str, Any]:
    return json.loads(input_path.read_text(encoding="utf-8"))


def export_bundle(world: dict[str, Any], output_dir: Path) -> dict[str, Any]:
    _validate_world_schema(world)
    output_dir.mkdir(parents=True, exist_ok=True)

    summary = _build_inspect_summary(world, Path("world.json"))
    showcase = _build_showcase(world, Path("world.json"))
    manifest = _build_bundle_manifest(summary, showcase)

    bundle_world_path = output_dir / "world.json"
    summary_path = output_dir / "summary.json"
    showcase_json_path = output_dir / "showcase.json"
    showcase_md_path = output_dir / "showcase.md"
    preview_html_path = output_dir / "index.html"
    manifest_path = output_dir / "manifest.json"

    write_world(bundle_world_path, world)
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    showcase_json_path.write_text(json.dumps(showcase, ensure_ascii=False, indent=2), encoding="utf-8")
    showcase_md_path.write_text(_render_showcase_markdown(showcase), encoding="utf-8")
    preview_html_path.write_text(_render_preview_html(world, showcase, manifest), encoding="utf-8")
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    return {
        "world_id": manifest["world_id"],
        "title": manifest["title"],
        "output_dir": str(output_dir),
        "manifest": str(manifest_path),
        "preview": str(preview_html_path),
        "bundle_version": manifest["bundle_version"],
    }


def _build_bundle_manifest(summary: dict[str, Any], showcase: dict[str, Any]) -> dict[str, Any]:
    hooks = showcase.get("hooks") or {}
    co_creation = showcase.get("co_creation_storyline") or {}
    slots = {
        "world_data": {"path": "world.json", "format": "json", "kind": "world", "required": True},
        "summary_data": {"path": "summary.json", "format": "json", "kind": "summary", "required": True},
        "showcase_data": {"path": "showcase.json", "format": "json", "kind": "showcase", "required": True},
        "showcase_markdown": {
            "path": "showcase.md",
            "format": "markdown",
            "kind": "document",
            "required": True,
        },
        "preview_html": {"path": "index.html", "format": "html", "kind": "preview", "required": True},
    }
    return {
        "bundle_version": "0.3",
        "world_id": summary.get("world_id"),
        "title": showcase.get("title"),
        "subtitle": showcase.get("subtitle"),
        "files": {
            "world": "world.json",
            "summary": "summary.json",
            "showcase_json": "showcase.json",
            "showcase_markdown": "showcase.md",
            "preview_html": "index.html",
        },
        "entrypoints": {
            "primary_world": "world.json",
            "primary_showcase": "showcase.json",
            "primary_readme": "showcase.md",
            "primary_preview": "index.html",
        },
        "slots": slots,
        "resources": [
            {
                "id": "world",
                "slot": "world_data",
                "path": slots["world_data"]["path"],
                "format": slots["world_data"]["format"],
                "kind": slots["world_data"]["kind"],
                "role": "primary_world",
            },
            {
                "id": "summary",
                "slot": "summary_data",
                "path": slots["summary_data"]["path"],
                "format": slots["summary_data"]["format"],
                "kind": slots["summary_data"]["kind"],
                "role": "inspect_summary",
            },
            {
                "id": "showcase_json",
                "slot": "showcase_data",
                "path": slots["showcase_data"]["path"],
                "format": slots["showcase_data"]["format"],
                "kind": slots["showcase_data"]["kind"],
                "role": "showcase_payload",
            },
            {
                "id": "showcase_markdown",
                "slot": "showcase_markdown",
                "path": slots["showcase_markdown"]["path"],
                "format": slots["showcase_markdown"]["format"],
                "kind": slots["showcase_markdown"]["kind"],
                "role": "showcase_document",
            },
            {
                "id": "preview_html",
                "slot": "preview_html",
                "path": slots["preview_html"]["path"],
                "format": slots["preview_html"]["format"],
                "kind": slots["preview_html"]["kind"],
                "role": "interactive_preview",
            },
        ],
        "presentation": {
            "theme": summary.get("theme"),
            "atmosphere": summary.get("atmosphere"),
            "dominant_faction": summary.get("dominant_faction"),
            "visual_style": hooks.get("visual_style"),
            "palette_hint": hooks.get("palette_hint"),
        },
        "signals": {
            "poi_count": summary.get("poi_count"),
            "road_count": summary.get("road_count"),
            "landmark_count": summary.get("landmark_count"),
            "sprite_count": summary.get("sprite_count"),
            "memory_anchor_count": summary.get("memory_anchor_count"),
            "historical_echo_count": summary.get("historical_echo_count"),
            "disturbance_level": summary.get("disturbance_level"),
            "city_myth_stage": co_creation.get("city_myth_stage"),
            "participation_mode_count": len(co_creation.get("participation_modes") or []),
        },
    }


def _localized_html(value: Any, fallback_key: str = "unknown") -> str:
    if value is None:
        return f'<span data-i18n="{fallback_key}"></span>'
    text = str(value).strip()
    if not text:
        return f'<span data-i18n="{fallback_key}"></span>'
    return escape(text)


def _position_or_none(value: Any) -> dict[str, float] | None:
    if not isinstance(value, dict):
        return None
    lat = value.get("lat")
    lon = value.get("lon")
    if lat is None or lon is None:
        return None
    try:
        return {"lat": float(lat), "lon": float(lon)}
    except (TypeError, ValueError):
        return None


def _build_map_projector(
    world: dict[str, Any],
    width: int = 880,
    height: int = 520,
    padding: int = 36,
) -> tuple[Callable[[Any], dict[str, float]], dict[str, int]]:
    points: list[dict[str, float]] = []
    for road in world.get("roads") or []:
        for point in road.get("points") or []:
            normalized = _position_or_none(point)
            if normalized is not None:
                points.append(normalized)
    for poi in world.get("pois") or []:
        normalized = _position_or_none(poi.get("position"))
        if normalized is not None:
            points.append(normalized)
    for landmark in world.get("landmarks") or []:
        normalized = _position_or_none((landmark.get("visual_hint") or {}).get("position"))
        if normalized is not None:
            points.append(normalized)

    source_position = _position_or_none(world.get("source") or {})
    if source_position is not None:
        points.append(source_position)
    if not points:
        points.append({"lat": 0.0, "lon": 0.0})

    min_lat = min(point["lat"] for point in points)
    max_lat = max(point["lat"] for point in points)
    min_lon = min(point["lon"] for point in points)
    max_lon = max(point["lon"] for point in points)
    lat_span = max(max_lat - min_lat, 0.0001)
    lon_span = max(max_lon - min_lon, 0.0001)
    inner_width = max(width - padding * 2, 1)
    inner_height = max(height - padding * 2, 1)

    def project(value: Any) -> dict[str, float]:
        default_point = source_position or {"lat": (min_lat + max_lat) / 2, "lon": (min_lon + max_lon) / 2}
        point = _position_or_none(value) or default_point
        x = padding + ((point["lon"] - min_lon) / lon_span) * inner_width
        y = padding + ((max_lat - point["lat"]) / lat_span) * inner_height
        return {"x": round(x, 2), "y": round(y, 2)}

    return project, {"width": width, "height": height}


def _disturbance_aura_svg(world_state: dict[str, Any], viewport: dict[str, Any]) -> str:
    level = float(world_state.get("disturbance_level") or 0.0)
    if level < 0.05:
        return ""
    cx = round(viewport["width"] / 2, 1)
    cy = round(viewport["height"] / 2, 1)
    r = round(min(viewport["width"], viewport["height"]) * 0.55, 1)
    opacity = round(min(0.22, level * 0.28), 3)
    color = "#a78bfa" if level > 0.6 else "#38bdf8"
    dur = round(max(1.8, 3.5 - level * 2), 2)
    return (
        f'<radialGradient id="aura-grad" cx="50%" cy="50%" r="50%">'
        f'<stop offset="0%" stop-color="{color}" stop-opacity="{opacity}"/>'
        f'<stop offset="100%" stop-color="{color}" stop-opacity="0"/>'
        f'</radialGradient>'
        f'<ellipse cx="{cx}" cy="{cy}" rx="{r}" ry="{round(r * 0.6, 1)}" '
        f'fill="url(#aura-grad)" class="disturbance-aura">'
        f'<animate attributeName="opacity" values="0.6;1;0.6" dur="{dur}s" repeatCount="indefinite"/>'
        f'</ellipse>'
    )


def _npc_agent_dots_svg(world_state: dict[str, Any], region: dict[str, Any], viewport: dict[str, Any]) -> str:
    commerce = float(region.get("commerce_flux") or 0.0)
    spawn = str(world_state.get("spawn_window") or "stable")
    count = 0
    if commerce > 0.3:
        count += 2
    if commerce > 0.6:
        count += 2
    if spawn in ("active", "rare"):
        count += 2
    if count == 0:
        return ""
    w, h = viewport["width"], viewport["height"]
    seed_str = f"{w}{h}{commerce}{spawn}"
    seed = int(hashlib.md5(seed_str.encode()).hexdigest(), 16)
    dots = []
    for i in range(count):
        s = (seed >> (i * 7)) & 0xFFFF
        x = round(20 + (s % (w - 40)), 1)
        y = round(20 + ((s >> 4) % (h - 40)), 1)
        r = 3 if spawn in ("active", "rare") and i >= count - 2 else 2
        color = "#fbbf24" if spawn in ("active", "rare") and i >= count - 2 else "#67e8f9"
        dur = round(3.0 + (s % 30) * 0.1, 1)
        dx = round(((s >> 2) % 40) - 20, 1)
        dy = round(((s >> 6) % 40) - 20, 1)
        dots.append(
            f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}" opacity="0.7" class="npc-agent-dot">'
            f'<animateMotion path="M0,0 q{dx},{dy} 0,0" dur="{dur}s" repeatCount="indefinite"/>'
            f'</circle>'
        )
    return "".join(dots)


def _comfort_aura_svg(region: dict[str, Any], viewport: dict[str, Any]) -> str:
    level = float(region.get("comfort_level") or 0.0)
    if level < 0.15:
        return ""
    cx = round(viewport["width"] / 2, 1)
    cy = round(viewport["height"] / 2, 1)
    r = round(min(viewport["width"], viewport["height"]) * 0.45, 1)
    opacity = round(min(0.18, level * 0.22), 3)
    dur = round(max(2.5, 5.0 - level * 2.5), 2)
    return (
        f'<radialGradient id="comfort-grad" cx="50%" cy="50%" r="50%">'
        f'<stop offset="0%" stop-color="#fbbf24" stop-opacity="{opacity}"/>'
        f'<stop offset="100%" stop-color="#fbbf24" stop-opacity="0"/>'
        f'</radialGradient>'
        f'<ellipse cx="{cx}" cy="{cy}" rx="{r}" ry="{round(r * 0.55, 1)}" '
        f'fill="url(#comfort-grad)" class="comfort-aura">'
        f'<animate attributeName="opacity" values="0.5;1;0.5" dur="{dur}s" repeatCount="indefinite"/>'
        f'</ellipse>'
    )


def _sprite_nodes_svg(
    world: dict[str, Any],
    world_state: dict[str, Any],
    project: Any,
) -> str:
    spawn = str(world_state.get("spawn_window") or "stable")
    if spawn not in ("active", "rare"):
        return ""
    sprites = world.get("sprites") or []
    pois_by_id = {poi["id"]: poi for poi in (world.get("pois") or [])}
    nodes = []
    _RARITY_COLOR = {"rare": "#e879f9", "uncommon": "#a78bfa", "common": "#86efac"}
    for sprite in sprites:
        poi = pois_by_id.get(sprite.get("linked_poi") or "")
        if not poi:
            continue
        pos = poi.get("position")
        if not pos:
            continue
        projected = project(pos)
        x, y = projected["x"], projected["y"]
        color = _RARITY_COLOR.get(sprite.get("rarity") or "common", "#86efac")
        dur = "2.4s" if spawn == "rare" else "3.2s"
        sid = escape(str(sprite.get("id") or ""))
        species = escape(str(sprite.get("species") or "sprite"))
        nodes.append(
            f'<g class="sprite-node" data-sprite-id="{sid}" aria-label="{species}">'
            f'<path d="M{x},{y - 10} L{x + 7},{y} L{x},{y + 10} L{x - 7},{y} Z" '
            f'class="sprite-gem" fill="{color}">'
            f'<animate attributeName="opacity" values="0.3;1;0.3" dur="{dur}" repeatCount="indefinite"/>'
            f'<animateTransform attributeName="transform" type="rotate" '
            f'from="0 {x} {y}" to="360 {x} {y}" dur="8s" repeatCount="indefinite"/>'
            f'</path>'
            f'<circle cx="{x}" cy="{y}" r="3" fill="white" opacity="0.7" class="sprite-core"></circle>'
            f'</g>'
        )
    return "".join(nodes)


def _anchor_nodes_svg(
    world: dict[str, Any],
    project: Any,
) -> str:
    anchors = world.get("memory_anchors") or []
    pois_by_id = {poi["id"]: poi for poi in (world.get("pois") or [])}
    nodes = []
    _HEART = "M0,-5 C0,-8 -5,-8 -5,-4 C-5,0 0,5 0,7 C0,5 5,0 5,-4 C5,-8 0,-8 0,-5Z"
    for anchor in anchors:
        linked = (anchor.get("linked_pois") or [])
        poi = pois_by_id.get(linked[0]) if linked else None
        if not poi:
            continue
        pos = poi.get("position")
        if not pos:
            continue
        projected = project(pos)
        x = round(projected["x"] - 16, 1)
        y = round(projected["y"] - 16, 1)
        aid = escape(str(anchor.get("id") or ""))
        tone = escape(str(anchor.get("tone") or "tender"))
        nodes.append(
            f'<g class="anchor-node" data-anchor-id="{aid}" aria-label="{tone}">'
            f'<path d="{_HEART}" transform="translate({x},{y})" class="anchor-heart">'
            f'<animate attributeName="opacity" values="0.4;0.9;0.4" dur="3.8s" repeatCount="indefinite"/>'
            f'</path>'
            f'</g>'
        )
    return "".join(nodes)


def _echo_layer_svg(world: dict[str, Any], project: Any) -> str:
    echoes = world.get("historical_echoes") or []
    landmarks = world.get("landmarks") or []
    lm_by_id = {lm["id"]: lm for lm in landmarks}
    nodes = []
    for echo in echoes:
        eid = escape(str(echo.get("id") or ""))
        summary = escape(str(echo.get("summary") or ""))
        if not summary:
            continue
        linked_lm_id = str(echo.get("id") or "").replace("echo-", "", 1)
        lm = lm_by_id.get(linked_lm_id)
        if not lm:
            continue
        pos = (lm.get("visual_hint") or {}).get("position")
        if not pos:
            continue
        projected = project(pos)
        x = round(projected["x"] + 18, 1)
        y = round(projected["y"] - 20, 1)
        max_chars = 48
        display = summary if len(summary) <= max_chars else summary[:max_chars] + "…"
        nodes.append(
            f'<g class="echo-node" data-echo-id="{eid}">'
            f'<text x="{x}" y="{y}" class="echo-text">'
            f'<animate attributeName="opacity" values="0;0.7;0.5;0.7;0" dur="6s" begin="{len(nodes)}s" repeatCount="indefinite"/>'
            f'{display}</text>'
            f'</g>'
        )
    return "".join(nodes)


def _capsule_marks_svg(world: dict[str, Any], project: Any) -> str:
    state = world.get("state") or {}
    marks = state.get("private_marks") or []
    pois_by_id = {poi["id"]: poi for poi in (world.get("pois") or [])}
    nodes = []
    _BUBBLE = "M-8,-14 L8,-14 Q12,-14 12,-10 L12,0 Q12,4 8,4 L2,4 L0,8 L-2,4 L-8,4 Q-12,4 -12,0 L-12,-10 Q-12,-14 -8,-14 Z"
    for mark in marks:
        poi = pois_by_id.get(mark.get("linked_poi") or "")
        if not poi:
            continue
        pos = poi.get("position")
        if not pos:
            continue
        projected = project(pos)
        x = round(projected["x"] + 12, 1)
        y = round(projected["y"] - 28, 1)
        mid = escape(str(mark.get("id") or ""))
        nodes.append(
            f'<g class="capsule-mark" data-mark-id="{mid}" aria-label="emotion capsule">'
            f'<path d="{_BUBBLE}" transform="translate({x},{y})" class="capsule-bubble">'
            f'<animate attributeName="opacity" values="0.3;0.8;0.3" dur="4.5s" repeatCount="indefinite"/>'
            f'</path>'
            f'<circle cx="{x}" cy="{y - 5}" r="2" class="capsule-dot"></circle>'
            f'</g>'
        )
    return "".join(nodes)


def _home_anchor_svg(world: dict[str, Any], project: Any) -> str:
    source = world.get("source") or {}
    lat = source.get("lat")
    lon = source.get("lon")
    if lat is None or lon is None:
        return ""
    state = world.get("state") or {}
    home_style = str(state.get("home_style") or "blank_slate")
    _STYLE_COLOR = {
        "verdant_nest": "#4ade80",
        "warm_corner": "#fbbf24",
        "blank_slate": "#94a3b8",
    }
    color = _STYLE_COLOR.get(home_style, "#94a3b8")
    projected = project({"lat": lat, "lon": lon})
    x = round(projected["x"], 1)
    y = round(projected["y"], 1)
    _HOUSE = "M0,-12 L10,0 L7,0 L7,10 L-7,10 L-7,0 L-10,0 Z"
    return (
        f'<g class="home-anchor" data-home-style="{escape(home_style)}" aria-label="home anchor">'
        f'<circle cx="{x}" cy="{y}" r="18" class="home-aura" fill="{color}" opacity="0.08">'
        f'<animate attributeName="r" values="14;20;14" dur="3s" repeatCount="indefinite"/>'
        f'<animate attributeName="opacity" values="0.05;0.15;0.05" dur="3s" repeatCount="indefinite"/>'
        f'</circle>'
        f'<path d="{_HOUSE}" transform="translate({x},{y})" class="home-icon" fill="{color}" opacity="0.85">'
        f'<animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite"/>'
        f'</path>'
        f'</g>'
    )


def _player_entity_svg(world: dict[str, Any], project: Any) -> str:
    source = world.get("source") or {}
    lat = source.get("lat")
    lon = source.get("lon")
    if lat is None or lon is None:
        return ""
    projected = project({"lat": lat, "lon": lon})
    x = round(projected["x"], 1)
    y = round(projected["y"], 1)
    return (
        f'<g id="player-entity" class="player-entity" transform="translate({x}, {y})" aria-label="Player">'
        f'<circle cx="0" cy="0" r="10" class="player-aura"></circle>'
        f'<path d="M0,-8 L6,4 L-6,4 Z" class="player-icon"></path>'
        f'</g>'
    )


def _broadcast_messages(world: dict[str, Any], world_state: dict[str, Any]) -> list[str]:
    region = world.get("region") or {}
    social = float(region.get("social_tension") or 0.0)
    commerce = float(region.get("commerce_flux") or 0.0)
    anomaly = float(region.get("anomaly_pressure") or 0.0)
    comfort = float(region.get("comfort_level") or 0.0)
    spawn = str(world_state.get("spawn_window") or "stable")
    lens = str(world_state.get("active_lens") or "quiet_rain")
    dist = float(world_state.get("disturbance_level") or 0.0)
    factions = world.get("factions") or []
    faction_name = factions[0].get("name") if factions else "Unknown Faction"
    region_name = region.get("name") or "This District"

    msgs: list[str] = []

    if social >= 0.5:
        msgs.append(f"⚠ {region_name}: social pressure elevated — movement patterns tightening.")
    elif social >= 0.25:
        msgs.append(f"◈ {region_name}: friction detectable in circulation flows.")

    if commerce >= 0.5:
        msgs.append(f"↑ Commerce flux high — {faction_name} supply lines active.")
    elif commerce >= 0.2:
        msgs.append(f"~ Trade pulse stable. {faction_name} maintains route visibility.")

    if anomaly >= 0.6:
        msgs.append("⬡ Anomaly pressure critical — historical echoes amplifying. Proceed with caution.")
    elif anomaly >= 0.35:
        msgs.append("◉ Anomaly pressure rising. Memory residue detected in landmark zones.")

    if comfort >= 0.4:
        msgs.append(f"♡ Comfort index favorable — secret garden windows may open near grove zones.")
    elif comfort >= 0.2:
        msgs.append(f"· Quiet undercurrent detected. Emotional anchors accessible after dark.")

    if spawn == "rare":
        msgs.append("✦ RARE spawn window open — urban sprites manifesting. Collect before dispersal.")
    elif spawn == "active":
        msgs.append("✧ Spawn window active — sprites visible near high-memory nodes.")

    _LENS_MSG = {
        "ghibli_town": "🌿 World lens: verdant calm. Hidden paths more likely to surface.",
        "quiet_rain":  "🌧 World lens: quiet rain. Emotional resonance heightened.",
        "neon_nostalgia": "🌃 World lens: neon nostalgia. Night-mode aesthetics at peak.",
        "amber_evening": "🕯 World lens: amber evening. Warmth signals concentrated.",
        "iron_blue": "🔵 World lens: iron blue. Bureau presence dominant.",
        "chalk_dawn": "📖 World lens: chalk dawn. Scholar frequencies active.",
    }
    if lens in _LENS_MSG:
        msgs.append(_LENS_MSG[lens])

    if dist >= 0.6:
        msgs.append(f"🔴 {region_name} disturbance CRITICAL — world state unstable.")
    elif dist >= 0.3:
        msgs.append(f"🟡 {region_name} disturbance moderate — watch for sudden state shifts.")

    if not msgs:
        msgs.append(f"· {region_name}: all systems nominal. World state stable.")

    return msgs


def _broadcast_bar_html(world: dict[str, Any], world_state: dict[str, Any]) -> str:
    msgs = _broadcast_messages(world, world_state)
    items = "".join(
        f'<span class="broadcast-item">{escape(m)}</span><span class="broadcast-sep" aria-hidden="true">◆</span>'
        for m in msgs
    )
    track = f'<span class="broadcast-track" aria-live="off">{items}{items}</span>'
    return (
        f'<div class="world-broadcast-bar" role="marquee" aria-label="World broadcast">'
        f'<span class="broadcast-label" data-i18n="broadcastBarTitle"></span>'
        f'<div class="broadcast-scroll-wrap">{track}</div>'
        f'</div>'
    )


def _render_map_observer_html(
    world: dict[str, Any],
    showcase: dict[str, Any],
    world_state: dict[str, Any],
) -> tuple[str, str]:
    roads = world.get("roads") or []
    pois = world.get("pois") or []
    landmarks = world.get("landmarks") or []
    state = world.get("state") or {}
    poi_states = state.get("poi_states") or {}
    project, viewport = _build_map_projector(world)

    _ROAD_TIER = {
        "motorway": "arterial", "trunk": "arterial",
        "primary": "arterial", "secondary": "arterial",
        "tertiary": "street", "residential": "street", "unclassified": "street",
        "footway": "path", "path": "path", "cycleway": "path", "steps": "path",
    }
    road_shapes: list[str] = []
    for road in roads:
        projected_points: list[str] = []
        for point in road.get("points") or []:
            projected = project(point)
            projected_points.append(f"{projected['x']},{projected['y']}")
        if len(projected_points) >= 2:
            kind = str(road.get("kind") or "")
            tier = _ROAD_TIER.get(kind, "street")
            points_attr = " ".join(projected_points)
            road_shapes.append(
                f'<g class="map-road-stack map-road-stack-{escape(tier)}" data-road-kind="{escape(kind)}">'
                f'<polyline class="map-road-shadow map-road-shadow-{escape(tier)}" points="{points_attr}" />'
                f'<polyline class="map-road map-road-{escape(tier)}" points="{points_attr}" />'
                f'<polyline class="map-road-center map-road-center-{escape(tier)}" points="{points_attr}" />'
                f'</g>'
            )

    _POI_ICON: dict[str, str] = {
        "whispering_grove": "M0,-11 C-6,-11 -11,-6 -11,0 C-11,7 -5,11 0,13 C5,11 11,7 11,0 C11,-6 6,-11 0,-11Z M0,-6 L2,0 L7,0 L3,3 L5,9 L0,6 L-5,9 L-3,3 L-7,0 L-2,0Z",
        "healing_sanctum": "M0,-12 L3,-4 L12,-4 L5,2 L8,10 L0,5 L-8,10 L-5,2 L-12,-4 L-3,-4Z",
        "supply_outpost": "M-9,-9 L9,-9 L9,9 L-9,9Z M-5,-5 L5,-5 L5,5 L-5,5Z M-1,-9 L1,-9 L1,-5 L-1,-5Z M-1,5 L1,5 L1,9 L-1,9Z",
        "judgement_tower": "M0,-12 L4,-4 L12,-4 L6,2 L9,12 L0,7 L-9,12 L-6,2 L-12,-4 L-4,-4Z",
        "ember_parlor": "M0,-11 C-7,-11 -11,-5 -8,1 C-5,7 -2,9 0,12 C2,9 5,7 8,1 C11,-5 7,-11 0,-11Z",
        "lore_academy": "M-10,-8 L10,-8 L10,10 L-10,10Z M-6,-8 L-6,-12 L6,-12 L6,-8Z M-3,0 L3,0 M0,-4 L0,4",
    }
    _LANDMARK_ICON = "M0,-13 L4,-4 L13,-4 L6,2 L9,13 L0,8 L-9,13 L-6,2 L-13,-4 L-4,-4Z"

    feature_items: list[dict[str, Any]] = []
    for index, poi in enumerate(pois, start=1):
        position = _position_or_none(poi.get("position"))
        if position is None:
            continue
        feature_id = str(poi.get("id") or f"poi-{index}")
        marker_name = str(poi.get("fantasy_name") or poi.get("real_name") or "POI").strip() or "POI"
        poi_state = poi_states.get(poi.get("state_ref") or poi.get("id") or "") or {}
        fantasy_type = str(poi.get("fantasy_type") or "")
        feature_items.append(
            {
                "id": feature_id,
                "kind": "poi",
                "fantasy_type": fantasy_type,
                "position": position,
                "marker_name": marker_name,
                "detail_body": (
                    '<p class="detail-kicker" data-i18n="detailPoiKicker"></p>'
                    f"<h3>{_localized_html(poi.get('fantasy_name'), 'unknownPoi')}</h3>"
                    f"<p>{_localized_html(poi.get('emotion_hook'), 'noHook')}</p>"
                    '<ul class="detail-list">'
                    f'<li><span data-i18n="detailType"></span>: {_localized_html(poi.get("fantasy_type"), "unknownType")}</li>'
                    f'<li><span data-i18n="detailRealName"></span>: {_localized_html(poi.get("real_name"))}</li>'
                    f'<li><span data-i18n="detailFaction"></span>: {_localized_html(poi.get("faction_alignment"), "unknownFaction")}</li>'
                    f'<li><span data-i18n="detailState"></span>: {_localized_html(poi_state.get("status"))}</li>'
                    "</ul>"
                ),
            }
        )
    for index, landmark in enumerate(landmarks, start=1):
        position = _position_or_none((landmark.get("visual_hint") or {}).get("position"))
        if position is None:
            continue
        feature_id = str(landmark.get("id") or f"landmark-{index}")
        marker_name = str(landmark.get("name") or "Landmark").strip() or "Landmark"
        feature_items.append(
            {
                "id": feature_id,
                "kind": "landmark",
                "fantasy_type": "landmark",
                "position": position,
                "marker_name": marker_name,
                "detail_body": (
                    '<p class="detail-kicker" data-i18n="detailLandmarkKicker"></p>'
                    f"<h3>{_localized_html(landmark.get('name'), 'unknownLandmark')}</h3>"
                    f"<p>{_localized_html(landmark.get('description'), 'noDescription')}</p>"
                    '<ul class="detail-list">'
                    f'<li><span data-i18n="detailType"></span>: {_localized_html(landmark.get("type"), "unknownType")}</li>'
                    f'<li><span data-i18n="detailDescription"></span>: {_localized_html(landmark.get("description"), "noDescription")}</li>'
                    "</ul>"
                    + (
                        lambda _echo: (
                            f'<div class="echo-panel">'
                            f'<p class="echo-panel-title" data-i18n="detailEchoTitle"></p>'
                            f'<p class="echo-summary">{escape(str(_echo.get("summary") or ""))}</p>'
                            f'</div>'
                        ) if _echo else ""
                    )(
                        next(
                            (e for e in (world.get("historical_echoes") or [])
                             if e.get("id") == f"echo-{landmark['id']}"),
                            None
                        )
                    )
                ),
            }
        )

    default_feature_id = feature_items[0]["id"] if feature_items else "map-overview"
    region = world.get("region") or {}
    _fmt_metric = lambda v: f"{float(v):.2f}" if v is not None else "—"
    spawn_window = escape(str(world_state.get("spawn_window") or "—"))
    detail_cards = [
        (
            f'<article class="detail-card{" is-active" if default_feature_id == "map-overview" else ""}" '
            'data-feature-card="map-overview">'
            '<p class="detail-kicker" data-i18n="detailOverviewKicker"></p>'
            f"<h3>{_localized_html(showcase.get('title'), 'untitledDistrict')}</h3>"
            '<p data-i18n="mapDetailHint"></p>'
            '<ul class="detail-list">'
            f'<li><span data-i18n="detailRoadCount"></span>: {escape(str(len(roads)))}</li>'
            f'<li><span data-i18n="detailPoiCount"></span>: {escape(str(len(pois)))}</li>'
            f'<li><span data-i18n="detailLandmarkCount"></span>: {escape(str(len(landmarks)))}</li>'
            f'<li><span data-i18n="detailActiveLens"></span>: {_localized_html(world_state.get("active_lens"))}</li>'
            f'<li><span data-i18n="detailDisturbance"></span>: {_localized_html(world_state.get("disturbance_level"))}</li>'
            '</ul>'
            '<div class="disturbance-panel">'
            '<p class="disturbance-panel-title" data-i18n="detailDisturbanceMetrics"></p>'
            '<ul class="detail-list disturbance-metrics">'
            f'<li><span data-i18n="detailSocialTension"></span>: <span class="metric-bar-wrap"><span class="metric-bar" style="width:{_fmt_metric(region.get("social_tension"))}em"></span></span> {_fmt_metric(region.get("social_tension"))}</li>'
            f'<li><span data-i18n="detailCommerceFlux"></span>: <span class="metric-bar-wrap"><span class="metric-bar commerce" style="width:{_fmt_metric(region.get("commerce_flux"))}em"></span></span> {_fmt_metric(region.get("commerce_flux"))}</li>'
            f'<li><span data-i18n="detailAnomalyPressure"></span>: <span class="metric-bar-wrap"><span class="metric-bar anomaly" style="width:{_fmt_metric(region.get("anomaly_pressure"))}em"></span></span> {_fmt_metric(region.get("anomaly_pressure"))}</li>'
            f'<li><span data-i18n="detailSpawnWindow"></span>: {spawn_window}</li>'
            f'<li><span data-i18n="detailComfortLevel"></span>: <span class="metric-bar-wrap"><span class="metric-bar" style="width:{_fmt_metric(region.get("comfort_level"))}em;background:#fbbf24"></span></span> {_fmt_metric(region.get("comfort_level"))}</li>'
            f'<li><span data-i18n="detailSpriteCount"></span>: {escape(str(len(world.get("sprites") or [])))}</li>'
            f'<li><span data-i18n="detailAnchorCount"></span>: {escape(str(len(world.get("memory_anchors") or [])))}</li>'
            '</ul></div>'
            "</article>"
        )
    ]
    _STATUS_CLASS = {"active": "poi-status-active", "anomaly": "poi-status-anomaly"}

    feature_nodes: list[str] = []
    for item in feature_items:
        projected = project(item["position"])
        x = projected["x"]
        y = projected["y"]
        is_active = item["id"] == default_feature_id
        active_class = " is-active" if is_active else ""
        ftype = item.get("fantasy_type") or ""
        poi_status = (poi_states.get(item["id"]) or {}).get("status") or "idle"
        status_cls = _STATUS_CLASS.get(poi_status, "poi-status-idle")
        badge_html = (
            f'<rect x="{x + 6}" y="{y - 18}" width="8" height="8" rx="2" '
            f'class="poi-status-badge {status_cls}"></rect>'
        )
        if item["kind"] == "poi":
            icon_path = _POI_ICON.get(ftype, _POI_ICON.get("supply_outpost", ""))
            shape_html = (
                f'<g class="poi-plot">'
                f'<ellipse cx="{x}" cy="{y + 11}" rx="18" ry="8" class="poi-shadow"></ellipse>'
                f'<rect x="{x - 16}" y="{y - 10}" width="32" height="22" rx="6" class="poi-base"></rect>'
                f'<path d="M{x - 19},{y - 10} L{x},{y - 20} L{x + 19},{y - 10} Z" class="poi-roof"></path>'
                f'<rect x="{x - 4}" y="{y + 1}" width="8" height="11" rx="2" class="poi-door"></rect>'
                f'<path d="{icon_path}" transform="translate({x},{y - 2}) scale(0.52)" class="poi-icon"></path>'
                f'</g>'
                + badge_html
            )
        else:
            shape_html = (
                f'<g class="landmark-plot">'
                f'<ellipse cx="{x}" cy="{y + 13}" rx="19" ry="8" class="landmark-shadow"></ellipse>'
                f'<rect x="{x - 10}" y="{y - 2}" width="20" height="18" rx="4" class="landmark-base"></rect>'
                f'<path d="M{x - 4},{y - 2} L{x},{y - 26} L{x + 4},{y - 2} Z" class="landmark-spire"></path>'
                f'<path d="M{x - 12},{y + 4} L{x},{y - 10} L{x + 12},{y + 4} Z" class="landmark-roof"></path>'
                f'<path d="{_LANDMARK_ICON}" transform="translate({x},{y - 6}) scale(0.42)" class="landmark-icon"></path>'
                f'</g>'
                + badge_html
            )
        type_class = f" map-ft-{escape(ftype)}" if ftype else ""
        feature_nodes.append(
            f'<g class="map-feature map-{escape(str(item["kind"]))}{type_class}{active_class}" '
            f'data-feature-id="{escape(str(item["id"]))}" tabindex="0" role="button" '
            f'aria-pressed="{"true" if is_active else "false"}" aria-label="{escape(str(item["marker_name"]))}">'
            f"{shape_html}</g>"
        )
        detail_cards.append(
            f'<article class="detail-card{active_class}" data-feature-card="{escape(str(item["id"]))}">{item["detail_body"]}</article>'
        )

    _home_rep_str = ", ".join(
        f"{escape(str(k))} {escape(str(v))}"
        for k, v in (world_state.get("reputation") or {}).items()
    ) or "\u2014"

    observer_html = f"""
      <section class=\"world-map-stage\" id=\"section-map-observer\">
        <div class=\"world-map-stage-head\">
          <div class=\"world-map-titleblock\">
            <h2 data-i18n=\"sectionMapObserver\"></h2>
            <p data-i18n=\"mapObserverLead\"></p>
          </div>
          <div class=\"observer-legend\" aria-label=\"Map legend\">
            <span class=\"legend-item\"><span class=\"legend-swatch road-arterial\"></span><span data-i18n=\"mapLegendArterial\"></span></span>
            <span class=\"legend-item\"><span class=\"legend-swatch road-street\"></span><span data-i18n=\"mapLegendStreet\"></span></span>
            <span class=\"legend-item\"><span class=\"legend-swatch road-path\"></span><span data-i18n=\"mapLegendPath\"></span></span>
            <span class=\"legend-item\"><span class=\"legend-swatch poi\"></span><span data-i18n=\"mapLegendPois\"></span></span>
            <span class=\"legend-item\"><span class=\"legend-swatch landmark\"></span><span data-i18n=\"mapLegendLandmarks\"></span></span>
          </div>
        </div>
        <div class=\"world-map-stage-body\">
          <div class=\"world-map-viewport\" id=\"world-map-viewport\" data-zoom-tier=\"survey\">
            <div class=\"world-map-canvas\">
              <div class=\"semantic-zoom-indicator\" id=\"semantic-zoom-indicator\" data-zoom-tier=\"survey\" aria-live=\"polite\">
                <span class=\"semantic-zoom-label\" data-i18n=\"semanticZoomTitle\"></span>
                <strong id=\"semantic-zoom-value\"></strong>
              </div>
              <div class=\"map-zoom-controls\" role=\"group\" aria-label=\"Map zoom controls\">
                <button class=\"map-zoom-btn\" id=\"map-zoom-in\" type=\"button\" title=\"Zoom in\" aria-label=\"Zoom in\">+</button>
                <button class=\"map-zoom-btn\" id=\"map-zoom-out\" type=\"button\" title=\"Zoom out\" aria-label=\"Zoom out\">\u2212</button>
                <button class=\"map-zoom-btn\" id=\"map-zoom-reset\" type=\"button\" title=\"Reset view\" aria-label=\"Reset view\" style=\"font-size:13px\">&#x2302;</button>
              </div>
              <svg id=\"observer-map\" viewBox=\"0 0 {viewport['width']} {viewport['height']}\" data-zoom-tier=\"survey\" role=\"img\" aria-labelledby=\"observer-map-title observer-map-desc\">
                <title id=\"observer-map-title\">{escape(str(showcase.get('title') or 'FableMap Observer'))}</title>
                <desc id=\"observer-map-desc\">{escape(f'{len(roads)} roads, {len(pois)} POIs, {len(landmarks)} landmarks')}</desc>
                <defs>
                  <pattern id=\"floor-grid\" width=\"28\" height=\"28\" patternUnits=\"userSpaceOnUse\">
                    <path d=\"M 28 0 L 0 0 0 28\" class=\"map-floor-grid\"></path>
                  </pattern>
                  <radialGradient id=\"map-backdrop-glow\" cx=\"50%\" cy=\"45%\" r=\"70%\">
                    <stop offset=\"0%\" stop-color=\"rgba(96, 165, 250, 0.22)\"></stop>
                    <stop offset=\"55%\" stop-color=\"rgba(30, 41, 59, 0.08)\"></stop>
                    <stop offset=\"100%\" stop-color=\"rgba(15, 23, 42, 0)\"></stop>
                  </radialGradient>
                </defs>
                <rect class=\"map-backdrop\" x=\"0\" y=\"0\" width=\"{viewport['width']}\" height=\"{viewport['height']}\" rx=\"22\" ry=\"22\"></rect>
                <rect class=\"map-floor-tiles\" x=\"16\" y=\"16\" width=\"{viewport['width'] - 32}\" height=\"{viewport['height'] - 32}\" rx=\"18\" ry=\"18\"></rect>
                <rect class=\"map-district-glow\" x=\"0\" y=\"0\" width=\"{viewport['width']}\" height=\"{viewport['height']}\" rx=\"22\" ry=\"22\"></rect>
                {_comfort_aura_svg(region, viewport)}
                {_disturbance_aura_svg(world_state, viewport)}
                {''.join(road_shapes)}
                {_npc_agent_dots_svg(world_state, region, viewport)}
                {_echo_layer_svg(world, project)}
                {_anchor_nodes_svg(world, project)}
                {_capsule_marks_svg(world, project)}
                {_home_anchor_svg(world, project)}
                {_sprite_nodes_svg(world, world_state, project)}
                {_player_entity_svg(world, project)}
                {''.join(feature_nodes)}
              </svg>
            </div>
            <p class=\"map-note\" data-i18n=\"mapObserverNote\"></p>
            {_broadcast_bar_html(world, world_state)}
          </div>
            <aside class=\"world-map-sidebar\" id=\"world-map-sidebar\">
              <section class=\"world-map-panel player-panel\" id=\"player-panel\">
                <h4 class=\"player-panel-title\" data-i18n=\"detailPlayerStats\"></h4>
                <ul class=\"detail-list player-stats\">
                  <li><span data-i18n=\"detailPlayerPos\"></span>: <code id=\"player-pos-display\">—</code></li>
                  <li><span data-i18n=\"detailPlayerStatus\"></span>: <span id=\"player-status-tag\" class=\"player-status-tag\" data-status=\"idle\" data-i18n=\"playerStatusIdle\"></span></li>
                </ul>
              </section>
              <section class=\"world-map-panel detail-panel\" id=\"map-detail-panel\">
              <h3 data-i18n=\"mapDetailPanelTitle\"></h3>
              <div id=\"map-detail-cards\">{''.join(detail_cards)}</div>
            </section>
            <section class=\"world-map-panel home-panel\" id=\"home-panel\">
              <h4 class=\"home-panel-title\" data-i18n=\"homePanelTitle\"></h4>
              <ul class=\"detail-list home-stats\">
                <li><span data-i18n=\"homeStyle\"></span>: <span class=\"home-style-tag home-style-{escape(str(world_state.get('home_style') or 'blank_slate'))}\">{escape(str(world_state.get('home_style') or 'blank_slate').replace('_', ' '))}</span></li>
                <li><span data-i18n=\"homeInventory\"></span>: {escape(str(len(world_state.get('home_inventory') or [])))}</li>
                <li><span data-i18n=\"homeReputation\"></span>: {_home_rep_str}</li>
              </ul>
            </section>
            <section class=\"world-map-panel mythline-panel\" id=\"mythline-panel\">
              <h4 class=\"mythline-panel-title\" data-i18n=\"sectionMythlineThreads\"></h4>
              <p class=\"mythline-lead\" data-i18n=\"mythlineThreadsLead\"></p>
              <ul class=\"detail-list mythline-list\">{_render_mythline_threads_html(showcase.get('mythline_threads') or [])}</ul>
              <h4 class=\"participation-title\" data-i18n=\"sectionParticipationEntries\"></h4>
              <p class=\"participation-lead\" data-i18n=\"participationEntriesLead\"></p>
              <ul class=\"detail-list participation-list\">{_render_participation_entries_html(showcase.get('participation_entries') or [])}</ul>
            </section>
          </aside>
        </div>
      </section>
    """
    return observer_html, default_feature_id


_MYTHLINE_TYPE_I18N: dict[str, str] = {
    "secret_annotation": "mythlineTypeSecretAnnotation",
    "echo_deposit": "mythlineTypeEchoDeposit",
    "history_inscription": "mythlineTypeHistoryInscription",
}


def _render_mythline_threads_html(threads: list[dict[str, Any]]) -> str:
    if not threads:
        return '<li data-i18n="noMythlineThreads"></li>'
    parts: list[str] = []
    for thread in threads:
        ttype = thread.get("type") or ""
        i18n_key = _MYTHLINE_TYPE_I18N.get(ttype, "unknown")
        title = escape(str(thread.get("title") or ""))
        hint = escape(str(thread.get("participation_hint") or ""))
        status = escape(str(thread.get("status") or "open"))
        parts.append(
            f'<li class="mythline-item mythline-{escape(ttype)}">'
            f'<span class="mythline-type-badge" data-i18n="{i18n_key}"></span> '
            f"<strong>{title}</strong>"
            f'<br><small class="mythline-hint">{hint}</small>'
            f'<span class="mythline-status mythline-status-{status}">{status}</span>'
            "</li>"
        )
    return "".join(parts)


def _render_participation_entries_html(entries: list[dict[str, Any]]) -> str:
    if not entries:
        return '<li data-i18n="noParticipationEntries"></li>'
    parts: list[str] = []
    for entry in entries:
        action = escape(str(entry.get("action") or ""))
        label_en = escape(str(entry.get("label_en") or ""))
        label_zh = escape(str(entry.get("label_zh") or ""))
        reward = escape(str(entry.get("reward_hint") or ""))
        count = escape(str(entry.get("target_count") or ""))
        parts.append(
            f'<li class="participation-item participation-{action}">'
            f'<strong class="participation-label" data-label-en="{label_en}" data-label-zh="{label_zh}">{label_en}</strong>'
            f'<span class="participation-count">×{count}</span>'
            f'<br><small class="participation-reward">{reward}</small>'
            "</li>"
        )
    return "".join(parts)


def _render_preview_html(world: dict[str, Any], showcase: dict[str, Any], manifest: dict[str, Any]) -> str:
    summary = showcase.get("summary") or {}
    reality = showcase.get("reality_skeleton") or {}
    world_state = showcase.get("world_state") or {}
    continuity = showcase.get("continuity_threads") or {}
    co_creation = showcase.get("co_creation_storyline") or {}
    faction = showcase.get("faction_spotlight") or {}
    playable_hooks = showcase.get("playable_hooks") or []
    hooks = showcase.get("hooks") or {}
    localized_value = _localized_html

    translations = {
        "zh-CN": {
            "pageTitleSuffix": "FableMap 预览页",
            "languageLabel": "语言 / Language",
            "untitledDistrict": "未命名区域",
            "noNarrativeSummary": "暂时还没有叙事摘要。",
            "tagWorld": "世界",
            "tagTheme": "主题",
            "tagAtmosphere": "氛围",
            "tagBundleVersion": "包版本",
            "sectionMapObserver": "2D 世界地图主舞台",
            "mapObserverLead": "当前浏览器入口已经改为地图舞台优先：道路构成骨架，POI 与地标作为世界对象直接落在同一张 2D 地图上。",
            "mapObserverNote": "当前采用局部经纬度归一化，只适用于 nearby 小范围世界观察，不等于完整 GIS 投影系统。",
            "mapLegendArterial": "主干道",
            "mapLegendStreet": "街道",
            "mapLegendPath": "步行路",
            "mapLegendPois": "POI 节点",
            "mapLegendLandmarks": "地标记忆点",
            "semanticZoomTitle": "语义缩放",
            "semanticZoomSurvey": "总览骨架",
            "semanticZoomDistrict": "区域脉冲",
            "semanticZoomIntimate": "街区低语",
            "mapDetailPanelTitle": "地点详情",
            "detailOverviewKicker": "世界概览",
            "mapDetailHint": "点选地图上的 POI 或地标，右侧会切换为对应详情。",
            "detailRoadCount": "道路数",
            "detailPoiCount": "POI 数",
            "detailLandmarkCount": "地标数",
            "detailActiveLens": "观察镜头",
            "detailDisturbance": "扰动等级",
            "detailDisturbanceMetrics": "动态扰动指标",
            "detailSocialTension": "社会张力",
            "detailCommerceFlux": "贸易流强",
            "detailAnomalyPressure": "异常压力",
            "detailSpawnWindow": "刷新窗口",
            "detailComfortLevel": "地区治愈度",
            "detailSpriteCount": "可收集精灵",
            "detailAnchorCount": "情感锚点",
            "detailPlayerStats": "玩家状态",
            "detailPlayerPos": "当前位置",
            "detailPlayerStatus": "行动状态",
            "playerStatusIdle": "驻足",
            "playerStatusMoving": "跋涉中",
            "broadcastBarTitle": "世界播报",
            "detailEchoTitle": "历史回声",
            "homePanelTitle": "镜像家园",
            "homeStyle": "家园风格",
            "homeInventory": "收藏数量",
            "homeReputation": "阵营好感",
            "detailPoiKicker": "POI",
            "detailLandmarkKicker": "地标",
            "detailType": "类型",
            "detailRealName": "现实名称",
            "detailFaction": "阵营",
            "detailState": "当前状态",
            "detailDescription": "描述",
            "sectionReality": "现实骨架",
            "realityProvider": "来源",
            "realityCoordinates": "坐标",
            "realityRadius": "半径（米）",
            "realityLanduse": "主导用地",
            "realitySourceElements": "源元素数",
            "realityMappedPois": "已映射 POI",
            "realityRoads": "道路数",
            "sectionWorldState": "世界状态",
            "stateDominantFaction": "主导阵营",
            "stateControlScore": "控制度",
            "stateStrategicValue": "战略价值",
            "stateSocialTension": "社会张力",
            "stateCommerceFlux": "商业流动",
            "stateDisturbance": "扰动等级",
            "stateAnomalyPressure": "异常压力",
            "stateActiveLens": "观察镜头",
            "stateSpawnWindow": "生成窗口",
            "stateVisitStatus": "访问状态",
            "stateMysteryProgress": "谜团进度",
            "sectionContinuity": "持续线索",
            "continuityCounts": "记忆锚点 / 回响 / 精灵",
            "continuityMemory": "记忆",
            "continuityEcho": "历史回响",
            "continuitySprite": "精灵信号",
            "sectionFaction": "阵营聚焦",
            "factionInfluence": "影响力",
            "sectionPoiHighlights": "重点 POI",
            "sectionLandmarkHooks": "地标钩子",
            "sectionPlayableHooks": "可玩钩子",
            "sectionCoCreation": "共创主线",
            "coCreationStage": "城市神话阶段",
            "coCreationMode": "参与模式",
            "coCreationThread": "开放线索",
            "coCreationWritingRights": "写回权限",
            "sectionMythlineThreads": "神话线索",
            "mythlineThreadsLead": "这里汇总地点秘闻、记忆锚点与历史回声，告诉玩家这片街区的故事从哪里进入。",
            "sectionParticipationEntries": "参与入口",
            "participationEntriesLead": "这些入口把观测、记录、收集与情绪沉积组织成可理解的共创行动。",
            "noMythlineThreads": "暂无神话线索。",
            "noParticipationEntries": "暂无参与入口。",
            "mythlineTypeSecretAnnotation": "隐秘注记",
            "mythlineTypeEchoDeposit": "回声沉积",
            "mythlineTypeHistoryInscription": "历史铭刻",
            "sectionPresentation": "表现提示",
            "presentationVisualStyle": "视觉风格",
            "presentationPaletteHint": "色板提示",
            "presentationComfortLevel": "舒适度",
            "presentationAnomalyPressure": "异常压力",
            "sectionBundleFiles": "Bundle 文件",
            "primaryPreviewSlot": "主预览入口",
            "noHighlightedPois": "暂无重点 POI。",
            "noHighlightedLandmarks": "暂无重点地标。",
            "unknown": "未知",
            "unknownPoi": "未知 POI",
            "unknownLandmark": "未知地标",
            "unknownFaction": "未知阵营",
            "unknownArchetype": "未知原型",
            "unknownType": "未知类型",
            "noHook": "暂无钩子。",
            "noDescription": "暂无描述。",
            "noDoctrine": "暂无教义。",
        },
        "en": {
            "pageTitleSuffix": "FableMap Preview",
            "languageLabel": "Language / 语言",
            "untitledDistrict": "Untitled District",
            "noNarrativeSummary": "No narrative summary available.",
            "tagWorld": "world",
            "tagTheme": "theme",
            "tagAtmosphere": "atmosphere",
            "tagBundleVersion": "bundle v",
            "sectionMapObserver": "2D World Map Stage",
            "mapObserverLead": "The browser entry is now map-stage-first: roads form the spatial skeleton while POIs and landmarks land on the same 2D world map as selectable world objects.",
            "mapObserverNote": "This view uses local lat/lon normalization for nearby-scale observation only; it is not a full GIS projection system.",
            "mapLegendArterial": "Arterial roads",
            "mapLegendStreet": "Streets",
            "mapLegendPath": "Footways",
            "mapLegendPois": "POI nodes",
            "mapLegendLandmarks": "Landmark memory points",
            "semanticZoomTitle": "Semantic Zoom",
            "semanticZoomSurvey": "Survey Skeleton",
            "semanticZoomDistrict": "District Pulse",
            "semanticZoomIntimate": "Street Whisper",
            "mapDetailPanelTitle": "Location Details",
            "detailOverviewKicker": "World Overview",
            "mapDetailHint": "Select a POI or landmark on the map to switch the detail panel.",
            "detailRoadCount": "Road count",
            "detailPoiCount": "POI count",
            "detailLandmarkCount": "Landmark count",
            "detailActiveLens": "Active lens",
            "detailDisturbance": "Disturbance",
            "detailDisturbanceMetrics": "Disturbance Metrics",
            "detailSocialTension": "Social tension",
            "detailCommerceFlux": "Commerce flux",
            "detailAnomalyPressure": "Anomaly pressure",
            "detailSpawnWindow": "Spawn window",
            "detailComfortLevel": "Comfort level",
            "detailSpriteCount": "Collectable sprites",
            "detailAnchorCount": "Memory anchors",
            "detailPlayerStats": "Player Stats",
            "detailPlayerPos": "Position",
            "detailPlayerStatus": "Status",
            "playerStatusIdle": "Idle",
            "playerStatusMoving": "Moving",
            "broadcastBarTitle": "World Broadcast",
            "detailEchoTitle": "Historical Echo",
            "homePanelTitle": "Mirror Home",
            "homeStyle": "Home style",
            "homeInventory": "Inventory",
            "homeReputation": "Reputation",
            "detailPoiKicker": "POI",
            "detailLandmarkKicker": "Landmark",
            "detailType": "Type",
            "detailRealName": "Real name",
            "detailFaction": "Faction",
            "detailState": "Current state",
            "detailDescription": "Description",
            "sectionReality": "Reality Skeleton",
            "realityProvider": "Provider",
            "realityCoordinates": "Coordinates",
            "realityRadius": "Radius (m)",
            "realityLanduse": "Dominant landuse",
            "realitySourceElements": "Source elements",
            "realityMappedPois": "Mapped POIs",
            "realityRoads": "Roads",
            "sectionWorldState": "World State",
            "stateDominantFaction": "Dominant faction",
            "stateControlScore": "Control score",
            "stateStrategicValue": "Strategic value",
            "stateSocialTension": "Social tension",
            "stateCommerceFlux": "Commerce flux",
            "stateDisturbance": "Disturbance",
            "stateAnomalyPressure": "Anomaly pressure",
            "stateActiveLens": "Active lens",
            "stateSpawnWindow": "Spawn window",
            "stateVisitStatus": "Visit status",
            "stateMysteryProgress": "Mystery progress",
            "sectionContinuity": "Continuity Threads",
            "continuityCounts": "Memory anchors / echoes / sprites",
            "continuityMemory": "Memory",
            "continuityEcho": "Echo",
            "continuitySprite": "Sprite signal",
            "sectionFaction": "Faction Spotlight",
            "factionInfluence": "Influence",
            "sectionPoiHighlights": "Highlight POIs",
            "sectionLandmarkHooks": "Landmark Hooks",
            "sectionPlayableHooks": "Playable Hooks",
            "sectionCoCreation": "Co-Creation Storyline",
            "coCreationStage": "City myth stage",
            "coCreationMode": "Participation mode",
            "coCreationThread": "Open thread",
            "coCreationWritingRights": "Writing rights",
            "sectionMythlineThreads": "Mythline Threads",
            "mythlineThreadsLead": "These threads gather hidden place notes, memory anchors, and historical echoes into clear narrative entry points.",
            "sectionParticipationEntries": "Participation Entries",
            "participationEntriesLead": "These entries frame observation, recording, collection, and emotional deposits as readable co-creation actions.",
            "noMythlineThreads": "No mythline threads.",
            "noParticipationEntries": "No participation entries.",
            "mythlineTypeSecretAnnotation": "Secret Annotation",
            "mythlineTypeEchoDeposit": "Echo Deposit",
            "mythlineTypeHistoryInscription": "Historical Inscription",
            "sectionPresentation": "Presentation Hooks",
            "presentationVisualStyle": "Visual style",
            "presentationPaletteHint": "Palette hint",
            "presentationComfortLevel": "Comfort level",
            "presentationAnomalyPressure": "Anomaly pressure",
            "sectionBundleFiles": "Bundle Files",
            "primaryPreviewSlot": "Primary preview slot",
            "noHighlightedPois": "No highlighted POIs.",
            "noHighlightedLandmarks": "No highlighted landmarks.",
            "unknown": "unknown",
            "unknownPoi": "Unknown POI",
            "unknownLandmark": "Unknown Landmark",
            "unknownFaction": "Unknown faction",
            "unknownArchetype": "unknown archetype",
            "unknownType": "unknown type",
            "noHook": "No hook.",
            "noDescription": "No description.",
            "noDoctrine": "No doctrine.",
        },
    }
    translations_json = json.dumps(translations, ensure_ascii=False)
    map_observer_html, default_feature_id = _render_map_observer_html(world, showcase, world_state)
    default_feature_id_json = json.dumps(default_feature_id, ensure_ascii=False)

    poi_highlights = showcase.get("poi_highlights") or []
    poi_items = (
        "".join(
            f"<li><strong>{localized_value(item.get('fantasy_name'), 'unknownPoi')}</strong> "
            f"<span>{localized_value(item.get('fantasy_type'), 'unknownType')}</span><br>"
            f"<small>{localized_value(item.get('emotion_hook'), 'noHook')}</small></li>"
            for item in poi_highlights
        )
        if poi_highlights
        else '<li data-i18n="noHighlightedPois"></li>'
    )
    landmark_highlights = showcase.get("landmark_highlights") or []
    landmark_items = (
        "".join(
            f"<li><strong>{localized_value(item.get('name'), 'unknownLandmark')}</strong> "
            f"<span>{localized_value(item.get('type'), 'unknownType')}</span><br>"
            f"<small>{localized_value(item.get('description'), 'noDescription')}</small></li>"
            for item in landmark_highlights
        )
        if landmark_highlights
        else '<li data-i18n="noHighlightedLandmarks"></li>'
    )
    continuity_items: list[str] = [
        '<li><span data-i18n="continuityCounts"></span>: '
        f"{escape(str(continuity.get('memory_anchor_count') or 0))} / "
        f"{escape(str(continuity.get('historical_echo_count') or 0))} / "
        f"{escape(str(continuity.get('sprite_count') or 0))}</li>"
    ]
    for item in continuity.get("memory_threads") or []:
        linked = ", ".join(str(value) for value in (item.get("linked_pois") or []) if value)
        continuity_items.append(
            f'<li><strong><span data-i18n="continuityMemory"></span></strong>: '
            f"{localized_value(item.get('anchor_type'))} / {localized_value(item.get('tone'))} / {localized_value(item.get('visibility'))}"
            f"<br><small>{escape(linked) if linked else localized_value(None)}</small></li>"
        )
    for item in continuity.get("historical_threads") or []:
        continuity_items.append(
            f'<li><strong><span data-i18n="continuityEcho"></span></strong>: '
            f"{localized_value(item.get('source_type'))} / {localized_value(item.get('severity'))}"
            f"<br><small>{localized_value(item.get('summary'), 'noDescription')}</small></li>"
        )
    for item in continuity.get("sprite_signals") or []:
        drop_tags = ", ".join(str(value) for value in (item.get("drop_tags") or []) if value)
        detail = localized_value(item.get("linked_poi"))
        if drop_tags:
            detail = f"{detail} / {escape(drop_tags)}"
        continuity_items.append(
            f'<li><strong><span data-i18n="continuitySprite"></span></strong>: '
            f"{localized_value(item.get('species'))} / {localized_value(item.get('rarity'))}"
            f"<br><small>{detail}</small></li>"
        )
    continuity_html = "".join(continuity_items)
    co_creation_items = [
        f'<li><span data-i18n="coCreationStage"></span>: {localized_value(co_creation.get("city_myth_stage"))}</li>',
        f'<li><span data-i18n="coCreationWritingRights"></span>: {localized_value(", ".join(sorted((co_creation.get("writing_rights") or {}).keys())) or None)}</li>',
    ]
    for item in co_creation.get("participation_modes") or []:
        co_creation_items.append(
            f'<li><strong><span data-i18n="coCreationMode"></span></strong>: '
            f'{escape(str(item.get("name") or "—"))} ({escape(str(item.get("visibility") or "—"))} / {escape(str(item.get("status") or "—"))})'
            f'<br><small>{escape(str(item.get("player_action") or "—"))}</small></li>'
        )
    for item in co_creation.get("open_threads") or []:
        co_creation_items.append(
            f'<li><strong><span data-i18n="coCreationThread"></span></strong>: '
            f'{escape(str(item.get("title") or "—"))} ({escape(str(item.get("visibility") or "—"))})'
            f'<br><small>{escape(str(item.get("goal") or "—"))}</small></li>'
        )
    co_creation_html = "".join(co_creation_items)
    playable_hook_items = (
        "".join(f"<li>{escape(str(item))}</li>" for item in playable_hooks)
        if playable_hooks
        else '<li data-i18n="noHook"></li>'
    )
    subtitle_html = f"<p>{escape(showcase.get('subtitle') or '')}</p>" if showcase.get("subtitle") else ""
    if showcase.get("narrative_summary"):
        narrative_html = f"<p>{escape(showcase.get('narrative_summary') or '')}</p>"
    else:
        narrative_html = '<p data-i18n="noNarrativeSummary"></p>'
    faction_html = ""
    if faction:
        faction_html = (
            '<section class="panel"><h2 data-i18n="sectionFaction"></h2>'
            f"<p><strong>{localized_value(faction.get('name'), 'unknownFaction')}</strong> "
            f"({localized_value(faction.get('archetype'), 'unknownArchetype')})</p>"
            f"<p>{localized_value(faction.get('doctrine'), 'noDoctrine')}</p>"
            f"<p><span data-i18n=\"factionInfluence\"></span>: {localized_value(faction.get('influence'))}</p></section>"
        )

    return f"""<!doctype html>
<html lang=\"en\">
  <head>
    <meta charset=\"utf-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">
    <title>{escape(showcase.get('title') or 'FableMap Preview')}</title>
    <style>
      :root {{ color-scheme: dark; }}
      body {{ margin: 0; min-height: 100vh; font-family: Segoe UI, Arial, sans-serif; background: radial-gradient(circle at top, #1e293b 0%, #0f172a 32%, #020617 100%); color: #e5e7eb; }}
      .wrap {{ max-width: 1440px; margin: 0 auto; padding: 20px 20px 36px; }}
      .world-shell {{ display: flex; flex-direction: column; gap: 20px; }}
      .hero {{ padding: 18px 20px; border-radius: 20px; background: linear-gradient(135deg, rgba(30, 41, 59, 0.92), rgba(15, 23, 42, 0.96)); border: 1px solid #334155; box-shadow: 0 24px 60px rgba(2, 6, 23, 0.28); }}
      .hero-top {{ display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; }}
      .hero h1 {{ margin: 0 0 8px; font-size: clamp(28px, 3.4vw, 40px); }}
      .hero p {{ margin: 6px 0; line-height: 1.55; max-width: 920px; }}
      .language-switcher {{ min-width: 180px; display: flex; flex-direction: column; gap: 8px; }}
      .language-switcher label {{ font-size: 13px; color: #cbd5e1; }}
      .language-switcher select {{ border-radius: 10px; border: 1px solid #475569; background: #111827; color: #e5e7eb; padding: 10px 12px; font: inherit; }}
      .world-map-stage {{ display: flex; flex-direction: column; gap: 16px; padding: 18px; border-radius: 24px; min-height: clamp(560px, 74vh, 900px); background: linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(2, 6, 23, 0.96)); border: 1px solid #334155; box-shadow: 0 28px 80px rgba(2, 6, 23, 0.38); }}
      .world-map-stage-head {{ display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }}
      .world-map-titleblock h2 {{ margin: 0 0 8px; font-size: 24px; }}
      .world-map-titleblock p {{ margin: 0; color: #cbd5e1; line-height: 1.55; max-width: 760px; }}
      .world-map-stage-body {{ display: grid; grid-template-columns: minmax(0, 2.2fr) minmax(320px, 0.95fr); gap: 16px; align-items: stretch; flex: 1; min-height: 0; }}
      .observer-legend {{ display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px; }}
      .legend-item {{ display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 999px; background: #0f172a; border: 1px solid #334155; font-size: 12px; }}
      .legend-swatch {{ width: 10px; height: 10px; border-radius: 999px; display: inline-block; }}
      .legend-swatch.road-arterial {{ background: #7dd3fc; }}
      .legend-swatch.road-street {{ background: #67e8f9; }}
      .legend-swatch.road-path {{ background: #a5f3fc; border: 1px dashed #67e8f9; }}
      .legend-swatch.poi {{ background: #38bdf8; }}
      .legend-swatch.landmark {{ background: #fbbf24; }}
      .world-map-viewport {{ min-height: 0; display: flex; flex-direction: column; gap: 12px; padding: 14px; background: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(2, 6, 23, 0.98)); border: 1px solid #334155; border-radius: 20px; }}
      #observer-map {{ width: 100%; height: 100%; min-height: 520px; display: block; cursor: grab; user-select: none; -webkit-user-select: none; touch-action: none; }}
      #observer-map.is-panning {{ cursor: grabbing; }}
      .map-backdrop {{ fill: #020617; stroke: #334155; stroke-width: 2; }}
      .map-floor-tiles {{ fill: url(#floor-grid); opacity: 0.22; pointer-events: none; }}
      .map-floor-grid {{ fill: none; stroke: rgba(148, 163, 184, 0.18); stroke-width: 1; }}
      .map-district-glow {{ fill: url(#map-backdrop-glow); opacity: 0.95; pointer-events: none; }}
      .map-road, .map-road-shadow, .map-road-center {{ fill: none; stroke-linecap: round; stroke-linejoin: round; }}
      .map-road-shadow {{ stroke: rgba(15, 23, 42, 0.92); }}
      .map-road-center {{ stroke: rgba(255, 255, 255, 0.22); stroke-dasharray: 10 14; }}
      .map-road {{ stroke-opacity: 0.92; }}
      .map-road-shadow-arterial {{ stroke-width: 12; }}
      .map-road-shadow-street {{ stroke-width: 8; }}
      .map-road-shadow-path {{ stroke-width: 5; }}
      .map-road-arterial {{ stroke: #60a5fa; stroke-width: 8; }}
      .map-road-street {{ stroke: #334155; stroke-width: 5; }}
      .map-road-path {{ stroke: #475569; stroke-width: 2.5; }}
      .map-road-center-arterial {{ stroke-width: 1.6; }}
      .map-road-center-street {{ stroke-width: 1.1; opacity: 0.5; }}
      .map-road-center-path {{ stroke-width: 0.8; opacity: 0.18; stroke-dasharray: 4 10; }}
      .map-feature {{ cursor: pointer; outline: none; transition: transform 0.15s ease, filter 0.15s ease; }}
      .map-feature.is-active, .map-feature:focus-visible {{ transform: translateY(-2px) scale(1.06); transform-origin: center; transform-box: fill-box; filter: drop-shadow(0 10px 16px rgba(15, 23, 42, 0.42)); }}
      .map-tooltip {{ position: fixed; pointer-events: none; z-index: 100; padding: 6px 10px; background: rgba(15,23,42,0.95); border: 1px solid #475569; border-radius: 8px; font-size: 12px; color: #e2e8f0; white-space: nowrap; opacity: 0; transition: opacity 0.12s ease; box-shadow: 0 4px 16px rgba(0,0,0,0.4); }}
      .map-tooltip.is-visible {{ opacity: 1; }}
      .semantic-zoom-indicator {{ position: absolute; top: 12px; left: 12px; z-index: 2; display: inline-flex; align-items: baseline; gap: 8px; padding: 8px 12px; border-radius: 999px; border: 1px solid #334155; background: rgba(15, 23, 42, 0.88); color: #e2e8f0; box-shadow: 0 8px 24px rgba(2, 6, 23, 0.28); transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease; pointer-events: none; }}
      .semantic-zoom-label {{ font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; }}
      #semantic-zoom-value {{ font-size: 13px; line-height: 1; }}
      .semantic-zoom-indicator[data-zoom-tier="survey"] {{ border-color: #334155; color: #cbd5e1; }}
      .semantic-zoom-indicator[data-zoom-tier="district"] {{ border-color: #0ea5e9; color: #bae6fd; background: rgba(8, 47, 73, 0.78); }}
      .semantic-zoom-indicator[data-zoom-tier="intimate"] {{ border-color: #c084fc; color: #f5d0fe; background: rgba(59, 7, 100, 0.78); }}
      .map-zoom-controls {{ display: flex; gap: 6px; position: absolute; top: 12px; right: 12px; z-index: 2; pointer-events: auto; }}
      .map-zoom-btn {{ width: 32px; height: 32px; border-radius: 8px; border: 1px solid #475569; background: rgba(15,23,42,0.9); color: #e2e8f0; font-size: 18px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.15s, opacity 0.15s; }}
      .map-zoom-btn:hover {{ background: rgba(30,41,59,0.98); }}
      .map-zoom-btn:disabled {{ opacity: 0.45; cursor: not-allowed; }}
      .world-map-canvas {{ flex: 1; min-height: 0; position: relative; overflow: hidden; }}
      .map-feature text {{ fill: #0f172a; font-size: 10px; font-weight: 700; pointer-events: none; opacity: 0.66; transition: opacity 0.15s ease, font-size 0.15s ease, letter-spacing 0.15s ease; }}
      .poi-shadow, .landmark-shadow {{ fill: rgba(2, 6, 23, 0.4); pointer-events: none; }}
      .poi-base {{ fill: #334155; stroke: rgba(148, 163, 184, 0.3); stroke-width: 1.2; }}
      .poi-roof {{ fill: #475569; stroke: rgba(226, 232, 240, 0.26); stroke-width: 1; }}
      .poi-door {{ fill: rgba(15, 23, 42, 0.78); }}
      .poi-icon {{ fill: #e2e8f0; pointer-events: none; }}
      .landmark-base {{ fill: #2d1b0e; stroke: rgba(251, 191, 36, 0.35); stroke-width: 1.2; }}
      .landmark-roof {{ fill: #92400e; }}
      .landmark-spire {{ fill: #fbbf24; filter: drop-shadow(0 0 5px rgba(251, 191, 36, 0.35)); }}
      .landmark-icon {{ fill: #fde68a; pointer-events: none; }}
      .map-ft-whispering_grove .poi-base {{ fill: #123129; }}
      .map-ft-whispering_grove .poi-roof {{ fill: #166534; }}
      .map-ft-whispering_grove .poi-icon {{ fill: #bbf7d0; }}
      .map-ft-healing_sanctum .poi-base {{ fill: #1f3645; }}
      .map-ft-healing_sanctum .poi-roof {{ fill: #155e75; }}
      .map-ft-healing_sanctum .poi-icon {{ fill: #e0f2fe; }}
      .map-ft-supply_outpost .poi-base {{ fill: #3f3f46; }}
      .map-ft-supply_outpost .poi-roof {{ fill: #9a3412; }}
      .map-ft-supply_outpost .poi-icon {{ fill: #fdba74; }}
      .map-ft-judgement_tower .poi-base {{ fill: #312e81; }}
      .map-ft-judgement_tower .poi-roof {{ fill: #6d28d9; }}
      .map-ft-judgement_tower .poi-icon {{ fill: #ddd6fe; }}
      .map-ft-ember_parlor .poi-base {{ fill: #3b2414; }}
      .map-ft-ember_parlor .poi-roof {{ fill: #be123c; }}
      .map-ft-ember_parlor .poi-icon {{ fill: #fecdd3; }}
      .map-ft-lore_academy .poi-base {{ fill: #27272a; }}
      .map-ft-lore_academy .poi-roof {{ fill: #a16207; }}
      .map-ft-lore_academy .poi-icon {{ fill: #fef08a; }}
      .map-feature.is-active .poi-roof, .map-feature:focus-visible .poi-roof {{ filter: brightness(1.18); }}
      .map-feature.is-active .poi-base, .map-feature:focus-visible .poi-base {{ stroke: rgba(125, 211, 252, 0.75); stroke-width: 2; }}
      .map-feature.is-active .landmark-spire, .map-feature:focus-visible .landmark-spire {{ filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.62)); }}
      .map-feature.is-active .landmark-base, .map-feature:focus-visible .landmark-base {{ stroke-width: 2; }}
      .world-map-viewport[data-zoom-tier="survey"] .map-feature text {{ opacity: 0.28; letter-spacing: 0.02em; }}
      .world-map-viewport[data-zoom-tier="survey"] .poi-plot,
      .world-map-viewport[data-zoom-tier="survey"] .landmark-plot {{ transform: scale(0.94); transform-origin: center; transform-box: fill-box; opacity: 0.92; }}
      .world-map-viewport[data-zoom-tier="survey"] .echo-node,
      .world-map-viewport[data-zoom-tier="survey"] .capsule-mark,
      .world-map-viewport[data-zoom-tier="survey"] .sprite-node,
      .world-map-viewport[data-zoom-tier="survey"] .home-anchor {{ opacity: 0.42; }}
      .world-map-viewport[data-zoom-tier="district"] .map-feature text {{ opacity: 0.74; }}
      .world-map-viewport[data-zoom-tier="district"] .poi-plot,
      .world-map-viewport[data-zoom-tier="district"] .landmark-plot {{ filter: drop-shadow(0 0 8px rgba(56, 189, 248, 0.2)); }}
      .world-map-viewport[data-zoom-tier="intimate"] .map-feature text {{ opacity: 1; font-size: 11px; }}
      .world-map-viewport[data-zoom-tier="intimate"] .poi-plot,
      .world-map-viewport[data-zoom-tier="intimate"] .landmark-plot {{ transform: scale(1.08); transform-origin: center; transform-box: fill-box; filter: drop-shadow(0 0 12px rgba(192, 132, 252, 0.28)); }}
      .world-map-viewport[data-zoom-tier="intimate"] .echo-node,
      .world-map-viewport[data-zoom-tier="intimate"] .capsule-mark,
      .world-map-viewport[data-zoom-tier="intimate"] .sprite-node,
      .world-map-viewport[data-zoom-tier="intimate"] .home-anchor {{ opacity: 1; }}
      .comfort-aura {{ pointer-events: none; }}
      .sprite-node {{ pointer-events: none; transition: opacity 0.15s ease; }}
      .sprite-gem {{ filter: drop-shadow(0 0 5px currentColor); }}
      .sprite-core {{ pointer-events: none; }}
      .anchor-node {{ pointer-events: none; }}
      .anchor-heart {{ fill: #fb7185; filter: drop-shadow(0 0 3px #fb7185); }}
      .echo-node {{ pointer-events: none; transition: opacity 0.15s ease; }}
      .echo-text {{ font-size: 9px; fill: #94a3b8; font-style: italic; }}
      .capsule-mark {{ pointer-events: none; transition: opacity 0.15s ease; }}
      .capsule-bubble {{ fill: #818cf8; filter: drop-shadow(0 0 3px #818cf8); }}
      .capsule-dot {{ fill: white; opacity: 0.8; pointer-events: none; }}
      .echo-panel {{ margin-top: 12px; border-top: 1px solid #1e293b; padding-top: 8px; }}
      .echo-panel-title {{ margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }}
      .echo-summary {{ margin: 0; font-size: 12px; color: #94a3b8; font-style: italic; line-height: 1.6; }}
      .home-anchor {{ pointer-events: none; transition: opacity 0.15s ease; }}
      .home-aura {{ pointer-events: none; }}
      .home-icon {{ pointer-events: none; filter: drop-shadow(0 0 4px currentColor); }}
        .player-status-tag[data-status="moving"] {{ color: #38bdf8; }}
        .player-entity {{ transition: transform 0.1s linear; pointer-events: none; }}
        .player-aura {{ fill: #38bdf8; opacity: 0.15; filter: blur(4px); }}
        .player-icon {{ fill: #38bdf8; filter: drop-shadow(0 0 5px #38bdf8); }}
        .player-panel {{ margin-bottom: 0; }}
        .player-panel-title {{ margin: 0 0 10px; font-size: 14px; }}
        .player-stats {{ padding-left: 0; list-style: none; margin: 0; display: flex; flex-direction: column; gap: 6px; }}
        .home-panel {{ margin-top: 0; }}
      .home-panel-title {{ margin: 0 0 10px; font-size: 14px; }}
      .home-stats {{ padding-left: 0; list-style: none; margin: 0; display: flex; flex-direction: column; gap: 6px; }}
      .home-style-tag {{ font-weight: 600; text-transform: capitalize; }}
      .home-style-verdant_nest {{ color: #4ade80; }}
      .home-style-warm_corner {{ color: #fbbf24; }}
      .home-style-blank_slate {{ color: #94a3b8; }}
      .mythline-panel {{ border-top: 1px solid #1e293b; padding-top: 14px; margin-top: 4px; }}
      .mythline-panel-title {{ margin: 0 0 6px; font-size: 14px; color: #c4b5fd; }}
      .mythline-lead {{ margin: 0 0 10px; font-size: 11px; color: #64748b; line-height: 1.5; }}
      .mythline-list {{ padding-left: 0; list-style: none; margin: 0 0 14px; display: flex; flex-direction: column; gap: 8px; }}
      .mythline-item {{ font-size: 12px; color: #cbd5e1; background: rgba(139, 92, 246, 0.06); border: 1px solid rgba(139, 92, 246, 0.18); border-radius: 8px; padding: 7px 10px; display: flex; flex-direction: column; gap: 3px; }}
      .mythline-type-badge {{ display: inline-block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #a78bfa; margin-bottom: 2px; }}
      .mythline-hint {{ color: #64748b; font-style: italic; }}
      .mythline-status {{ display: inline-block; margin-top: 3px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; padding: 1px 6px; border-radius: 999px; }}
      .mythline-status-open {{ background: rgba(99, 102, 241, 0.2); color: #818cf8; }}
      .mythline-status-seeded {{ background: rgba(251, 191, 36, 0.15); color: #fbbf24; }}
      .participation-title {{ margin: 10px 0 6px; font-size: 14px; color: #6ee7b7; }}
      .participation-lead {{ margin: 0 0 10px; font-size: 11px; color: #64748b; line-height: 1.5; }}
      .participation-list {{ padding-left: 0; list-style: none; margin: 0; display: flex; flex-direction: column; gap: 8px; }}
      .participation-item {{ font-size: 12px; color: #cbd5e1; background: rgba(52, 211, 153, 0.05); border: 1px solid rgba(52, 211, 153, 0.15); border-radius: 8px; padding: 7px 10px; }}
      .participation-label {{ display: block; margin-bottom: 2px; }}
      .participation-count {{ font-size: 11px; color: #6ee7b7; margin-left: 6px; }}
      .participation-reward {{ color: #64748b; font-style: italic; }}
      .poi-status-badge {{ pointer-events: none; }}
      .poi-status-idle {{ fill: #475569; }}
      .poi-status-active {{ fill: #4ade80; filter: drop-shadow(0 0 3px #4ade80); }}
      .poi-status-anomaly {{ fill: #f87171; filter: drop-shadow(0 0 4px #f87171); animation: anomaly-pulse 1.2s ease-in-out infinite; }}
      @keyframes anomaly-pulse {{ 0%,100% {{ opacity: 1; }} 50% {{ opacity: 0.35; }} }}
      .disturbance-aura {{ pointer-events: none; mix-blend-mode: screen; }}
      .npc-agent-dot {{ pointer-events: none; }}
      .disturbance-panel {{ margin-top: 14px; border-top: 1px solid #1e293b; padding-top: 10px; }}
      .disturbance-panel-title {{ margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }}
      .disturbance-metrics {{ padding-left: 0; list-style: none; margin-top: 0; display: flex; flex-direction: column; gap: 6px; }}
      .disturbance-metrics li {{ display: flex; align-items: center; gap: 8px; font-size: 12px; color: #94a3b8; }}
      .metric-bar-wrap {{ display: inline-block; width: 40px; height: 4px; background: #1e293b; border-radius: 2px; overflow: hidden; }}
      .metric-bar {{ display: block; height: 4px; background: #38bdf8; border-radius: 2px; max-width: 40px; }}
      .metric-bar.commerce {{ background: #fb923c; }}
      .metric-bar.anomaly {{ background: #a78bfa; }}
      .map-note {{ margin: 12px 4px 0; color: #94a3b8; font-size: 13px; line-height: 1.5; }}
      .world-broadcast-bar {{ display: flex; align-items: center; gap: 10px; margin-top: 10px; padding: 7px 12px; background: rgba(2,6,23,0.85); border: 1px solid #1e293b; border-radius: 10px; overflow: hidden; min-height: 32px; }}
      .broadcast-label {{ flex-shrink: 0; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #38bdf8; white-space: nowrap; padding-right: 8px; border-right: 1px solid #1e3a5f; }}
      .broadcast-scroll-wrap {{ flex: 1; overflow: hidden; position: relative; }}
      .broadcast-track {{ display: inline-flex; align-items: center; gap: 0; white-space: nowrap; animation: broadcast-scroll 38s linear infinite; }}
      .broadcast-track:hover {{ animation-play-state: paused; }}
      .broadcast-item {{ font-size: 12px; color: #cbd5e1; padding: 0 18px; }}
      .broadcast-sep {{ color: #334155; font-size: 10px; padding: 0 4px; }}
      @keyframes broadcast-scroll {{ from {{ transform: translateX(0); }} to {{ transform: translateX(-50%); }} }}
      .world-map-sidebar {{ display: flex; flex-direction: column; gap: 16px; min-height: 0; }}
      .world-map-panel {{ background: rgba(15, 23, 42, 0.88); border: 1px solid #334155; border-radius: 18px; padding: 18px; }}
      .detail-panel {{ display: flex; flex-direction: column; min-height: 0; }}
      .detail-panel h3 {{ margin-top: 0; margin-bottom: 14px; font-size: 18px; }}
      #map-detail-cards {{ flex: 1; }}
      .detail-card {{ display: none; }}
      .detail-card.is-active {{ display: block; }}
      .detail-card h3 {{ margin: 0 0 8px; font-size: 22px; }}
      .detail-card p {{ margin: 8px 0; line-height: 1.6; }}
      .detail-kicker {{ margin: 0 0 8px; color: #93c5fd; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }}
      .detail-list {{ padding-left: 18px; margin-top: 12px; }}
      .world-secondary-panels {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }}
      .panel {{ background: rgba(31, 41, 55, 0.92); border: 1px solid #374151; border-radius: 16px; padding: 18px; }}
      .panel h2 {{ margin-top: 0; font-size: 20px; }}
      ul {{ padding-left: 18px; margin: 10px 0 0; }}
      li {{ margin: 10px 0; line-height: 1.5; }}
      .meta {{ display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }}
      .tag {{ background: #312e81; border-radius: 999px; padding: 6px 10px; font-size: 12px; }}
      .links a {{ color: #93c5fd; text-decoration: none; margin-right: 12px; }}
      .links a:hover {{ text-decoration: underline; }}
      code {{ color: #c4b5fd; }}
      @media (max-width: 980px) {{
        .world-map-stage {{ min-height: 0; }}
        .world-map-stage-body {{ grid-template-columns: 1fr; }}
        #observer-map {{ min-height: 420px; }}
      }}
      @media (max-width: 720px) {{
        .hero-top {{ flex-direction: column; }}
        .language-switcher {{ min-width: 0; width: 100%; }}
        .world-map-stage-head {{ flex-direction: column; }}
        .observer-legend {{ justify-content: flex-start; }}
        #observer-map {{ min-height: 320px; }}
      }}
    </style>
  </head>
  <body>
    <div class=\"wrap\">
      <main class=\"world-shell\">
        <section class=\"hero\" id=\"world-hud\">
          <div class=\"hero-top\">
            <div>
              <h1 id=\"hero-title\"{' data-i18n="untitledDistrict"' if not showcase.get('title') else ''}>{escape(showcase.get('title') or '')}</h1>
              {subtitle_html}
              {narrative_html}
            </div>
            <div class=\"language-switcher\">
              <label for=\"language-select\" data-i18n=\"languageLabel\"></label>
              <select id=\"language-select\">
                <option value=\"zh-CN\">中文</option>
                <option value=\"en\">English</option>
              </select>
            </div>
          </div>
          <div class=\"meta\">
            <span class=\"tag\"><span data-i18n=\"tagWorld\"></span>: {localized_value(showcase.get('world_id'))}</span>
            <span class=\"tag\"><span data-i18n=\"tagTheme\"></span>: {localized_value(summary.get('theme'))}</span>
            <span class=\"tag\"><span data-i18n=\"tagAtmosphere\"></span>: {localized_value(summary.get('atmosphere'))}</span>
            <span class=\"tag\"><span data-i18n=\"tagBundleVersion\"></span>{escape(str(manifest.get('bundle_version') or '0'))}</span>
          </div>
        </section>

        {map_observer_html}

        <section class=\"world-secondary-panels\" id=\"world-secondary-panels\">
        <section class=\"panel\" id=\"section-reality\">
          <h2 data-i18n=\"sectionReality\"></h2>
          <ul>
            <li><span data-i18n=\"realityProvider\"></span>: {localized_value(reality.get('provider'))}</li>
            <li><span data-i18n=\"realityCoordinates\"></span>: {localized_value(f"{reality.get('lat')}, {reality.get('lon')}" if reality.get('lat') is not None and reality.get('lon') is not None else None)}</li>
            <li><span data-i18n=\"realityRadius\"></span>: {localized_value(reality.get('radius_m'))}</li>
            <li><span data-i18n=\"realityLanduse\"></span>: {localized_value(reality.get('dominant_landuse'))}</li>
            <li><span data-i18n=\"realitySourceElements\"></span>: {localized_value(reality.get('source_element_count'))}</li>
            <li><span data-i18n=\"realityMappedPois\"></span>: {localized_value(reality.get('mapped_poi_count'))}</li>
            <li><span data-i18n=\"realityRoads\"></span>: {localized_value(reality.get('road_count'))}</li>
          </ul>
        </section>
        <section class=\"panel\" id=\"section-world-state\">
          <h2 data-i18n=\"sectionWorldState\"></h2>
          <ul>
            <li><span data-i18n=\"stateDominantFaction\"></span>: {localized_value(world_state.get('dominant_faction'), 'unknownFaction')}</li>
            <li><span data-i18n=\"stateControlScore\"></span>: {localized_value(world_state.get('control_score'))}</li>
            <li><span data-i18n=\"stateStrategicValue\"></span>: {localized_value(world_state.get('strategic_value'))}</li>
            <li><span data-i18n=\"stateSocialTension\"></span>: {localized_value(world_state.get('social_tension'))}</li>
            <li><span data-i18n=\"stateCommerceFlux\"></span>: {localized_value(world_state.get('commerce_flux'))}</li>
            <li><span data-i18n=\"stateDisturbance\"></span>: {localized_value(world_state.get('disturbance_level'))}</li>
            <li><span data-i18n=\"stateAnomalyPressure\"></span>: {localized_value(world_state.get('anomaly_pressure'))}</li>
            <li><span data-i18n=\"stateActiveLens\"></span>: {localized_value(world_state.get('active_lens'))}</li>
            <li><span data-i18n=\"stateSpawnWindow\"></span>: {localized_value(world_state.get('spawn_window'))}</li>
            <li><span data-i18n=\"stateVisitStatus\"></span>: {localized_value(world_state.get('visit_status'))}</li>
            <li><span data-i18n=\"stateMysteryProgress\"></span>: {localized_value(world_state.get('mystery_progress'))}</li>
          </ul>
        </section>
        {faction_html}
        <section class=\"panel\" id=\"section-continuity\">
          <h2 data-i18n=\"sectionContinuity\"></h2>
          <ul>{continuity_html}</ul>
        </section>
        <section class=\"panel\">
          <h2 data-i18n=\"sectionPoiHighlights\"></h2>
          <ul>{poi_items}</ul>
        </section>
        <section class=\"panel\">
          <h2 data-i18n=\"sectionLandmarkHooks\"></h2>
          <ul>{landmark_items}</ul>
        </section>
        <section class=\"panel\" id=\"section-playable-hooks\">
          <h2 data-i18n=\"sectionPlayableHooks\"></h2>
          <ul>{playable_hook_items}</ul>
        </section>
        <section class=\"panel\" id=\"section-co-creation\">
          <h2 data-i18n=\"sectionCoCreation\"></h2>
          <ul>{co_creation_html}</ul>
        </section>
        <section class=\"panel\">
          <h2 data-i18n=\"sectionPresentation\"></h2>
          <ul>
            <li><span data-i18n=\"presentationVisualStyle\"></span>: {localized_value(hooks.get('visual_style'))}</li>
            <li><span data-i18n=\"presentationPaletteHint\"></span>: {localized_value(hooks.get('palette_hint'))}</li>
            <li><span data-i18n=\"presentationComfortLevel\"></span>: {localized_value(hooks.get('comfort_level'))}</li>
            <li><span data-i18n=\"presentationAnomalyPressure\"></span>: {localized_value(hooks.get('anomaly_pressure'))}</li>
          </ul>
        </section>
        </section>

        <section class=\"panel links\" id=\"section-bundle-files\">
          <h2 data-i18n=\"sectionBundleFiles\"></h2>
          <p>
            <a href=\"world.json\">world.json</a>
            <a href=\"summary.json\">summary.json</a>
            <a href=\"showcase.json\">showcase.json</a>
            <a href=\"showcase.md\">showcase.md</a>
            <a href=\"manifest.json\">manifest.json</a>
          </p>
          <p><small><span data-i18n=\"primaryPreviewSlot\"></span>: <code>{escape(manifest.get('entrypoints', {}).get('primary_preview') or 'index.html')}</code></small></p>
        </section>
      </main>
    </div>
    <script>
      const translations = {translations_json};
      const defaultFeatureId = {default_feature_id_json};
      const languageSelect = document.getElementById("language-select");
      const heroTitle = document.getElementById("hero-title");
      const mapFeatures = Array.from(document.querySelectorAll("[data-feature-id]"));
      const detailCards = Array.from(document.querySelectorAll("[data-feature-card]"));
      const mapViewport = document.getElementById("world-map-viewport");
        const semanticZoomIndicator = document.getElementById("semantic-zoom-indicator");
        const semanticZoomValue = document.getElementById("semantic-zoom-value");
        const playerPosDisplay = document.getElementById("player-pos-display");
        const playerStatusTag = document.getElementById("player-status-tag");

        // ── Player / Character state ──────────────────────────────────────────
        const playerEl = document.getElementById("player-entity");
        const mapBackdrop = document.querySelector(".map-backdrop");
        const roadsGroup = Array.from(document.querySelectorAll(".map-road"));
        let playerX = 0, playerY = 0;
        let isMoving = false;
        const MOVE_SPEED = 2.5;

        if (playerEl) {{
          const transform = playerEl.getAttribute("transform") || "";
          const match = transform.match(/translate\\\\(([\\\\d.-]+),\\\\s*([\\\\d.-]+)\\\\)/);
          if (match) {{
            playerX = parseFloat(match[1]);
            playerY = parseFloat(match[2]);
          }}
        }}

        function updatePlayerDisplay() {{
          if (playerPosDisplay) playerPosDisplay.textContent = `${{Math.round(playerX)}}, ${{Math.round(playerY)}}`;
          if (playerStatusTag) {{
            const status = isMoving ? "moving" : "idle";
            playerStatusTag.setAttribute("data-status", status);
            playerStatusTag.textContent = t(isMoving ? "playerStatusMoving" : "playerStatusIdle");
          }}
        }}

        function isPointNearRoad(x, y, threshold = 15) {{
          if (roadsGroup.length === 0) return true; // No roads, allow free move
          return roadsGroup.some(road => {{
            if (road.getTotalLength) {{
              // Approximate check using SVG points if possible, but simplest is distance to nearest point
              // For MVP, we allow movement if near any point of any polyline
              const points = road.getAttribute("points").split(" ").map(p => {{
                const [px, py] = p.split(",").map(Number);
                return {{x: px, y: py}};
              }});
              return points.some(p => Math.sqrt((p.x - x)**2 + (p.y - y)**2) < threshold);
            }}
            return false;
          }});
        }}

        function movePlayer(dx, dy) {{
          const nextX = playerX + dx;
          const nextY = playerY + dy;
          
          // Simple street constraint: only move if near a road or within bounds
          if (isPointNearRoad(nextX, nextY) || !roadsGroup.length) {{
            playerX = nextX;
            playerY = nextY;
          }} else {{
            // Sliding along axes if blocked
            if (isPointNearRoad(nextX, playerY)) playerX = nextX;
            else if (isPointNearRoad(playerX, nextY)) playerY = nextY;
          }}

          if (playerEl) playerEl.setAttribute("transform", `translate(${{playerX}}, ${{playerY}})`);
          updatePlayerDisplay();
          // Camera follow
          vbX = playerX - vbW / 2;
          vbY = playerY - vbH / 2;
          applyViewBox();
        }}

        const keysPressed = {{}};
        window.addEventListener("keydown", (e) => {{ keysPressed[e.key.toLowerCase()] = true; }});
        window.addEventListener("keyup", (e) => {{ keysPressed[e.key.toLowerCase()] = false; }});

        function gameLoop() {{
          let dx = 0, dy = 0;
          if (keysPressed["w"] || keysPressed["arrowup"]) dy -= MOVE_SPEED;
          if (keysPressed["s"] || keysPressed["arrowdown"]) dy += MOVE_SPEED;
          if (keysPressed["a"] || keysPressed["arrowleft"]) dx -= MOVE_SPEED;
          if (keysPressed["d"] || keysPressed["arrowright"]) dx += MOVE_SPEED;

          if (dx !== 0 || dy !== 0) {{
            isMoving = true;
            movePlayer(dx, dy);
          }} else {{
            isMoving = false;
            updatePlayerDisplay();
          }}
          requestAnimationFrame(gameLoop);
        }}
        requestAnimationFrame(gameLoop);

        // ── Map camera / viewport state ──────────────────────────────────────────
      const mapSvg = document.getElementById("observer-map");
      const initialViewBox = mapSvg ? mapSvg.viewBox.baseVal : null;
      let vbX = initialViewBox ? initialViewBox.x : 0;
      let vbY = initialViewBox ? initialViewBox.y : 0;
      let vbW = initialViewBox ? initialViewBox.width : 880;
      let vbH = initialViewBox ? initialViewBox.height : 520;
      const vbW0 = vbW;
      const vbH0 = vbH;
      const MIN_ZOOM = 0.35;
      const MAX_ZOOM = 5.0;
      const ZOOM_STEP = 0.18;
      const zoomInBtn = document.getElementById("map-zoom-in");
      const zoomOutBtn = document.getElementById("map-zoom-out");
      const zoomResetBtn = document.getElementById("map-zoom-reset");

        function clampViewBox() {{
          const minW = vbW0 / MAX_ZOOM;
          const maxW = vbW0 / MIN_ZOOM;
          vbW = Math.max(minW, Math.min(maxW, vbW));
          vbH = vbW * (vbH0 / vbW0);
          // Relax clamping for player exploration
          const padX = vbW0 * 1.5;
          const padY = vbH0 * 1.5;
          vbX = Math.max(-padX, Math.min(padX, vbX));
          vbY = Math.max(-padY, Math.min(padY, vbY));
        }}

      function updateZoomButtons() {{
        if (!zoomInBtn || !zoomOutBtn || !zoomResetBtn) return;
        const minW = vbW0 / MAX_ZOOM;
        const maxW = vbW0 / MIN_ZOOM;
        zoomInBtn.disabled = vbW <= minW + 0.01;
        zoomOutBtn.disabled = vbW >= maxW - 0.01;
        zoomResetBtn.disabled = Math.abs(vbW - vbW0) < 0.01 && Math.abs(vbH - vbH0) < 0.01 && Math.abs(vbX) < 0.01 && Math.abs(vbY) < 0.01;
      }}

      function applyViewBox() {{
        if (!mapSvg) return;
        clampViewBox();
        mapSvg.setAttribute("viewBox", `${{vbX}} ${{vbY}} ${{vbW}} ${{vbH}}`);
        updateSemanticZoomTier();
        updateZoomButtons();
      }}

      function updateSemanticZoomTier() {{
        const zoomRatio = vbW0 / vbW;
        let tier = "survey";
        let labelKey = "semanticZoomSurvey";
        if (zoomRatio >= 2.2) {{
          tier = "intimate";
          labelKey = "semanticZoomIntimate";
        }} else if (zoomRatio >= 1.35) {{
          tier = "district";
          labelKey = "semanticZoomDistrict";
        }}
        mapViewport?.setAttribute("data-zoom-tier", tier);
        mapSvg?.setAttribute("data-zoom-tier", tier);
        semanticZoomIndicator?.setAttribute("data-zoom-tier", tier);
        if (semanticZoomValue) semanticZoomValue.textContent = t(labelKey);
      }}

      function svgCoordsFromClient(clientX, clientY) {{
        if (!mapSvg) return {{ x: 0, y: 0 }};
        const rect = mapSvg.getBoundingClientRect();
        const scaleX = vbW / rect.width;
        const scaleY = vbH / rect.height;
        return {{
          x: vbX + (clientX - rect.left) * scaleX,
          y: vbY + (clientY - rect.top) * scaleY,
        }};
      }}

      function zoomAroundPoint(svgX, svgY, factor) {{
        const desiredW = vbW / factor;
        const minW = vbW0 / MAX_ZOOM;
        const maxW = vbW0 / MIN_ZOOM;
        const newW = Math.max(minW, Math.min(maxW, desiredW));
        const newH = newW * (vbH0 / vbW0);
        vbX = svgX - (svgX - vbX) * (newW / vbW);
        vbY = svgY - (svgY - vbY) * (newH / vbH);
        vbW = newW;
        vbH = newH;
        applyViewBox();
      }}

      // ── Pan (mouse drag) ─────────────────────────────────────────────────────
      let panActive = false;
      let panStartSvg = {{ x: 0, y: 0 }};
      let panStartVb = {{ x: 0, y: 0 }};

      if (mapSvg) {{
        mapSvg.addEventListener("mousedown", (e) => {{
          if (e.button !== 0) return;
          if (e.target && e.target.closest && e.target.closest(".map-feature")) return;
          panActive = true;
          panStartSvg = svgCoordsFromClient(e.clientX, e.clientY);
          panStartVb = {{ x: vbX, y: vbY }};
          mapSvg.classList.add("is-panning");
          hideTooltip();
          e.preventDefault();
        }});

        window.addEventListener("mousemove", (e) => {{
          if (!panActive) return;
          const rect = mapSvg.getBoundingClientRect();
          const scaleX = vbW / rect.width;
          const scaleY = vbH / rect.height;
          vbX = panStartVb.x - (e.clientX - rect.left) * scaleX + panStartSvg.x - panStartVb.x;
          vbY = panStartVb.y - (e.clientY - rect.top) * scaleY + panStartSvg.y - panStartVb.y;
          applyViewBox();
        }});

        window.addEventListener("mouseup", () => {{
          if (!panActive) return;
          panActive = false;
          mapSvg.classList.remove("is-panning");
        }});

        // ── Zoom (wheel) ────────────────────────────────────────────────────────
        mapSvg.addEventListener("wheel", (e) => {{
          e.preventDefault();
          const factor = e.deltaY < 0 ? (1 + ZOOM_STEP) : 1 / (1 + ZOOM_STEP);
          const svgPt = svgCoordsFromClient(e.clientX, e.clientY);
          zoomAroundPoint(svgPt.x, svgPt.y, factor);
        }}, {{ passive: false }});

        // ── Touch pan / pinch-zoom ───────────────────────────────────────────────
        let touches = [];
        let lastPinchDist = 0;
        let touchPanStart = null;
        let touchVbStart = null;

        mapSvg.addEventListener("touchstart", (e) => {{
          touches = Array.from(e.touches);
          if (touches.length === 1) {{
            touchPanStart = svgCoordsFromClient(touches[0].clientX, touches[0].clientY);
            touchVbStart = {{ x: vbX, y: vbY }};
          }} else if (touches.length === 2) {{
            const dx = touches[1].clientX - touches[0].clientX;
            const dy = touches[1].clientY - touches[0].clientY;
            lastPinchDist = Math.sqrt(dx * dx + dy * dy);
          }}
          e.preventDefault();
        }}, {{ passive: false }});

        mapSvg.addEventListener("touchmove", (e) => {{
          touches = Array.from(e.touches);
          if (touches.length === 1 && touchPanStart && touchVbStart) {{
            const rect = mapSvg.getBoundingClientRect();
            const scaleX = vbW / rect.width;
            const scaleY = vbH / rect.height;
            vbX = touchVbStart.x - (touches[0].clientX - rect.left) * scaleX + touchPanStart.x - touchVbStart.x;
            vbY = touchVbStart.y - (touches[0].clientY - rect.top) * scaleY + touchPanStart.y - touchVbStart.y;
            applyViewBox();
          }} else if (touches.length === 2) {{
            const dx = touches[1].clientX - touches[0].clientX;
            const dy = touches[1].clientY - touches[0].clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (lastPinchDist > 0) {{
              const factor = dist / lastPinchDist;
              const midX = (touches[0].clientX + touches[1].clientX) / 2;
              const midY = (touches[0].clientY + touches[1].clientY) / 2;
              const svgPt = svgCoordsFromClient(midX, midY);
              zoomAroundPoint(svgPt.x, svgPt.y, factor);
            }}
            lastPinchDist = dist;
          }}
          e.preventDefault();
        }}, {{ passive: false }});

        mapSvg.addEventListener("touchend", (e) => {{
          touches = Array.from(e.touches);
          if (touches.length < 2) lastPinchDist = 0;
          if (touches.length === 0) {{ touchPanStart = null; touchVbStart = null; }}
        }});
      }}

      // ── Zoom buttons ─────────────────────────────────────────────────────────
      zoomInBtn?.addEventListener("click", () => {{
        zoomAroundPoint(vbX + vbW / 2, vbY + vbH / 2, 1 + ZOOM_STEP * 1.5);
      }});
      zoomOutBtn?.addEventListener("click", () => {{
        zoomAroundPoint(vbX + vbW / 2, vbY + vbH / 2, 1 / (1 + ZOOM_STEP * 1.5));
      }});
      zoomResetBtn?.addEventListener("click", () => {{
        vbX = 0; vbY = 0; vbW = vbW0; vbH = vbH0;
        applyViewBox();
      }});

      // ── Hover tooltip ────────────────────────────────────────────────────────
      const tooltip = document.createElement("div");
      tooltip.className = "map-tooltip";
      document.body.appendChild(tooltip);
      let tooltipVisible = false;

      function showTooltip(text, x, y) {{
        tooltip.textContent = text;
        tooltip.style.left = (x + 14) + "px";
        tooltip.style.top = (y - 8) + "px";
        tooltip.classList.add("is-visible");
        tooltipVisible = true;
      }}

      function hideTooltip() {{
        tooltip.classList.remove("is-visible");
        tooltipVisible = false;
      }}

      mapFeatures.forEach((node) => {{
        node.addEventListener("mouseenter", (e) => {{
          if (panActive) return;
          showTooltip(node.getAttribute("aria-label") || "", e.clientX, e.clientY);
        }});
        node.addEventListener("mousemove", (e) => {{
          if (!tooltipVisible) return;
          tooltip.style.left = (e.clientX + 14) + "px";
          tooltip.style.top = (e.clientY - 8) + "px";
        }});
        node.addEventListener("mouseleave", () => hideTooltip());
        node.addEventListener("focus", (e) => {{
          showTooltip(node.getAttribute("aria-label") || "", node.getBoundingClientRect().right, node.getBoundingClientRect().top);
        }});
        node.addEventListener("blur", () => hideTooltip());
      }});

      function normalizeLanguage(value) {{
        if (!value) {{
          return "";
        }}
        return String(value).toLowerCase().startsWith("zh") ? "zh-CN" : "en";
      }}

      function readStoredLanguage() {{
        try {{
          return window.localStorage.getItem("fablemap-language") || "";
        }} catch (error) {{
          return "";
        }}
      }}

      function writeStoredLanguage(language) {{
        try {{
          window.localStorage.setItem("fablemap-language", language);
        }} catch (error) {{
          // Ignore storage failures for local preview files.
        }}
      }}

      function detectInitialLanguage() {{
        const params = new URLSearchParams(window.location.search);
        return (
          normalizeLanguage(params.get("lang")) ||
          normalizeLanguage(readStoredLanguage()) ||
          normalizeLanguage(window.navigator.language) ||
          "en"
        );
      }}

      let currentLanguage = detectInitialLanguage();

      function t(key) {{
        return translations[currentLanguage][key] || translations.en[key] || key;
      }}

      function updateUrlLanguage() {{
        try {{
          const url = new URL(window.location.href);
          url.searchParams.set("lang", currentLanguage);
          window.history.replaceState(null, "", url);
        }} catch (error) {{
          // Ignore URL rewriting failures in restricted contexts.
        }}
      }}

      function featureSvgCenter(featureId) {{
        const node = mapFeatures.find((n) => n.dataset.featureId === featureId);
        if (!node || !mapSvg) return null;
        const circle = node.querySelector("circle");
        const rect = node.querySelector("rect");
        if (circle) return {{ x: parseFloat(circle.getAttribute("cx")), y: parseFloat(circle.getAttribute("cy")) }};
        if (rect) return {{
          x: parseFloat(rect.getAttribute("x")) + parseFloat(rect.getAttribute("width")) / 2,
          y: parseFloat(rect.getAttribute("y")) + parseFloat(rect.getAttribute("height")) / 2,
        }};
        return null;
      }}

      function focusToFeature(featureId) {{
        const center = featureSvgCenter(featureId);
        if (!center || !mapSvg) return;
        const targetX = center.x - vbW / 2;
        const targetY = center.y - vbH / 2;
        const startX = vbX, startY = vbY;
        const duration = 320;
        const startTime = performance.now();
        function ease(t) {{ return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }}
        function step(now) {{
          const t = Math.min((now - startTime) / duration, 1);
          vbX = startX + (targetX - startX) * ease(t);
          vbY = startY + (targetY - startY) * ease(t);
          applyViewBox();
          if (t < 1) requestAnimationFrame(step);
        }}
        requestAnimationFrame(step);
      }}

      function setActiveFeature(featureId) {{
        const resolvedFeatureId = detailCards.some((card) => card.dataset.featureCard === featureId)
          ? featureId
          : "map-overview";
        mapFeatures.forEach((node) => {{
          const isActive = node.dataset.featureId === resolvedFeatureId;
          node.classList.toggle("is-active", isActive);
          node.setAttribute("aria-pressed", isActive ? "true" : "false");
        }});
        detailCards.forEach((card) => {{
          card.classList.toggle("is-active", card.dataset.featureCard === resolvedFeatureId);
        }});
        if (resolvedFeatureId !== "map-overview") focusToFeature(resolvedFeatureId);
      }}

      function applyLanguage() {{
        document.documentElement.lang = currentLanguage;
        languageSelect.value = currentLanguage;
        document.querySelectorAll("[data-i18n]").forEach((node) => {{
          node.textContent = t(node.dataset.i18n);
        }});
        document.querySelectorAll(".participation-label[data-label-en][data-label-zh]").forEach((node) => {{
          node.textContent = currentLanguage === "zh-CN" ? node.dataset.labelZh : node.dataset.labelEn;
        }});
        updateSemanticZoomTier();
        updateZoomButtons();
        const visibleTitle = heroTitle.textContent.trim() || t("untitledDistrict");
        document.title = `${{visibleTitle}} · ${{t("pageTitleSuffix")}}`;
      }}

      languageSelect.addEventListener("change", (event) => {{
        currentLanguage = normalizeLanguage(event.target.value) || "en";
        writeStoredLanguage(currentLanguage);
        updateUrlLanguage();
        applyLanguage();
      }});

      mapFeatures.forEach((node) => {{
        node.addEventListener("click", () => {{
          setActiveFeature(node.dataset.featureId);
        }});
        node.addEventListener("keydown", (event) => {{
          if (event.key === "Enter" || event.key === " ") {{
            event.preventDefault();
            setActiveFeature(node.dataset.featureId);
          }}
        }});
      }});

      updateUrlLanguage();
      setActiveFeature(defaultFeatureId);
      applyLanguage();
    </script>
  </body>
</html>
"""


if __name__ == "__main__":
    raise SystemExit(main())
