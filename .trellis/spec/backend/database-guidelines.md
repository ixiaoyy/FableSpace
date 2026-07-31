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
