# Integration Plan

## Child Order

1. `07-16-visitor-identity-character-entry`
   - Establish request and navigation contracts used by all other work.
2. `07-16-three-world-six-character-seeds`
   - Establish the canonical public content set and rule fallbacks.
3. `07-16-legacy-default-content-cleanup`
   - Depends on the new canonical IDs being fixed.
4. `07-16-story-continuity-visual-qa`
   - Runs after the first three children have reviewable candidate output.

## Parent Integration Checklist

- [x] Review each child PRD/design/plan before starting that child.
- [x] Start and finish children individually; do not use the parent as an implementation target.
- [x] Confirm product docs and Trellis task artifacts describe the same three Spaces and six characters.
- [x] Confirm new IDs are present in API responses and old system records are absent from public discovery.
- [x] Run final backend compile, frontend typecheck/build, seed migration, and continuity fixtures; browser review is optional unless explicitly requested.
- [x] Record deferred portrait cleanup and blocked LLM evidence without presenting either as complete visual/LLM proof.
- [x] Leave commit creation to the user; no commit was created during this task.

## Integration Validation

```powershell
py -3 -m compileall -q apps/api/src
npm --prefix .\apps\web run typecheck
npm --prefix .\apps\web run build
py -3 .trellis/scripts/task.py validate 07-16-character-first-story-worlds
```

## Current Candidate State

The workspace already contains uncommitted candidate changes spanning identity, frontend routing, seed content, migration, and docs. Each child must review the relevant diff against its own acceptance criteria before claiming completion.
