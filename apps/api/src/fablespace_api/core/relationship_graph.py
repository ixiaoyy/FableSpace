"""Owner-governed tavern/character relationship graph domain helpers."""

from __future__ import annotations

from dataclasses import dataclass, field, replace
from typing import Any, Iterable

NODE_TYPES = {"tavern", "character"}
BEHAVIOR_TYPES = {"friendly", "allied", "neutral", "rival", "hostile"}
STRENGTH_PRESETS = {"weak", "normal", "strong"}
GOVERNANCE_MODES = {"manual", "assisted", "delegated_ai", "system_ai"}
EDGE_STATUSES = {"pending", "confirmed", "rejected", "disabled"}

_STRENGTH_MULTIPLIERS = {
    "weak": 0.25,
    "normal": 0.5,
    "strong": 0.8,
}

_SPECIFICITY_RANKS = {
    ("tavern", "tavern"): 1,
    ("tavern", "character"): 2,
    ("character", "tavern"): 2,
    ("character", "character"): 3,
}


def _require_choice(value: str, allowed: set[str], field_name: str) -> str:
    if value not in allowed:
        allowed_text = ", ".join(sorted(allowed))
        raise ValueError(f"{field_name} must be one of: {allowed_text}")
    return value


def _clamp_affinity(value: float) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        numeric = 0.0
    return max(0.0, min(1.0, numeric))


def _normalize_non_negative(value: float) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        numeric = 0.0
    return max(0.0, numeric)


@dataclass(slots=True)
class RelationshipEdge:
    """Canonical owner/source-side relationship stance between two graph nodes."""

    id: str
    source_node_type: str
    source_node_id: str
    target_node_type: str
    target_node_id: str
    behavior_type: str
    source_owner_id: str = ""
    source_space_id: str = ""
    target_owner_id: str = ""
    target_space_id: str = ""
    display_name: str = ""
    description: str = ""
    strength_preset: str = "normal"
    status: str = "pending"
    governance_mode: str = "manual"
    confirmed_by: str = ""
    confirmed_by_type: str = ""
    created_at: str = ""
    updated_at: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.source_node_type = _require_choice(self.source_node_type, NODE_TYPES, "source_node_type")
        self.target_node_type = _require_choice(self.target_node_type, NODE_TYPES, "target_node_type")
        self.behavior_type = _require_choice(self.behavior_type, BEHAVIOR_TYPES, "behavior_type")
        self.strength_preset = _require_choice(self.strength_preset, STRENGTH_PRESETS, "strength_preset")
        self.status = _require_choice(self.status, EDGE_STATUSES, "status")
        self.governance_mode = _require_choice(self.governance_mode, GOVERNANCE_MODES, "governance_mode")
        self.metadata = dict(self.metadata or {})

    @property
    def is_confirmed_enabled(self) -> bool:
        return self.status == "confirmed"


@dataclass(slots=True)
class RelationshipProjection:
    """Visitor-private dual-axis relation to one tavern or character node."""

    visitor_id: str
    node_type: str
    node_id: str
    space_id: str = ""
    affinity: float = 0.0
    hostility: float = 0.0
    last_event_at: str = ""
    updated_at: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.node_type = _require_choice(self.node_type, NODE_TYPES, "node_type")
        self.affinity = _clamp_affinity(self.affinity)
        self.hostility = _normalize_non_negative(self.hostility)
        self.metadata = dict(self.metadata or {})


def strength_multiplier(value: str) -> float:
    """Return the deterministic multiplier for a closed strength preset."""

    return _STRENGTH_MULTIPLIERS[_require_choice(value, STRENGTH_PRESETS, "strength_preset")]


def apply_positive_effect(
    projection: RelationshipProjection,
    amount: float,
    *,
    cap: float = 1.0,
) -> RelationshipProjection:
    """Increase affinity up to a friendly cap without reducing hostility."""

    effect = _normalize_non_negative(amount)
    cap_value = _clamp_affinity(cap)
    current = _clamp_affinity(projection.affinity)
    if current >= cap_value or effect == 0:
        new_affinity = current
    else:
        new_affinity = min(cap_value, current + effect)
    return replace(
        projection,
        affinity=round(new_affinity, 10),
        hostility=round(_normalize_non_negative(projection.hostility), 10),
    )


def apply_negative_effect(projection: RelationshipProjection, amount: float) -> RelationshipProjection:
    """Drain affinity first, then convert any remainder into hostility."""

    effect = _normalize_non_negative(amount)
    current_affinity = _clamp_affinity(projection.affinity)
    current_hostility = _normalize_non_negative(projection.hostility)
    if effect == 0:
        return replace(projection, affinity=current_affinity, hostility=current_hostility)

    drained = min(current_affinity, effect)
    remainder = effect - drained
    return replace(
        projection,
        affinity=round(max(0.0, current_affinity - drained), 10),
        hostility=round(current_hostility + remainder, 10),
    )


def specificity_rank(edge: RelationshipEdge) -> int:
    """Rank edge specificity; higher means the edge wins propagation resolution."""

    return _SPECIFICITY_RANKS.get((edge.source_node_type, edge.target_node_type), 0)


def select_effective_edge(edges: Iterable[RelationshipEdge]) -> RelationshipEdge:
    """Pick the edge whose specificity should explain one propagation effect."""

    candidates = list(edges)
    if not candidates:
        raise ValueError("at least one relationship edge is required")
    return sorted(
        candidates,
        key=lambda edge: (
            specificity_rank(edge),
            strength_multiplier(edge.strength_preset),
            edge.id,
        ),
        reverse=True,
    )[0]


@dataclass(slots=True)
class RelationshipPropagationEvent:
    """One direct visitor relationship change used as propagation input."""

    visitor_id: str
    source_node_type: str
    source_node_id: str
    source_space_id: str = ""
    source_owner_id: str = ""
    delta_axis: str = "affinity"
    delta_amount: float = 0.0
    character_influence_weight: float = 0.0
    source_event_id: str = ""
    source_message_ids: tuple[str, ...] = ()
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.source_node_type = _require_choice(self.source_node_type, NODE_TYPES, "source_node_type")
        if self.delta_axis not in {"affinity", "hostility"}:
            raise ValueError("delta_axis must be one of: affinity, hostility")
        self.delta_amount = _normalize_non_negative(self.delta_amount)
        self.character_influence_weight = _normalize_non_negative(self.character_influence_weight)
        self.source_message_ids = tuple(self.source_message_ids or ())
        self.metadata = dict(self.metadata or {})


@dataclass(slots=True)
class RelationshipPropagationResult:
    """Summary of one projection updated by propagation."""

    edge_id: str
    target_node_type: str
    target_node_id: str
    affinity: float
    hostility: float
    reason: str = "edge"
