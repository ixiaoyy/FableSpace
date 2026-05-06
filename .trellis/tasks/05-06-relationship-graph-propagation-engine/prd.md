# Relationship graph propagation engine

## Goal

Implement deterministic one-hop propagation for visitor affinity/hostility across confirmed relationship graph edges.

## Requirements

- Apply one-hop propagation only.
- Use dual-axis projection: `affinity` and `hostility`.
- Negative effect drains affinity first, then increases hostility.
- Friendly/allied effects are capped; rival/hostile effects can accumulate hostility after affinity drains.
- More specific relationship wins: `character↔character > character↔tavern > tavern↔tavern`.
- Same-owner/system relations can be mutually effective; cross-owner edges remain directional perspectives.
- Character relationship changes weakly roll up to parent tavern using owner-controlled influence weight.
- Store provenance for derived projection changes.

## Acceptance Criteria

- [x] Tests cover friendly, allied, rival, hostile, and neutral effects.
- [x] Tests cover one-hop only and no graph-wide cascade.
- [x] Tests cover cross-owner A→B perspective reaction to visitor↔B changes.
- [x] Tests cover same-owner/system mutual effectiveness.
- [x] Tests cover character-specific edge overriding tavern-wide edge.
- [x] Tests cover character-to-tavern roll-up weighting.
- [x] Compileall and focused pytest pass.

## Out of Scope

- Owner UI and prompt/discovery integration.


## Implementation Notes

- Added `RelationshipPropagationEvent` / `RelationshipPropagationResult` to the relationship graph domain layer.
- Added `RelationshipGraphService.propagate_event(...)` for deterministic one-hop propagation over confirmed edges from the SQLAlchemy store.
- Implemented friendly/allied capped positive effects, neutral no-op, rival/hostile negative effects, target-to-source perspective reactions, specificity suppression of broad tavern-wide edges, and character-to-parent-tavern roll-up with influence weight.
- Projection metadata records provenance such as `source_edge_id`, `propagation_direction`, source node/event, behavior and strength preset; roll-up records `source_character_id` and `reason=character_rollup`.
- Updated architecture and backend quality spec with propagation contracts.

## Validation

- RED: `py -3 -m pytest -q backend/tests/test_relationship_graph_propagation.py --tb=short` failed on missing `fablemap_api.application.services.relationship_graph`.
- GREEN: `py -3 -m pytest -q backend/tests/test_relationship_graph_propagation.py --tb=short` → 7 passed.
- `py -3 -m pytest -q backend/tests/test_relationship_graph_domain.py backend/tests/test_relationship_graph_store.py backend/tests/test_relationship_graph_propagation.py --tb=short` → 16 passed.
- `py -3 -m compileall -q backend/src` → passed.
- `git diff --check -- <changed files>` → passed with CRLF normalization warning for docs only.
