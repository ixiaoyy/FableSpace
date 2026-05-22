# NPC Vividness Prompt Contract

## Scope

Use this when changing default NPC voice/system prompt wording that makes character replies feel less robotic.

## Contracts

- The prompt should reinforce owner-authored character identity, not invent platform-authored backstory.
- Include anti-robotic guidance: avoid mechanical repetition, avoid “as an AI” framing, and preserve the character's unique traits.
- Include a non-persistent role-positioning response template derived only from owner-authored fields (`description`, `personality`, `scenario`, `system_prompt`, `tags`, `hobbies`, `traits`), so different NPC positions (e.g. safety triage, clue archivist, low-pressure companion, tough-love/roast friend, action coach) produce different chat behavior.
- Tough-love/roast friend positioning must use an English prompt body and preserve the full tuned behavior shape (brutal honesty, tough love, scannable formatting toolkit, drop-the-mic completion, one sharp follow-up only when needed), not collapse into a one-line style hint or Chinese paraphrase.
- Encourage concise sensory/action/emotional resonance when appropriate, while keeping replies within the existing 1–3 sentence expectation.
- Do not break SillyTavern-compatible character card fields or override owner-defined personality/scenario content.
- Safety/professional positioning takes priority over roast/tough-love style when both are present; role-positioning templates must not replace crisis, privacy, or real-world help boundaries.

## Validation

- `py -3 -m pytest backend/tests/test_npc_vividness_prompt.py -q --tb=short`
- `py -3 -m compileall -q backend/src`

## Affected Files

- `backend/src/fablemap_api/core/npc_voice.py`
- `backend/tests/test_npc_vividness_prompt.py`
