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
table creation and named indexes. `008_retire_legacy_space_schema.sql` is a
one-time destructive retirement migration: it is never an empty-database
baseline and must not run during startup or automated deployment.

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

## Scenario: Preserving the current eight-table physical baseline

### 1. Scope / Trigger

- Applies to ORM registration, `Database.create_tables()`, Schema comments,
  migrations, deployment documentation, and residual-reference audits.
- The current baseline contains six private StoryWorld runtime tables and two
  managed-content tables. Space, owner, visitor, map, social, and SillyTavern
  tables are not compatibility surfaces.

### 2. Signatures

```text
Base.metadata.tables == {
    "player_story_states",
    "story_runs",
    "character_relationships",
    "story_events",
    "story_messages",
    "private_memories",
    "managed_story_worlds",
    "managed_media_assets",
}

FABLESPACE_DATABASE_URL=<SQLAlchemy URL>
FABLESPACE_MYSQL_POOL_SIZE=<positive integer>
FABLESPACE_MYSQL_MAX_OVERFLOW=<non-negative integer>
FABLESPACE_MYSQL_ECHO=<boolean>

mysql --defaults-extra-file=<secure-option-file> \
  --database=<explicit-target> \
  < apps/api/sql/migrations/008_retire_legacy_space_schema.sql
```

### 3. Contracts

- Production composition registers only `story_state_models` and
  `managed_content_models` before `Base.metadata.create_all()`.
- `schema_comments.py` has complete coverage for exactly these eight tables.
- Do not restore legacy ORM modules, default Space seeds, JSON migration
  commands, `FABLEMAP_*` aliases, or Redis as a FableSpace dependency.
- Existing deployed databases may retain legacy physical tables until an
  authorized operator backs up the named target and explicitly runs 008.
- Deploy the current eight-table ORM before 008; an older process that still
  inserts the retired inline column must not run after the column drop.
- 008 uses a transient stored procedure because MySQL permits `SIGNAL` in
  stored programs but does not prepare it as a dynamic statement. A successful
  run drops that procedure; a failed run may leave it behind, and the
  migration's first statement removes that residue before a retry.
- Run 008 only through the MySQL client because it contains `DELIMITER`
  directives. Never add it to application startup or deployment automation.
- Repository completion is not evidence that any database executed 008.

### 4. Validation & Error Matrix

| Condition | Required result |
|---|---|
| Current model modules are imported without app creation | `Base.metadata.tables` is exactly the eight-table baseline |
| Schema comments are audited statically | No missing or stale table/column comment remains |
| A retired environment key is set | `ApiSettings` ignores it; deployment cleanup may remove it from FableSpace env |
| 008 preconditions fail | No target table or column is dropped |
| 008 fails after destructive DDL begins | Stop writes and restore the verified logical backup; do not infer transactional rollback |
| Database execution is requested without target/backup authorization | Stop before connecting |

### 5. Good / Base / Bad Cases

- Good: statically import both current model modules and assert the exact table
  set without constructing an engine.
- Base: let `create_tables()` initialize an empty SQLite or MySQL database with
  the same eight-table metadata.
- Bad: reintroduce an old model or config alias to make legacy data reachable,
  or claim physical cleanup from repository-only verification.

### 6. Tests Required

- Run `py -3 -m compileall -q apps/api/src`.
- Import both current model modules and assert the exact table set plus
  `schema_comment_errors(Base.metadata) == []`.
- Statically parse 008 and assert its 23-table DROP set, single approved column
  DROP, eight-table guard, and non-empty inline-memory guard.
- Run a residual grep for retired modules, table names, aliases, Redis, AMap,
  and old config files. Allow old names only in 008, cleanup constants,
  prohibition documentation, and archived task evidence.
- Run `docker compose config --quiet` and
  `npm --prefix .\apps\web run build` for deployment/frontend residue.
- Database integration or migration execution always requires separate,
  explicit authorization.

### 7. Wrong vs Correct

#### Wrong

```python
from fablespace_api.infrastructure import models  # retired legacy ORM
```

#### Correct

```python
from fablespace_api.infrastructure.database import Base
from fablespace_api.infrastructure import (
    managed_content_models,
    story_state_models,
)

assert set(Base.metadata.tables) == {
    "player_story_states",
    "story_runs",
    "character_relationships",
    "story_events",
    "story_messages",
    "private_memories",
    "managed_story_worlds",
    "managed_media_assets",
}
```

---

## Scenario: Repairing missing StoryRun role data before legacy retirement

