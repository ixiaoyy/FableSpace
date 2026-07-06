# Backend Directory Structure

Concise backend placement rules for AI development. Product source of truth remains `docs/ARCHITECTURE.md`, `docs/WORLD_SCHEMA.md`, and focused contract specs in this folder.

## Core layout

- `apps/api/src/fablespace_api/api/v1/`: FastAPI route modules. Keep routes thin.
- `apps/api/src/fablespace_api/application/services/`: use-case orchestration and payload assembly.
- `apps/api/src/fablespace_api/application/stores/`: persistence adapters and query helpers.
- `apps/api/src/fablespace_api/contracts/`: request/response DTOs and normalization helpers.
- `apps/api/src/fablespace_api/domain/`: domain entities/policies when behavior is framework-free.
- `apps/api/src/fablespace_api/core/`: legacy compatibility core; do not add new product surface here unless maintaining compatibility.
- Current repo intentionally does not keep pytest test directories.

## Placement rules

### Routes stay thin

Routes may:
- parse path/query/body/header values;
- call one service method;
- map expected domain errors to HTTP errors;
- return a response envelope where required.

Routes must not:
- mutate space state directly;
- implement owner/visitor visibility rules inline;
- duplicate prompt, memory, or relationship policy.

### Services own orchestration

Application services should own:
- permission/identity checks;
- load-normalize-save flow;
- cross-layer payload slicing for page APIs;
- calls into stores/core compatibility adapters;
- deterministic fallback behavior.

### Stores own persistence shape

Stores should own:
- database/file read-write details;
- filtering/query helpers;
- schema migration compatibility defaults;
- no user-facing copy or HTTP concerns.

### Contracts own API shape

Use `contracts/` for:
- DTO/dataclass/Pydantic response shapes;
- enum/value normalization;
- envelope-compatible response payloads;
- schema-safe defaults.

## Where to put new work

| Change | Put it in |
| --- | --- |
| New `/api/v1/...` route | `api/v1/<domain>.py` + application service |
| Response shape / DTO | `contracts/<domain>.py` |
| Persistence query/update | application store or existing core adapter |
| Prompt/runtime behavior | application service or `core/` compatibility only if already there |

## Import direction

Preferred direction:

```text
api/v1 -> application/services -> application/stores -> domain/contracts/core adapters
```

Avoid reverse imports from `core/` into `api/v1` unless maintaining legacy bridges.

## Verification

- Python source touched: `py -3 -m compileall -q apps/api/src`.
- API behavior touched: run an isolated local API check for the touched endpoint.
- Global contract/schema touched: update docs/spec and run compile/import plus an isolated local API check.

## Common mistakes

- Adding direct persistence logic to a route.
- Adding new schema fields without updating contract docs and local verification.
- Putting one-off helpers in global modules before reuse exists.
- Treating legacy `/api/*` compatibility code as the preferred home for new v1 behavior.
- Returning a different payload shape for the same endpoint depending on caller.

## Context policy

Verbose historical scenario matrices were removed from this file to keep AI context small. For feature-specific behavior, inspect the live code and only add a focused spec when a durable contract changes.
