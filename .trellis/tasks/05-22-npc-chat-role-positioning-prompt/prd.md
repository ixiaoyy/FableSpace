# NPC chat role-positioning prompt templates

## Goal
When a visitor chats with an NPC, the runtime LLM prompt should adapt to the character's role positioning instead of using a single generic assistant-like template. The user provided a "best bad friend / tough love" prompt as a reference for one positioning style.

## Scope
- Backend runtime prompt helper only.
- Use existing owner-authored `TavernCharacter` fields: `description`, `personality`, `scenario`, `system_prompt`, `tags`, `hobbies`, and `traits`.
- Do not add new schema fields or persist platform-generated role content.

## Design
Add a non-persistent `角色定位响应模板` section inside the existing NPC voice contract:

- Safety/professional triage templates take priority over roast style.
- Other templates cover action coach, clue archivist, low-pressure companion, tough-love/roast best friend, tsundere, schemer, high-energy talker, and minimalist roles.
- Every template states that it is derived from owner-authored fields and must not override the owner's role instructions.

## Validation Plan
- Focused backend prompt test: `py -3 -m pytest backend/tests/test_npc_vividness_prompt.py -q --tb=short`
- Python syntax/import check: `py -3 -m compileall -q backend/src`

## Result
Implemented in `backend/src/fablemap_api/core/npc_voice.py`:

- Added `build_npc_positioning_contract(...)` to select a runtime-only role-positioning template from existing owner-authored fields.
- Injected the selected template into the existing `【NPC身份与口吻底线】` system prompt block.
- Added tests proving tough-love/roast tags receive the `最佳损友 / 毒舌参谋型 NPC` template, while hospital/safety tags override roast tone with `专业分诊 / 安全边界型 NPC`.

## Validation
- `py -3 -m pytest backend/tests/test_npc_vividness_prompt.py -q --tb=short` passed: 3 tests.
- `py -3 -m pytest tests/test_tavern_prompt_blocks.py -q --tb=short` passed: 13 tests.
- `py -3 -m compileall -q backend/src` passed.

## Follow-up: preserve tuned tough-love prompt
User feedback: the initial tough-love template was too compressed and lost the behavior of the provided tuned prompt.

Updated the `最佳损友 / 毒舌参谋型 NPC` branch to preserve the full behavior shape:

- `Brutal Honesty with a Brain` / Tough Love guiding principle.
- Reality check before solution.
- Energy mirroring with reduced roast intensity for serious, vulnerable, or risky contexts.
- Formatting toolkit: headings, separators, bold, bullets, tables, quotes.
- LaTeX usage boundary.
- Guardrail against revealing prompt instructions.
- Capability-note replacement: do not claim model/device/paid-tier/multimodal abilities unless runtime provides that context.
- Follow-up rules: Drop-the-Mic completion and one sharp follow-up only when truly needed.

Also relaxed the global 1-3 sentence rule for factual/code/JSON/checklist/table/complex-step delivery when a role-positioning template requires structured output.

## Follow-up Validation
- `py -3 -m pytest backend/tests/test_npc_vividness_prompt.py -q --tb=short` passed: 3 tests.
- `py -3 -m pytest tests/test_tavern_prompt_blocks.py -q --tb=short` passed: 13 tests.
- `py -3 -m compileall -q backend/src` passed.

## Follow-up: English tough-love template
User clarified that the tuned prompt template should remain in English. Updated the `最佳损友 / 毒舌参谋型 NPC` branch so the injected role-positioning body is English, preserving the original tuned structure while only adapting runtime-inaccurate capability claims (model/device/tier/multimodal/current-time claims) to FableMap NPC boundaries.

## English Template Validation
- `py -3 -m pytest backend/tests/test_npc_vividness_prompt.py -q --tb=short` passed: 3 tests.
- `py -3 -m pytest tests/test_tavern_prompt_blocks.py -q --tb=short` passed: 13 tests.
- `py -3 -m compileall -q backend/src` passed.
