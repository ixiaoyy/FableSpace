# Reviewed Historical Choice and Dialogue

## 1. Scope / Trigger

Use this contract when a published historical StoryWorld offers reviewed
choices and also accepts free Character dialogue. Structured choices control
story state; AI dialogue may interpret player input and perform bounded
Character portrayal, but it cannot author history or deterministic outcomes.

Reference implementation:
`application/story_worlds.StoryWorldApplicationService`.

## 2. Signatures

```text
POST /api/v1/story-worlds/{story_world_id}/runs/{run_id}/choices
body: { "character_id": "...", "choice_id": "..." }

POST /api/v1/story-worlds/{story_world_id}/runs/{run_id}/messages
body: { "character_id": "...", "content": "..." }
```

Reviewed choice source:

```text
StoryChoice(
  id,
  next_node_id,
  set_flags,
  relationship_effects,
  ...
)
```

## 3. Contracts

- A choice ID must exist on the current reviewed node and satisfy its required
  and blocked flags.
- Applying a choice writes a player choice event with
  `source_kind="reviewed_choice"` and `source_id=choice.id`.
- Repeating the same reviewed source is idempotent: return the current run
  rather than applying flags or relationship effects again.
- Only authored choice data changes key choices, story flags, deterministic
  relationship effects, current node, and ending.
- The authored narration for the next node is appended to the ordered event
  timeline and remains visible to the player.
- Free dialogue writes `source_kind="free_input"`. The dialogue policy may
  apply a small bounded relationship signal; it cannot change nodes, key
  choices, story flags, canon categories, or endings.
- The model response is a fixed JSON object with string fields `dialogue`,
  `narration_before`, and `narration_after`. `dialogue` contains only words the
  Character actually speaks. Observable third-person action belongs in the
  narration fields; quoted speech, player action, and internal thought do not.
- Persist generated output in presentation order as optional system-role
  `narration` events around one Character-role `message`. Only that Character
  message enters later Character dialogue context; narration remains
  player-visible presentation and grants no Character knowledge.
- If a legacy `free_input` Character event contains an explicit third-person
  action by that Character, project it as narration and exclude it from later
  Character context. Do not rewrite the stored event or invent a missing line
  of speech.
- Historical canon entries remain `fixed_fact`, `story_setting`, or
  `needs_verification`; runtime AI cannot promote or create a fixed fact.

## 4. Validation & Error Matrix

| Condition | Required behavior |
|---|---|
| Unknown or currently blocked choice | `409 choice_unavailable`; no write |
| Same reviewed choice source already exists | Return current projection; no duplicate effect |
| StoryRun already completed | `409 run_completed` |
| Persisted run uses replaced content | `409 story_content_changed` or current-content recovery |
| Dialogue model is unavailable | `503 dialogue_unavailable`; no fabricated Character reply |
| Dialogue response is not the exact three-field JSON contract | Replace it with policy-owned direct dialogue; persist no model narration |
| `dialogue` contains third-person Character action, or narration contains speech | Replace it with policy-owned direct dialogue; persist no mixed presentation |
| Dialogue output violates policy | Replace/reject it according to `StoryDialoguePolicy`; do not change reviewed state |
| Relationship signal exceeds natural-turn bound | Clamp/reject it to the Character's reviewed rules |

## 5. Good / Base / Bad Cases

- Good: an authored Annie choice records the choice, applies its reviewed
  relationship reason, advances to the reviewed node, and preserves the public
  historical outcome.
- Base: a free player message receives a short in-character response and at
  most a bounded natural relationship effect.
- Good: a generated observable action is persisted as a system narration event
  before or after a separate Character message containing only spoken words.
- Bad: parse an LLM reply for a `next_node_id`, story flag, or ending.
- Bad: persist `安妮把纸压在陶罐下面` as `role="character"` merely because it
  came from the Character dialogue model.
- Bad: remove the authored next-node narration because the same text also
  appears in the current-node projection.

## 6. Tests Required

- Validate the full StoryWorld registry, graph reachability, choice references,
  canon categories, and `content_version`.
- Verify one reviewed choice applies each flag/effect once and appends the
  authored narration in order.
- Verify unavailable and repeated choices leave deterministic state unchanged.
- Verify free input cannot set reviewed flags, choose a node, or complete a run.
- Verify the exact dialogue JSON contract is required; malformed output,
  mixed Character narration, and speech embedded in narration all produce a
  direct-dialogue safe replacement with no model narration.
- Verify generated narration is ordered around the Character message, is not
  added to later Character context, and an old mixed event projects as
  narration without modifying persistence.
- Run `py -3 -m compileall -q apps/api/src` and the relevant frontend
  typecheck/build.
- For historical content, record a PASS/FAIL/BLOCKED integrity verdict with
  inspected evidence.

## 7. Wrong vs Correct

Wrong:

```python
decision = json.loads(model_reply)
run.current_node_id = decision["next_node_id"]
```

Correct:

```python
choice = require_available_reviewed_choice(world, run, choice_id)
append_choice_event(source_id=choice.id)
apply_reviewed_effects(choice)
run.current_node_id = choice.next_node_id
```

For generated presentation, the corresponding correct boundary is:

```python
output = parse_story_dialogue_output(model_content)
decision = dialogue_policy.decide(
    character_name=character.name,
    player_message=player_message,
    model_reply=output,
    input_fallback=input_fallback,
)
if decision.narration_before:
    append_narration(decision.narration_before, role="system")
append_message(decision.dialogue, role="character")
if decision.narration_after:
    append_narration(decision.narration_after, role="system")
```

The reviewed StoryWorld graph, not runtime generation, owns deterministic
state.
