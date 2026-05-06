from __future__ import annotations

from fablemap_api.core.relationship_graph import (
    BEHAVIOR_TYPES,
    EDGE_STATUSES,
    GOVERNANCE_MODES,
    NODE_TYPES,
    STRENGTH_PRESETS,
    RelationshipEdge,
    RelationshipProjection,
    apply_negative_effect,
    apply_positive_effect,
    select_effective_edge,
    specificity_rank,
    strength_multiplier,
)


def test_negative_effect_drains_affinity_before_hostility() -> None:
    projection = RelationshipProjection(
        visitor_id="visitor_a",
        node_type="tavern",
        node_id="tavern_a",
        affinity=0.05,
        hostility=0.0,
    )

    updated = apply_negative_effect(projection, 0.08)

    assert updated.affinity == 0.0
    assert round(updated.hostility, 4) == 0.03


def test_positive_effect_respects_cap_without_erasing_hostility() -> None:
    projection = RelationshipProjection(
        visitor_id="visitor_a",
        node_type="character",
        node_id="char_a",
        affinity=0.62,
        hostility=0.2,
    )

    updated = apply_positive_effect(projection, 0.3, cap=0.7)

    assert updated.affinity == 0.7
    assert updated.hostility == 0.2


def test_specificity_prefers_character_edge_over_tavern_edge() -> None:
    tavern_edge = RelationshipEdge(
        id="edge_t",
        source_node_type="tavern",
        source_node_id="ta",
        target_node_type="tavern",
        target_node_id="tb",
        behavior_type="hostile",
    )
    character_edge = RelationshipEdge(
        id="edge_c",
        source_node_type="character",
        source_node_id="ca",
        target_node_type="character",
        target_node_id="cb",
        behavior_type="friendly",
    )

    assert specificity_rank(character_edge) > specificity_rank(tavern_edge)
    assert select_effective_edge([tavern_edge, character_edge]).id == "edge_c"


def test_same_specificity_prefers_stronger_strength_preset_then_stable_id() -> None:
    weak = RelationshipEdge(
        id="edge_a",
        source_node_type="tavern",
        source_node_id="ta",
        target_node_type="tavern",
        target_node_id="tb",
        behavior_type="friendly",
        strength_preset="weak",
    )
    strong = RelationshipEdge(
        id="edge_b",
        source_node_type="tavern",
        source_node_id="ta",
        target_node_type="tavern",
        target_node_id="tb",
        behavior_type="friendly",
        strength_preset="strong",
    )

    assert strength_multiplier("weak") < strength_multiplier("strong")
    assert select_effective_edge([weak, strong]).id == "edge_b"


def test_fixed_relationship_graph_enums_are_closed_sets() -> None:
    assert NODE_TYPES == {"tavern", "character"}
    assert BEHAVIOR_TYPES == {"friendly", "allied", "neutral", "rival", "hostile"}
    assert STRENGTH_PRESETS == {"weak", "normal", "strong"}
    assert GOVERNANCE_MODES == {"manual", "assisted", "delegated_ai", "system_ai"}
    assert EDGE_STATUSES == {"pending", "confirmed", "rejected", "disabled"}
