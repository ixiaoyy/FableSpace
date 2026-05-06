# Unified Tavern / Character Relationship Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use Trellis task workflow plus `before-dev`, `check`, and `finish-work` before coding/committing. If using Superpowers execution, use `superpowers:subagent-driven-development` or `superpowers:executing-plans` task-by-task.

**Goal:** Build a unified owner-governed relationship graph for taverns and characters, with deterministic one-hop visitor affinity/hostility propagation.

**Architecture:** Add a backend domain layer for graph edges and visitor projections, persist it through SQLAlchemy/MySQL, expose owner-governed APIs, then add minimal owner UI and prompt/discovery integration after core propagation is tested. Keep AI-generated relationship changes as pending candidates unless the tavern uses `delegated_ai` or `system_ai` governance.

**Tech Stack:** Python/FastAPI, SQLAlchemy models/stores, existing `AffinityCalculator`/`VisitorState`, React Router/Vite frontend, Trellis docs/specs/tests.

---

## Confirmed product decisions

- Unified graph from day one: `tavern` and `character` nodes.
- Dual-axis visitor projection: `affinity: 0.0–1.0`, `hostility: 0.0–∞`.
- One-hop propagation only.
- More specific edge wins: `character↔character > character↔tavern > tavern↔tavern`.
- Same-owner/system relations can be mutually effective; cross-owner relations are directional perspective edges.
- A perspective A→B can make A react to the visitor's relationship with B, but cannot force B to accept A's stance.
- Negative effects drain `affinity` before adding `hostility`.
- Character relationships weakly roll up to parent tavern relationship with owner-controlled influence weights.
- Built-in behavior types with editable labels: `friendly`, `allied`, `neutral`, `rival`, `hostile`.
- Strength presets: `weak`, `normal`, `strong`.
- Governance modes: `manual`, `assisted`, `delegated_ai`, `system_ai`.
- AI auto-confirm can only confirm its own/source-side perspective.

---

## Proposed file responsibilities

### Backend schema/domain

- `backend/src/fablemap_api/core/relationship_graph.py`
  - Domain enums and dataclasses: node type, behavior type, strength preset, governance mode, edge status, edge, projection, propagation event/result.
  - Pure helper functions for specificity ranking and positive/negative dual-axis effects.
- `backend/src/fablemap_api/infrastructure/models.py`
  - Add SQLAlchemy tables for relationship edges, visitor-node projections, and AI/owner candidates if candidates are not represented as edges with `status=pending`.
- `backend/src/fablemap_api/infrastructure/relationship_graph_store.py`
  - SQLAlchemy store for edges/projections/candidates.
  - Optional explicit JSON fallback only if required by existing fallback strategy; production path must be DB-backed.

### Backend service/API

- `backend/src/fablemap_api/application/services/relationship_graph.py`
  - Owner authorization, governance mode checks, edge CRUD, candidate confirm/reject, propagation orchestration.
- `backend/src/fablemap_api/api/v1/relationship_graph.py`
  - Thin FastAPI routes.
- `backend/src/fablemap_api/api/v1/router.py`
  - Include router.
- `backend/src/fablemap_api/application/services/runtime.py`
  - Hook propagation after direct tavern/character affinity updates.

### Frontend

- `frontend/app/lib/relationship-graph.ts`
  - Typed API client and normalizers.
- `frontend/app/features/relationship-graph/RelationshipGraphPanel.tsx`
  - Owner-visible list/edit/confirm UI.
- `frontend/app/routes/tavern.tsx` or owner dashboard route modules
  - Mount minimal owner panel in the management surface only.

### Docs/spec/tests

- `docs/WORLD_SCHEMA.md`
  - Add canonical schema section.
- `docs/ARCHITECTURE.md`
  - Add relationship graph layer and data flow.
- `.trellis/spec/backend/database-guidelines.md`
  - Add persistence/propagation contract.
- `.trellis/spec/frontend/*` if UI boundary needs a new relationship graph guideline.
- `backend/tests/test_relationship_graph_domain.py`
  - Pure math and specificity tests.
- `backend/tests/test_relationship_graph_store.py`
  - DB round-trip and idempotency tests.
- `backend/tests/test_relationship_graph_api.py`
  - Owner/governance/API tests.
- `frontend/scripts/relationship-graph-test.mjs`
  - Frontend client/normalizer tests.

---

## Task 1: Schema and domain contracts

**Files:**
- Create: `backend/src/fablemap_api/core/relationship_graph.py`
- Modify: `backend/src/fablemap_api/infrastructure/models.py`
- Modify: `docs/WORLD_SCHEMA.md`
- Modify: `docs/ARCHITECTURE.md`
- Test: `backend/tests/test_relationship_graph_domain.py`

- [ ] **Step 1: Write failing domain tests**

Create tests for:

