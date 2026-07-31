# Database Guidelines

## Storage Boundary

The current private StoryWorld runtime uses SQLAlchemy 2.x models in
`infrastructure/story_state_models.py` and transactional operations in
`infrastructure/player_story_state_store.py`. `Database.session_scope()` owns
commit, rollback, and close. Store methods must not leak a live `Session`.

Do not query any database, including for diagnostics, without explicit user
authorization.

## Query and Transaction Patterns

- Use `select(...)`, `session.scalar(...)`, or `session.scalars(...)`; keep
  query construction inside infrastructure stores.
- Scope private reads and writes by the trusted `player_id` plus
  `story_world_id`. `_owned_run()` demonstrates the required ownership filter.
- Use `.with_for_update()` for state that controls active-run or sequence
  transitions. Do not implement read-modify-write state changes across
  separate transactions.
- Let `session_scope()` commit once for the aggregate. Call `flush()` only when
  database ordering or generated state is required before the final commit.
- Convert `IntegrityError` into a stable domain/application conflict and let
  the context manager roll back.
- Persist structured events with source IDs, sequence numbers, and a
  `rule_source` so writes remain traceable and replayable.

## Models and Naming

- Tables and columns use `snake_case`; table names are plural.
- Primary domain IDs use bounded `String` columns. Player state uses the
  composite key `(player_id, story_world_id)`.
- Foreign keys name their delete behavior explicitly; child StoryRun rows use
  `ondelete="CASCADE"`.
- Prefix unique indexes with `uq_`, ordinary indexes with `idx_`, foreign keys
  with `fk_`, and checks with `ck_`. See
  `infrastructure/story_state_models.py`.
- Use JSON columns for bounded structured payloads only. Validate and normalize
  values at the store/domain boundary before persistence.

## Migration Rules

SQL migrations live in `apps/api/sql/migrations/` and use an ordered numeric
prefix. A requirement may have at most one migration version; combine all
approved tables/columns for that requirement into it.

Before creating or editing a migration:

1. Present the proposed tables/columns, affected code, data backfill, rollout,
   and rollback boundary for human review.
2. Wait for explicit approval. Do not create a migration file, table, or column
   speculatively.
3. Keep migration SQL explicit and fail on invalid preconditions. Never clear
   or silently rebuild production data during application startup.
4. Sync `docs/WORLD_SCHEMA.md` and deployment documentation when applicable.

`006_story_run_player_role.sql` is the reference for add/backfill/not-null
ordering. `007_managed_story_content.sql` is the reference for idempotent
table creation and named indexes.

---

## Scenario: Persisting a StoryRun aggregate with FK children

### 1. Scope / Trigger

- Applies when one transaction creates a `StoryRunModel` and separately mapped rows whose `story_run_id` references it, including relationships, events, messages, or memories.

### 2. Signatures

```python
session.add(run)
session.flush()
session.add(CharacterRelationshipModel(story_run_id=run.id, ...))
```

### 3. Contracts

- The parent `story_runs` row must exist before any child-row flush.
- Parent and children remain in the same transaction; `flush()` establishes ordering but does not commit.
- No migration or deferred foreign key is used to hide ordering errors.

### 4. Validation & Error Matrix

| Condition | Required result |
|---|---|
| Parent flush succeeds | Add FK children and commit the aggregate atomically |
| Parent flush fails | Roll back the transaction; add no children |
| Child references an absent run | Raise the database integrity error and roll back |

### 5. Good / Base / Bad Cases

- Good: flush the new parent, then add all children and commit once.
- Base: update an already-persisted run and its children in one transaction.
- Bad: add independently mapped parent and children, then rely on a later unrelated flush to infer insert order.

### 6. Tests Required

- Run a temporary SQLite integration verification with `PRAGMA foreign_keys=ON`.
- Assert the parent exists, every child references its ID, and the expected relationship/event counts are committed.
- A verifier with SQLite foreign keys disabled is not evidence for MySQL FK behavior.

### 7. Wrong vs Correct

#### Wrong

```python
session.add(run)
session.add(CharacterRelationshipModel(story_run_id=run.id, ...))
append_event(session, run.id)  # flush may insert the child first
```

#### Correct

```python
session.add(run)
session.flush()
session.add(CharacterRelationshipModel(story_run_id=run.id, ...))
append_event(session, run.id)
```

---

## Scenario: Isolating legacy physical schema after application contract removal

### 1. Scope / Trigger

- Applies after the Space application/domain/API contract has been removed,
  while old ORM tables and explicit migration commands await a separately
  reviewed physical Schema/config retirement.
- This is an isolation boundary, not permission to extend or call the legacy
  schema from production runtime code.

### 2. Signatures

```python
create_legacy_tables(database: Database) -> None
run_migration(output_root: Path, mysql_url: str, ...) -> dict[str, Any]
run_database_migration(source_url: str, target_url: str, ...) -> dict[str, Any]
```

The remaining physical dependency includes old `taverns`, visitor, chat,
gameplay, map/social, `space_id`, and coordinate models. Their deletion belongs
to the reviewed legacy Schema/config task, not to application startup.

### 3. Contracts

- Production `app_factory`, API routers, StoryWorld services, and frontend
  clients must not import the legacy Schema helper or ORM models.
- Only explicit migration commands may call `create_legacy_tables()`.
- The isolated helper may preserve existing additive column/rename behavior so
  those commands remain loadable until their owner task removes them.
- No Space store, application projection, runtime seed, alias, or public route
  may be rebuilt around the remaining ORM.
- Do not remove or alter ORM columns, indexes, migrations, or production data
  without the required schema-impact review and explicit approval.

### 4. Validation & Error Matrix

| Condition | Required result |
|---|---|
| Production app/import graph is inspected | No legacy Schema helper, ORM model, or Space runtime is reachable |
| Explicit migration module is imported | Legacy ORM metadata is registered without opening a database connection |
| `/api/v1/spaces/...` is requested | Route is absent; no redirect or compatibility response exists |
| Physical column removal is requested | Stop and route to schema review, migration, backup, and rollback planning |

### 5. Good / Base / Bad Cases

- Good: keep the old metadata and migration bootstrap in one explicitly named
  infrastructure module that production assembly never imports.
- Base: import a migration command for static validation without constructing
  an engine or executing SQL.
- Bad: reintroduce a Space store to make old tables reachable, or delete
  physical columns without approval and rollback evidence.

### 6. Tests Required

- Run `py -3 -m compileall -q apps/api/src`.
- Inspect the FastAPI router and production import graph without creating an
  app/database; assert the Space route and runtime are absent.
- Import the isolated helper and assert expected legacy table names exist in
  `Base.metadata` without constructing a `Database`.
- Run a residual grep that separates application/runtime hits from owned
  physical-schema and migration hits.
- Database integration or migration execution requires explicit database
  authorization and belongs to the physical schema-removal task.

### 7. Wrong vs Correct

#### Wrong

```python
from fablespace_api.infrastructure.legacy_schema import create_legacy_tables

create_legacy_tables(story_database)  # production startup
```

#### Correct

```python
# Only an explicit operator-invoked migration command imports this helper.
from fablespace_api.infrastructure.legacy_schema import create_legacy_tables
```
