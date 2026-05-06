# Backend Quality Guidelines

> Quality standards for Python backend changes in FableMap.

---

## Overview

Backend quality is defined by project constraints first, then by tests. The most important rule is to preserve the cyber tavern product boundary: real coordinates, owner-authored tavern content, AI as NPC/dialogue engine, sensitive owner LLM config, and SillyTavern-compatible character data.

---

## Required patterns

### Read docs before medium/high-risk work

For backend API/schema/product changes, read at least the relevant docs from `AGENTS.md`:

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/WORLD_SCHEMA.md`
- `docs/WHAT_NOT_TO_BUILD.md`
- `docs/AI参与开发协议.md`
- relevant `.trellis/tasks/<task>/prd.md`, context jsonl files, and `.trellis/spec/` docs for the active task

### Keep behavior testable

Most backend behavior has pytest coverage in `tests/`. New or changed behavior should add/update focused tests near existing files:

- Tavern CRUD/chat/history: `tests/test_tavern_*.py`
- Gameplay: `tests/test_tavern_gameplay_api.py`, `tests/test_tavern_gameplay_models.py`
- World info/prompt/output rules: `tests/test_tavern_world_info_injection.py`, `tests/test_tavern_prompt_blocks.py`, `tests/test_tavern_output_rules.py`
- Core engines: `tests/test_writeback...`, `tests/test_orchestrator.py`, etc.

### New NPC completion requires art payload tests

If a backend/default-seed task adds a formal NPC role, do not claim the NPC is complete with text fields alone. The focused test must assert that the character payload includes `avatar` or `sprites.neutral`, required expression sprite semantics, and that project-local asset files exist. See `../frontend/npc-art-guidelines.md` for the cross-layer NPC completion contract.

### Keep route/service/store boundaries

- `router.py`: HTTP method/path/parameters and thin delegation.
- `web/service.py`: response payload orchestration, owner/visitor boundary checks, cross-module coordination.
- `tavern.py`: tavern domain dataclasses, JSON store, tavern CRUD/character/history operations.
- `gameplay.py`: gameplay normalization, session/event mechanics, AI/fallback result shaping.

### Normalize external/user input

Follow existing helpers such as `_normalize_*`, `_clamp_*`, `_safe_*`, and `from_dict` defaults. Do not assume browser payloads or imported SillyTavern cards are complete or well-typed.

---

## Forbidden patterns

- Adding dependencies not already in `requirements.txt` without user approval.
- Adding/changing schema fields without docs and tests.
- Exposing owner-only secrets to visitors.
- Implementing platform-generated tavern/NPC/story content.
- Adding platform token purchase/settlement/market logic.
- Adding visitor-to-visitor social features, combat, levels, equipment, or traditional map-app features.
- Mixing unrelated formatting/refactors into a functional change.
- Writing destructive file or git operations without explicit user confirmation.

---

## Verification requirements

For new enterprise-backend code under `backend/src`, run:

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests --tb=short
```

If a change touches both the migrated product core and new backend code, also run the migrated-product-core command:

```powershell
py -3 -m compileall -q backend/src
```

Choose the smallest real verification that matches the change:

```powershell
# Python syntax/importability check
py -3 -m compileall -q backend/src

# Focused backend tests
py -3 -m pytest -q tests/test_tavern_gameplay_api.py --tb=short

# Full backend tests when API/schema behavior is broad
py -3 -m pytest -q --tb=short
```

If frontend contracts change, also run relevant frontend build/tests from `frontend/` docs.

Never claim completion without fresh command output.

---

## Code review checklist

Review backend changes for:

- Product boundary: does it reinforce tavern discovery/entry/dialogue/memory instead of old map-game directions?
- Schema contract: are docs/tests/frontend services aligned?
- Security: are API keys, password hashes, private visitor data, and owner-only views protected?
- Persistence: is JSON read/write backward-compatible?
- Error handling: expected user/provider errors return stable JSON/degraded payloads.
- Tests: relevant pytest added/updated and command output recorded.
- Scope: no unrelated refactor, dependency, or formatting churn.

---

## Real examples to follow

1. `tests/test_tavern_chat_history_permissions.py` and `tests/test_tavern_memory_permissions.py` show permission-sensitive behavior should be directly tested.
2. `tests/test_tavern_gameplay_api.py` exercises the route/service/session boundary for gameplay rather than only unit-normalizing data.
3. `backend/src/fablemap_api/core/gameplay.py` keeps AI Director output validation/fallback separate from route handling.
4. `backend/src/fablemap_api/core/web/app.py` centralizes error envelope behavior instead of letting each route invent one.

