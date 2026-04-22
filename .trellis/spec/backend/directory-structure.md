# Backend Directory Structure

> How Python backend code is organized in FableMap.

---

## Overview

> **Refactor target note (2026-04-22)**: New enterprise-backend code lives under `backend/src/fablemap_api/` while the current runnable FableMap core remains under `backend/src/fablemap_api/core/`. The root `fablemap/` package has been retired; migrated product-core modules now live under `backend/src/fablemap_api/core/` and provide regression coverage while v1 modules are extracted.

Backend code lives in `backend/src/fablemap_api/core/`; tests live in `tests/`. The project is mostly standard-library Python plus `fastapi`, `uvicorn`, `httpx`, `python-multipart`, and `pytest` from `requirements.txt`.

The current backend is not organized as a deep package hierarchy. Many domain modules are top-level files under `backend/src/fablemap_api/core/`, while web/API composition is under `backend/src/fablemap_api/core/web/`.

---

## Directory layout

### Target enterprise backend layout

New FastAPI enterprise-layered code should follow this shape:

```text
backend/
├── src/fablemap_api/
│   ├── main.py                  # FastAPI app factory
│   ├── api/v1/                  # APIRouter modules only
│   ├── contracts/               # Pydantic request/response models
│   ├── application/             # use cases / orchestration
│   ├── domain/                  # framework-independent product rules
│   ├── repositories/            # repository interfaces
│   └── infrastructure/          # settings, storage, LLM/external adapters
└── tests/                       # tests for the new backend package
```

Contract: `api/v1/*` can import `contracts` and `application`; `application` can use `domain` and repository interfaces; `domain` must not import FastAPI.

```text
backend/src/fablemap_api/core/
├── __main__.py                 # `python -m fablemap_api` entry
├── api.py                      # API server CLI: arguments, app creation, uvicorn
├── web/
│   ├── app.py                  # FastAPI app factory and SPA static serving
│   ├── config.py               # ApiSettings and default paths/ports
│   ├── router.py               # HTTP routes; thin delegation to WebService
│   └── service.py              # Web-facing orchestration/payload methods
├── tavern.py                   # Tavern dataclasses, JSON store, TavernService
├── gameplay.py                 # GameplayDefinition/Session normalization and AI Director/fallback
├── llm_clients.py              # LLM backend adapters and client factory
├── char_card_parser.py         # SillyTavern card JSON/PNG parsing/export
├── world_info_injector.py      # WorldInfo keyword injection and macro substitution
├── writeback.py                # World/player writeback state engine
├── default_taverns.py          # Default public-welfare tavern seed data
├── memory/                     # Memory atom core types
├── orchestrator/               # Orchestrator schemas/rule/AI engine
└── application/                # Cross-layer web payload helpers

tests/
├── test_tavern_*.py            # Tavern/chat/gameplay/memory/API behavior
├── test_*                      # Core engine tests
└── fixtures/                   # Test fixtures such as Overpass samples
```

Do not use or modify generated/runtime folders as source: `__pycache__/`, `.pytest_cache/`, `tmp_pytest*/`, `frontend/dist/`, and similar output directories.

---

## Module organization rules

### Routes stay thin

New enterprise routes under `backend/src/fablemap_api/api/v1/` should declare HTTP shape and immediately delegate to application services. Example pattern:

```python
@router.get("/{tavern_id}/gameplays")
def list_gameplays(request: Request, tavern_id: str) -> dict:
    return _taverns(request).list_gameplays(tavern_id, _get_user_id(request))
```

When adding an endpoint, place request parsing and `X-User-Id` extraction in the route, but put domain checks and payload construction in `backend/src/fablemap_api/application/` or the relevant domain service. Migrated-product-core routes under `backend/src/fablemap_api/core/web/router.py` should keep their existing thin-route pattern while they remain in use.

### Domain models live near their store/service

`backend/src/fablemap_api/core/tavern.py` contains dataclasses such as `Tavern`, `TavernCharacter`, `WorldInfoEntry`, `LLMConfig`, `VisitorState`, and `ChatMessage`, plus `TavernStore` and `TavernService`.

Follow its serialization pattern:

```python
@dataclass
class ChatMessage:
    id: str
    tavern_id: str
    character_id: str
    visitor_id: str
    role: str
    content: str
    timestamp: str

    def to_dict(self) -> dict[str, Any]: ...

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "ChatMessage": ...
```