```python
def test_negative_effect_drains_affinity_before_hostility():
    from fablemap_api.core.relationship_graph import RelationshipProjection, apply_negative_effect

    projection = RelationshipProjection(visitor_id="visitor_a", node_type="tavern", node_id="tavern_a", affinity=0.05, hostility=0.0)
    updated = apply_negative_effect(projection, 0.08)

    assert updated.affinity == 0.0
    assert round(updated.hostility, 4) == 0.03


def test_specificity_prefers_character_edge_over_tavern_edge():
    from fablemap_api.core.relationship_graph import RelationshipEdge, select_effective_edge

    tavern_edge = RelationshipEdge(id="edge_t", source_node_type="tavern", source_node_id="ta", target_node_type="tavern", target_node_id="tb", behavior_type="hostile")
    character_edge = RelationshipEdge(id="edge_c", source_node_type="character", source_node_id="ca", target_node_type="character", target_node_id="cb", behavior_type="friendly")

    assert select_effective_edge([tavern_edge, character_edge]).id == "edge_c"
```

Run:

```powershell
py -3 -m pytest -q backend/tests/test_relationship_graph_domain.py --tb=short
```

Expected: fails because module does not exist.

- [ ] **Step 2: Implement domain dataclasses/enums**

Define fixed enums:

```python
NODE_TYPES = {"tavern", "character"}
BEHAVIOR_TYPES = {"friendly", "allied", "neutral", "rival", "hostile"}
STRENGTH_PRESETS = {"weak", "normal", "strong"}
GOVERNANCE_MODES = {"manual", "assisted", "delegated_ai", "system_ai"}
EDGE_STATUSES = {"pending", "confirmed", "rejected", "disabled"}
```

Add dataclasses for `RelationshipEdge` and `RelationshipProjection`, including provenance fields.

- [ ] **Step 3: Implement pure helpers**

Implement:

```python
apply_positive_effect(projection, amount, cap)
apply_negative_effect(projection, amount)
specificity_rank(edge)
select_effective_edge(edges)
```

- [ ] **Step 4: Add schema docs**

Add a WORLD_SCHEMA section describing:

```typescript
type RelationshipNodeType = "tavern" | "character";
type RelationshipBehaviorType = "friendly" | "allied" | "neutral" | "rival" | "hostile";
type RelationshipStrengthPreset = "weak" | "normal" | "strong";
type RelationshipGovernanceMode = "manual" | "assisted" | "delegated_ai" | "system_ai";
```

- [ ] **Step 5: Verify**

Run:

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests/test_relationship_graph_domain.py --tb=short
```

---

## Task 2: SQLAlchemy store and migration-compatible persistence

**Files:**
- Modify: `backend/src/fablemap_api/infrastructure/models.py`
- Create: `backend/src/fablemap_api/infrastructure/relationship_graph_store.py`
- Test: `backend/tests/test_relationship_graph_store.py`
- Modify: `.trellis/spec/backend/database-guidelines.md`

- [ ] **Step 1: Write failing DB tests**

Test confirmed edge round-trip, pending candidate ignored by propagation queries, projection upsert, and provenance persistence.

- [ ] **Step 2: Add SQLAlchemy models**

Tables should include at least:

```text
relationship_edges
visitor_relationship_projections
```

Required edge columns:

```text
id, source_owner_id, source_tavern_id, source_node_type, source_node_id,
target_owner_id, target_tavern_id, target_node_type, target_node_id,
behavior_type, display_name, description, strength_preset,
status, governance_mode, confirmed_by, confirmed_by_type,
created_at, updated_at, metadata
```

Required projection columns:

```text
visitor_id, node_type, node_id, tavern_id, affinity, hostility,
last_event_at, updated_at, metadata
```

Use composite uniqueness for `(visitor_id, node_type, node_id)`.

- [ ] **Step 3: Implement store**

Implement methods:

```python
list_edges_for_source(...)
list_confirmed_edges_for_node(...)
save_edge(edge)
get_projection(visitor_id, node_type, node_id)
upsert_projection(projection)
```

- [ ] **Step 4: Verify**

Run:

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests/test_relationship_graph_store.py --tb=short
```

---

## Task 3: Propagation engine and runtime integration

**Files:**
- Modify: `backend/src/fablemap_api/core/relationship_graph.py`
- Create: `backend/src/fablemap_api/application/services/relationship_graph.py`
- Modify: `backend/src/fablemap_api/application/services/runtime.py`
- Test: `backend/tests/test_relationship_graph_propagation.py`

- [ ] **Step 1: Write propagation tests**

Cover:

1. A→B hostile perspective: visitor improves with B, visitor↔A affinity drains first.
2. A→B friendly perspective: visitor improves with B, visitor↔A affinity increases up to cap.
3. One-hop only: A→B and B→C does not update C.
4. Same-owner relation may be mutually effective.
5. Cross-owner target is not hijacked.
6. Character→parent tavern roll-up uses influence weight.

- [ ] **Step 2: Implement event model**

Define propagation event fields:

```text
visitor_id, context_owner_id, source_node_type, source_node_id,
delta_axis, delta_amount, event_type, source_message_ids
```

