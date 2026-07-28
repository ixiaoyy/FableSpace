# StoryRun PlayerRole Lock

## 1. Scope / Trigger

Use this contract when a published `StoryWorld` offers one or more reviewed
`PlayerRole` values, or when start/restart APIs, persistence, dialogue context,
or entry UI touch the player's story identity.

## 2. Signatures

```text
StoryWorld.player_roles: tuple[PlayerRole, ...]
StoryRun.player_role_id: str

POST /api/v1/story-worlds/{story_world_id}/runs
POST /api/v1/story-worlds/{story_world_id}/runs/restart
body: { "character_id": "...", "player_role_id": "..." }
```

Database migration baseline:

```sql
ALTER TABLE story_runs ADD COLUMN player_role_id VARCHAR(128);
```

Backfill existing rows before making the column non-null.

## 3. Contracts

- A `StoryWorld` has at least one reviewed role; role IDs are unique and cannot
  cross world boundaries.
- The client submits only a published `player_role_id`. It never submits role
  prose, capabilities, prompts, or `player_id`.
- A new `StoryRun` stores the selected ID. The run response returns the public
  projection resolved from that stored ID.
- Dialogue context resolves the role from `StoryRun.player_role_id`, not from
  current client state or a mutable world default.
- An active run cannot change identity. A restarted run may choose another
  currently published role.
- A single-role entry may select the sole role automatically in the UI, but the
  start/restart write still carries its stable ID.

## 4. Validation & Error Matrix

| Condition | Result |
|---|---|
| StoryWorld has no roles | Registry rejects `missing_player_role` |
| Duplicate role ID | Registry rejects `duplicate_id` |
| Role belongs to another world | Registry rejects `cross_world_reference` |
| Required multi-role avatar is absent | Registry rejects `missing_player_role_avatar` |
| Start/restart role is blank or unknown | API returns `422` |
| Start supplies a role different from the active run | API returns `409 player_role_locked` |
| Persisted state role differs from active run role | Runtime rejects invalid state |

## 5. Good / Base / Bad Cases

- Good: palace entry submits one of its published IDs, persists it on the run,
  and uses it in every later dialogue prompt.
- Base: Annie has one role; the UI selects it automatically and writes its ID.
- Bad: switch the visible identity in React while reusing an active run whose
  stored role is different.

## 6. Tests Required

- Registry verification for single-role, multi-role, empty, duplicate,
  cross-world, and missing-avatar cases.
- Integration verification with foreign keys enabled: create the run parent,
  then relationships/events, and assert every child references the run.
- Assert active-run mismatch returns `player_role_locked` without changing
  persisted state.
- Assert a completed run retains its old role after a restarted run chooses a
  different role.
- Frontend typecheck/build plus a narrow viewport check for one, two, and three
  or more Character entries.

## 7. Wrong vs Correct

### Wrong

```python
responder.reply(player_role=world.player_roles[0], ...)
```

This silently changes historical runs if role order or published content
changes.

### Correct

```python
player_role = resolve_player_role(world, run.player_role_id)
responder.reply(player_role=player_role, ...)
```

The durable run remains the source of truth.
