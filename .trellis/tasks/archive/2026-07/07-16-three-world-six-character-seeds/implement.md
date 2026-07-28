# Execution Plan

- [x] Review the three builder functions in `core/default_spaces.py` against this task's exact six archetypes.
- [x] Confirm public copy does not leak the characters' full secrets.
- [x] Confirm WorldInfo rules are stable and do not contradict character cards.
- [x] Confirm gameplay choices point back into character conversations and do not add combat/equipment systems.
- [x] Align `public_welfare_rules.py` with the three current Space IDs only.
- [x] Remove obsolete default content builders and obsolete backend asset-ID mapping that no active seed uses.
- [x] Run focused content shape and prompt-marker assertions.
- [x] Run backend compile.
- [x] Defer open-ended three-turn dialogue Verdict when no configured LLM is available.

## Verification Record

- Focused construction assertions — PASS: 3 Space IDs, 6 character IDs, 6 WorldInfo entries per Space, one published gameplay per Space, required prompt markers, and no combat/level/equipment node copy.
- Space-specific `怎么玩` plus `帮助/规则` responses — PASS for all three Space IDs.
- Privacy fallback — PASS; it describes private visitor state and no longer exposes old owner setup instructions.
- `py -3 -m compileall -q apps/api/src` — PASS after the rules-copy correction.
- Real-LLM three-turn differentiation — BLOCKED: launch seeds currently use the finite `rules` backend and no real model configuration was placed in task scope.

## Validation

```powershell
py -3 -m compileall -q apps/api/src
$env:PYTHONPATH='apps/api/src'
py -3 -c "from fablespace_api.core.default_spaces import default_public_welfare_spaces; s=default_public_welfare_spaces(); assert len(s)==3 and sum(len(x['characters']) for x in s)==6"
```

## Rollback

Make a faulty new seed private/closed while retaining its ID and stored history. Do not remap historical messages to a different character identity.
