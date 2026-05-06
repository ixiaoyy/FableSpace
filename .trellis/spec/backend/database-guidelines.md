# Backend Persistence Guidelines

> FableMap runtime storage is database-backed by default. JSON stores remain only as an explicit local/dev fallback (`FABLEMAP_STORAGE_BACKEND=json`) and for import/export/cache artifacts.

---

## Overview

There is no database migration framework in this repository. Persistent backend runtime state is stored through SQLAlchemy models by default. If `FABLEMAP_DATABASE_URL`/`FABLEMAP_MYSQL_URL` is unset, the app creates a local SQLite database at `<output_root>/fablemap.sqlite3`; production deployments should provide a real SQLAlchemy URL through `FABLEMAP_DATABASE_URL`.

Important stores:

```text
<output_root>/fablemap.sqlite3       # default local database when no DB URL is configured
FABLEMAP_DATABASE_URL                # preferred production SQLAlchemy URL
FABLEMAP_MYSQL_URL                   # legacy alias for database URL
FABLEMAP_STORAGE_BACKEND=json        # explicit fallback only; not the default runtime path
```

Important database-backed stores:

- `MySQLTavernStore`: taverns, characters, world info, LLM config, chat history, visitor state, memories, gameplay sessions, state cards and tavern messages.
- `SQLAlchemyOwnerConfigStore`: owner default LLM config.
- `SQLAlchemyVisitorNoteStore`: owner-visible visitor notes.
- `SQLAlchemyNotificationStore`: user notifications.
- `SQLAlchemyRumorStore`: neighborhood rumors.
- `SQLAlchemyHomeStore`: Home/member/visit records.
- `SQLAlchemyWritebackStore`: legacy world/player writeback state.

The shared storage resolver is `backend/src/fablemap_api/infrastructure/storage.py`.

---

## Persistence patterns

### Use explicit load-normalize-save flows

`MySQLTavernStore` and the SQLAlchemy side stores must normalize database rows through the same dataclasses/helper functions used by the explicit JSON fallback. JSON load-normalize-save examples remain useful for backward-compat behavior:

```python
def _load_taverns(self) -> dict[str, Any]:
    try:
        return json.loads(self.taverns_file.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
```

```python
characters = [TavernCharacter.from_dict(c) for c in d.get("characters", [])]
world_info = [WorldInfoEntry.from_dict(w) for w in d.get("world_info", [])]
llm = LLMConfig.from_dict(d.get("llm_config", {}))
```

When reading older data, prefer defaults and normalizers over crashing on missing optional fields.

### Keep public and private payloads separate

`Tavern.to_dict()` and `Tavern.to_dict_public()` must not expose secrets. `LLMConfig.to_dict()` intentionally returns `api_key: ""`; `to_dict_private()` is only for owner/internal use.

Example from `backend/src/fablemap_api/core/tavern.py`:

```python
def to_dict_private(self, user_id: str) -> dict[str, Any]:
    result = self.to_dict()
    if user_id == self.owner_id:
        result["llm_config"] = self.llm_config.to_dict_private()
    return result
```

New persistence code must preserve this owner/public separation.

### Gameplay sessions are runtime-private

`gameplay_definitions` are Tavern content and can be exported/imported with tavern packages. `GameplaySession` data is visitor runtime state and must not be mixed into public Tavern payloads or exported as tavern content.

Existing docs and code to inspect:

- `docs/WORLD_SCHEMA.md` Gameplay section
- `backend/src/fablemap_api/core/gameplay.py`
- `backend/src/fablemap_api/core/tavern.py` `list_gameplay_sessions`, `get_gameplay_session`, `save_gameplay_session`
- `tests/test_tavern_gameplay_api.py`

---

## Query/list patterns

### Filtering belongs in service/store methods

`TavernService.list_taverns(...)` handles filters such as access, status, owner, query, and distance. Keep new list filters close to that logic and cover them with tests.

### Always scope visitor-owned state

Chat history, memory atoms, visitor states, and gameplay sessions are scoped by tavern and visitor/owner identity. Existing service methods enforce this with helpers such as:

```python
def _ensure_gameplay_session_access(self, tavern: Any, session: GameplaySession, user_id: str) -> None: ...
```

```python
def _ensure_group_chat_visitor_scope(...): ...
```

Do not add a list endpoint that lets ordinary visitors read other visitors' runtime data.

---

## Schema change rules

Schema changes are medium/high risk. Before adding/changing persistent fields:

1. Confirm the field is allowed by `docs/WORLD_SCHEMA.md` and not blocked by `docs/WHAT_NOT_TO_BUILD.md`.
2. Update `docs/WORLD_SCHEMA.md` if this is a canonical schema change.
3. Add backward-compatible `from_dict` / normalization behavior.
4. Update frontend service/component expectations if payload shape changes.
5. Add or update tests in `tests/test_tavern_*.py` or the relevant module test.
6. Run at least `py -3 -m compileall -q backend/src` and relevant pytest.

Do **not** silently change enum semantics (`access`, `status`, gameplay states, relationship stages) without docs and tests.

