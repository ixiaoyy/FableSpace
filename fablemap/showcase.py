from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Sequence

from .cli import _build_inspect_summary, _validate_world_schema


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m fablemap.showcase",
        description="Build a presentation-friendly showcase bundle from a FableMap world JSON.",
    )
    parser.add_argument("--input", type=Path, required=True, help="Path to an existing world.json file.")
    parser.add_argument(
        "--output-dir",
        type=Path,
        help="Directory where showcase.json and showcase.md will be written. Defaults to the input directory.",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        input_path = args.input
        output_dir = args.output_dir or input_path.parent
        world = _load_world(input_path)
        _validate_world_schema(world)
        output_dir.mkdir(parents=True, exist_ok=True)

        showcase = _build_showcase(world, input_path)
        showcase_json_path = output_dir / "showcase.json"
        showcase_md_path = output_dir / "showcase.md"

        showcase_json_path.write_text(json.dumps(showcase, ensure_ascii=False, indent=2), encoding="utf-8")
        showcase_md_path.write_text(_render_showcase_markdown(showcase), encoding="utf-8")

        print(
            json.dumps(
                {
                    "world_id": showcase["world_id"],
                    "title": showcase["title"],
                    "output_dir": str(output_dir),
                    "showcase_json": str(showcase_json_path),
                    "showcase_markdown": str(showcase_md_path),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 0
    except Exception as exc:  # pragma: no cover - exercised by smoke tests
        print(f"error: {exc}", file=sys.stderr)
        return 1


def _load_world(input_path: Path) -> dict[str, Any]:
    return json.loads(input_path.read_text(encoding="utf-8"))


def _build_showcase(world: dict[str, Any], input_path: Path) -> dict[str, Any]:
    summary = _build_inspect_summary(world, input_path)
    region = world.get("region") or {}
    source = world.get("source") or {}
    state = world.get("state") or {}
    co_creation = world.get("co_creation") or {}
    signal_snapshot = state.get("signal_snapshot") or {}
    pois = world.get("pois") or []
    landmarks = world.get("landmarks") or []
    memory_anchors = world.get("memory_anchors") or []
    historical_echoes = world.get("historical_echoes") or []
    sprites = world.get("sprites") or []
    poi_lookup = {poi.get("id"): poi for poi in pois if poi.get("id")}
    faction = _faction_spotlight(world.get("factions") or [])
    poi_highlights = [_poi_highlight(poi) for poi in pois[:3]]
    landmark_highlights = [_landmark_highlight(item) for item in landmarks[:2]]

    title = region.get("name") or summary["world_id"] or "Untitled District"
    faction_name = faction.get("name") or summary.get("dominant_faction") or "Unknown faction"
    subtitle = " · ".join(
        part for part in [summary.get("theme"), summary.get("atmosphere"), f"held by {faction_name}"] if part
    )

    reality_skeleton = {
        "provider": source.get("provider"),
        "lat": source.get("lat"),
        "lon": source.get("lon"),
        "radius_m": source.get("radius_m"),
        "dominant_landuse": region.get("dominant_landuse"),
        "source_element_count": signal_snapshot.get("source_element_count"),
        "mapped_poi_count": signal_snapshot.get("mapped_poi_count"),
        "road_count": signal_snapshot.get("road_count"),
    }
    world_state = {
        "dominant_faction": region.get("dominant_faction"),
        "control_score": region.get("control_score"),
        "strategic_value": region.get("strategic_value"),
        "social_tension": region.get("social_tension"),
        "commerce_flux": region.get("commerce_flux"),
        "anomaly_pressure": region.get("anomaly_pressure"),
        "disturbance_level": state.get("disturbance_level"),
        "active_lens": state.get("active_lens"),
        "spawn_window": state.get("spawn_window"),
        "market_pressure": (state.get("economy_state") or {}).get("market_pressure"),
        "mystery_progress": state.get("mystery_progress"),
        "visit_status": "visited" if state.get("visited") else "unvisited",
        "home_style": state.get("home_style"),
    }
    continuity_threads = {
        "memory_anchor_count": summary.get("memory_anchor_count"),
        "historical_echo_count": summary.get("historical_echo_count"),
        "sprite_count": summary.get("sprite_count"),
        "memory_threads": [_memory_thread(anchor, poi_lookup) for anchor in memory_anchors[:2]],
        "historical_threads": [_historical_thread(echo) for echo in historical_echoes[:2]],
        "sprite_signals": [_sprite_signal(sprite, poi_lookup) for sprite in sprites[:3]],
    }
    co_creation_storyline = {
        "city_myth_stage": co_creation.get("city_myth_stage"),
        "writing_rights": co_creation.get("writing_rights") or {},
        "participation_modes": [_participation_mode(mode) for mode in (co_creation.get("participation_modes") or [])[:3]],
        "open_threads": [_co_creation_thread(thread) for thread in (co_creation.get("open_threads") or [])[:3]],
        "memory_policy": co_creation.get("memory_policy") or {},
    }

    mythline_threads = _build_mythline_threads(pois, memory_anchors, historical_echoes)
    participation_entries = _build_participation_entries(
        pois,
        sprites,
        memory_anchors,
        co_creation.get("participation_modes") or [],
        co_creation.get("open_threads") or [],
    )

    return {
        "world_id": summary["world_id"],
        "title": title,
        "subtitle": subtitle,
        "narrative_summary": region.get("narrative_summary") or "No narrative summary available.",
        "summary": summary,
        "reality_skeleton": reality_skeleton,
        "world_state": world_state,
        "continuity_threads": continuity_threads,
        "co_creation_storyline": co_creation_storyline,
        "faction_spotlight": faction,
        "poi_highlights": poi_highlights,
        "landmark_highlights": landmark_highlights,
        "playable_hooks": _build_playable_hooks(world_state, faction, continuity_threads, co_creation_storyline),
        "mythline_threads": mythline_threads,
        "participation_entries": participation_entries,
        "hooks": {
            "satire_profile": region.get("satire_profile"),
            "visual_style": region.get("visual_style"),
            "palette_hint": region.get("palette_hint"),
            "comfort_level": region.get("comfort_level"),
            "anomaly_pressure": region.get("anomaly_pressure"),
            "memory_anchor_count": summary.get("memory_anchor_count"),
            "sprite_count": summary.get("sprite_count"),
            "historical_echo_count": summary.get("historical_echo_count"),
        },
    }


def _build_mythline_threads(
    pois: list[dict[str, Any]],
    memory_anchors: list[dict[str, Any]],
    historical_echoes: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    threads: list[dict[str, Any]] = []
    for poi in pois:
        if not poi.get("secret_slot"):
            continue
        threads.append({
            "id": f"myth-secret-{poi.get('id')}",
            "type": "secret_annotation",
            "title": poi.get("fantasy_name") or poi.get("real_name") or "Hidden Place",
            "description": poi.get("emotion_hook") or "A place where private memory can settle.",
            "linked_to": poi.get("id"),
            "linked_name": poi.get("fantasy_name"),
            "participation_hint": "Visit this location to leave a memory capsule or annotate the hidden story.",
            "status": "open",
        })
    for anchor in memory_anchors:
        linked_pois = anchor.get("linked_pois") or []
        threads.append({
            "id": f"myth-anchor-{anchor.get('id')}",
            "type": "echo_deposit",
            "title": f"Memory Anchor · {anchor.get('tone') or 'quiet'}",
            "description": f"A {anchor.get('anchor_type') or 'memory anchor'} with {anchor.get('visibility') or 'private'} visibility.",
            "linked_to": anchor.get("id"),
            "linked_name": linked_pois[0] if linked_pois else None,
            "participation_hint": "Unlock by visiting the linked POI; deposit an emotion to complete the thread.",
            "status": "open",
        })
    for echo in historical_echoes:
        threads.append({
            "id": f"myth-echo-{echo.get('id')}",
            "type": "history_inscription",
            "title": f"Historical Echo · {echo.get('era') or 'unspecified'}",
            "description": echo.get("fragment") or "A fragment of the district's older story.",
            "linked_to": echo.get("id"),
            "linked_name": echo.get("linked_landmark"),
            "participation_hint": "Explore the linked landmark to surface and corroborate this historical fragment.",
            "status": "seeded",
        })
    return threads[:6]


def _build_participation_entries(
    pois: list[dict[str, Any]],
    sprites: list[dict[str, Any]],
    memory_anchors: list[dict[str, Any]],
    participation_modes: list[dict[str, Any]],
    open_threads: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    mode_thread_counts: dict[str, int] = {mode.get("visibility") or "unknown": 0 for mode in participation_modes}
    for thread in open_threads:
        visibility = thread.get("visibility") or "unknown"
        mode_thread_counts[visibility] = mode_thread_counts.get(visibility, 0) + 1

    mode_targets = {
        "private_capsules": ("secret_slot", len([p for p in pois if p.get("secret_slot")]), "记忆胶囊锚点"),
        "street_legends": ("historical_echo", max(1, len(open_threads)), "可继承的街头传说槽位"),
        "repair_rituals": ("sprite_anchor", max(len(sprites), len(memory_anchors), 1), "公共修复痕迹节点"),
    }

    for mode in participation_modes:
        mode_id = mode.get("id") or "unknown_mode"
        target_type, target_count, target_label_zh = mode_targets.get(
            mode_id,
            ("co_creation_node", max(1, mode.get("capacity_hint") or 0), "共创节点"),
        )
        capacity_hint = mode.get("capacity_hint")
        entries.append({
            "action": mode.get("player_action") or mode_id,
            "label_en": (
                f"{mode.get('name') or 'Unknown mode'} · engage {target_count} {target_type.replace('_', ' ')} slot(s)"
            ),
            "label_zh": f"{mode.get('name') or '未知模式'}：可参与 {target_count} 个{target_label_zh}",
            "target_type": target_type,
            "target_count": target_count,
            "visibility": mode.get("visibility"),
            "status": mode.get("status"),
            "capacity_hint": capacity_hint,
            "open_thread_count": mode_thread_counts.get(mode.get("visibility") or "unknown", 0),
            "reward_hint": (
                f"Contributions enter the {mode.get('visibility') or 'shared'} layer and advance "
                f"{mode_thread_counts.get(mode.get('visibility') or 'unknown', 0)} currently open myth thread(s)."
            ),
        })

    if not entries:
        sprite_pois = [p for p in pois if p.get("sprite_spawn_hint")]
        if sprite_pois:
            entries.append({
                "action": "observe_sprite",
                "label_en": f"Observe sprites at {len(sprite_pois)} active POI(s)",
                "label_zh": f"在 {len(sprite_pois)} 个激活地点观测精灵",
                "target_type": "poi_sprite",
                "target_count": len(sprite_pois),
                "reward_hint": "Sprite observation logs contribute to the district's collective field record.",
            })
        secret_pois = [p for p in pois if p.get("secret_slot")]
        if secret_pois:
            entries.append({
                "action": "leave_memory",
                "label_en": f"Deposit a memory capsule at {len(secret_pois)} secret slot(s)",
                "label_zh": f"在 {len(secret_pois)} 个隐藏锚点留下记忆胶囊",
                "target_type": "secret_slot",
                "target_count": len(secret_pois),
                "reward_hint": "Memory deposits become echoes that future visitors can surface.",
            })
        if memory_anchors:
            entries.append({
                "action": "unlock_anchor",
                "label_en": f"Unlock {len(memory_anchors)} memory anchor(s) by visiting linked POIs",
                "label_zh": f"走访关联地点解锁 {len(memory_anchors)} 个记忆锚点",
                "target_type": "memory_anchor",
                "target_count": len(memory_anchors),
                "reward_hint": "Unlocked anchors feed back into the district's comfort and narrative score.",
            })
        if sprites:
            entries.append({
                "action": "collect_sprite",
                "label_en": f"Collect {len(sprites)} sprite(s) linked to district POIs",
                "label_zh": f"收集 {len(sprites)} 只与地区 POI 绑定的精灵",
                "target_type": "sprite",
                "target_count": len(sprites),
                "reward_hint": "Each collected sprite carries a drop tag that tags your participation in the district story.",
            })
    return entries[:4]


def _build_playable_hooks(
    world_state: dict[str, Any],
    faction: dict[str, Any],
    continuity_threads: dict[str, Any],
    co_creation_storyline: dict[str, Any],
) -> list[str]:
    hooks: list[str] = []
    faction_name = faction.get("name") or world_state.get("dominant_faction")
    if faction_name:
        hooks.append(
            f"{faction_name} currently holds the district at control {world_state.get('control_score')} "
            f"with strategic value {world_state.get('strategic_value')}."
        )
    if world_state.get("commerce_flux") is not None or world_state.get("social_tension") is not None:
        hooks.append(
            f"Commerce flux {world_state.get('commerce_flux')} and social tension {world_state.get('social_tension')} "
            "show how governable or combustible the district feels right now."
        )
    if continuity_threads.get("memory_threads") or continuity_threads.get("historical_threads"):
        hooks.append(
            f"{continuity_threads.get('memory_anchor_count')} memory anchors and "
            f"{continuity_threads.get('historical_echo_count')} historical echoes mean the district keeps traces "
            "of earlier visits and public memory."
        )
    if continuity_threads.get("sprite_signals"):
        hooks.append(
            f"{continuity_threads.get('sprite_count')} sprite signals are already tied to visitable POIs, "
            "hinting at collection and return-play loops."
        )
    if world_state.get("disturbance_level") is not None or world_state.get("active_lens"):
        hooks.append(
            f"Disturbance {world_state.get('disturbance_level')} under lens {world_state.get('active_lens')} "
            f"with spawn window {world_state.get('spawn_window')} frames the district as a live state snapshot."
        )
    if co_creation_storyline.get("participation_modes"):
        hooks.append(
            f"City myth stage {co_creation_storyline.get('city_myth_stage')} exposes "
            f"{len(co_creation_storyline.get('participation_modes') or [])} participation modes for player write-back."
        )
    return hooks[:4]


def _faction_spotlight(factions: list[dict[str, Any]]) -> dict[str, Any]:
    if not factions:
        return {}
    faction = factions[0]
    return {
        "id": faction.get("id"),
        "name": faction.get("name"),
        "archetype": faction.get("archetype"),
        "doctrine": faction.get("doctrine"),
        "influence": faction.get("influence"),
    }


def _poi_highlight(poi: dict[str, Any]) -> dict[str, Any]:
    return {
        "fantasy_name": poi.get("fantasy_name"),
        "fantasy_type": poi.get("fantasy_type"),
        "real_name": poi.get("real_name"),
        "emotion_hook": poi.get("emotion_hook"),
        "faction_alignment": poi.get("faction_alignment"),
    }


def _landmark_highlight(landmark: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": landmark.get("name"),
        "type": landmark.get("type"),
        "description": landmark.get("description"),
    }


def _memory_thread(anchor: dict[str, Any], poi_lookup: dict[str, dict[str, Any]]) -> dict[str, Any]:
    return {
        "anchor_type": anchor.get("anchor_type"),
        "tone": anchor.get("tone"),
        "visibility": anchor.get("visibility"),
        "linked_pois": _linked_poi_names(anchor.get("linked_pois") or [], poi_lookup),
        "unlock_conditions": anchor.get("unlock_conditions") or [],
    }


def _historical_thread(echo: dict[str, Any]) -> dict[str, Any]:
    return {
        "source_type": echo.get("source_type"),
        "summary": echo.get("summary"),
        "trigger_hint": echo.get("trigger_hint"),
        "severity": echo.get("severity"),
    }


def _sprite_signal(sprite: dict[str, Any], poi_lookup: dict[str, dict[str, Any]]) -> dict[str, Any]:
    linked_poi = sprite.get("linked_poi")
    linked_name = poi_lookup.get(linked_poi, {}).get("fantasy_name") if linked_poi else None
    return {
        "species": sprite.get("species"),
        "rarity": sprite.get("rarity"),
        "linked_poi": linked_name or linked_poi,
        "drop_tags": sprite.get("drop_tags") or [],
    }


def _participation_mode(mode: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": mode.get("id"),
        "name": mode.get("name"),
        "visibility": mode.get("visibility"),
        "player_action": mode.get("player_action"),
        "capacity_hint": mode.get("capacity_hint"),
        "status": mode.get("status"),
    }


def _co_creation_thread(thread: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": thread.get("id"),
        "title": thread.get("title"),
        "visibility": thread.get("visibility"),
        "goal": thread.get("goal"),
    }


def _linked_poi_names(linked_pois: list[str], poi_lookup: dict[str, dict[str, Any]]) -> list[str]:
    names: list[str] = []
    for poi_id in linked_pois:
        names.append(poi_lookup.get(poi_id, {}).get("fantasy_name") or poi_id)
    return names


def _render_showcase_markdown(showcase: dict[str, Any]) -> str:
    summary = showcase.get("summary") or {}
    reality = showcase.get("reality_skeleton") or {}
    world_state = showcase.get("world_state") or {}
    continuity = showcase.get("continuity_threads") or {}
    co_creation = showcase.get("co_creation_storyline") or {}
    faction = showcase.get("faction_spotlight") or {}
    hooks = showcase.get("hooks") or {}
    lines = [
        f"# {showcase.get('title')}",
        "",
        f"> {showcase.get('subtitle')}",
        "",
        showcase.get("narrative_summary") or "",
        "",
        "## Reality Skeleton",
        f"- World ID: `{showcase.get('world_id')}`",
        f"- Source: `{reality.get('provider')}` @ `{reality.get('lat')}`, `{reality.get('lon')}` radius `{reality.get('radius_m')}`m",
        f"- Dominant landuse: `{reality.get('dominant_landuse')}`",
        f"- Source elements / mapped POIs / roads: {reality.get('source_element_count')} / {reality.get('mapped_poi_count')} / {reality.get('road_count')}",
        "",
        "## World State",
        f"- Theme / atmosphere: `{summary.get('theme')}` / `{summary.get('atmosphere')}`",
        f"- Dominant faction: `{world_state.get('dominant_faction')}`",
        f"- Control / strategic value: `{world_state.get('control_score')}` / `{world_state.get('strategic_value')}`",
        f"- Social tension / commerce flux: `{world_state.get('social_tension')}` / `{world_state.get('commerce_flux')}`",
        f"- Disturbance / anomaly pressure: `{world_state.get('disturbance_level')}` / `{world_state.get('anomaly_pressure')}`",
        f"- Active lens / spawn window: `{world_state.get('active_lens')}` / `{world_state.get('spawn_window')}`",
        f"- Visit status / mystery progress: `{world_state.get('visit_status')}` / `{world_state.get('mystery_progress')}`",
        "",
    ]

    if faction:
        lines.extend(
            [
                "## Faction Spotlight",
                f"- **{faction.get('name')}** (`{faction.get('archetype')}`) with influence `{faction.get('influence')}`",
                f"- Doctrine: {faction.get('doctrine')}",
                "",
            ]
        )

    lines.extend(
        [
            "## Continuity Threads",
            f"- Memory anchors / echoes / sprites: {continuity.get('memory_anchor_count')} / {continuity.get('historical_echo_count')} / {continuity.get('sprite_count')}",
        ]
    )
    for thread in continuity.get("memory_threads") or []:
        lines.append(
            f"- Memory: `{thread.get('anchor_type')}` / `{thread.get('tone')}` / `{thread.get('visibility')}` -> {', '.join(thread.get('linked_pois') or [])}"
        )
    for thread in continuity.get("historical_threads") or []:
        lines.append(
            f"- Echo: `{thread.get('source_type')}` / `{thread.get('severity')}` -> {thread.get('summary')}"
        )
    for sprite in continuity.get("sprite_signals") or []:
        lines.append(
            f"- Sprite: `{sprite.get('species')}` / `{sprite.get('rarity')}` -> {sprite.get('linked_poi')}"
        )
    lines.append("")

    lines.extend(
        [
            "## Co-Creation Storyline",
            f"- City myth stage: `{co_creation.get('city_myth_stage')}`",
            f"- Writing rights: `{', '.join(sorted((co_creation.get('writing_rights') or {}).keys())) or 'none'}`",
        ]
    )
    memory_policy = co_creation.get("memory_policy") or {}
    if memory_policy:
        lines.append(
            "- Memory policy: "
            f"`{memory_policy.get('retention_model')}` with "
            f"echo sources `{memory_policy.get('echo_sources')}` and "
            f"anchor sources `{memory_policy.get('anchor_sources')}`"
        )
    for mode in co_creation.get("participation_modes") or []:
        lines.append(
            f"- Mode: **{mode.get('name')}** / `{mode.get('visibility')}` / `{mode.get('status')}` -> {mode.get('player_action')} (capacity {mode.get('capacity_hint')})"
        )
    for thread in co_creation.get("open_threads") or []:
        lines.append(
            f"- Thread: **{thread.get('title')}** / `{thread.get('visibility')}` -> {thread.get('goal')}"
        )
    lines.append("")

    if showcase.get("poi_highlights"):
        lines.append("## Highlight POIs")
        for poi in showcase["poi_highlights"]:
            real_name = poi.get("real_name") or poi.get("fantasy_type") or "unknown place"
            lines.append(
                f"- **{poi.get('fantasy_name')}** (`{poi.get('fantasy_type')}`) ← {real_name}: {poi.get('emotion_hook')}"
            )
        lines.append("")

    if showcase.get("landmark_highlights"):
        lines.append("## Landmark Hooks")
        for landmark in showcase["landmark_highlights"]:
            lines.append(f"- **{landmark.get('name')}** (`{landmark.get('type')}`): {landmark.get('description')}")
        lines.append("")

    if showcase.get("playable_hooks"):
        lines.append("## Playable Hooks")
        for item in showcase["playable_hooks"]:
            lines.append(f"- {item}")
        lines.append("")

    if showcase.get("mythline_threads"):
        lines.append("## Mythline Threads")
        for thread in showcase["mythline_threads"]:
            lines.append(
                f"- **[{thread.get('type')}]** {thread.get('title')}: {thread.get('description')}"
            )
            lines.append(f"  - _{thread.get('participation_hint')}_")
        lines.append("")

    if showcase.get("participation_entries"):
        lines.append("## Participation Entries")
        for entry in showcase["participation_entries"]:
            lines.append(f"- **{entry.get('label_en')}** (`{entry.get('action')}`)")
            lines.append(f"  - {entry.get('reward_hint')}")
        lines.append("")

    lines.extend(
        [
            "## Presentation Hooks",
            f"- Visual style: `{hooks.get('visual_style')}` / palette `{hooks.get('palette_hint')}`",
            f"- Comfort vs anomaly: `{hooks.get('comfort_level')}` / `{hooks.get('anomaly_pressure')}`",
            f"- Memory anchors / sprites / echoes: {hooks.get('memory_anchor_count')} / {hooks.get('sprite_count')} / {hooks.get('historical_echo_count')}",
            f"- Satire profile: {hooks.get('satire_profile')}",
            "",
        ]
    )
    return "\n".join(lines)


if __name__ == "__main__":
    raise SystemExit(main())
