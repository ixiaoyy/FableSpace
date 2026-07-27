# Database Guidelines

> Database patterns and conventions for this project.

---

## Overview

<!--
Document your project's database conventions here.

Questions to answer:
- What ORM/query library do you use?
- How are migrations managed?
- What are the naming conventions for tables/columns?
- How do you handle transactions?
-->

(To be filled by the team)

---

## Query Patterns

<!-- How should queries be written? Batch operations? -->

(To be filled by the team)

---

## Migrations

<!-- How to create and run migrations -->

(To be filled by the team)

---

## Naming Conventions

<!-- Table names, column names, index names -->

(To be filled by the team)

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