---

## Scenario: Tavern Layout Style Persistence Contract

### 1. Scope / Trigger

Use this contract when maintaining the Tavern page layout preference field across backend, persistence, API contracts, and frontend route modules. The field is a presentation preference for the tavern detail page, not owner-authored tavern content generation.

### 2. Signatures

```python
Tavern.layout_style: str
TavernService.create_tavern(data: dict[str, Any], owner_id: str = "") -> dict[str, Any]
TavernService.update_tavern(tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]
TavernCreateRequest.layout_style: str | None
TavernUpdateRequest.layout_style: str | None
```

```typescript
type TavernLayoutStyle = "lobby" | "npc-chat" | "quest-play" | "hybrid-room"
type Tavern = { layout_style?: TavernLayoutStyle | string }
```

### 3. Contracts

- Persistent key is `layout_style`.
- Allowed values are `lobby`, `npc-chat`, `quest-play`, and `hybrid-room`.
- Missing, blank, non-string, or unsupported values normalize to `lobby`.
- `Tavern.to_dict()`, `to_dict_private()`, and `to_dict_public()` include normalized `layout_style`.
- JSON `TavernStore` and `MySQLTavernStore` must round-trip the value.
- Frontend layout config lives in `frontend/app/lib/tavern-layouts.js`; route components should initialize local active layout from `tavern.layout_style` through `normalizeTavernLayoutStyle`.

### 4. Validation & Error Matrix

| Case | Expected |
|------|----------|
| Create without `layout_style` | response includes `layout_style: "lobby"` |
| Create/update with `quest-play` | value persists and appears in later GET |
| Create/update with unknown value | normalized response and storage use `lobby` |
| Legacy JSON missing field | `Tavern.from_dict(...)` returns `layout_style == "lobby"` |
| MySQL row missing/empty value | domain object falls back to `lobby` |

### 5. Good/Base/Bad Cases

- Good: Add a new layout by updating backend allowed values, frontend `TAVERN_LAYOUTS`, frontend type, `docs/WORLD_SCHEMA.md`, and tests in one change.
- Base: UI-only temporary tab switches may remain local state; only the default layout preference is persisted.
- Bad: Persisting free-form layout names from a component, or adding a backend field without updating `WORLD_SCHEMA` and frontend types.

### 6. Tests Required

Run and assert:

```powershell
py -3 -m pytest -q backend/tests/test_v1_tavern_layout_style.py --tb=short
py -3 -m pytest -q backend/tests/test_mysql_infrastructure.py::TestTavernCRUD::test_layout_style_round_trip --tb=short
npm --prefix .\frontend test
```

The v1 API test must assert create defaults, valid create/update round-trip, visitor GET visibility, and invalid fallback. The MySQL test must assert create/get/update/get round-trip. The frontend script must assert layout IDs and normalizer fallback.

### 7. Wrong vs Correct

#### Wrong

```python
tavern.layout_style = data["layout_style"]
```

This stores unsupported UI strings and can make old clients render unknown layouts.

#### Correct

```python
tavern.layout_style = _normalize_tavern_layout_style(data.get("layout_style"))
```

Normalization keeps JSON, MySQL, API responses, and frontend route initialization backward-compatible.

---

## Scenario: Place/Home MVP Persistence Contract

### 1. Scope / Trigger

Use this contract when changing Place/Home data on top of the Tavern compatibility layer: `place_type`, Home members, generic Place relationships, including school enrollment, public discovery filtering, JSON persistence, MySQL persistence, API contracts, and frontend service types.

### 2. Signatures

```python
Tavern.place_type: str
Tavern.home_members: list[dict[str, Any]]
Tavern.place_relationships: list[dict[str, Any]]
TavernService.add_home_member(tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]
TavernService.create_place_relationship(tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]
TavernService.create_school_enrollment(tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]  # compatibility wrapper
TavernService.decide_place_relationship(tavern_id: str, relationship_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]
```

```typescript
type PlaceType =
  | "tavern"
  | "cafe"
  | "milk-tea-shop"
  | "restaurant"
  | "convenience-store"
  | "bookstore"
  | "school"
  | "hospital"
  | "home"
```

### 3. Contracts

- Persistent key `place_type` is finite and backward-compatible; missing legacy values read as `tavern`.
- Home is still a Tavern with real `lat/lon`; creating/updating `place_type="home"` must coerce public access to private/password, never public.
- Hospital is a public Place type for safe nursing/triage-themed NPC spaces; content must preserve medical safety boundaries and cannot imply diagnosis, prescriptions, or emergency-care replacement.
- Public list/discover responses must exclude Home records unless an owner-scoped list is requested.
- Public Tavern payloads must not expose `home_members` or `place_relationships`; owner/private payloads may include them.
- `silent_member` and `display_object` Home members must normalize to non-conversational speech modes and must not become `characters` in enter/chat payloads.
- `PlaceRelationship.relation_type` is a finite controlled set. `school_enrollment` is one type, not the entire relationship graph.
- Generic relationships are stored on the source Home. Same-owner Home→target Place can auto-approve; cross-owner relationships must remain `pending` until the target Place owner decides.
- `school_enrollment` is the only relationship type projected into school member summaries; other approved relationships stay target-owner governance data.
- JSON `TavernStore` and `MySQLTavernStore` must round-trip `place_type`, `home_members`, and `place_relationships`.

