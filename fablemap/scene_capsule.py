"""AIO6 · Scene capsule generation utilities."""
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .city_persona import CityPersona
from .lens_engine import LensOutput


@dataclass
class CapsuleTrigger:
    """Trigger evaluation result for a scene capsule."""

    should_trigger: bool
    reason: str
    priority: int = 0
    source: str = "none"


@dataclass
class CapsuleInput:
    """Minimal backend input for scene capsule generation."""

    player_id: str
    poi_id: str
    district_type: str
    persona: Optional[CityPersona] = None
    lens: Optional[LensOutput] = None
    dwell_seconds: float = 0.0
    visit_count: int = 1
    writeback_count: int = 0
    mark_count: int = 0
    echo_count: int = 0
    event_types: List[str] = field(default_factory=list)
    visibility: str = "private"
    slice_id: str = "default"
    target_type: str = "poi"
    safety_flags: Dict[str, bool] = field(default_factory=dict)
    deterministic_fallbacks: List[str] = field(default_factory=list)
    active_capsule_types: List[str] = field(default_factory=list)


@dataclass
class CapsuleTextBlock:
    role: str
    text: str
    tone: str = ""


@dataclass
class CapsuleVisualHint:
    hint_type: str
    intensity: float
    anchor: str = "poi"


@dataclass
class CapsuleInteraction:
    action_id: str
    label: str
    target_ref: str = ""


@dataclass
class CapsuleSoundHint:
    hint_type: str
    intensity: float
    loop: bool = False


@dataclass
class CapsuleOutput:
    """Structured scene capsule output consumed by the orchestrator/frontend."""

    player_id: str
    poi_id: str
    capsule_type: str = "null"
    title: str = ""
    narrative: str = ""
    summary: str = ""
    trigger_source: str = "none"
    asset_pack_hint: str = ""
    render_mode: str = "panel"
    duration: float = 0.0
    ttl_seconds: int = 0
    visibility: str = "private"
    confidence: float = 0.0
    is_fallback: bool = False
    fallback_reason: str = ""
    trigger_reason: str = ""
    ui_filter_hint: str = ""
    cooldown_seconds: int = 0
    cache_key: str = ""
    sound_hints: List["CapsuleSoundHint"] = field(default_factory=list)
    text_blocks: List[CapsuleTextBlock] = field(default_factory=list)
    visual_hints: List[CapsuleVisualHint] = field(default_factory=list)
    interaction_hooks: List[CapsuleInteraction] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class _CapsuleConfig:
    title_template: str
    narrative_template: str
    summary_template: str
    duration: float
    ttl_seconds: int
    visibility: str
    render_mode: str
    visual_hint: str
    interaction_label: str


_BIAS_TO_CAPSULE: Dict[str, str] = {
    "mystery": "anomaly_glimpse",
    "story": "legend_fragment",
    "repair": "dwell_aura",
    "solitude": "persona_whisper",
    "resonance": "broadcast_echo",
    "drift": "memory_reveal",
}

_LENS_TO_VISUAL: Dict[str, str] = {
    "drift": "marker_pulse",
    "chronicle": "sepia",
    "surge": "shimmer",
    "veil": "vignette",
    "hearth": "glow",
    "oracle": "golden_shimmer",
}