---

## Common mistakes

- Running only `compileall` for behavior changes that need pytest.
- Changing response shape in backend but forgetting `frontend/app/lib/`, `frontend/app/product/services/`, and frontend scripts.
- Treating tests as documentation substitutes; still update `docs/WORLD_SCHEMA.md` for schema changes.
- Using broad `except Exception` without logging, rollback/fallback, or a clear reason.

---

## Scenario: Persistent Notification Store and WebSocket Identity

### 1. Scope / Trigger

Use this contract when changing `backend/src/fablemap_api/core/notifications.py` or `backend/src/fablemap_api/api/v1/notifications.py`. Notifications are persistent by default through `SQLAlchemyNotificationStore`; the in-memory `NotificationStore` is only an explicit JSON/dev fallback and is not the production runtime path. This is still not a Redis/pub-sub or cross-process push system.

### 2. Signatures

```python
NotificationStore.add_notification(user_id, notification_type, title, content, data=None, tavern_id=None, tavern_name=None) -> Notification
NotificationStore.register_connection(user_id: str) -> asyncio.Queue
NotificationStore.unregister_connection(user_id: str, queue: asyncio.Queue) -> None
NotificationStore.get_notifications(user_id: str, limit=20, offset=0, unread_only=False) -> tuple[list[dict], int, int]
NotificationStore.mark_as_read(user_id: str, notification_id: str) -> bool
```

```http
GET /api/v1/notifications
POST /api/v1/notifications/{notification_id}/read
POST /api/v1/notifications/read-all
DELETE /api/v1/notifications/{notification_id}
GET /api/v1/notifications/unread-count
WS  /api/v1/notifications/ws/{user_id}
```

### 3. Contracts

- REST endpoints identify the user from `X-User-Id` / `X-User-ID` or `user_id`; missing identity returns `401`.
- WebSocket endpoints must not trust the path `{user_id}` alone. The claimed identity must come from `X-User-Id` / `X-User-ID` or `?user_id=...` and must match the path user; missing/mismatched identity closes with policy violation (`1008`).
- WebSocket sends an initial `{ type: "connected", unread_count, notifications }` payload.
- After a WebSocket connects, new `NotificationStore.add_notification(...)` calls for that user must push `{ type: "notification", data }` to the connection.
- WebSocket client messages support `ping`, `mark_read`, `mark_all_read`, and `get_unread_count`.
- Store keeps only the most recent 100 notifications per user.
- `SQLAlchemyNotificationStore` must preserve notifications and read/unread state across app recreation when using the same output root/database URL.
- Notification types must stay within in-app tavern operations such as revisit care, relationship/visit requests, owner-visible feedback, and owner management. Do not add marketing pushes, ads, resurrection campaigns, social growth loops, rankings, or visitor-to-visitor messages.
- Logs must use logger formatting and must not include private message bodies beyond notification title/type/user/tavern identifiers.

### 4. Validation & Error Matrix

| Case | Expected |
|------|----------|
| Missing user ID on REST list/read/delete | `401` |
| Mark unknown notification | `404` |
| User A marks User B notification | `404`, User B unread count unchanged |
| WebSocket path user without matching header/query identity | close `1008` |
| WebSocket path user and claimed identity mismatch | close `1008` |
| WebSocket connect with no pending notifications | initial `connected` with `unread_count: 0` |
| Add notification while WebSocket is connected | WebSocket receives `type: notification`, `data` scoped to that connected user |
| Client sends `mark_read` | WebSocket replies `notification_read` and REST unread count decreases |
| Invalid WebSocket JSON | warning log only; connection stays alive |
| App recreated with same database/output root | existing notifications and read state remain visible |

### 5. Good/Base/Bad Cases

- Good: WebSocket registers a queue in `NotificationStore`, and `add_notification` broadcasts through that queue.
- Base: REST list/mark-read works without an active WebSocket and remains user-scoped.
- Bad: tracking sockets in a separate manager while `NotificationStore` broadcasts to unused queues; that makes real-time delivery silently fail.
- Bad: using only `/ws/{user_id}` as authorization; browser clients should pass a matching `?user_id=...` claim because WebSocket custom headers are not generally available from the frontend.