### 4. Validation & Error Matrix

| Case | Expected |
|------|----------|
| Legacy Tavern missing `place_type` | API/domain reads `tavern` |
| Create/update with unsupported `place_type` | 400 with a user-facing place-type error |
| Create Home with `access="public"` | stored/returned as private |
| Public tavern list includes public Home row in storage | response filters it out |
| Visitor GET private Home | 403 |
| Owner GET Home | includes Home fields |
| Home silent/display member | saved with silent/display speech and absent from enter characters |
| Same-owner school enrollment | `approved`, appears in school member summary |
| Cross-owner school enrollment | `pending`, hidden until school owner approves |
| Cross-owner non-school relationship | `pending`, visible to target owner for approval, not to public visitors |
| Unsupported relationship type | 400 with a user-facing relationship-type error |

### 5. Good/Base/Bad Cases

- Good: Add a new place type or relationship type by updating backend enum validation, `WORLD_SCHEMA`, frontend constants/types, frontend tests, and persistence/API tests in one change.
- Base: Discovery helper may infer legacy types when `place_type` is missing, but persisted `place_type` must win.
- Bad: Deriving Home solely from keywords, exposing Home members in public payloads, or treating relationship records as a global friend/social graph.

### 6. Tests Required

Run and assert:

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests/test_v1_place_home_mvp.py backend/tests/test_mysql_infrastructure.py::TestTavernCRUD::test_place_home_fields_round_trip --tb=short
npm --prefix .\frontend test
npm --prefix .\frontend run typecheck
```

### 7. Wrong vs Correct

#### Wrong

```python
tavern.place_type = data.get("place_type", "tavern")
```

This can persist unsupported UI strings and accidentally publish Home records.

#### Correct

```python
place_type = _require_valid_place_type(data.get("place_type", "tavern"))
tavern.place_type = place_type
tavern.access = _normalize_home_access(data.get("access")) if place_type == "home" else _normalize_access(data.get("access"))
```

Validation and Home access coercion keep backend, persistence, docs, and frontend behavior aligned.

---

## Scenario: Visitor/NPC Gender Persistence Contract

### 1. Scope / Trigger

Use this contract when maintaining `TavernCharacter.gender`, `VisitorState.gender`, v1 character/chat/enter API payloads, JSON persistence, MySQL persistence, and frontend gender helpers.

### 2. Signatures

```python
TavernCharacter.gender: str
VisitorState.gender: str
TavernService.enter_tavern(..., visitor_gender: str = "") -> dict[str, Any]
ChatRequest.visitor_gender: str
GroupChatRequest.visitor_gender: str
```

```typescript
type Gender = "unspecified" | "female" | "male" | "nonbinary" | "other"
type TavernCharacter = { gender?: Gender | string }
type VisitorStatePayload = { gender?: Gender | string }
```

### 3. Contracts

- Persistent key is `gender` for both `TavernCharacter` and `VisitorState`; chat/enter request input uses `visitor_gender`.
- Allowed values are `unspecified`, `female`, `male`, `nonbinary`, and `other`.
- Missing, blank, legacy, or unsupported values normalize to `unspecified`; common Chinese/English aliases may normalize to the finite values.
- NPC gender is owner-authored metadata and may appear in character payloads.
- Visitor gender is self-declared runtime state scoped to `tavern_id + visitor_id`; do not promote it to global profile, public discovery filters, visitor matching, or social features.
- JSON `TavernStore` and `MySQLTavernStore` must round-trip both fields.

### 4. Validation & Error Matrix

| Case | Expected |
|------|----------|
| Create character without `gender` | response includes `gender: "unspecified"` |
| Create/update character with `女` / `non-binary` | normalized to `female` / `nonbinary` |
| Enter tavern with `visitor_gender` | `visitor_state.gender` updates |
| Send chat with a different `visitor_gender` | current visitor state updates to the new normalized value |
| Legacy JSON/MySQL row missing `gender` | domain object reads `unspecified` |
| Unsupported gender value | normalized to `unspecified`, not stored as free-form UI text |

### 5. Tests Required

Run and assert:

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests/test_v1_gender_fields.py backend/tests/test_mysql_infrastructure.py::TestCharacterCRUD::test_character_gender_round_trip backend/tests/test_mysql_infrastructure.py::TestVisitorState::test_update_and_get_visitor_state --tb=short
npm --prefix .\frontend test
npm --prefix .\frontend run typecheck
```

### 6. Wrong vs Correct

#### Wrong

```python
character.gender = data.get("gender")
```

This can persist arbitrary frontend strings or inferred labels.

#### Correct

```python
character.gender = _normalize_gender(data.get("gender"))
```

Normalization keeps docs, API payloads, JSON, MySQL, and frontend labels aligned.


