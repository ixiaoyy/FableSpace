# Relationship graph API and governance

## Goal

Expose backend APIs and service-layer governance for owner/system relationship edges, pending AI candidates, and AI auto-confirm modes.

## Requirements

- Add thin v1 API routes for listing/creating/updating/deciding relationship edges.
- Enforce ownership and source-side authority.
- Support governance modes: `manual`, `assisted`, `delegated_ai`, `system_ai`.
- AI auto-confirm can only confirm source-side perspective edges.
- Cross-owner target cannot be forced to accept source declaration.
- Pending candidates must not participate in propagation until confirmed/auto-confirmed.
- Return public-safe payloads; do not expose private prompts, API keys, or unrelated visitor data.

## Acceptance Criteria

- [x] Owner can create/update own source-side edges.
- [x] Non-owner cannot mutate another owner’s edge.
- [x] Delegated/system AI can auto-confirm only source-side perspective.
- [x] Cross-owner relation remains directional perspective.
- [x] Pending edge is ignored by propagation queries.
- [x] API tests and compileall pass.

## Out of Scope

- Frontend UI and prompt/discovery integration.


## Implementation Notes

- Added thin v1 relationship graph routes under tavern scope for list/create/update/decision flows.
- Added service-layer source-side governance: path tavern must match `source_tavern_id`, `_ensure_owner(...)` gates owner mutations, and delegated/system AI auto-confirm only confirms source-side edges.
- Added pending candidate support: pending edges are visible to the source owner but remain excluded from confirmed propagation/store queries until explicitly confirmed.
- Returned public-safe edge payloads with `perspective_scope=source_owner`; cross-owner target taverns do not receive or accept the source owner edge as their own canon.
- Updated backend architecture and quality spec with API governance contracts.

## Validation

- RED: `py -3 -m pytest -q backend/tests/test_relationship_graph_api.py --tb=short` failed with 404s before routes existed.
- GREEN: `py -3 -m pytest -q backend/tests/test_relationship_graph_api.py --tb=short` → 4 passed.
- `py -3 -m pytest -q backend/tests/test_relationship_graph_domain.py backend/tests/test_relationship_graph_store.py backend/tests/test_relationship_graph_propagation.py backend/tests/test_relationship_graph_api.py --tb=short` → 20 passed.
- `py -3 -m compileall -q backend/src` → passed.
- `git diff --check -- <changed files>` → passed with CRLF normalization warnings only.
