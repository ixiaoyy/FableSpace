# Implementation Plan

## 1. Dialogue boundary

- [x] Add one application-layer module that owns input classification, output
      validation, reviewed fallbacks, and bounded relation signals.
- [x] Keep all safety and relation constants in that module.
- [x] Make unsafe model text impossible to reach StoryEvent persistence.

## 2. Runtime integration

- [x] Expand responder context with locked content version and story flags.
- [x] Apply the boundary before and after the LLM call.
- [x] Persist the source player event before any relationship audit event.
- [x] Apply at most one bounded relation change without changing story
      progression fields.
- [x] Reject stale replies if a concurrent choice changed the current node.
- [x] Keep missing/invalid LLM configuration errors non-secret.

## 3. Verification

- [x] Add a task-local fake-responder/adversarial verification script.
- [x] Run:
      `py -3 .trellis/tasks/07-27-annie-dialogue-guardrails/verify_dialogue_guardrails.py`
- [x] Run: `py -3 -m compileall -q apps/api/src`
- [x] Run: `python ./.trellis/scripts/task.py validate
      .trellis/tasks/07-27-annie-dialogue-guardrails`
- [x] Run a scoped diff check and Trellis quality review.

## 4. Finish

- [x] Record verification evidence and historical-integrity verdict.
- [x] Stage only production files immediately; stage task artifacts at the
      phase commit.
- [x] Commit, archive this task, and record the Trellis session.