---

## Scenario: Relationship Graph Schema / Storage Contract

### 1. Scope / Trigger

Use this contract when changing `backend/src/fablemap_api/core/relationship_graph.py`, `backend/src/fablemap_api/infrastructure/relationship_graph_store.py`, or the SQLAlchemy `relationship_edges` / `visitor_relationship_projections` tables.

### 2. Signatures

```python
RelationshipEdge(
    id, source_owner_id, source_tavern_id, source_node_type, source_node_id,
    target_owner_id, target_tavern_id, target_node_type, target_node_id,
    behavior_type, display_name, strength_preset, status, governance_mode,
)
RelationshipProjection(visitor_id, node_type, node_id, affinity, hostility)
SQLAlchemyRelationshipGraphStore.save_edge(edge)
SQLAlchemyRelationshipGraphStore.list_confirmed_edges_for_node(node_type, node_id)
SQLAlchemyRelationshipGraphStore.get_projection(visitor_id, node_type, node_id)
SQLAlchemyRelationshipGraphStore.upsert_projection(projection)
```

### 3. Contracts

- Node types are the closed set `tavern | character`.
- Behavior types are the closed set `friendly | allied | neutral | rival | hostile`.
- Strength presets are the closed set `weak | normal | strong`; do not persist raw formula sliders for MVP.
- Governance modes are `manual | assisted | delegated_ai | system_ai`.
- Edge statuses are `pending | confirmed | rejected | disabled`; only `confirmed` participates in propagation queries.
- `RelationshipProjection.affinity` is clamped to `0.0–1.0`; `hostility` is non-negative and separate from `VisitorState.relationship_strength`.
- Cross-owner edges are source-owner perspectives. A source owner or delegated/system AI may not confirm another owner’s target-side stance.
- Visitor projections are runtime-private and must not appear in public Tavern payloads, export packages, or visitor-to-visitor social surfaces.

### 4. Validation & Error Matrix

| Case | Expected |
|------|----------|
| Negative effect `0.08` on affinity `0.05` | affinity becomes `0.0`, hostility increases by `0.03` |
| Positive effect over friendly cap | affinity stops at cap; hostility unchanged |
| Character↔character and tavern↔tavern both match | character-specific edge wins |
| Pending/disabled edge in store | excluded from `list_confirmed_edges_for_node` |
| Projection upsert same visitor/node | updates the same row and preserves provenance metadata |

### 5. Tests Required

```powershell
py -3 -m pytest -q backend/tests/test_relationship_graph_domain.py backend/tests/test_relationship_graph_store.py --tb=short
py -3 -m compileall -q backend/src
```

### 6. Wrong vs Correct

#### Wrong

```python
projection.relationship_strength = -0.2
```

This pollutes the existing positive affinity field with hostile semantics.

#### Correct

```python
projection = apply_negative_effect(projection, 0.2)
store.upsert_projection(projection)
```

The helper drains positive affinity first, then records remaining tension on the separate hostility axis.

---

## Migrations

There is no formal migration runner. Compatibility is handled by:

- default values in dataclass fields,
- `from_dict` fallbacks,
- `_normalize_*` helpers,
- idempotent seed/update logic such as default public-welfare tavern seeding.

If a change cannot be handled by backward-compatible readers, stop and design an explicit migration plan with the user.

---

## Scenario: Default Public-Welfare Tavern Seed Runtime Contract

Use this contract when changing `backend/src/fablemap_api/core/default_taverns.py`, public-welfare NPC seed data, default seed merge/backfill logic, or tests that validate built-in example shops.

Contracts:

- Every default public-welfare tavern / shop must have at least 3 formal `TavernCharacter` entries. One-character demo shops are not complete.
- Every seeded character must expose complete project-owned direct assets per `frontend/npc-art-guidelines.md`: `avatar`, `sprites.neutral`, and expression aliases for `joy/happy`, `anger/angry`, `embarrassment/shy`, and `curiosity/curious`.
- Every default shop must provide the core character chat loop: visitor can enter the shop, select any seeded character, send a normal greeting, receive non-empty assistant text, and persist a two-message chat session.
- Default shops must ship with `llm_config.backend="rules"` and `api_key=""`; core chat for fresh seeds must not call an external LLM and token usage must remain `0`.
- System / public-welfare shop owners may later save a free-model choice such as `kilo-auto/free`; that choice must not force the shop closed. During early testing, this exact opt-in model may be hydrated from the versioned repo config at `backend/config/system_public_welfare_llm.json`; ordinary user taverns must not inherit that test key. If no matching versioned config exists, runtime keeps the local rules fallback until a configured provider/API endpoint exists.
- Public-welfare shops should include `NPC 分工` world info and role-triage gameplay so the 3+ roles have clear boundaries instead of duplicate personalities.

Required tests:

```powershell
py -3 -m pytest -q tests/test_default_public_welfare_taverns.py tests/test_default_public_welfare_gameplays.py --tb=short
```

Good: A new default hospital shop has nurse, records clerk, and emergency liaison NPCs; all three can chat through the local rules backend and have five local expression PNGs.