_CAPSULE_CONFIGS: Dict[str, _CapsuleConfig] = {
    "memory_reveal": _CapsuleConfig(
        title_template="旧痕在 {poi_id} 复现",
        narrative_template="你再次经过 {poi_id}，上一次留下的细节被轻轻翻面。",
        summary_template="一次回访触发了私人记忆显影。",
        duration=10.0,
        ttl_seconds=45,
        visibility="private",
        render_mode="panel",
        visual_hint="marker_pulse",
        interaction_label="Inspect echo",
    ),
    "dwell_aura": _CapsuleConfig(
        title_template="{poi_id} 的驻留气场变浓了",
        narrative_template="{address}，你在这里停留得足够久，周围空气开始呈现一层可被感知的偏移。",
        summary_template="长时间驻留激活了局部氛围层。",
        duration=14.0,
        ttl_seconds=60,
        visibility="private",
        render_mode="ambient",
        visual_hint="glow",
        interaction_label="Dwell more",
    ),
    "anomaly_glimpse": _CapsuleConfig(
        title_template="{poi_id} 出现异常显影",
        narrative_template="{address}，{poi_id} 的另一层轮廓在视野边缘短暂显形。",
        summary_template="边界感或异常信号触发了一次局部显影。",
        duration=8.0,
        ttl_seconds=40,
        visibility="private",
        render_mode="overlay",
        visual_hint="vignette",
        interaction_label="Inspect anomaly",
    ),
    "persona_whisper": _CapsuleConfig(
        title_template="城市向你低语",
        narrative_template="{address}，这座城市只把这句话交给你：别急着离开 {poi_id}。",
        summary_template="城市人格对玩家发出了一次定向回应。",
        duration=7.0,
        ttl_seconds=35,
        visibility="private",
        render_mode="whisper",
        visual_hint="glow",
        interaction_label="Listen closer",
    ),
    "legend_fragment": _CapsuleConfig(
        title_template="{poi_id} 的传说碎片被拼出",
        narrative_template="{address}，有人曾在 {poi_id} 留下痕迹，城市把它整理成一段可被继承的传说。",
        summary_template="公共层回声被组装成可继承的地点传说。",
        duration=12.0,
        ttl_seconds=75,
        visibility="local_public",
        render_mode="panel",
        visual_hint="sepia",
        interaction_label="Read fragment",
    ),
    "broadcast_echo": _CapsuleConfig(
        title_template="全城回响掠过 {poi_id}",
        narrative_template="{address}，此刻城市与你同频，{poi_id} 接住了一段来自更大范围的回响。",
        summary_template="公共广播或高共振状态生成了地点化回响。",
        duration=9.0,
        ttl_seconds=50,
        visibility="global",
        render_mode="beacon",
        visual_hint="shimmer",
        interaction_label="Trace resonance",
    ),
    "vision": _CapsuleConfig(
        title_template="{poi_id} 出现异常显影",
        narrative_template="{address}，{poi_id} 的另一层轮廓在视野边缘短暂显形。",
        summary_template="边界感或异常信号触发了一次局部显影。",
        duration=8.0,
        ttl_seconds=40,
        visibility="private",
        render_mode="overlay",
        visual_hint="vignette",
        interaction_label="Inspect anomaly",
    ),
    "echo": _CapsuleConfig(
        title_template="{poi_id} 的传说碎片被拼出",
        narrative_template="{address}，有人曾在 {poi_id} 留下痕迹，城市把它整理成一段可被继承的传说。",
        summary_template="公共层回声被组装成可继承的地点传说。",
        duration=12.0,
        ttl_seconds=75,
        visibility="local_public",
        render_mode="panel",
        visual_hint="sepia",
        interaction_label="Read fragment",
    ),
    "ritual": _CapsuleConfig(
        title_template="{poi_id} 的驻留气场变浓了",
        narrative_template="{address}，你在这里停留得足够久，周围空气开始呈现一层可被感知的偏移。",
        summary_template="长时间驻留激活了局部氛围层。",
        duration=14.0,
        ttl_seconds=60,
        visibility="private",
        render_mode="ambient",
        visual_hint="glow",
        interaction_label="Dwell more",
    ),
    "whisper": _CapsuleConfig(
        title_template="城市向你低语",
        narrative_template="{address}，这座城市只把这句话交给你：别急着离开 {poi_id}。",
        summary_template="城市人格对玩家发出了一次定向回应。",
        duration=7.0,
        ttl_seconds=35,
        visibility="private",
        render_mode="whisper",
        visual_hint="glow",
        interaction_label="Listen closer",
    ),
    "rift": _CapsuleConfig(
        title_template="全城回响掠过 {poi_id}",
        narrative_template="{address}，此刻城市与你同频，{poi_id} 接住了一段来自更大范围的回响。",
        summary_template="公共广播或高共振状态生成了地点化回响。",
        duration=9.0,
        ttl_seconds=50,
        visibility="global",
        render_mode="beacon",
        visual_hint="shimmer",
        interaction_label="Trace resonance",
    ),
    "null": _CapsuleConfig(
        title_template="",
        narrative_template="",
        summary_template="",
        duration=0.0,
        ttl_seconds=0,
        visibility="private",
        render_mode="panel",
        visual_hint="",
        interaction_label="",
    ),
}

