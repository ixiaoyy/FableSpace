# Backend Quality Guidelines

Concise backend quality rules.

## Required patterns

- Read only the docs/specs relevant to the change; do not bulk-load historical task files.
- Keep route/service/store boundaries clear.
- Normalize external/user input before persistence or prompt construction.
- Keep behavior testable with focused unit/API tests.
- Preserve owner-authored content, real-coordinate anchoring, and SillyTavern compatibility.
- Treat owner API keys, LLM config, private memories, and visitor-private data as sensitive.

## Forbidden patterns

- Adding platform-generated space/NPC/story content that bypasses owner confirmation.
- Adding platform billing/recharge/settlement/token monetization.
- Adding combat/level/equipment/ranking/social-network systems.
- Logging secrets or returning private state in public/visitor payloads.
- Broad refactors or dependency upgrades while fixing a narrow bug.
- Adding broad brittle assertions for small UI/text/layout changes.

## Verification selection

Run the smallest real validation:

```powershell
# Python import/syntax
py -3 -m compileall -q backend/src

# Focused backend tests
py -3 -m pytest backend/tests/<file>.py -q --tb=short

# Legacy/core tests when touched
py -3 -m pytest tests/<file>.py -q --tb=short
```

Use full backend pytest only for broad API/schema changes.

## Review checklist

- Does the change keep public/owner/visitor boundaries clear?
- Is API shape stable and documented if changed?
- Are missing legacy fields/default rows handled?
- Are secrets redacted and not logged?
- Is validation proportional to the change?
- Did we avoid unrelated cleanup/refactor?

## Context policy

Historical scenario matrices were removed from this general guide. Keep future lessons short; if a feature needs a detailed contract, create/update a focused spec rather than appending a long scenario block here.
