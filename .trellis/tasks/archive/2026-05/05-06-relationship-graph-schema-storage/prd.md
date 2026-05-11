# Relationship graph schema and storage

## Goal

Define the canonical backend data model for the unified tavern/character relationship graph and persist it in the DB-backed runtime path.

## Requirements

- Add domain contracts for relationship nodes, edges, behavior types, strength presets, governance modes, edge status, and visitor projections.
- Add SQLAlchemy persistence for relationship edges and visitor-node projections.
- Use fixed behavior enums: `friendly`, `allied`, `neutral`, `rival`, `hostile`.
- Use fixed strength presets: `weak`, `normal`, `strong`.
- Preserve `VisitorState.relationship_strength` compatibility; do not force negative values into existing affinity.
- Update `docs/WORLD_SCHEMA.md`, `docs/ARCHITECTURE.md`, and `.trellis/spec/backend/database-guidelines.md` as needed.

## Acceptance Criteria

- [x] Domain helpers pass unit tests for dual-axis effects and specificity ranking.
- [x] DB models can round-trip confirmed edges and visitor projections.
- [x] Pending/disabled edges are distinguishable from confirmed/enabled edges.
- [x] Docs describe schema and owner/perspective boundaries.
- [x] `py -3 -m compileall -q backend/src` passes.
- [x] Focused backend tests pass.

## Out of Scope

- API routes, UI, prompt injection, and runtime propagation hooks.


## Implementation Notes

- Added `backend/src/fablemap_api/core/relationship_graph.py` with closed enums, `RelationshipEdge`, `RelationshipProjection`, dual-axis positive/negative helpers, strength multipliers, specificity ranking, and effective-edge selection.
- Added SQLAlchemy `relationship_edges` and `visitor_relationship_projections` models. Projection identity is `(visitor_id, node_type, node_id)` and stores affinity/hostility plus provenance metadata.
- Added `SQLAlchemyRelationshipGraphStore` for edge save/list, confirmed-edge queries, and projection get/upsert. `list_confirmed_edges_for_node(...)` excludes `pending` / `disabled` / `rejected` edges.
- Updated `docs/WORLD_SCHEMA.md`, `docs/ARCHITECTURE.md`, and `.trellis/spec/backend/database-guidelines.md` with owner/source-side perspective boundaries, fixed enums, and visitor-private projection rules.

## Validation

- RED: `py -3 -m pytest -q backend/tests/test_relationship_graph_domain.py backend/tests/test_relationship_graph_store.py --tb=short` failed on missing `fablemap_api.core.relationship_graph`.
- GREEN: `py -3 -m pytest -q backend/tests/test_relationship_graph_domain.py backend/tests/test_relationship_graph_store.py --tb=short` → 9 passed.
- `py -3 -m compileall -q backend/src` → passed.
- `py -3 -m pytest -q backend/tests/test_mysql_infrastructure.py --tb=short` → 19 passed, 6 existing utcnow deprecation warnings.
- `git diff --check -- <changed files>` → passed.