### 6. Tests Required

```powershell
py -3 -m pytest -q tests/test_notifications.py --tb=short
py -3 -m compileall -q backend/src
```

Focused tests must assert REST list/mark-read scoping, persistence across app recreation, path-only/mismatched WebSocket rejection, and live WebSocket push after an identity-validated connection.

### 7. Wrong vs Correct

#### Wrong

```python
await manager.connect(websocket, user_id)
# NotificationStore.add_notification broadcasts to a different connection registry.
# Also bad: accepting `/ws/{user_id}` without checking a matching header/query identity.
```

#### Correct

```python
claimed_user_id = _get_websocket_user_id(websocket)
if not claimed_user_id or claimed_user_id != user_id:
    await websocket.accept()
    await websocket.close(code=1008, reason="用户身份不匹配")
    return
store = get_notification_store()
queue = await store.register_connection(user_id)
# queue.get() is raced with websocket.receive_text(); add_notification pushes to this queue.
```

---

## Scenario: Relationship Graph Propagation Engine

### 1. Scope / Trigger

Use this contract when changing `backend/src/fablemap_api/application/services/relationship_graph.py` or propagation helpers in `backend/src/fablemap_api/core/relationship_graph.py`.

### 2. Contracts

- Propagation is one-hop only: an event at A may update direct neighbors, but derived updates must not recursively trigger B→C in the same call.
- Only `confirmed` edges from `SQLAlchemyRelationshipGraphStore.list_confirmed_edges_for_node(...)` may participate.
- `friendly` and `allied` increase target/source projection affinity up to behavior caps; they must not automatically erase existing hostility.
- `rival` and `hostile` apply negative effects by draining affinity first, then increasing hostility for any remainder.
- `neutral` documents a relationship but does not change visitor projections by default.
- Candidate resolution must prefer more specific relationships in the same target scope: `character↔character > character↔tavern > tavern↔tavern`.
- Cross-owner A→B perspective edges can update A-side reactions to a visitor becoming closer to B, but must record provenance and must not represent B-side accepted canon.
- Character changes may roll up weakly to the parent tavern only through explicit influence weight; background/silent roles should pass zero influence.
- Projection metadata must include enough provenance to explain derived changes (`source_edge_id`, direction, source node/event, or `reason=character_rollup`).

### 3. Validation & Error Matrix

| Case | Expected |
|------|----------|
| A friendly B, visitor improves with A | visitor↔B affinity increases within friendly cap |
| A hostile B, visitor improves with A | visitor↔B affinity drains, then hostility grows |
| A neutral B | no projection write |
| A→B and B→C | event at A updates B only, never C in same call |
| A hostile B cross-owner, event at B | visitor↔A worsens with `target_to_source` provenance |
| character-specific friendly edge plus tavern-wide hostile edge | character edge wins for B's target scope |
| character event with influence weight | parent tavern receives weak bounded roll-up |

### 4. Tests Required

```powershell
py -3 -m pytest -q backend/tests/test_relationship_graph_domain.py backend/tests/test_relationship_graph_store.py backend/tests/test_relationship_graph_propagation.py --tb=short
py -3 -m compileall -q backend/src
```

---

## Scenario: Relationship Graph API Governance

### 1. Scope / Trigger

Use this contract when changing `backend/src/fablemap_api/api/v1/relationship_graph.py` or the relationship-edge governance methods on `TavernApplicationService`.

### 2. Contracts

- Routes must stay thin and delegate to application service methods.
- `GET/POST/PUT/decision` endpoints are owner-scoped to the path tavern; non-owners must receive `403` for mutations and source-edge listing.
- Creating/updating an edge through `/taverns/{tavern_id}/relationship-edges` must keep `source_tavern_id == tavern_id`; the caller cannot create target-owner/bilateral edges from another tavern's side.
- Cross-owner relations remain directional source-owner perspectives. Listing target tavern source edges must not show another owner’s A→B edge as B-side canon.
- `delegated_ai` / `system_ai` auto-confirm metadata may only confirm the source-side perspective represented by the path tavern.
- `pending`, `rejected`, and `disabled` edges may be visible to the owner but must not participate in propagation queries until confirmed.
- Public-safe edge payloads must not include owner API keys, prompts, private visitor projections, chat transcripts, or unrelated visitor data.

