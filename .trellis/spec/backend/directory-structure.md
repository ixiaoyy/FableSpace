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
│   ├── contracts/               # Pydantic request/response models grouped by API domain
│   ├── application/             # use-case facade plus focused services/ modules
│   ├── domain/                  # framework-independent product rules
│   ├── repositories/            # repository interfaces
│   └── infrastructure/          # settings, storage, LLM/external adapters
└── tests/                       # tests for the new backend package
```

Contract: `api/v1/*` can import the nearest focused `contracts.<domain>` module and the application facade; `application/taverns.py` keeps shared facade construction/helpers, focused route-facing behavior belongs in `application/services/*`, and application code can use `domain` plus repository interfaces. `domain` must not import FastAPI.

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

For new enterprise code, `backend/src/fablemap_api/application/taverns.py` is the route-facing compatibility facade and `backend/src/fablemap_api/application/services/*.py` holds focused use-case implementations. Application services are the boundary between versioned routes, stores, prompt/LLM logic, and response payloads. They may call migrated product core domain modules such as `backend/src/fablemap_api/core/tavern.py`, `backend/src/fablemap_api/core/gameplay.py`, `backend/src/fablemap_api/core/memory`, and `backend/src/fablemap_api/core/llm_clients.py`, but they must not delegate to the migrated product web router/service layer.

Current native service modules are `management.py`, `characters.py`, `runtime.py`, `owner_config.py`, `memories.py`, `worldinfo.py`, `packages.py`, `gameplay.py`, and `utilities.py`. Add new route-facing use cases to the closest existing service module; only add a new service module when a bounded context does not already exist.

Migrated-product-core `backend/src/fablemap_api/core/web/service.py` remains the boundary for current `/api/*` routes. Existing methods use the `_payload` suffix for route-facing responses, for example:

- `list_taverns_payload(...)`
- `tavern_chat_payload(...)`
- `start_gameplay_session_payload(...)`
- `advance_gameplay_session_payload(...)`

Use the existing suffix convention for migrated-product-core route responses. For new `/api/v1` route responses, prefer explicit application method names such as `send_chat(...)`, `list_gameplays(...)`, and `start_gameplay_session(...)` with request/response contracts in `backend/src/fablemap_api/contracts/`.

Focused contract modules currently mirror route/use-case modules: `taverns.py`, `characters.py`, `chat.py`, `runtime.py`, `owner_config.py`, `memories.py`, `worldinfo.py`, `packages.py`, `gameplay.py`, and `utilities.py`; shared flexible payload behavior belongs in `common.py`. New route modules should import their closest contract module instead of adding unrelated models to `contracts/taverns.py`.

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
| New `/api/v1/...` endpoint | closest focused `backend/src/fablemap_api/api/v1/<context>.py` route + `backend/src/fablemap_api/application/services/<context>.py` use case exposed through `TavernApplicationService` + relevant `backend/src/fablemap_api/contracts/*.py` contract |
| Migrated-product-core `/api/taverns/...` endpoint | `backend/src/fablemap_api/core/web/router.py` route + `backend/src/fablemap_api/core/web/service.py` payload method |
| Tavern access/text/relationship policy | `backend/src/fablemap_api/domain/tavern_policy.py` + `backend/tests/test_tavern_policy.py`; application layer converts failures to HTTP errors |
| Native v1 memory atom endpoints | `backend/src/fablemap_api/api/v1/memories.py` routes + `backend/src/fablemap_api/application/services/memories.py` use cases + `backend/src/fablemap_api/domain/memory_atom_policy.py` policy helpers + `backend/tests/test_v1_memory_atoms.py` |
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

Routes live in `backend/src/fablemap_api/api/v1/memories.py` and must stay thin:

```python
GET    /api/v1/taverns/{tavern_id}/memory-atoms
POST   /api/v1/taverns/{tavern_id}/memory-atoms
GET    /api/v1/taverns/{tavern_id}/memory-atoms/{memory_id}
PUT    /api/v1/taverns/{tavern_id}/memory-atoms/{memory_id}
DELETE /api/v1/taverns/{tavern_id}/memory-atoms/{memory_id}
```

Application methods are implemented in `backend/src/fablemap_api/application/services/memories.py` and exposed through `TavernApplicationService`:

```python
list_memory_atoms(tavern_id, user_id="", scope="", dimension="", horizon="", visibility="", visitor_id="", character_id="", place_id="", limit=100) -> dict
get_memory_atom(tavern_id, memory_id, user_id="") -> dict
create_memory_atom(tavern_id, data, user_id="") -> dict
update_memory_atom(tavern_id, memory_id, data, user_id="") -> dict
delete_memory_atom(tavern_id, memory_id, user_id="") -> dict
```

Policy helpers live in `backend/src/fablemap_api/domain/memory_atom_policy.py`; they must not import FastAPI.

### 3. Contracts

Request body uses `MemoryAtomWriteRequest` in `backend/src/fablemap_api/contracts/memories.py`. Supported fields mirror `MemoryAtom.to_dict()`:

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

Routes live in `backend/src/fablemap_api/api/v1/owner_config.py` and stay thin:

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

Application methods are implemented in `backend/src/fablemap_api/application/services/owner_config.py` and exposed through `TavernApplicationService`:

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

- Request body models live in `backend/src/fablemap_api/contracts/owner_config.py`: `WorldInfoTestRequest`, `OutputRulesWriteRequest`, `OutputRulesTestRequest`, `PromptBlocksWriteRequest`, `PromptBlocksPreviewRequest`, `RuntimePresetsWriteRequest`, and `RuntimePresetApplyRequest`.
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

Routes live in `backend/src/fablemap_api/api/v1/packages.py` for package/visitor endpoints, `backend/src/fablemap_api/api/v1/characters.py` for character import, and `backend/src/fablemap_api/api/v1/gameplay.py` for gameplay-session abandon:

```python
GET  /api/v1/taverns/{tavern_id}/package
POST /api/v1/tavern-packages/import
GET  /api/v1/taverns/{tavern_id}/visitors
POST /api/v1/taverns/{tavern_id}/characters/import
POST /api/v1/taverns/{tavern_id}/gameplay-sessions/{session_id}/abandon
```

Application methods are implemented in `backend/src/fablemap_api/application/services/packages.py` and exposed through `TavernApplicationService`:

```python
export_tavern_package(tavern_id, user_id="") -> dict
import_tavern_package(data, user_id="") -> dict
list_visitors(tavern_id, user_id="") -> dict
import_character_card(tavern_id, data, user_id="") -> dict
abandon_gameplay_session(tavern_id, session_id, user_id="") -> dict
```

Package-safe redaction helpers live in `backend/src/fablemap_api/domain/tavern_package_policy.py`; domain modules must not import FastAPI.

### 3. Contracts

- `TavernPackageImportRequest` lives in `backend/src/fablemap_api/contracts/packages.py`; `CharacterImportRequest` lives in `backend/src/fablemap_api/contracts/characters.py`.
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


## Scenario: native runtime diagnostics / group chat / voice endpoints

### 1. Scope / Trigger

Use this contract when migrating runtime tavern behavior from compatibility `/api/*` into native `/api/v1`: LLM config probing, multi-character group chat, per-character talkativeness, tavern voice config, TTS, and STT. These endpoints are runtime features around the existing owner-authored tavern/NPC content; they must not introduce platform-generated taverns or platform token billing.

### 2. Signatures

Routes live in `backend/src/fablemap_api/api/v1/runtime.py` for LLM/voice/TTS/STT endpoints and `backend/src/fablemap_api/api/v1/chat.py` for chat/group-chat/talkativeness endpoints. They stay thin:

```python
POST /api/v1/llm/test-config
POST /api/v1/taverns/{tavern_id}/test-llm
GET  /api/v1/taverns/{tavern_id}/group-chat
PUT  /api/v1/taverns/{tavern_id}/group-chat/config
POST /api/v1/taverns/{tavern_id}/group-chat
GET  /api/v1/taverns/{tavern_id}/group-chat/history
PUT  /api/v1/taverns/{tavern_id}/characters/{character_id}/talkativeness
GET  /api/v1/taverns/{tavern_id}/voice
PUT  /api/v1/taverns/{tavern_id}/voice
POST /api/v1/taverns/{tavern_id}/tts
POST /api/v1/taverns/{tavern_id}/stt
```

Application methods are implemented in `backend/src/fablemap_api/application/services/runtime.py` and exposed through `TavernApplicationService`:

```python
test_llm_config(data) -> dict
test_tavern_llm(tavern_id, data, user_id="") -> dict
get_group_chat_config(tavern_id, user_id="") -> dict
update_group_chat_config(tavern_id, data, user_id="") -> dict
send_group_chat(tavern_id, message=..., visitor_id=..., visitor_name="", user_id="", display_message="") -> dict
get_group_chat_history(tavern_id, visitor_id="", user_id="", limit=50) -> dict
update_character_talkativeness(tavern_id, character_id, data, user_id="") -> dict
get_voice_config(tavern_id, user_id="") -> dict
save_voice_config(tavern_id, data, user_id="") -> dict
synthesize_voice(tavern_id, data, user_id="") -> bytes
transcribe_voice(tavern_id, audio_bytes, audio_format="webm", user_id="") -> dict
```

Group-chat normalization helpers live in `backend/src/fablemap_api/domain/group_chat_policy.py`; domain modules must not import FastAPI.

### 3. Contracts

- Request body models live in focused modules: `LLMConfigTestRequest`, `VoiceConfigRequest`, and `TTSRequest` in `backend/src/fablemap_api/contracts/runtime.py`; `GroupChatConfigRequest`, `GroupChatRequest`, and `CharacterTalkativenessRequest` in `backend/src/fablemap_api/contracts/chat.py`.
- `test_llm_config` must not persist supplied API keys or echo secrets. Rules/public-welfare backends may return deterministic success without external calls.
- Group chat stores visitor messages under `_group` and assistant replies under character ids so history can be reconstructed from `TavernStore.list_chat_sessions`.
- Group-chat visitor history follows single-chat privacy: visitor can access own history; owner can inspect a requested visitor; another visitor must receive 403.
- Voice config is owner-writable and public-readable; TTS/STT use tavern voice config and owner LLM credentials but must never log or return API keys.
- Frontend native clients belong in `frontend/app/lib/taverns.ts`; binary audio responses should use the shared `readApiBlob` helper in `frontend/app/lib/api-client.ts`.

### 4. Validation & Error Matrix

| Case | Expected |
|------|----------|
| Missing tavern | `404 {"error": "酒馆不存在"}` |
| Tavern LLM probe by non-owner | `403 {"error": "你不是此酒馆的主人"}` |
| External LLM probe without key/base_url | `200 {"ok": false, "message": "请提供 API Key 或 Base URL"}` |
| Group chat disabled | `400 {"error": "群聊未启用"}` |
| Group chat with no characters | `400 {"error": "酒馆没有角色"}` |
| Other visitor reads requested visitor history | `403 {"error": "不能访问其他访客的群聊会话"}` |
| Visitor updates group config/talkativeness | `403 {"error": "你不是此酒馆的主人"}` |
| TTS while voice disabled | `400 {"error": "语音未启用"}` |
| STT with browser provider | `400 {"error": "浏览器 STT 无需上传到后端"}` |

### 5. Tests Required

`backend/tests/test_v1_runtime_features.py` must assert:

- `/api/v1/llm/test-config` and tavern `test-llm` support deterministic rules probes without leaking `api_key`;
- voice config defaults, owner-only writes, disabled TTS, and browser STT guardrails;
- group-chat config defaults, owner-only writes, send/history flow, owner history access, other-visitor rejection, and talkativeness updates.

Run:

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests/test_v1_runtime_features.py --tb=short
py -3 -m pytest -q backend/tests --tb=short
```

If frontend native client methods changed, also run:

```powershell
npm --prefix frontend run typecheck
npm --prefix frontend run build
```

## Scenario: native character expression / sprite / card utility endpoints

### 1. Scope / Trigger

Use this contract when migrating compatibility utilities for SillyTavern-compatible character presentation and card tooling into native `/api/v1`: expression catalogs, expression inference, per-character sprite maps, standalone character-card parsing, and character-card export. These endpoints preserve owner-authored NPC/card data; they must not generate tavern content or introduce platform token billing.

### 2. Signatures

Routes live in `backend/src/fablemap_api/api/v1/characters.py` and stay thin:

```python
GET  /api/v1/expressions
POST /api/v1/expression/infer
GET  /api/v1/taverns/{tavern_id}/characters/{character_id}/sprites
PUT  /api/v1/taverns/{tavern_id}/characters/{character_id}/sprites
POST /api/v1/characters/parse
POST /api/v1/characters/export
```

Application methods are implemented in `backend/src/fablemap_api/application/services/characters.py` and exposed through `TavernApplicationService`:

```python
list_expressions() -> dict
infer_expression(data) -> dict
get_character_sprites(tavern_id, character_id, user_id="") -> dict
update_character_sprites(tavern_id, character_id, data, user_id="") -> dict
parse_character_card_payload(data) -> dict
export_character_card_payload(data) -> dict
```

Expression keyword fallback and sprite-map normalization live in `backend/src/fablemap_api/domain/expression_policy.py`; domain modules must not import FastAPI.

### 3. Contracts

- Request body models live in `backend/src/fablemap_api/contracts/characters.py`: `ExpressionInferRequest`, `SpriteMapWriteRequest`, `CharacterCardParseRequest`, and `CharacterCardExportRequest`.
- Expression catalog returns the canonical `STANDARD_EXPRESSIONS`, `EXPRESSION_CATEGORIES`, and `count` from migrated product core.
- Expression inference may use owner-configured tavern LLM when available, but rules/public-welfare backends fall back to deterministic keyword inference; API keys must not be logged or returned.
- Sprite reads are tavern-visible; sprite writes are owner-only and keep only non-empty expression-to-URL mappings.
- Character-card parse/export delegates to migrated SillyTavern parser behavior and returns normalized character fields plus `world_info`, `sprites`, and `source_format`.
- Frontend native clients belong in `frontend/app/lib/taverns.ts` and must call `/api/v1/...`, not compatibility `/api/...`.

### 4. Validation & Error Matrix

| Case | Expected |
|------|----------|
| Missing tavern | `404 {"error": "酒馆不存在"}` |
| Missing character | `404 {"error": "角色不存在"}` |
| Visitor updates sprites | `403 {"error": "你不是此酒馆的主人"}` |
| Empty inference text | `400 {"error": "text is required"}` |
| Rules/public-welfare inference | deterministic keyword result, no external LLM call |
| Invalid character-card payload | `400` with parser error, no partial persistence |

### 5. Tests Required

`backend/tests/test_v1_character_assets.py` must assert:

- expression catalog shape and deterministic keyword inference;
- character sprite read/write round-trip, owner-only update, and empty URL filtering;
- SillyTavern V3 card parse preserves sprites/world_info/source format;
- character-card export returns V3 `spec`/`spec_version` and sprite map.

Run:

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests/test_v1_character_assets.py --tb=short
py -3 -m pytest -q backend/tests --tb=short
```

If frontend native client methods changed, also run:

```powershell
npm --prefix frontend run typecheck
npm --prefix frontend run build
```
## Scenario: native global WorldInfo utility endpoints

### 1. Scope / Trigger

Use this contract when migrating compatibility WorldInfo CRUD/test routes into native `/api/v1`. WorldInfo entries remain owner-authored tavern knowledge used for NPC prompt context; these endpoints must not create platform-authored lore, unanchored world spaces, or visitor-to-visitor social data.

### 2. Signatures

Routes live in `backend/src/fablemap_api/api/v1/worldinfo.py`:

```python
GET    /api/v1/worldinfo?tavern_id=...
POST   /api/v1/worldinfo
PUT    /api/v1/worldinfo/{entry_id}
DELETE /api/v1/worldinfo/{entry_id}
POST   /api/v1/worldinfo/test
```

Application methods are implemented in `backend/src/fablemap_api/application/services/worldinfo.py` and exposed through `TavernApplicationService`:

```python
list_world_info(user_id="", tavern_id="") -> dict
create_world_info(data, user_id="") -> dict
update_world_info(entry_id, data, user_id="") -> dict
delete_world_info(entry_id, data, user_id="") -> dict
test_world_info_global(data, user_id="") -> dict
```

Normalization and diagnostics reuse `backend/src/fablemap_api/domain/world_info_policy.py`; domain modules must not import FastAPI.

### 3. Contracts

- Request body models live in `backend/src/fablemap_api/contracts/worldinfo.py`: `WorldInfoWriteRequest` and `WorldInfoGlobalTestRequest`.
- `list_world_info` returns only WorldInfo entries on taverns visible to the caller; private tavern entries are visible only to the owner.
- Create/update/delete require tavern ownership and persist entries on `Tavern.world_info` using `WorldInfoEntry` shape.
- `keys` and `keys_secondary` accept lists or comma/Chinese-comma separated strings and normalize through `world_info_keywords`.
- Global test accepts compatibility `text` or native `message`, requires `tavern_id`, and returns the same deterministic diagnostic shape as per-tavern `/world-info/test`.
- Frontend native clients belong in `frontend/app/lib/taverns.ts` and must call `/api/v1/worldinfo...`, not compatibility `/api/worldinfo...`.

### 4. Validation & Error Matrix

| Case | Expected |
|------|----------|
| Missing `tavern_id` on write/test | `400 {"error": "tavern_id is required"}` |
| Missing tavern | `404 {"error": "酒馆不存在"}` |
| Non-owner create/update/delete | `403 {"error": "你不是此酒馆的主人"}` |
| Visitor lists private tavern entries | omitted from global list; scoped private list returns `403 {"error": "此酒馆是私人的"}` |
| Missing entry on update/delete | `404 {"error": "WorldInfo entry not found"}` |
| Empty global test text/message | `400 {"error": "text is required"}` |

### 5. Tests Required

`backend/tests/test_v1_world_info_global.py` must assert:

- owner-only create/update/delete and missing `tavern_id` validation;
- normalized keyword strings/lists, order/depth/probability persistence;
- global list includes visible tavern entries with `tavern_id`/`tavern_name`;
- global diagnostic accepts `text` and reports deterministic matches;
- private tavern WorldInfo is hidden from non-owner global and scoped reads.

Run:

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests/test_v1_world_info_global.py --tb=short
py -3 -m pytest -q backend/tests --tb=short
```

If frontend native client methods changed, also run:

```powershell
npm --prefix frontend run typecheck
npm --prefix frontend run build
```

## Scenario: native tokenizer / memory utility endpoints

### 1. Scope / Trigger

Use this contract when migrating compatibility utility routes that support prompt budgeting and local memory tooling into native `/api/v1`. These endpoints are deterministic helpers; they must not expose owner LLM credentials or create platform-authored tavern content.

### 2. Signatures

Routes live in `backend/src/fablemap_api/api/v1/utilities.py` for tokenizer endpoints and `backend/src/fablemap_api/api/v1/memories.py` for deterministic memory utility endpoints:

```python
GET  /api/v1/tokenizers
POST /api/v1/tokenizers/count
POST /api/v1/tokenizers/count_messages
POST /api/v1/memory/summarize
POST /api/v1/memory/truncate
POST /api/v1/memory/importance
```

Application methods are implemented in `backend/src/fablemap_api/application/services/utilities.py` and exposed through `TavernApplicationService`:

```python
list_tokenizers() -> dict
count_tokens(data) -> dict
count_message_tokens(data) -> dict
summarize_memory(data) -> dict
truncate_memory(data) -> dict
score_memory_importance(data) -> dict
```

### 3. Contracts

- Request body models live in focused modules: `TokenCountRequest` and `TokenMessagesCountRequest` in `backend/src/fablemap_api/contracts/utilities.py`; `MemorySummarizeRequest`, `MemoryTruncateRequest`, and `MemoryImportanceRequest` in `backend/src/fablemap_api/contracts/memories.py`.
- Tokenizer routes reuse `core.token_counter.TokenCounter` and retain the compatibility response shape `{"count": int, "backend": str}`.
- Memory routes reuse `core.memory.ChatSummarizer`, `HistoryTruncator`, and `ImportanceScorer`; summarization stays guarded with `501` until an explicit LLM client is injected.
- Frontend native clients belong in `frontend/app/lib/taverns.ts` and must call `/api/v1/tokenizers...` and `/api/v1/memory...`, not compatibility `/api/...`.

### 4. Validation & Error Matrix

| Case | Expected |
|------|----------|
| List tokenizers | includes `cl100k_base`, `o200k_base`, `p50k_base`, `p50k_edit`, `r50k_base` |
| Count text/messages | `200 {"count": int, "backend": requested_backend}` |
| `messages` is not a list | `400/422` client error |
| Summarize without injected LLM client | `501 {"error": "LLM client not configured for summarization"}` |
| Truncate | returns retained `messages` and `count` |
| Importance | returns `scores` with message indexes and `importance` values |

### 5. Good/Base/Bad Cases

- Good: `POST /api/v1/tokenizers/count_messages` with OpenAI-style messages returns a positive count without requiring external services.
- Base: `POST /api/v1/memory/truncate` with a tiny `max_tokens` budget returns a shorter message list plus `count`.
- Bad: `POST /api/v1/memory/summarize` without an injected LLM client returns `501` instead of trying to call a provider or exposing credentials.

### 6. Tests Required

`backend/tests/test_v1_memory_tokenizer_utilities.py` must assert:

- tokenizer list, text count, and message count responses;
- memory truncate returns fewer messages when budget is tiny;
- importance scoring preserves indexes and ranks more informative content higher;
- summarize returns the current `501` guardrail.

Run:

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests/test_v1_memory_tokenizer_utilities.py --tb=short
py -3 -m pytest -q backend/tests --tb=short
```

If frontend native client methods changed, also run:

```powershell
npm --prefix frontend run typecheck
npm --prefix frontend run build
```

## Scenario: native player-as-NPC roleplay endpoints

### 1. Scope / Trigger

Use this contract when maintaining tavern-scoped player-as-NPC roleplay. This feature is allowed only as owner-governed NPC performance inside one tavern; it must not become a friend graph, global online presence, cross-tavern direct messages, or unmoderated visitor-to-visitor chat.

### 2. Signatures

Persistent `Tavern` fields live in `backend/src/fablemap_api/core/tavern.py`:

```python
roleplay_mode: str = "ai_only"  # "ai_only" | "hybrid"
character_claims: list[dict[str, Any]] = field(default_factory=list)
```

Routes live in `backend/src/fablemap_api/api/v1/roleplay.py` and stay thin:

```python
GET  /api/v1/taverns/{tavern_id}/roleplay
PUT  /api/v1/taverns/{tavern_id}/roleplay
POST /api/v1/taverns/{tavern_id}/roleplay/claims
PUT  /api/v1/taverns/{tavern_id}/roleplay/claims/{claim_id}
```

Application methods are implemented in `backend/src/fablemap_api/application/services/roleplay.py` and exposed through `TavernApplicationService`:

```python
get_roleplay(tavern_id, user_id="") -> dict
save_roleplay_config(tavern_id, data, user_id="") -> dict
request_character_claim(tavern_id, data, user_id="") -> dict
decide_character_claim(tavern_id, claim_id, data, user_id="") -> dict
```

Frontend native clients belong in `frontend/app/lib/taverns.ts`:

```typescript
getRoleplayState(tavernId, userId)
saveRoleplayConfig(tavernId, { roleplay_mode }, userId)
requestRoleplayClaim(tavernId, { character_id, player_name }, userId)
decideRoleplayClaim(tavernId, claimId, { status, note }, userId)
```

### 3. Contracts

`roleplay_mode` supports:

```text
ai_only | hybrid
```

`character_claims` entries support:

```text
id, character_id, player_id, player_name, status, requested_at, decided_at, note
```

`status` supports:

```text
pending | approved | rejected | revoked
```

Public tavern payloads should expose only public-safe claim state; the dedicated roleplay endpoint returns all claims to owners, approved claims to other visitors, and a visitor's own pending/rejected/revoked claims to that visitor.

### 4. Validation & Error Matrix

| Case | Expected |
|------|----------|
| Missing tavern | `404 {"error": "酒馆不存在"}` |
| Private tavern viewed by non-owner | `403 {"error": "此酒馆是私人的"}` |
| Non-owner updates mode | `403` owner error |
| Unsupported `roleplay_mode` | `400 {"error": "Unsupported roleplay_mode"}` |
| Claim while mode is `ai_only` | `400 {"error": "This tavern has not enabled player NPC roleplay"}` |
| Claim missing/unknown character | `404 {"error": "Character not found"}` |
| Claim without user identity or `player_id` fallback | `401 {"error": "Player identity is required to request a claim"}` |
| Visitor claims for another `player_id` while authenticated as self | `403 {"error": "Cannot request a claim for another player"}` |
| Owner approves while mode is `ai_only` | `400 {"error": "Enable hybrid roleplay before approving claims"}` |
| Missing claim decision target | `404 {"error": "Roleplay claim not found"}` |

### 5. Good/Base/Bad Cases

- Good: owner sets `hybrid`, visitor requests a claim for an existing character, owner approves it, and the NPC stage displays the approved player name.
- Base: existing taverns with no roleplay fields load as `ai_only` with an empty `character_claims` list.
- Bad: adding a websocket or cross-tavern private message endpoint under this feature. That must be a separate product/security design task.

### 6. Tests Required

`backend/tests/test_v1_roleplay.py` must assert:

- default mode and empty claims for old/new taverns;
- owner-only mode updates;
- claim rejection while `ai_only` and unknown-character validation;
- pending claim visibility: owner + requester can see it, unrelated visitor cannot;
- approved claims become visible to other visitors;
- approving a second claim for the same character revokes the previous approved claim.

Run:

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests/test_v1_roleplay.py --tb=short
py -3 -m pytest -q backend/tests --tb=short
```

If frontend roleplay clients or route UI changed, also run:

```powershell
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
npm --prefix .\frontend test
```

### 7. Wrong vs Correct

#### Wrong

```python
# Route mutates tavern state directly and exposes every pending claim to all visitors.
tavern.character_claims.append(data)
return tavern.to_dict()
```

#### Correct

```python
# Route delegates to the application service, which applies visibility and owner checks.
return taverns_service(request).request_character_claim(tavern_id, data.to_payload(), get_user_id(request))
```

## Common mistakes

- Adding API logic directly inside route handlers when it belongs in `WebService` or `TavernService`.
- Putting frontend-specific display labels into backend schema fields.
- Treating old world/POI modules as the product mainline when docs say the current mainline is Tavern-centric.
- Creating new broad utility modules before checking whether the helper belongs to an existing domain file.