Bad: A visually complete shop with only one character, or a three-character shop where secondary characters have portraits but cannot complete a chat session.

---

## Naming conventions

- Persistent JSON keys use `snake_case` to match existing schema (`owner_id`, `created_at`, `world_info`, `llm_config`, `token_used`).
- IDs are strings. Existing code often generates prefixed IDs such as `msg_<hex>` or gameplay IDs from payloads.
- Timestamps should be ISO strings; helper functions typically use UTC and `Z` suffix where needed.
- Do not introduce frontend-only labels as persistent enum values.

---

## Real examples to follow

1. `backend/src/fablemap_api/core/tavern.py` `Tavern.from_dict`: reads optional lists with `d.get(...)`, normalizes nested structures, and preserves defaults.
2. `backend/src/fablemap_api/core/gameplay.py` `normalize_gameplay_definition`: clamps/normalizes user-provided gameplay definitions before saving.
3. `backend/src/fablemap_api/core/writeback.py` `WritebackStore` / `WritebackEngine`: separates storage paths, state defaults, event validation, and state mutation.
4. `tests/test_tavern_backup_restore.py` and `tests/test_tavern_gameplay_models.py`: demonstrate persistence/import-export behavior expected by tests.

---

## Common mistakes

- Treating `taverns.json` as free-form storage and adding fields without `WORLD_SCHEMA` alignment.
- Returning `password_hash`, `api_key`, private voice/LLM config, or other sensitive fields to non-owner users.
- Storing gameplay sessions in public Tavern payloads.
- Writing one-off migration scripts or destructive data rewrites without a design/review step.
- Assuming JSON files are valid; existing code intentionally handles decode errors in selected paths.

---

## Scenario: MySQL LLM Config Privacy And Token Usage

### 1. Scope / Trigger

Use this contract when maintaining `backend/src/fablemap_api/infrastructure/mysql_store.py` or any application path that reads owner LLM configuration from the MySQL-backed store. MySQL persistence stores private owner credentials in `LLMConfigModel`, but normal store reads must not expose `api_key` into tavern payloads or tests.

### 2. Signatures

```python
MySQLTavernStore.save_llm_config(tavern_id: str, config: LLMConfig) -> None
MySQLTavernStore.get_llm_config(tavern_id: str) -> LLMConfig | None
MySQLTavernStore.get_llm_config_private(tavern_id: str) -> LLMConfig | None
MySQLTavernStore.add_token_usage(tavern_id: str, tokens: int) -> None
MySQLTavernStore.get_token_usage(tavern_id: str) -> int
```

Application/runtime code that genuinely calls an LLM should use a private-config helper that prefers `get_llm_config_private` when the store exposes it and falls back to `get_llm_config` for JSON `TavernStore`.

### 3. Contracts

- `get_llm_config` returns `LLMConfig` with `api_key=""` and preserves non-secret fields such as `backend`, `model`, `base_url`, sampling options, and `token_used`.
- `get_llm_config_private` returns the same config with `api_key` included for internal runtime use only.
- `TavernService.update_tavern` must preserve an existing private key when a same-backend update payload omits `api_key`.
- `add_token_usage` accepts only positive integer-like values, creates a token-only `LLMConfigModel` row when a tavern exists but no config row exists, and also mirrors `token_used` into `TavernModel.voice_config["llm_config"]` for compatibility.
- `get_token_usage` returns the maximum known usage from `LLMConfigModel.token_used` and the compatibility `voice_config["llm_config"]["token_used"]` mirror.

### 4. Validation & Error Matrix

| Case | Expected |
|------|----------|
| Saved config contains `api_key` | `get_llm_config(...).api_key == ""` |
| Runtime code needs provider key | private helper returns `get_llm_config_private(...)` when available |
| Token usage added before LLM config exists | `get_token_usage(...)` returns the added total |
| Token usage receives `0`, negative, or non-numeric input | no state change |
| Legacy voice-config mirror contains larger count | `get_token_usage(...)` returns the larger mirror count |
| Same-backend LLM update omits `api_key` | existing private key is preserved |

### 5. Good/Base/Bad Cases

- Good: `TavernApplicationService._get_runtime_llm_config` calls `get_llm_config_private` on MySQL stores and JSON `get_llm_config` on file stores.
- Base: `store.get_llm_config("tavern").to_dict_private()` in tests still has an empty key because the normal read is public-safe.
- Bad: API/application code calls `store.get_llm_config` and assumes the returned object always has an owner credential.

### 6. Tests Required

`backend/tests/test_mysql_infrastructure.py` must assert:

- `save_llm_config` followed by `get_llm_config` redacts `api_key`;
- `add_token_usage` and `get_token_usage` round-trip totals when no `LLMConfigModel` row existed first;
- MySQL table creation succeeds through SQLAlchemy metadata.

