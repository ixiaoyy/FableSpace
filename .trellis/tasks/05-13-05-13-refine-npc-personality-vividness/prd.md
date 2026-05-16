# Refine NPC Personality and Vividness

## Result

Implemented a focused prompt-contract refinement in `backend/src/fablemap_api/core/npc_voice.py`.

## Completed Scope

- Added stronger anti-robotic wording against mechanical repetition.
- Added emotional resonance guidance and preserved concise 1–3 sentence behavior.
- Kept owner-authored character card personality/scenario as the source of truth.
- Did not add schema/API fields or override SillyTavern-compatible card data.

## Validation

- `py -3 -m pytest backend/tests/test_npc_vividness_prompt.py -q --tb=short`: PASS.

## Spec

- `.trellis/spec/backend/npc-vividness-prompt-contract.md`
