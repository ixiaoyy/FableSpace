# Backend Persistence Guidelines

> FableMap currently uses JSON-file persistence, not a SQL database or ORM.

---

## Overview

There is no database migration framework in this repository. Persistent backend state is stored as JSON/JSONL under the configured output root (default described in `backend/src/fablemap_api/core/web/config.py` and architecture docs as `fablemap_data/`).

Important stores:

```text
fablemap_data/
├── taverns.json                  # Tavern public/config payloads; includes gameplay_definitions
├── taverns_keyvault.json          # Owner LLM API keys / private config
├── chat_history/                  # Per-tavern/per-visitor/per-character JSONL-like histories
├── writeback-state.json           # World/player writeback state
└── _gameplay_sessions             # Logical private bucket inside TavernStore data
```

The exact implementation is in `backend/src/fablemap_api/core/tavern.py` and `backend/src/fablemap_api/core/writeback.py`.

---

## Persistence patterns

### Use explicit load-normalize-save flows

`TavernStore` reads JSON from disk, normalizes through dataclasses/helper functions, then writes JSON back. Existing examples:

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

## Migrations

There is no formal migration runner. Compatibility is handled by:

- default values in dataclass fields,
- `from_dict` fallbacks,
- `_normalize_*` helpers,
- idempotent seed/update logic such as default public-welfare tavern seeding.

If a change cannot be handled by backward-compatible readers, stop and design an explicit migration plan with the user.

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

## Scenario: Optional MySQL Infrastructure Startup

### 1. Scope / Trigger

Use this contract when maintaining native startup code (`backend/src/fablemap_api/main.py`) or optional SQLAlchemy/MySQL infrastructure modules. JSON file storage remains the default development/test path, so importing or starting the native app with no `FABLEMAP_MYSQL_URL` must not require SQLAlchemy or a MySQL driver.

### 2. Signatures

```python
ApiSettings.mysql_url: str
create_store(settings: ApiSettings) -> TavernStore
create_database_from_settings(settings: ApiSettings) -> Database | None
MySQLTavernStore(database: Database)
create_mysql_tables(database: Database) -> None
```

Package-level infrastructure exports are lazy:

```python
from fablemap_api.infrastructure.settings import ApiSettings  # must be SQLAlchemy-free
from fablemap_api.infrastructure import Database              # may import optional SQLAlchemy modules
```

### 3. Contracts

- `fablemap_api.main` and `fablemap_api.infrastructure.settings` must import successfully without SQLAlchemy installed when `FABLEMAP_MYSQL_URL` is unset.
- `create_store()` must use `TavernStore(output_root / "taverns")` as the default JSON-backed store.
- SQLAlchemy-backed modules (`database.py`, `models.py`, `mysql_store.py`) are optional infrastructure and should be imported only after a non-empty `mysql_url` is selected or a caller explicitly imports MySQL infrastructure.
- If SQLAlchemy is unavailable and MySQL infrastructure is imported, the raised `ImportError` should explain that SQLAlchemy/MySQL dependencies are optional and that unsetting `FABLEMAP_MYSQL_URL` uses JSON storage.
- MySQL infrastructure tests should use `pytest.importorskip("sqlalchemy", ...)` so the default backend test suite can run in JSON-only environments.
- Logs must not print full database credentials; redact URLs before logging or log only the host/path part after `@`.

### 4. Validation & Error Matrix

| Case | Expected |
|------|----------|
| No `FABLEMAP_MYSQL_URL`, SQLAlchemy absent | native app imports and `/api/v1/health` returns 200 using JSON store |
| No `FABLEMAP_MYSQL_URL`, SQLAlchemy present | native app still uses JSON store by default |
| `FABLEMAP_MYSQL_URL` set, SQLAlchemy present and connection works | create tables and use `MySQLTavernStore` |
| `FABLEMAP_MYSQL_URL` set, SQLAlchemy missing | log a warning and fall back to JSON store unless a future explicit fail-fast setting is added |
| Explicit import of `fablemap_api.infrastructure.database` without SQLAlchemy | clear `ImportError` explaining optional dependency requirements |
| MySQL tests in JSON-only environment | skipped, not failed |

### 5. Good/Base/Bad Cases

- Good: `from fablemap_api.main import create_app` works in a fresh JSON-only install because SQLAlchemy imports are lazy.
- Base: `backend/tests/test_mysql_infrastructure.py` runs full SQLite-backed MySQL-store behavior when SQLAlchemy is installed.
- Bad: `backend/src/fablemap_api/infrastructure/__init__.py` eagerly imports `database`, `models`, or `mysql_store`, causing default app startup to fail before JSON fallback can run.

### 6. Tests Required

When changing this startup path, assert:

- a subprocess can block `sqlalchemy` imports, import `create_app`, create an app with `mysql_url=""`, and call `/api/v1/health`;
- MySQL infrastructure tests are skipped with `pytest.importorskip` if SQLAlchemy is absent;
- normal backend smoke tests still create/list/enter/chat through the JSON store.

Run:

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q backend/tests/test_startup_optional_mysql.py backend/tests/test_api_smoke.py --tb=short
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

This imports SQLAlchemy-backed modules even when the app will use JSON storage.

#### Correct

```python
def create_store(settings):
    if settings.mysql_url:
        from fablemap_api.infrastructure.database import create_database_from_settings
        from fablemap_api.infrastructure.mysql_store import MySQLTavernStore
        ...
    return TavernStore(settings.output_root / "taverns")
```