Run:

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests/test_mysql_infrastructure.py --tb=short
py -3 -m pytest -q backend/tests --tb=short
```

### 7. Wrong vs Correct

#### Wrong

```python
llm_config = store.get_llm_config(tavern_id)
client = create_client(ClientLLMConfig(api_key=llm_config.api_key, ...))
```

#### Correct

```python
private_getter = getattr(store, "get_llm_config_private", None)
llm_config = private_getter(tavern_id) if callable(private_getter) else store.get_llm_config(tavern_id)
client = create_client(ClientLLMConfig(api_key=llm_config.api_key, ...))
```

## Scenario: Database-backed Runtime Startup

### 1. Scope / Trigger

Use this contract when maintaining native/web startup code (`backend/src/fablemap_api/main.py`, `backend/src/fablemap_api/core/web/app.py`) or SQLAlchemy storage modules. Database storage is the default runtime path. JSON storage is only an explicit dev/backward-compat fallback via `FABLEMAP_STORAGE_BACKEND=json`.

### 2. Signatures

```python
ApiSettings.storage_backend: str
ApiSettings.database_url: str
ApiSettings.mysql_url: str  # legacy alias
create_store(settings: ApiSettings) -> TavernStore | MySQLTavernStore
create_tavern_store(settings: ApiSettings) -> TavernStore | MySQLTavernStore
resolve_database_url(settings: ApiSettings) -> str
create_database_from_settings(settings: ApiSettings) -> Database | None
```

Package-level infrastructure exports stay lazy:

```python
from fablemap_api.infrastructure.settings import ApiSettings  # must be SQLAlchemy-free
from fablemap_api.infrastructure import Database              # may import SQLAlchemy modules
```

### 3. Contracts

- With `storage_backend="database"` (default), startup must create/use `MySQLTavernStore` backed by `FABLEMAP_DATABASE_URL`, `FABLEMAP_MYSQL_URL`, or `<output_root>/fablemap.sqlite3`.
- Native `/api/v1` and legacy `py -m fablemap_api api` web app paths must share the same `create_tavern_store` and side-store factories from `infrastructure/storage.py`.
- Owner config, visitor notes, notifications, rumors, Home records and legacy writeback state must use SQLAlchemy-backed stores whenever the tavern store exposes a database session.
- `FABLEMAP_STORAGE_BACKEND=json` may still create JSON stores for explicit local/dev fallback and tests that simulate missing SQLAlchemy, but routes must not hard-code JSON paths.
- Logs must not print full database credentials; use `redact_database_url` or equivalent before logging URLs.

### 4. Validation & Error Matrix

| Case | Expected |
|------|----------|
| No DB URL, SQLAlchemy present | app creates `<output_root>/fablemap.sqlite3` and uses database-backed stores |
| `FABLEMAP_DATABASE_URL` set | app creates tables and uses that SQLAlchemy URL |
| `FABLEMAP_MYSQL_URL` set | app treats it as a legacy alias and uses database-backed stores |
| `FABLEMAP_STORAGE_BACKEND=json`, SQLAlchemy absent | app imports and `/api/v1/health` returns 200 using explicit JSON fallback |
| SQLAlchemy unavailable with database backend | fail clearly with dependency/setup guidance, not silent data-loss fallback |

### 5. Good/Base/Bad Cases

- Good: `backend/tests/test_database_backed_runtime_stores.py` proves the default SQLite DB and all runtime side stores round-trip through SQLAlchemy.
- Base: `backend/tests/test_startup_optional_mysql.py` keeps the explicit JSON fallback importable when SQLAlchemy is intentionally blocked.
- Bad: route code constructing `OwnerConfigStore(...owner_configs.json)`, `VisitorNoteStore(...visitor_notes.json)`, `NotificationStore()`, `RumorStore()`, `HomeStore(...)`, or `WritebackStore(...)` directly in a production startup path.

### 6. Tests Required

When changing this startup path, assert:

- default settings create a SQLite database and database-backed tavern store;
- side stores persist after re-instantiation against the same database;
- explicit JSON fallback still works when SQLAlchemy imports are blocked;
- native smoke tests still create/list/enter/chat through the configured backend.

Run:

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests/test_database_backed_runtime_stores.py backend/tests/test_startup_optional_mysql.py backend/tests/test_api_smoke.py --tb=short
py -3 -m pytest -q backend/tests --tb=short
```

### 7. Wrong vs Correct

#### Wrong

```python
from fablemap_api.infrastructure.database import create_database_from_settings
from fablemap_api.infrastructure.mysql_store import MySQLTavernStore

def create_store(settings):
    if settings.mysql_url:
        ...
```

This duplicates backend selection logic, ignores `FABLEMAP_DATABASE_URL`, and will miss side stores such as notifications/writeback.

#### Correct

```python
def create_store(settings):
    return create_tavern_store(settings)
```

---

## Scenario: MySQL Next-stage Storage Migration

### 1. Scope / Trigger

Use this contract when maintaining `backend/src/fablemap_api/infrastructure/migrate.py` or documenting the transition from legacy JSON/file runtime stores into the next-stage production database. MySQL is the production target; SQLite is only the local default when no database URL is configured.

### 2. Signatures

