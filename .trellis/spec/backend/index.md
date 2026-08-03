# Backend Development Guidelines

## Scope

These specs cover the FastAPI application in `apps/api/src/fablespace_api/`.
The current product domain is StoryWorld-first. Application-level Space
routes, services, contracts, stores, ORM, migration entrypoints, and product
config aliases have been removed. StoryWorld dialogue may reuse the existing
deployment-level public-welfare model route only as defined in
`system-story-llm-config.md`; this does not restore a Space runtime. The current
SQLAlchemy baseline contains only the six private runtime tables and two
managed-content tables.

## Guidelines Index

| Guide | Use it for |
|---|---|
| [Directory Structure](./directory-structure.md) | Choosing domain, application, API, content, or infrastructure ownership |
| [Database Guidelines](./database-guidelines.md) | SQLAlchemy models, transactions, locking, and reviewed migrations |
| [Error Handling](./error-handling.md) | Stable application errors, HTTP mapping, and response envelopes |
| [Logging Guidelines](./logging-guidelines.md) | Safe module logging and secret/private-state redaction |
| [Quality Guidelines](./quality-guidelines.md) | Required checks, documentation sync, and forbidden shortcuts |
| [StoryRun PlayerRole Lock](./player-role-run-lock.md) | PlayerRole validation and immutable StoryRun identity |
| [Reviewed Historical Choice and Dialogue](./historical-choice-chat.md) | Deterministic historical choice and bounded dialogue boundaries |
| [System Story LLM Config](./system-story-llm-config.md) | Deployment config source priority, shared route reuse, and secret boundaries |
| [Managed StoryWorld Content](./managed-story-content.md) | Admin content, managed media, and runtime adoption |

## Pre-Development Checklist

1. Read root `AGENTS.md` and the relevant authority document under `docs/`.
2. Confirm the change belongs to the StoryWorld domain and does not reintroduce
   a Space, anonymous visitor, or `/spaces` compatibility path.
3. For API, Schema, persistence, content, or deployment work, identify the
   authoritative contract and the exact verification before editing.
4. Do not connect to a database unless the user explicitly authorizes it.
5. Do not create or modify a migration until the proposed schema and impact
   have received explicit human approval.
6. Read [System Story LLM Config](./system-story-llm-config.md) before changing
   model environment variables, provider wiring, or dialogue availability.

## Verification Baseline

- Python source: `py -3 -m compileall -q apps/api/src`
- API, Schema, or persistence: also sync `docs/WORLD_SCHEMA.md` and run a
  scoped real validation that does not silently use a database.
- StoryWorld content: run registry/reference/version validation; historical
  content also follows `../guides/historical-content-integrity.md`.
- The repository intentionally has no pytest suite. Do not create or reference
  `tests/` unless the user explicitly restores that system.
