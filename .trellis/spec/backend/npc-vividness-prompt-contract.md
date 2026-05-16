# NPC Vividness Prompt Contract

## Scope

Use this when changing default NPC voice/system prompt wording that makes character replies feel less robotic.

## Contracts

- The prompt should reinforce owner-authored character identity, not invent platform-authored backstory.
- Include anti-robotic guidance: avoid mechanical repetition, avoid “as an AI” framing, and preserve the character's unique traits.
- Encourage concise sensory/action/emotional resonance when appropriate, while keeping replies within the existing 1–3 sentence expectation.
- Do not break SillyTavern-compatible character card fields or override owner-defined personality/scenario content.

## Validation

- `py -3 -m pytest backend/tests/test_npc_vividness_prompt.py -q --tb=short`
- `py -3 -m compileall -q backend/src`

## Affected Files

- `backend/src/fablemap_api/core/npc_voice.py`
- `backend/tests/test_npc_vividness_prompt.py`
