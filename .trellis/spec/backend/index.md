# Backend Development Guidelines

Backend guide index. Read only files relevant to the change.

## Authority

Do not override `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/WORLD_SCHEMA.md`, or `docs/WHAT_NOT_TO_BUILD.md`.

Current backend principles:

- Real-coordinate space anchoring.
- Owner-authored space/NPC/world content.
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

- Focused feature specs were pruned to keep the repository close to real business code.
- For feature work, inspect the live route/service/store/contract files plus `docs/ARCHITECTURE.md` and `docs/WORLD_SCHEMA.md`.
- Add a new focused spec only when a durable contract genuinely changes.

## Pre-development checklist

1. Identify touched layer/files.
2. Read the relevant core guide and live code.
3. Inspect existing route/service/store before editing.
4. Choose focused validation before coding.

## Verification

- Syntax/import: `py -3 -m compileall -q apps/api/src`
- Current repo does not keep pytest suites or `test_*.py` entry points.
- For runtime behavior, start the API against an isolated local database and hit the touched endpoint manually or with a one-off command that is not committed as a test file.

## Anti-patterns

- Route-level persistence/business logic.
- Raw space records returned to public endpoints.
- Secret leakage.
- Platform-generated content bypassing owner confirmation.
- Combat/level/equipment/ranking/social-network directions.