_FALLBACK_TITLE = "城市短暂沉默"
_FALLBACK_NARRATIVE = "城市在这里沉默了片刻。"
_FALLBACK_SUMMARY = "本次场景胶囊已回退到确定性反馈。"


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def _contains_any(event_types: List[str], candidates: List[str]) -> bool:
    event_set = {event_type.lower() for event_type in event_types}
    return any(candidate.lower() in event_set for candidate in candidates)


def evaluate_trigger(
    inp: CapsuleInput,
    min_dwell: float = 5.0,
    min_trust: float = 0.25,
) -> CapsuleTrigger:
    """Evaluate whether a capsule should be generated."""

    trust = inp.persona.trust_level if inp.persona else 0.0
    has_revisit_signal = inp.visit_count >= 3 or inp.echo_count >= 2
    has_event_signal = inp.writeback_count >= 1 or _contains_any(
        inp.event_types,
        ["echo", "memory_anchor", "anomaly_detected", "special_event", "spirit_spawn"],
    )
    has_persona_signal = inp.persona is not None and trust >= min_trust
    has_lens_signal = inp.lens is not None and inp.lens.lens_id in {"veil", "oracle", "hearth", "chronicle"}
    has_dwell_signal = inp.dwell_seconds >= min_dwell

    if inp.persona is not None and inp.persona.response_bias == "drift" and inp.visit_count <= 1:
        return CapsuleTrigger(False, "drift_bias_first_visit", 0, "none")

    if not any([has_revisit_signal, has_event_signal, has_persona_signal, has_lens_signal, has_dwell_signal]):
        return CapsuleTrigger(False, "insufficient_signals", 0, "none")

    if has_revisit_signal:
        priority = 4 + min(inp.visit_count, 3)
        if inp.echo_count:
            priority += 1
        return CapsuleTrigger(True, f"revisit:visits={inp.visit_count},echoes={inp.echo_count}", priority, "revisit_driven")

    if has_dwell_signal:
        priority = 2 + int(has_dwell_signal)
        parts = [f"dwell={inp.dwell_seconds:.0f}s"]
        if inp.lens is not None:
            parts.append(f"lens={inp.lens.lens_id}")
        return CapsuleTrigger(True, ",".join(parts), priority, "lens_driven")

    if has_event_signal:
        priority = 4 + min(inp.writeback_count, 2)
        return CapsuleTrigger(True, f"event:writeback={inp.writeback_count},events={len(inp.event_types)}", priority, "event_driven")

    if has_lens_signal:
        return CapsuleTrigger(True, f"lens={inp.lens.lens_id}", 2, "lens_driven")

    if has_persona_signal:
        priority = 3 + int(trust >= 0.6)
        return CapsuleTrigger(True, f"persona:trust={trust:.2f}", priority, "persona_driven")

    return CapsuleTrigger(False, "no_trigger_signal", 0, "none")