```python
run_migration(
    json_root: str | None,
    mysql_url: str,
    drop_existing: bool = False,
    *,
    output_root: str | None = None,
) -> dict[str, int]
```

```powershell
py -3 -m fablemap_api.infrastructure.migrate `
  --output-root .fablemap-api `
  --database-url "mysql+pymysql://user:pass@host:3306/fablemap"
```

Environment priority:

```text
--database-url
--mysql-url
FABLEMAP_DATABASE_URL
FABLEMAP_MYSQL_URL
```

### 3. Contracts

- The migration script must treat `FABLEMAP_DATABASE_URL` as the canonical SQLAlchemy URL and `FABLEMAP_MYSQL_URL` only as a legacy alias.
- `--output-root` must locate the old runtime side stores without requiring separate file arguments:
  - `<output-root>/taverns/taverns.json`
  - `<output-root>/taverns/taverns_keyvault.json`
  - `<output-root>/taverns/chat_history/**.jsonl`
  - `<output-root>/owner_configs.json`
  - `<output-root>/visitor_notes.json`
  - `<output-root>/homes/homes.json`
  - `<output-root>/homes/visits.json`
  - `<output-root>/writeback/writeback-state.json`
- Migration must be non-destructive and idempotent by default. Existing DB rows should be skipped or explicitly backfilled/upserted; table dropping is allowed only when `--drop-existing` is passed.
- The script must migrate private/runtime data into SQLAlchemy tables: taverns, characters, world info, visitor state, chat history, memory atoms, gameplay sessions, state cards, LLM configs/keyvault, owner configs, visitor notes, Home records/visits, and writeback state.
- The script must not log full database credentials, owner API keys, keyvault payloads, or visitor chat transcripts.
- Do not migrate cache/export/static data into MySQL: Overpass/cache artifacts, Tavern export packages, generated images, prompt sidecars, frontend static assets, pytest fixtures, and any in-memory-only notification/rumor entries that never had a durable source.

### 4. Validation & Error Matrix

| Case | Expected |
|------|----------|
| `--database-url` present | uses that URL and logs only the redacted target |
| only `FABLEMAP_MYSQL_URL` present | works as a compatibility alias |
| `--output-root` present, `--json-root` omitted | reads `<output-root>/taverns` and side-store files |
| tavern already exists | backfills/upserts nested runtime buckets without duplicate rows |
| side-store JSON missing | skips that slice and reports count `0` |
| invalid side-store JSON | logs a warning and skips that slice |
| `--drop-existing` absent | never drops existing tables |

### 5. Good/Base/Bad Cases

- Good: `backend/tests/test_mysql_migration_runtime_side_stores.py` builds a legacy output root and proves owner configs, visitor notes, Home visits, writeback state, chat history and state cards land in DB tables.
- Base: SQLite URLs may be used in tests to exercise the same SQLAlchemy code path; production docs still point to MySQL.
- Bad: Adding a second migration script that writes new JSON snapshots or prints `mysql+pymysql://user:password@...` in logs.

### 6. Tests Required

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests/test_mysql_migration_runtime_side_stores.py --tb=short
```

For startup/storage resolver changes, also run:

```powershell
py -3 -m pytest -q backend/tests/test_database_backed_runtime_stores.py backend/tests/test_startup_optional_mysql.py --tb=short
```

---

## Scenario: Owner Default LLM Config Store

### 1. Scope / Trigger

Use this contract when implementing or extending owner-level default LLM configuration used by creator workflows such as AI-assisted tavern drafts. This is sensitive owner runtime configuration, not public tavern content.

### 2. Signatures

```python
OwnerConfigStore(path: Path)
OwnerConfigStore.get_default_llm_config(owner_id: str) -> dict[str, Any] | None
OwnerConfigStore.save_default_llm_config(owner_id: str, config: dict[str, Any]) -> dict[str, Any]

