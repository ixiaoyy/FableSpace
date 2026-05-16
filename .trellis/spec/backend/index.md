# Backend Development Guidelines

Backend guide index. Read only files relevant to the change.

## Authority

Do not override `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/WORLD_SCHEMA.md`, or `docs/WHAT_NOT_TO_BUILD.md`.

Current backend principles:

- Real-coordinate tavern anchoring.
- Owner-authored tavern/NPC/world content.
- Owner LLM config and API keys are sensitive.
- Public/owner/visitor payloads must stay separate.
- Prefer native `/api/v1/*` boundaries; legacy compatibility is not the home for new work.

## Always-use guides

- [Directory Structure](./directory-structure.md) — route/service/store/contract placement.
- [Database Guidelines](./database-guidelines.md) — persistence, defaults, privacy.
- [Error Handling](./error-handling.md) — HTTP/degraded response shape.
- [Quality Guidelines](./quality-guidelines.md) — proportional validation.
- [Logging Guidelines](./logging-guidelines.md) — sensitive data.

## Read only when touched

- API envelope: [api-response-envelope-contract.md](./api-response-envelope-contract.md)
- Platform homepage aggregates: [platform-home-api-contract.md](./platform-home-api-contract.md)
- Tavern list/detail optimization: [tavern-api-response-contract.md](./tavern-api-response-contract.md)
- Default DB tavern list performance: [default-db-tavern-list-performance.md](./default-db-tavern-list-performance.md)
- Clue hunt routes/sessions/rewards: [clue-hunt-api-contract.md](./clue-hunt-api-contract.md)
- NPC vividness prompt: [npc-vividness-prompt-contract.md](./npc-vividness-prompt-contract.md)
- Share: [tavern-share-api-contract.md](./tavern-share-api-contract.md)
- State cards / GM / episode / voice / souvenir / skill packs / preset import: corresponding `*-contract.md` files.
- Territory / engagement / special tavern types / NPC dynamic responses: corresponding focused files.

## Pre-development checklist

1. Identify touched layer/files.
2. Read the smallest focused spec above.
3. Inspect existing route/service/store before editing.
4. Choose focused validation before coding.

## Verification

- Syntax/import: `py -3 -m compileall -q backend/src`
- Focused behavior: `py -3 -m pytest backend/tests/<file>.py -q --tb=short` or relevant `tests/<file>.py`
- Broad API/schema migration only: larger pytest selection.

## Anti-patterns

- Route-level persistence/business logic.
- Raw tavern records returned to public endpoints.
- Secret leakage.
- Platform-generated content bypassing owner confirmation.
- Combat/level/equipment/ranking/social-network directions.