- [ ] **Step 3: Implement one-hop propagation**

Use confirmed/enabled edges only, resolve specificity, apply strength preset constants, write provenance metadata.

- [ ] **Step 4: Hook after affinity updates**

In runtime chat/update paths, after direct visitor affinity update, emit propagation event into relationship graph service. Keep failures degraded/logged so chat does not break if propagation has a recoverable error.

- [ ] **Step 5: Verify**

Run:

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests/test_relationship_graph_propagation.py --tb=short
```

---

## Task 4: Owner/API governance and AI candidates

**Files:**
- Create: `backend/src/fablemap_api/api/v1/relationship_graph.py`
- Modify: `backend/src/fablemap_api/api/v1/router.py`
- Modify: `backend/src/fablemap_api/application/services/relationship_graph.py`
- Test: `backend/tests/test_relationship_graph_api.py`

- [ ] **Step 1: Write API tests**

Cover:

1. Owner creates confirmed manual edge inside own scope.
2. Cross-owner edge is stored as source-side perspective.
3. Non-owner cannot modify another owner’s edge.
4. Delegated AI can auto-confirm source-side perspective only.
5. Delegated AI cannot create target-owner/bilateral edge.
6. Pending edge does not participate in propagation.

- [ ] **Step 2: Add routes**

Suggested endpoints:

```http
GET /api/v1/taverns/{tavern_id}/relationship-edges
POST /api/v1/taverns/{tavern_id}/relationship-edges
PUT /api/v1/taverns/{tavern_id}/relationship-edges/{edge_id}
POST /api/v1/taverns/{tavern_id}/relationship-edges/{edge_id}/decision
GET /api/v1/taverns/{tavern_id}/relationship-projections/me
```

- [ ] **Step 3: Add governance validation**

Validate source owner, source tavern, target references, AI confirmation authority, and edge status transitions.

- [ ] **Step 4: Verify**

Run:

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests/test_relationship_graph_api.py --tb=short
```

---

## Task 5: Minimal owner UI and frontend client

**Files:**
- Create: `frontend/app/lib/relationship-graph.ts`
- Create: `frontend/app/features/relationship-graph/RelationshipGraphPanel.tsx`
- Modify: `frontend/app/routes/tavern.tsx` or owner/admin route that currently hosts tavern management panels
- Create: `frontend/scripts/relationship-graph-test.mjs`
- Modify: `frontend/package.json` test script if needed

- [ ] **Step 1: Write frontend service tests**

Test normalizers for behavior types, strength presets, edge status, and safe fallback labels.

- [ ] **Step 2: Implement typed API client**

Add functions:

```typescript
listRelationshipEdges(tavernId, options)
createRelationshipEdge(tavernId, payload)
updateRelationshipEdge(tavernId, edgeId, payload)
decideRelationshipEdge(tavernId, edgeId, decision)
listMyRelationshipProjections(tavernId)
```

- [ ] **Step 3: Implement owner panel**

MVP UI should support list, create/edit simple edge, show pending candidates, confirm/reject, and show “single-sided perspective” wording for cross-owner edges.

- [ ] **Step 4: Verify desktop and narrow layout**

Run:

```powershell
npm --prefix .\frontend test
npm --prefix .\frontend run build
```

For visual changes, run Playwright/self-acceptance per project frontend rules before reporting ready for human visual review.

---

## Task 6: Prompt/discovery integration after core is stable

**Files:**
- Modify: `backend/src/fablemap_api/application/services/runtime.py`
- Modify: prompt builder/service files that inject visitor relationship context
- Modify: `frontend/app/routes/discover.tsx` or relevant tavern detail components if showing relationship hints
- Test: focused backend prompt tests and frontend route tests

- [ ] **Step 1: Add backend tests for prompt-safe relation context**

Ensure prompts explain only owner/scope-appropriate relation facts and do not leak private visitor projection history.

- [ ] **Step 2: Inject relation context into NPC prompts**

Use concise blocks such as:

```text
【关系立场】
本酒馆对“B 酒馆”的立场：商业竞争（rival）。
当前访客与 B 酒馆较亲近，因此本酒馆角色可能表现出轻微疏离或试探。
```

- [ ] **Step 3: Add discovery/detail hints only if product-approved**

Keep hints owner-authored/perspective-labeled. Avoid public “global social graph” language.

- [ ] **Step 4: Verify**

Run backend prompt tests and frontend tests/build for touched surfaces.

---

## Self-review checklist

- [x] Covers unified graph, dual-axis projection, one-hop propagation, specificity, ownership/perspective, AI governance, type presets, strength presets, character roll-up.
- [x] Keeps implementation split into independently testable backend/domain/store/service/API/frontend slices.
- [x] Does not implement visitor social graph, private messaging, battle/faction/ranking systems, or owner-bypassing canon mutation.
- [x] Uses SQLAlchemy/DB-backed persistence as current project direction.
- [x] Requires docs/tests before behavior claims.