If a new persistent concept is needed, first confirm it belongs in the schema and product scope; then add `to_dict`/`from_dict`, backward-compatible defaults, tests, and docs together.

### Cross-layer payload code belongs in application services

For new enterprise code, `backend/src/fablemap_api/application/*.py` is the boundary between versioned routes, stores, prompt/LLM logic, and response payloads. It may call migrated product core domain modules such as `backend/src/fablemap_api/core/tavern.py`, `backend/src/fablemap_api/core/gameplay.py`, `backend/src/fablemap_api/core/memory`, and `backend/src/fablemap_api/core/llm_clients.py`, but it must not delegate to the migrated product web router/service layer.

Migrated-product-core `backend/src/fablemap_api/core/web/service.py` remains the boundary for current `/api/*` routes. Existing methods use the `_payload` suffix for route-facing responses, for example:

- `list_taverns_payload(...)`
- `tavern_chat_payload(...)`
- `start_gameplay_session_payload(...)`
- `advance_gameplay_session_payload(...)`

Use the existing suffix convention for migrated-product-core route responses. For new `/api/v1` route responses, prefer explicit application method names such as `send_chat(...)`, `list_gameplays(...)`, and `start_gameplay_session(...)` with request/response contracts in `backend/src/fablemap_api/contracts/`.

### Keep helpers local until reused

Many modules use small private helpers such as `_utc_now_iso`, `_normalize_*`, `_clamp_*`, `_ensure_*`, and `_safe_*`. Prefer local private helpers for module-specific normalization. Extract shared utilities only when the same logic is genuinely reused across modules.

### Native domain policy helpers

Reusable, framework-independent tavern rules belong in `backend/src/fablemap_api/domain/`, not in FastAPI route modules. Current extracted contract:

```python
from fablemap_api.domain.tavern_policy import (
    can_view_memory,
    can_view_tavern,
    clean_text,
    is_tavern_owner,
    relationship_stage_for,
)
```

- `clean_text(value, max_length=...)` collapses user/provider text whitespace and truncates route-facing strings.
- `relationship_stage_for(strength, visit_count)` maps visitor metrics to `stranger | acquaintance | regular | confidant`.
- `is_tavern_owner(tavern, user_id)` and `can_view_tavern(tavern, user_id)` keep private tavern access rules out of routes.
- `can_view_memory(atom, tavern, user_id)` keeps public/owner/subject/visitor memory visibility consistent.

Application services may translate these boolean/domain results into `HTTPException`; domain modules must not import FastAPI.

---

## Naming conventions

- Python modules: `snake_case.py`.
- Classes/dataclasses: `PascalCase`.
- Functions/methods: `snake_case`.
- Internal helpers: leading underscore, e.g. `_normalize_group_chat_config`.
- Route handler names: HTTP/action-oriented, e.g. `get_tavern`, `post_tavern_chat`, `advance_gameplay_session`.
- Payload methods: suffix `_payload` when returning route response objects.
- Tests: `tests/test_<feature>.py`, with behavior-oriented names.

---

## Where to put new work

| Change type | Preferred location |
|-------------|--------------------|
| New tavern field or store behavior | `backend/src/fablemap_api/core/tavern.py` + tests + `docs/WORLD_SCHEMA.md` if schema-level |
| New `/api/v1/taverns/...` endpoint | `backend/src/fablemap_api/api/v1/taverns.py` route + `backend/src/fablemap_api/application/taverns.py` use case + `backend/src/fablemap_api/contracts/taverns.py` contract |
| Migrated-product-core `/api/taverns/...` endpoint | `backend/src/fablemap_api/core/web/router.py` route + `backend/src/fablemap_api/core/web/service.py` payload method |
| Tavern access/text/relationship policy | `backend/src/fablemap_api/domain/tavern_policy.py` + `backend/tests/test_tavern_policy.py`; application layer converts failures to HTTP errors |
| Native v1 memory atom endpoints | `backend/src/fablemap_api/api/v1/taverns.py` routes + `backend/src/fablemap_api/application/taverns.py` use cases + `backend/src/fablemap_api/domain/memory_atom_policy.py` policy helpers + `backend/tests/test_v1_memory_atoms.py` |
| Gameplay normalization/session behavior | `backend/src/fablemap_api/core/gameplay.py` and relevant enterprise/migrated-product-core application boundary methods |
| LLM backend adapter | `backend/src/fablemap_api/core/llm_clients.py`, without logging secrets |
| SillyTavern import/export behavior | `backend/src/fablemap_api/core/char_card_parser.py` and tavern character tests |
| Writeback/world state behavior | `backend/src/fablemap_api/core/writeback.py` and writeback tests |
| Frontend-only API consumer | `frontend/app/lib/taverns.ts` for new routes or `frontend/app/product/services/tavernService.js` for product parity source, not Python |

