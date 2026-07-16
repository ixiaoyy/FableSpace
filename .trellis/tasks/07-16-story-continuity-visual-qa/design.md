# QA Design

## Conversation Matrix

For each Space:

- male ancient beggar -> character A and B with the same opening;
- female ancient beggar -> character A and B with the same opening;
- one three-turn continuation;
- one refusal;
- one truthful clue and one lie;
- one unsupported cross-world weapon/power claim;
- one revisit after a confirmed fact.

Tag each response with one or more outcomes: goal progress, information reveal, obstacle, relationship test, next action, or memory change.

## Visual Matrix

| Surface | Desktop | Narrow/mobile |
|---|---:|---:|
| Identity onboarding | required | required |
| Character-first homepage | required | required |
| Character detail | required | required |
| Owning Space with target selected | required | required |
| Chat workbench | required | required |

Screenshots belong under a task-specific `artifacts/audits/` directory, not in temporary image-generation storage.

## Verdict Rules

- **PASS**: required evidence exists and no blocking consistency/access/visual defect remains.
- **FAIL**: reproducible defect exists; route it to the owning child and repeat only the affected checks after a fix.
- **BLOCKED**: external LLM/runtime/browser infrastructure prevents real evidence. Do not substitute offline rules for an LLM pass.