class SceneCapsuleGenerator:
    """Minimal deterministic generator for MVP scene capsules."""

    def generate(self, inp: CapsuleInput) -> CapsuleOutput:
        trigger = evaluate_trigger(inp)
        if not trigger.should_trigger:
            return CapsuleOutput(
                player_id=inp.player_id,
                poi_id=inp.poi_id,
                capsule_type="null",
                trigger_reason=trigger.reason,
                trigger_source=trigger.source,
                metadata={"suppressed": True},
            )

        # Protocol guard: mutual exclusion
        if inp.active_capsule_types:
            return CapsuleOutput(
                player_id=inp.player_id,
                poi_id=inp.poi_id,
                capsule_type="null",
                trigger_reason="suppressed_by_protocol_guard",
                trigger_source="protocol_guard",
                metadata={"suppressed": True},
            )

        # Safety flags: deterministic fallback
        if inp.safety_flags.get("allow_generated_text") is False:
            meta: Dict[str, Any] = {"suppressed": False}
            if inp.deterministic_fallbacks:
                meta["deterministic_fallbacks"] = list(inp.deterministic_fallbacks)
            return CapsuleOutput(
                player_id=inp.player_id,
                poi_id=inp.poi_id,
                capsule_type="null",
                title=_FALLBACK_TITLE,
                is_fallback=True,
                fallback_reason="deterministic_ui_fallback",
                confidence=0.5,
                trigger_reason=trigger.reason,
                trigger_source=trigger.source,
                metadata=meta,
            )
        capsule_type = self._resolve_capsule_type(inp, trigger)
        canonical_capsule_type = self._canonicalize_capsule_type(capsule_type)
        config = _CAPSULE_CONFIGS.get(canonical_capsule_type, _CAPSULE_CONFIGS["memory_reveal"])
        output_capsule_type = canonical_capsule_type
        address = inp.persona.address if inp.persona else "过路人"

        try:
            title = config.title_template.format(address=address, poi_id=inp.poi_id, district_type=inp.district_type)
            narrative = config.narrative_template.format(address=address, poi_id=inp.poi_id, district_type=inp.district_type)
            summary = config.summary_template.format(address=address, poi_id=inp.poi_id, district_type=inp.district_type)
            is_fallback = False
        except Exception:
            title = _FALLBACK_TITLE
            narrative = _FALLBACK_NARRATIVE
            summary = _FALLBACK_SUMMARY
            is_fallback = True

        asset_hint = inp.lens.asset_pack_hint if inp.lens and inp.lens.asset_pack_hint else ""
        visibility = self._resolve_visibility(inp, canonical_capsule_type, config.visibility)
        confidence = self._build_confidence(inp, trigger)
        if not title or not narrative:
            title = _FALLBACK_TITLE
            narrative = _FALLBACK_NARRATIVE
            summary = _FALLBACK_SUMMARY
            is_fallback = True

        text_blocks = [
            CapsuleTextBlock(role="title", text=title, tone=inp.lens.tone if inp.lens else ""),
            CapsuleTextBlock(role="body", text=narrative, tone=inp.lens.tone if inp.lens else ""),
        ]
        visual_hints = [
            CapsuleVisualHint(
                hint_type=self._resolve_visual_hint(inp, canonical_capsule_type, config.visual_hint),
                intensity=0.35 + 0.1 * min(trigger.priority, 4),
                anchor="poi",
            )
        ]
        interaction_hooks = [
            CapsuleInteraction(
                action_id=self._resolve_interaction(output_capsule_type),
                label=config.interaction_label,
                target_ref=inp.poi_id,
            )
        ]

        ui_filter_hint = _LENS_TO_VISUAL.get(inp.lens.lens_id, "") if inp.lens else ""
        lens_id_str = inp.lens.lens_id if inp.lens else ""
        cooldown = 180 if config.render_mode == "ambient" else 90
        cache_key = f"scene_capsule:{inp.player_id}:{inp.slice_id}:{inp.poi_id}:{output_capsule_type}:{lens_id_str}:{visibility}"
        sound_hints: List[CapsuleSoundHint] = []
        if lens_id_str == "chronicle":
            sound_hints.append(CapsuleSoundHint(hint_type="crowd", loop=False, intensity=0.5))
        elif config.render_mode == "ambient":
            sound_hints.append(CapsuleSoundHint(hint_type="ambient", loop=True, intensity=0.4))

        # Redact persona address if safety_flags disallow it
        if inp.safety_flags.get("allow_persona_address") is False:
            title = title.replace(address, "旅人") if address != "过路人" else title
            narrative = narrative.replace(address, "旅人") if address != "过路人" else narrative

        return CapsuleOutput(
            player_id=inp.player_id,
            poi_id=inp.poi_id,
            capsule_type=output_capsule_type,
            title=title,
            narrative=narrative,
            summary=summary,
            trigger_source=trigger.source,
            asset_pack_hint=asset_hint,
            render_mode=config.render_mode,
            duration=config.duration,
            ttl_seconds=config.ttl_seconds,
            visibility=visibility,
            confidence=confidence,
            is_fallback=is_fallback,
            trigger_reason=trigger.reason,
            ui_filter_hint=ui_filter_hint,
            cooldown_seconds=cooldown,
            cache_key=cache_key,
            sound_hints=sound_hints,
            text_blocks=text_blocks,
            visual_hints=visual_hints,
            interaction_hooks=interaction_hooks,
            metadata={
                "event_types": list(inp.event_types),
                "lens_id": inp.lens.lens_id if inp.lens else None,
                "persona_bias": inp.persona.response_bias if inp.persona else None,
                "visit_count": inp.visit_count,
                "writeback_count": inp.writeback_count,
            },
        )

    def _resolve_capsule_type(self, inp: CapsuleInput, trigger: CapsuleTrigger) -> str:
        if trigger.source == "revisit_driven":
            return "memory_reveal"

        if _contains_any(inp.event_types, ["anomaly_detected"]):
            return "anomaly_glimpse"
        if _contains_any(inp.event_types, ["special_event"]):
            return "broadcast_echo"
        if _contains_any(inp.event_types, ["echo", "memory_anchor"]):
            return "legend_fragment"

        if inp.persona is not None:
            return {
                "mystery": "vision",
                "story": "echo",
                "repair": "ritual",
                "solitude": "whisper",
                "resonance": "rift",
                "drift": "memory_reveal",
            }.get(inp.persona.response_bias, "memory_reveal")

        if inp.lens is not None:
            if inp.lens.lens_id == "veil":
                return "anomaly_glimpse"
            if inp.lens.lens_id == "hearth":
                return "dwell_aura"
            if inp.lens.lens_id == "oracle":
                return "persona_whisper"
            if inp.lens.lens_id == "chronicle":
                return "legend_fragment"

        return "memory_reveal"

    def _canonicalize_capsule_type(self, capsule_type: str) -> str:
        return {
            "vision": "anomaly_glimpse",
            "echo": "legend_fragment",
            "ritual": "dwell_aura",
            "whisper": "persona_whisper",
            "rift": "broadcast_echo",
        }.get(capsule_type, capsule_type)

    def _resolve_visibility(self, inp: CapsuleInput, capsule_type: str, default_visibility: str) -> str:
        order = {"private": 0, "local_public": 1, "global": 2}
        input_visibility = inp.visibility if inp.visibility in order else "private"
        allowed_visibility = {
            "memory_reveal": {"private"},
            "dwell_aura": {"private", "local_public"},
            "anomaly_glimpse": {"private", "local_public"},
            "persona_whisper": {"private"},
            "legend_fragment": {"local_public", "global"},
            "broadcast_echo": {"global"},
        }
        allowed = allowed_visibility.get(capsule_type, {default_visibility})

        candidates = [
            visibility
            for visibility in allowed
            if order.get(visibility, 0) <= order.get(input_visibility, 0)
        ]
        if candidates:
            return max(candidates, key=lambda visibility: order[visibility])

        if default_visibility in allowed:
            return default_visibility
        return min(allowed, key=lambda visibility: order[visibility])

    def _resolve_visual_hint(self, inp: CapsuleInput, capsule_type: str, default_hint: str) -> str:
        if capsule_type == "broadcast_echo":
            return "shimmer"
        if inp.lens is not None:
            return _LENS_TO_VISUAL.get(inp.lens.lens_id, default_hint)
        return default_hint

    def _resolve_interaction(self, capsule_type: str) -> str:
        mapping = {
            "memory_reveal": "inspect_echo",
            "dwell_aura": "dwell_more",
            "anomaly_glimpse": "inspect_anomaly",
            "persona_whisper": "listen_closer",
            "legend_fragment": "read_fragment",
            "broadcast_echo": "trace_resonance",
            "vision": "inspect_anomaly",
            "echo": "read_fragment",
            "ritual": "dwell_more",
            "whisper": "listen_closer",
            "rift": "trace_resonance",
        }
        return mapping.get(capsule_type, "dismiss")

    def _build_confidence(self, inp: CapsuleInput, trigger: CapsuleTrigger) -> float:
        trust = inp.persona.trust_level if inp.persona else 0.0
        score = 0.3 + 0.08 * trigger.priority + 0.2 * trust
        if inp.lens is not None and inp.lens.lens_id in {"oracle", "chronicle", "hearth", "veil"}:
            score += 0.05
        if inp.writeback_count > 0:
            score += 0.05
        return round(_clamp(score, 0.0, 0.98), 3)