---

## Examples of well-scoped modules

1. `backend/src/fablemap_api/core/gameplay.py` keeps definition normalization, session/event dataclasses, deterministic fallback, completion payloads, and AI Director output validation in one domain file.
2. `backend/src/fablemap_api/core/char_card_parser.py` isolates SillyTavern JSON/PNG card parsing and export helpers instead of spreading binary parsing through API code.
3. `backend/src/fablemap_api/core/web/app.py` is small and compositional: app creation, exception response shape, router registration, and SPA static fallback.
4. `backend/src/fablemap_api/domain/tavern_policy.py` is framework-independent and has focused tests for text normalization, owner/private access, memory visibility, and visitor relationship stages.
5. `backend/src/fablemap_api/domain/memory_atom_policy.py` keeps memory-atom visibility/editability/filter/payload rules independent from FastAPI while v1 routes translate policy failures into stable HTTP errors.

---

## Scenario: native `/api/v1/taverns/{id}/memory-atoms`

### 1. Scope / Trigger

Use this contract when migrating structured memory behavior from compatibility `/api/taverns/{id}/memory-atoms` into native `/api/v1`. This API is part of the tavern mainline's memory/writeback/revisit loop and must preserve private visitor boundaries.

### 2. Signatures

Routes live in `backend/src/fablemap_api/api/v1/taverns.py` and must stay thin:

```python
GET    /api/v1/taverns/{tavern_id}/memory-atoms
POST   /api/v1/taverns/{tavern_id}/memory-atoms
GET    /api/v1/taverns/{tavern_id}/memory-atoms/{memory_id}
PUT    /api/v1/taverns/{tavern_id}/memory-atoms/{memory_id}
DELETE /api/v1/taverns/{tavern_id}/memory-atoms/{memory_id}
```

Application methods live in `backend/src/fablemap_api/application/taverns.py`:

```python
list_memory_atoms(tavern_id, user_id="", scope="", dimension="", horizon="", visibility="", visitor_id="", character_id="", place_id="", limit=100) -> dict
get_memory_atom(tavern_id, memory_id, user_id="") -> dict
create_memory_atom(tavern_id, data, user_id="") -> dict
update_memory_atom(tavern_id, memory_id, data, user_id="") -> dict
delete_memory_atom(tavern_id, memory_id, user_id="") -> dict
```

Policy helpers live in `backend/src/fablemap_api/domain/memory_atom_policy.py`; they must not import FastAPI.

### 3. Contracts

Request body uses `MemoryAtomWriteRequest` in `backend/src/fablemap_api/contracts/taverns.py`. Supported fields mirror `MemoryAtom.to_dict()`:

```text
scope, dimension, horizon, subject, content, importance, confidence,
source_message_ids, pinned, visibility, visitor_id, character_id,
place_id, metadata
```

Response shapes:

```python
{"tavern_id": str, "memory_atoms": list[dict], "count": int, "filters": dict}
{"tavern_id": str, "memory_atom": dict}
{"ok": True, "tavern_id": str, "memory_atom": dict}
{"ok": True, "tavern_id": str, "memory_id": str}
```

Frontend native clients belong in `frontend/app/lib/taverns.ts` and must use `/api/v1/taverns/.../memory-atoms`, not compatibility `/api/taverns/...`.

### 4. Validation & Error Matrix

| Case | Expected |
|------|----------|
| Missing tavern | `404 {"error": "酒馆不存在"}` |
| Private tavern viewed by non-owner | `403 {"error": "此酒馆是私人的"}` |
| Create without `X-User-Id` | `401 {"error": "创建记忆需要明确用户身份"}` |
| Empty `content` | `400 {"error": "记忆内容不能为空"}` |
| Private memory read by owner/other visitor | `403 {"error": "不能访问这条记忆"}` |
| Private memory edited/deleted by owner/other visitor | `403 {"error": "不能修改/删除这条记忆"}` |
| Public memory in public tavern | visible to anonymous users |
| Owner memory | visible to owner and matching subject, not anonymous users |