TavernApplicationService.get_owner_default_llm(user_id: str) -> dict[str, Any]
TavernApplicationService.save_owner_default_llm(data: dict[str, Any], user_id: str) -> dict[str, Any]
TavernApplicationService.generate_tavern_draft(data: dict[str, Any], user_id: str) -> dict[str, Any]
```

```http
GET /api/v1/owners/me/default-llm
PUT /api/v1/owners/me/default-llm
POST /api/v1/owners/me/tavern-drafts/generate
X-User-Id: <owner id>
```

### 3. Contracts

- Route handlers must stay thin and delegate to `TavernApplicationService`; they must not read or write `owner_configs.json` directly.
- Runtime persistence must use `SQLAlchemyOwnerConfigStore` by default; explicit JSON fallback must stay behind the same store abstraction.
- The storage key is the authenticated owner ID from `X-User-Id`; do not fall back to `owner-demo` for these endpoints.
- Read responses must never echo raw `api_key`; use `configured` / `api_key_configured` and safe model/backend/base URL fields only.
- Draft generation may use the private API key internally through `core.llm_clients.create_client`, but the returned payload is a candidate draft only and must not persist Tavern or Character records.

### 4. Validation & Error Matrix

| Case | Expected |
|------|----------|
| Missing `X-User-Id` | `401` user identity error |
| Owner saves valid config | Config persists under that owner ID |
| Owner reads config | Raw `api_key` omitted; `api_key_configured` reflects presence |
| Different owner reads | Cannot see the first owner's config |
| Draft generation without config | `400` clear "configure default LLM first" style error; no writes |
| LLM returns non-JSON | `502` provider/format error; no writes |
| LLM returns valid draft JSON | Sanitized draft payload only; no Tavern/Character persistence |

### 5. Good/Base/Bad Cases

- Good: `owners.py` extracts `X-User-Id`, calls the application service, and returns a masked config/draft response.
- Base: SQLAlchemy store writes normalized config; explicit JSON fallback follows the same normalization for local/dev compatibility.
- Bad: route or React code importing `owner_configs.json`, returning `api_key`, or silently using `owner-demo` when the user header is missing.

### 6. Tests Required

Run focused tests that assert:

```powershell
py -3 -m pytest -q tests/test_ai_assisted_tavern_drafts.py --tb=short
```

Required assertions:

- config save/read masks `api_key`;
- configs are isolated by owner ID;
- missing user ID fails;
- missing default LLM blocks draft generation;
- successful draft generation does not add Tavern/Character records;
- invalid LLM JSON returns an error.

Also run:

```powershell
py -3 -m compileall -q backend/src
```

### 7. Wrong vs Correct

#### Wrong

```python
owner_id = request.headers.get("X-User-Id") or "owner-demo"
return json.loads(Path("owner_configs.json").read_text())[owner_id]
```

This bypasses identity enforcement, hard-codes persistence, and risks leaking secrets.

#### Correct

```python
owner_id = get_user_id(request)
return taverns_service(request).get_owner_default_llm(owner_id)
```

The service enforces identity, uses `OwnerConfigStore`, and returns only a masked safe payload.

---

## Scenario: Owner-Visible Tavern Visitor Notes

### 1. Scope / Trigger

Use this contract when implementing visitor feedback tied to a tavern. This is a bounded revisit-feedback loop, not a public guestbook or visitor social feature.

### 2. Signatures

```python
VisitorNoteStore(path: Path)
VisitorNoteStore.create_note(tavern_id: str, visitor_id: str, data: dict[str, Any]) -> dict[str, Any]
VisitorNoteStore.list_notes(tavern_id: str, *, limit: int = 20, offset: int = 0) -> tuple[list[dict[str, Any]], int]
VisitorNoteStore.delete_note(tavern_id: str, note_id: str) -> bool

TavernApplicationService.create_visitor_note(tavern_id: str, data: dict[str, Any], user_id: str) -> dict[str, Any]
TavernApplicationService.list_visitor_notes(tavern_id: str, user_id: str, limit: int = 20, offset: int = 0) -> dict[str, Any]
TavernApplicationService.delete_visitor_note(tavern_id: str, note_id: str, user_id: str) -> dict[str, Any]
```

```http
POST /api/v1/taverns/{tavern_id}/visitor-notes
GET /api/v1/taverns/{tavern_id}/visitor-notes
DELETE /api/v1/taverns/{tavern_id}/visitor-notes/{note_id}
```

### 3. Contracts

- Notes are stored outside public Tavern payloads.
- `visibility` is fixed to `owner_only` for MVP.
- Visitors may create notes only for visible taverns and must provide `X-User-Id`.
- Only the tavern owner can list all notes.
- Owner can delete any note; the original visitor may delete their own note if that path is exposed.
- Do not expose public `/messages`, replies, pinning, likes, follows, feeds, or cross-tavern visitor messaging for this feature.

### 4. Validation & Error Matrix

| Case | Expected |
|------|----------|
| Missing visitor identity on create | `401` |
| Empty content | `400` |
| Content over 500 chars | `400` |
| Non-owner lists notes | `403` |
| Owner lists notes | `200`, `{ notes, count }` |
| Public tavern GET | no `visitor_notes` / `messages` fields |
| Old `/messages` routes | not exposed by v1 router |

### 5. Good/Base/Bad Cases

- Good: visitor sends one private note to owner, owner reviews/deletes it.
- Base: `SQLAlchemyVisitorNoteStore` is the default; explicit JSON fallback remains behind `VisitorNoteStore` only for local/dev compatibility.
- Bad: public message board with replies/pins, because it drifts into visitor-to-visitor social behavior.

### 6. Tests Required

```powershell
py -3 -m pytest -q tests/test_tavern_visitor_notes.py --tb=short
py -3 -m compileall -q backend/src
```

Assertions must cover create, owner-only list, public-payload exclusion, delete, and old social route non-exposure.

### 7. Wrong vs Correct

#### Wrong

```python
@router.get("/{tavern_id}/messages")
def list_public_messages(...): ...
```

This creates a public social surface.

#### Correct

```python
@router.get("/{tavern_id}/visitor-notes")
def list_visitor_notes(request, tavern_id):
    return service.list_visitor_notes(tavern_id, get_user_id(request))
```

The service enforces owner-only access and keeps notes private.
