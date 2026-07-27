# Verification

## Result

PASS for the scoped backend projection, frontend interaction, responsive
layout, accessibility-state, and historical-integrity checks. Browser
verification used the task-local mock server; no database connection and no
live LLM request were made.

## Backend

```text
py -3 .trellis/tasks/archive/2026-07/07-23-broad-street-story/verify_broad_street_story.py
PASS: version=annie-broad-street-2026-07-27.1 nodes=15 choices=30 endings=5 trusted_affinity=10

py -3 .trellis/tasks/archive/2026-07/07-27-annie-dialogue-guardrails/verify_dialogue_guardrails.py
PASS: ordinary=1 adversarial_inputs=4 unsafe_outputs=8 natural_turn_max_delta=1 natural_run_cap=3 highest_stage_guard=1

py -3 .trellis/tasks/07-27-annie-story-interaction-polish/verify_story_projection.py
PASS: reference_stages=3 unlocked=3/7/11 canon_entries=11 choice_feedback_source_link=1

py -3 -m compileall -q apps/api/src
PASS
```

The projection script runs without a database and verifies:

- all eleven canon entries appear exactly once in the stage map;
- opening/investigation/outcome unlock 3/7/11 entries;
- every fixed fact retains two or more HTTPS sources;
- published entries contain no `needs_verification`;
- reviewed choice feedback uses `relationship_changed` and points to the
  source choice event before authored node narration.

## Frontend

Iterative worktree checks:

```text
npm --prefix .\apps\web run typecheck
PASS

npm --prefix .\apps\web run build
PASS
```

Final staged-tree evidence used detached snapshot
`428d58b4025f3171be25cd82891ef4c741972af3` in a temporary worktree:

```text
npm --prefix <snapshot>/apps/web run typecheck
PASS

npm --prefix <snapshot>/apps/web run build
PASS
```

The temporary worktree was removed after verification. Unrelated
`apps/web/vite.config.js` and untracked Web preview files did not participate.

## Browser

The in-app browser opened the route at a local Vite server backed only by
`preview_mock_server.mjs`.

- 390×844: document `scrollWidth=375` at `innerWidth=390`; timeline
  `scrollWidth=clientWidth=310`; minimum choice height `50.4px`; placeholder
  color `rgb(174,177,190)`.
- Message pending: specific `安妮正在回应…` live text; choices, textarea, and
  send button disabled.
- Message failure: error is adjacent to the composer, original text remains,
  and the button becomes `重新发送回应`.
- Message retry: error count returns to zero, input clears only after success,
  and the timeline ends at `scrollTop=392.5` for
  `scrollHeight-clientHeight=393`.
- Choice pending: `正在记下这个选择…` appears and the selected button is
  disabled.
- Choice success: the last three events are the player choice,
  `relationship_changed`, and authored narration; current node and relation
  label update, and timeline ends at `scrollTop=711` for
  `scrollHeight-clientHeight=711`.
- Reference disclosure: category counts are
  `史实 3 / 剧情设定 4 / 待核验 0`; source links and no-source Story Setting
  labels are visible only after explicit expansion.
- Desktop 1280×900: workspace width `1120px`, no horizontal overflow, and
  choice height `50.4px`.
- Browser console: no warnings or errors from the local application.

## Historical Integrity Verdict

PASS.

- The UI receives only unlocked projections of reviewed CanonEntry data.
- Locked statements and sources are not sent early.
- Category mapping is fixed and visibly separates facts, Story Settings, and
  verification status.
- Published content shows zero `待核验` entries instead of inventing a
  placeholder.
- Choice feedback changes only private relationship state and is linked to the
  reviewed source choice.

## Issues Found and Fixed

- The first projection run caught an undefined `choice_event` caused by an
  assignment landing in the message path; the source event assignment was
  moved to the reviewed choice path.
- Archived verification scripts originally used a fixed parent depth and
  failed after Trellis moved them under `archive/YYYY-MM`; they now discover
  the repository root by locating `apps/api/src`.

## Residual Risk

- The browser harness validates deterministic UI states, not real provider
  latency or a real authenticated database-backed run.
- The separate runtime task still owns old StoryRun resolution by locked
  `content_version`.
