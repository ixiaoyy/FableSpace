# Backend Directory Structure

## Runtime Layout

```text
apps/api/src/fablespace_api/
├── api/
│   ├── response_envelope.py
│   └── v1/                    # FastAPI routers and request models
├── application/               # StoryWorld use cases and stable runtime errors
├── content/                   # Reviewed, versioned system StoryWorld content
├── domain/                    # Framework-free immutable domain contracts
├── infrastructure/            # SQLAlchemy, stores, settings, and storage adapters
├── app_factory.py             # Application assembly, middleware, and state wiring
└── main.py                    # Environment load and ASGI app entry
```

`core/`, `contracts/`, legacy `application/services/`, and `/spaces` routes
contain the old Space runtime. They may be audited or removed, but new
StoryWorld work must not copy their entity names, identity headers, or route
shape.

## Layer Ownership

- `domain/`: dataclasses, enums, immutable value structures, and deterministic
  validation. It must not import FastAPI or SQLAlchemy. See
  `domain/story_world.py` and `domain/story_state.py`.
- `application/`: orchestrates domain/content/store operations and raises
  stable errors such as `StoryRuntimeError(code, message)`. See
  `application/story_worlds.py`.
- `api/v1/`: validates HTTP input with Pydantic, resolves the trusted session,
  calls application services, and maps stable error codes to status codes. See
  `api/v1/story_worlds.py`.
- `content/`: defines reviewed StoryWorld registries. Every registry load must
  validate IDs, references, publication state, and `content_version`.
- `infrastructure/`: owns SQLAlchemy models, transactions, settings, generated
  storage, and private-state stores. Domain/application modules receive these
  capabilities rather than creating engines or reading environment variables.
- `app_factory.py`: is the composition root. Put middleware and `app.state`
  wiring here, not in route modules.

## Naming and File Rules

- Python modules and functions use `snake_case`; domain types and services use
  `PascalCase`.
- SQLAlchemy classes end in `Model`; HTTP bodies end in `Request`; stores end
  in `Store`; use-case orchestration ends in `Service`.
- New API fields use `story_world_id`, `character_id`, and `player_role_id`.
  Do not introduce `Space`, `NPC`, `VisitorState`, or client-supplied
  `player_id` into new contracts.
- New methods require a method-level docstring or comment that states purpose,
  important parameters, return value, and any non-obvious business constraint.
- Prefer existing dependencies in `apps/api/requirements.txt`; adding a
  dependency requires approval.

## Reference Implementations

- Layered runtime flow:
  `api/v1/story_worlds.py` → `application/story_worlds.py` →
  `infrastructure/player_story_state_store.py`.
- Immutable reviewed content: `domain/story_world.py` and
  `content/annie_broad_street.py`.
- App assembly and error boundary: `app_factory.create_app`.