### 5. Good/Base/Bad Cases

- Good: visitor creates `visibility="private"` + `scope="visitor_tavern"` without `visitor_id`; policy fills `visitor_id` and `subject` with current user.
- Base: owner creates `visibility="public"` + `scope="tavern_public"`; anonymous list with `visibility=public` returns it.
- Bad: owner tries to read a visitor private memory; must be 403, because private visitor memory is not owner-visible.

### 6. Tests Required

`backend/tests/test_v1_memory_atoms.py` must assert:

- private visitor memory self-read/list/update/delete succeeds;
- owner and other visitor cannot read/delete private visitor memory;
- public memory is anonymous-visible;
- owner memory is owner-visible and anonymous-forbidden.

Run:

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests --tb=short
```

If frontend native client methods changed, also run:

```powershell
npm --prefix frontend run typecheck
npm --prefix frontend run build
```

### 7. Wrong vs Correct

#### Wrong

```python
# Route contains permission logic and imports core web service.
return request.app.state.compat_web_service.create_memory_atom_payload(...)
```

#### Correct

```python
# Route delegates to native application service; policy remains framework-free.
return _taverns(request).create_memory_atom(tavern_id, data.to_payload(), _get_user_id(request))
```

## Scenario: native owner-config `/api/v1/taverns/{id}/...`

### 1. Scope / Trigger

Use this contract when migrating店主配置能力 from compatibility `/api/taverns/{id}/...` into native `/api/v1`. These endpoints are owner-only, deterministic where possible, and must not call LLM providers during diagnostics/previews.

### 2. Signatures

Routes live in `backend/src/fablemap_api/api/v1/taverns.py` and stay thin:

```python
POST /api/v1/taverns/{tavern_id}/world-info/test
GET  /api/v1/taverns/{tavern_id}/output-rules
PUT  /api/v1/taverns/{tavern_id}/output-rules
POST /api/v1/taverns/{tavern_id}/output-rules/test
GET  /api/v1/taverns/{tavern_id}/prompt-blocks
PUT  /api/v1/taverns/{tavern_id}/prompt-blocks
POST /api/v1/taverns/{tavern_id}/prompt-blocks/preview
GET  /api/v1/taverns/{tavern_id}/runtime-presets
PUT  /api/v1/taverns/{tavern_id}/runtime-presets
POST /api/v1/taverns/{tavern_id}/runtime-presets/apply
```

Application methods live in `backend/src/fablemap_api/application/taverns.py`:

```python
test_world_info(tavern_id, data, user_id="") -> dict
get_output_rules(tavern_id, user_id="") -> dict
save_output_rules(tavern_id, data, user_id="") -> dict
test_output_rules(tavern_id, data, user_id="") -> dict
get_prompt_blocks(tavern_id, user_id="") -> dict
save_prompt_blocks(tavern_id, data, user_id="") -> dict
preview_prompt_blocks(tavern_id, data, user_id="") -> dict
get_runtime_presets(tavern_id, user_id="") -> dict
save_runtime_presets(tavern_id, data, user_id="") -> dict
apply_runtime_preset(tavern_id, data, user_id="") -> dict
```

WorldInfo diagnostic matching lives in `backend/src/fablemap_api/domain/world_info_policy.py`; domain modules must not import FastAPI.

### 3. Contracts

- Request body models live in `backend/src/fablemap_api/contracts/taverns.py`: `WorldInfoTestRequest`, `OutputRulesWriteRequest`, `OutputRulesTestRequest`, `PromptBlocksWriteRequest`, `PromptBlocksPreviewRequest`, `RuntimePresetsWriteRequest`, and `RuntimePresetApplyRequest`.
- Output/prompt/runtime normalization reuses migrated product-core modules: `core.output_rules`, `core.prompt_blocks`, `core.prompt_builder`, and `core.presets`.
- Frontend native clients live in `frontend/app/lib/taverns.ts` and must call `/api/v1/taverns/...`, not compatibility `/api/taverns/...`.

### 4. Validation & Error Matrix

| Case | Expected |
|------|----------|
| Missing tavern | `404 {"error": "酒馆不存在"}` |
| Non-owner user | `403 {"error": "你不是此酒馆的主人"}` |
| WorldInfo test | deterministic hit diagnostics, no persistence, no LLM call |
| Output rules test | returns transformed text plus applied/errors diagnostics |
| Prompt-block preview without character | `400 {"error": "请先为酒馆添加角色"}` |
| Runtime preset not found | `404 {"error": "运行预设不存在"}` |
| Runtime preset apply | preserves existing owner API key only through private owner update path; presets themselves never persist `api_key` |

### 5. Tests Required

`backend/tests/test_v1_owner_config.py` must assert:

- temporary WorldInfo payload matches expected keywords;
- output rules round-trip and diagnostic test;
- prompt blocks round-trip and preview;
- runtime presets round-trip/apply and preset `api_key` stripping;
- all owner-config endpoints reject non-owner callers.

Run:

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests --tb=short
```