### 1. Scope / Trigger

- Applies when a deployed MySQL database is behind the current StoryRun ORM:
  `story_runs.player_role_id` is absent and the old inline
  `story_runs.private_memories` column may still exist.
- This is an authorized maintenance operation, not an application startup,
  ordinary deployment, or general migration runner.

### 2. Signatures

```text
workflow_dispatch confirmation:
APPLY-006-AND-008-FABLESPACE-PRODUCTION

target checkout: /opt/fablespace
target database: fablespace
backup directory: /opt/fablespace/backups/story-run-schema-repair/

006_story_run_player_role.sql
  -> verify VARCHAR(128) NOT NULL and complete backfill
  -> 008_retire_legacy_space_schema.sql
  -> verify the exact eight-table baseline
```

### 3. Contracts

- Require explicit authorization for the named production database and the
  destructive 008 table/column set before dispatch.
- Pin the reviewed 006 and 008 file SHA-256 values. Do not accept database,
  SQL, path, host command, or migration inputs from the dispatch form.
- The maintenance workflow and ordinary production deploy share the same
  non-canceling concurrency group.
- Verify the server commit and current ORM before stopping writes. The ORM must
  require `StoryRunModel.player_role_id` and must not map the retired inline
  memory column.
- Stop the backend, create a non-empty full logical backup, retain its
  SHA-256, and keep credentials inside the database container.
- Before DDL, require all eight current tables, no table outside the eight
  current plus the exact 23 reviewed legacy names, an entirely absent run-role
  column, unique player-state keys, complete bounded role backfill, and only
  empty inline memories when that column exists.
- Execute 006 first and verify its schema/data/row-count postconditions before
  executing 008. Run 008 through the MySQL client so `DELIMITER` is honored.
- A pre-DDL failure may restart the verified backend image. Any failure after
  DDL begins leaves the backend stopped and the backup intact for a separately
  approved whole-database restore.
- `/api/v1/health` does not read StoryRun tables. A successful repair also
  requires a real current-ORM StoryRun query and an authenticated browser
  acceptance check.

### 4. Validation & Error Matrix

| Condition | Required result |
|---|---|
| Confirmation, commit, or migration hash differs | Stop before database access or DDL |
| Backup fails or is empty | Delete only the partial backup file, restart the verified backend, and fail |
| Run role already exists or is nullable mid-migration | Stop; do not rerun 006 |
| A run cannot map to one non-empty role of at most 128 characters | Stop before DDL |
| An unreviewed extra table or non-empty inline memory exists | Stop before DDL |
| 006 fails or its postconditions differ | Keep backend stopped; preserve backup for manual recovery |
| 008 fails or final tables differ from the exact eight | Keep backend stopped; preserve backup for manual recovery |
| Health succeeds but the current ORM StoryRun query fails | Keep backend stopped; repair is incomplete |

### 5. Good / Base / Bad Cases

- Good: dispatch the pinned repair after the matching Deploy reaches the same
  commit; retain the backup path and hash, then validate the authenticated
  story page.
- Base: for an empty database, let current `create_tables()` build the eight
  tables; do not run historical migrations.
- Bad: add 006/008 to startup or ordinary Deploy, rerun a partially committed
  006, use `mysql --force`, or treat a static health response as proof that the
  runtime schema matches the ORM.

### 6. Tests Required

- Parse both workflow YAML files and assert manual-only repair triggering plus
  the shared non-canceling concurrency group.
- Statically assert the exact confirmation phrase, fixed path/database,
  approved migration hashes, 006-before-008 order, and absence of arbitrary
  SQL/database inputs or `mysql --force`.
- Statically compare the workflow's allowed legacy tables with 008's exact
  23-table DROP set and its final expected table list with the ORM eight-table
  baseline.
- Run `py -3 -m compileall -q apps/api/src deploy/server`,
  `docker compose config --quiet`, and
  `npm --prefix .\apps\web run build`.
- Database execution remains a separate explicitly authorized production
  validation and must report the retained backup path and SHA-256.

### 7. Wrong vs Correct

#### Wrong

```text
push main -> application startup -> blindly rerun 006 -> automatically run 008
```

#### Correct

```text
authorized dispatch
  -> verify commit / ORM / migration hashes
  -> stop writes
  -> full backup + SHA-256
  -> preflight
  -> 006 + postflight
  -> 008 + exact baseline postflight
  -> backend health + real ORM query + authenticated browser acceptance
```
