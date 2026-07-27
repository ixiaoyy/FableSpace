# Technical Design

## Scope

This stage changes only the StoryWorld dialogue runtime under
`apps/api/src/fablespace_api/application/` and its API error mapping. It does
not change the reviewed story graph, frontend payloads, database schema,
deployment configuration shape, or image assets.

## Data Flow

```text
player message
  -> deterministic input boundary
  -> bounded responder prompt or reviewed safe reply
  -> deterministic output boundary
  -> dialogue decision
  -> existing StoryEvent rows
  -> optional bounded CharacterRelationship update
  -> existing run projection
```

The LLM owns only the in-character wording. It never owns chapter movement,
story flags, ending selection, or the relationship delta.

## Contracts

### Dialogue context

The responder receives:

- the run's locked `content_version`;
- the reviewed StoryWorld and Character;
- the fixed PlayerRole;
- current node and relation stage;
- current story flags;
- at most eight recent player/Character messages;
- all reviewed canon entries with their classification.

### Boundary policy

A new application-layer dialogue policy owns:

- deterministic handling for child-safety, history-rewrite, fabricated-source,
  and modern-medical prompts;
- output checks for the same boundaries plus player-action substitution;
- a reviewed fallback that replaces unsafe or empty model text before any
  event is persisted;
- small relationship signals derived from player conduct, not model claims.

The policy returns a typed decision containing the visible reply, whether a
fallback replaced model output, a boundary reason, and an optional relation
signal.

### Relationship feedback

- One free-input event changes affinity by at most `1`.
- Each positive conduct signal can award only once per StoryRun.
- The total positive free-input award is capped at `3`.
- Free input cannot cross into the highest relation stage.
- Every applied change appends a relationship StoryEvent whose payload records
  the signal, delta, reason, and source player-event ID.
- Free input never changes `current_node_id`, `story_flags`, `key_choices`, or
  `ending_id`.

No migration is needed: the existing event payload and relationship fields
hold the audit data.

### Concurrency

The service snapshots the current node before calling the responder. Before
persisting, it verifies that the active run is still at that node. If a
reviewed choice moved the run concurrently, the stale reply is discarded with
a conflict error.

## Compatibility

- The HTTP message request and run response shapes stay unchanged.
- Existing responders that implement the expanded keyword-only protocol must
  return plain text; fake responders remain simple.
- Invalid or missing system LLM configuration continues to surface only the
  existing non-secret `dialogue_unavailable` message.

## Verification

A task-local script uses a fake completion function and pure dialogue policy.
It covers:

- ordinary in-character conversation;
- unsafe child-directed content;
- history rewrite and fabricated quotation prompts;
- modern medical hindsight;
- unsafe model output replacement;
- player-action substitution;
- repeated and synonymous relationship farming;
- per-turn, cumulative, and highest-stage relation caps;
- prompt inclusion of locked version, flags, relation, node, and canon;
- invalid configuration without secret disclosure.