### 3. Validation & Error Matrix

| Case | Expected |
|------|----------|
| Source owner creates A→B edge | `200`, edge has `source_owner_id=A.owner`, `perspective_scope=source_owner` |
| Target owner lists B source edges | does not see A→B as B canon |
| Non-owner updates A edge | `403` |
| Delegated AI auto-confirms source side | `confirmed_by_type=delegated_ai`, `source_tavern_id` remains path tavern |
| Caller tries `source_tavern_id != path tavern` | `400` |
| Pending edge created | visible to owner but excluded from `list_confirmed_edges_for_node` |

### 4. Tests Required

```powershell
py -3 -m pytest -q backend/tests/test_relationship_graph_api.py --tb=short
py -3 -m pytest -q backend/tests/test_relationship_graph_domain.py backend/tests/test_relationship_graph_store.py backend/tests/test_relationship_graph_propagation.py backend/tests/test_relationship_graph_api.py --tb=short
py -3 -m compileall -q backend/src
```

---

## Scenario: Memory Search Adapter Productization

### 1. Scope / Trigger

Use this contract when changing `backend/src/fablemap_api/core/memory_graph.py`, `backend/src/fablemap_api/core/vectors.py`, or source/reason strings returned by structured memory search.

### 2. Contracts

- Without a configured semantic embedder or real graph backend, memory search is keyword/shared-field retrieval and must be named as such in result `reason`, docs, and UI copy.
- Do not expose half-finished adapter labels such as graph/vector stub names in public payloads or source strings.
- `VectorMemoryStore` may return `reason="vector"` only when a real embedder successfully indexes/searches content; otherwise it must delegate to `KeywordMemoryStore` and preserve keyword reasons.
- `GraphMemoryStore.related_atoms(...)` is a shared-field helper over visitor/character/place/subject/dimension overlap, not graph traversal.
- Search/list filters such as `visitor_id`, `character_id`, `visibility`, and `include_flagged` must continue to scope private memory atoms.
- Adapter choice must not bypass `MemoryStore.save_atom(...)` / `list_atoms(...)` / `get_atom(...)`, so chat history and writeback remain replayable through persisted `memory_atoms`.

### 3. Validation & Error Matrix

| Case | Expected |
|------|----------|
| No embedder configured | vector adapter returns keyword fallback results with keyword/recent reasons |
| Lightweight graph adapter search | returns keyword results, not graph-labelled results |
| Related atoms helper | returns `reason="shared_fields"` |
| Search with `visitor_id=A` | visitor B private memories are excluded |
| Source scan | no old stub labels in memory adapter source files |

### 4. Tests Required

```powershell
py -3 -m pytest -q tests/test_memory_store_adapters.py tests/test_tavern_memory_permissions.py --tb=short
py -3 -m compileall -q backend/src
```

---

## Scenario: Owner Dialogue Preview Dry-run

### 1. Scope / Trigger

Use this contract when changing `backend/src/fablemap_api/application/services/owner_config.py`, `backend/src/fablemap_api/api/v1/owner_config.py`, or owner-only dialogue preview routes.

### 2. Contracts

- The route is owner-only and must reject non-owners with `403`.
- The default path only builds a dry-run prompt through `PromptBuilder` / WorldInfo matching; it must not call an external model unless `call_model=true` is explicit.
- Responses must include `dry_run=true`, `persisted=false`, `model_called=true|false`, and explicit `history_written=false`, `memory_written=false`, `writeback_written=false`.
- Dry-runs must not write chat messages, memory atoms, visitor state, writeback state, StateCards, or Tavern content.
- If `call_model=true`, token use/error status must be visible and no API Key or secret may appear in the response.
- Internal prompt details are owner-facing only; do not expose the same payload to visitors.

### 3. Validation & Error Matrix

| Case | Expected |
|------|----------|
| Owner dry-run, no model | prompt messages returned, `model_called=false`, no persistence |
| Owner explicitly calls model | `model_called=true` only if external model call succeeds; token estimate or error shown |
| Rules backend test | local rules response may appear, but external `model_called=false` |
| Non-owner request | `403` |
| Response serialization | no owner API key / Authorization value |

### 4. Tests Required

```powershell
py -3 -m pytest -q backend/tests/test_v1_owner_dialogue_preview.py backend/tests/test_v1_owner_config.py --tb=short
py -3 -m compileall -q backend/src
```