If frontend native client methods changed, also run:

```powershell
npm --prefix frontend run typecheck
npm --prefix frontend run build
```

## Scenario: native tavern package / visitor utility endpoints

### 1. Scope / Trigger

Use this contract when migrating compatibility utilities that still belong to the tavern mainline: shareable tavern packages, SillyTavern card import, owner visitor summaries, and gameplay-session abandon. These endpoints must preserve owner-authored content and never export owner credentials or private runtime buckets.

### 2. Signatures

Routes live in `backend/src/fablemap_api/api/v1/taverns.py`:

```python
GET  /api/v1/taverns/{tavern_id}/package
POST /api/v1/tavern-packages/import
GET  /api/v1/taverns/{tavern_id}/visitors
POST /api/v1/taverns/{tavern_id}/characters/import
POST /api/v1/taverns/{tavern_id}/gameplay-sessions/{session_id}/abandon
```

Application methods live in `backend/src/fablemap_api/application/taverns.py`:

```python
export_tavern_package(tavern_id, user_id="") -> dict
import_tavern_package(data, user_id="") -> dict
list_visitors(tavern_id, user_id="") -> dict
import_character_card(tavern_id, data, user_id="") -> dict
abandon_gameplay_session(tavern_id, session_id, user_id="") -> dict
```

Package-safe redaction helpers live in `backend/src/fablemap_api/domain/tavern_package_policy.py`; domain modules must not import FastAPI.

### 3. Contracts

- `TavernPackageImportRequest` and `CharacterImportRequest` live in `backend/src/fablemap_api/contracts/taverns.py`.
- Package export includes tavern metadata, characters, world_info, gameplay_definitions, prompt/output/runtime presets, voice_config, and memory_policy.
- Package export must omit `api_key`, `password_hash`, chat history, visitor state, `_memory_atoms`, and `_gameplay_sessions`.
- Package import always creates a new tavern owned by the importing `X-User-Id`; imported password-protected packages default to private access until the owner reconfigures access.
- Frontend native clients belong in `frontend/app/lib/taverns.ts`.

### 4. Validation & Error Matrix

| Case | Expected |
|------|----------|
| Export missing tavern | `404 {"error": "酒馆不存在"}` |
| Export/list visitors/import card by non-owner | `403 {"error": "你不是此酒馆的主人"}` |
| Import wrong package type | `400 {"error": "不支持的酒馆包类型"}` |
| Import missing tavern payload | `400 {"error": "酒馆包缺少 tavern 数据"}` |
| Import invalid coordinates | `400 {"error": "导入酒馆包时需要有效坐标"}` |
| Abandon other visitor session | `403 {"error": "不能访问其他访客的玩法会话"}` |
| Abandon missing session | `404 {"error": "玩法会话不存在"}` |

### 5. Tests Required

`backend/tests/test_v1_tavern_package.py` must assert:

- package export redacts credentials and excludes runtime session buckets;
- package import recreates characters/world_info under the importing owner;
- SillyTavern card import creates a character and character-book world_info;
- owner visitor summaries include names and message counts;
- gameplay abandon enforces visitor/owner session access.

## Common mistakes

- Adding API logic directly inside route handlers when it belongs in `WebService` or `TavernService`.
- Putting frontend-specific display labels into backend schema fields.
- Treating old world/POI modules as the product mainline when docs say the current mainline is Tavern-centric.
- Creating new broad utility modules before checking whether the helper belongs to an existing domain file.
