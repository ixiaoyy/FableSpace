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

## Scenario: Retiring an application field before reviewed physical schema removal

### 1. Scope / Trigger

- Applies only when an approved legacy-retirement task removes a field from
  application/domain contracts before a separate reviewed migration can remove
  an existing physical column.
- The current instance is the old Space `lat` / `lon` retirement. It is not a
  pattern for adding new compatibility fields or extending the Space runtime.

### 2. Signatures

```python
Space.from_dict(payload: dict[str, Any]) -> Space
Space.to_dict() -> dict[str, Any]
MySQLSpaceStore._to_tavern(model: TavernModel) -> Space
MySQLSpaceStore.create_space(space: Space) -> Space
MySQLSpaceStore.update_space(space: Space) -> Space
```

The temporary physical dependency is `taverns.lat` / `taverns.lon` as legacy
`NOT NULL` columns. Their deletion belongs to the reviewed legacy Schema
removal task, not to application startup.

### 3. Contracts

- Legacy input may contain retired fields, but `Space.from_dict()` ignores
  them and `Space.to_dict()` never writes them to JSON.
- The MySQL read adapter never projects retired column values into the
  application object or a public response.
- Until the physical migration lands, a legacy insert may supply a fixed,
  semantically inert value solely to satisfy `NOT NULL`; application code must
  never read or branch on it.
- Legacy updates leave the physical column unchanged.
- Do not remove or alter ORM columns, indexes, migrations, or production data
  without the required schema-impact review and explicit approval.

### 4. Validation & Error Matrix

| Condition | Required result |
|---|---|
| Old JSON contains `lat` / `lon` | Load succeeds; application object and next write omit both fields |
| New JSON record is created | Serialized payload contains neither field |
| Existing MySQL row has coordinate values | Hydration ignores them |
| Legacy insert runs before column removal | Adapter writes only the fixed inert value required by the old schema |
| Legacy Space is updated | Existing physical coordinate columns are not rewritten |
| Physical column removal is requested | Stop and route to schema review, migration, backup, and rollback planning |

### 5. Good / Base / Bad Cases

- Good: retire the field at content, domain, serialization, and projection
  boundaries while isolating the old physical constraint in one adapter.
- Base: read an old JSON document with the retired keys and write it back
  without those keys.
- Bad: expose the inert value through an API, infer location from it, or remove
  the ORM column while deployed databases still require it.

### 6. Tests Required

- Run `py -3 -m compileall -q apps/api/src`.
- Construct every default legacy Space without a database and assert its seed,
  dataclass fields, full serialization, and entry projection omit the retired
  keys.
- Pass a legacy dict containing the retired keys through `Space.from_dict()`
  and assert the next serialization omits them.
- Run a residual grep that separates application/runtime hits from owned
  physical-schema and migration hits.
- Database integration or migration execution requires explicit database
  authorization and belongs to the physical schema-removal task.

### 7. Wrong vs Correct

#### Wrong

```python
return Space(lat=model.lat, lon=model.lon, ...)
```

#### Correct

```python
return Space(...)

# Only inside the isolated legacy insert adapter until the reviewed migration.
model = TavernModel(lat=0.0, lon=0.0, ...)
```
