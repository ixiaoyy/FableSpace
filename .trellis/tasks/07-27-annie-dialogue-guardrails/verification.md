# Verification

## Result

PASS for the scoped fake-responder and pure-policy verification. No database
connection and no live LLM request were made.

## Commands

```text
py -3 .trellis/tasks/07-27-annie-dialogue-guardrails/verify_dialogue_guardrails.py
PASS: ordinary=1 adversarial_inputs=4 unsafe_outputs=8 natural_turn_max_delta=1 natural_run_cap=3 highest_stage_guard=1

py -3 -m compileall -q apps/api/src
PASS

python ./.trellis/scripts/task.py validate .trellis/tasks/07-27-annie-dialogue-guardrails
PASS

git diff --check --cached -- apps/api/src/fablespace_api/application/story_dialogue.py apps/api/src/fablespace_api/application/story_worlds.py apps/api/src/fablespace_api/api/v1/story_worlds.py
PASS
```

## Acceptance Evidence

- The fake completion captures a system prompt containing the locked content
  version, story flags, relation attitude, current node, fixed PlayerRole, and
  both reviewed canon classifications.
- Four unsafe input classes use reviewed replies without calling the LLM.
- Eight unsafe output cases are replaced before persistence, including a
  fabricated real-person contact, deterministic modern medical claim, history
  rewrite, player-action substitution, child-safety violation, and prompt
  disclosure.
- Positive free-input relation feedback reads the reviewed Character
  `natural_turn_max_delta`; duplicate/synonymous signals, the three-point run
  cap, and crossing into the highest stage are rejected.
- The application method has no assignment to node, flags, key choices,
  ending, or run status; a relation change records a
  `relationship_changed` event tied to the source player event.
- A stale reply is discarded if a reviewed choice changed the node during the
  responder call.
- Invalid configuration raises `dialogue_unavailable` without echoing the
  configured secret.

## Historical Integrity Verdict

PASS.

- Fixed facts and Story Settings remain sourced from the reviewed registry.
- The prompt explicitly separates and includes both classifications.
- Input and output boundaries reject fabricated quotations, invented contact
  with real people, deterministic modern-medical hindsight, and history
  rewrite.
- Free input changes only private relation state and cannot move the reviewed
  story graph or public-history outcome.

## Residual Risk

- A real provider call was intentionally not used; tone and latency still need
  an environment-level smoke check with deployment credentials.
- The existing runtime still needs its separate queued fix to resolve old
  StoryRuns by locked `content_version`; this task passes the locked version
  into dialogue but does not implement registry version lookup.

## Spec Review

No authority-document edit is required: this implementation follows the
existing contracts in `docs/WORLD_SCHEMA.md`,
`docs/FABLESPACE_SPACE_PLATFORM.md`, `docs/WHAT_NOT_TO_BUILD.md`, and
`.trellis/spec/guides/historical-content-integrity.md`. It adds no schema,
public response field, or content enum.
