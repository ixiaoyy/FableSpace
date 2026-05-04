# Safe NPC Character Card Template Guidelines

## Goal

把安全 NPC 角色卡模板规范落成文档/示例任务，保留风味、清理越权/PII/强制内容。

## Source Planning

* Parent task: `.trellis/tasks/04-29-npc-role-prompt-safety-brainstorm/`
* Source note: NPC role prompt safety Approach A
* Status: backlog task created to prevent this planning item from being lost; not yet implemented.

## Requirements

* 映射到现有 TavernCharacter 字段，不新增 schema。
* 给出 bad prompt → safe role card 的改写模式。
* 明确主人确认后才保存/发布。

## Acceptance Criteria

* [x] Relevant existing code/docs are inspected before implementation.
* [x] MVP scope is confirmed against `docs/WHAT_NOT_TO_BUILD.md` and owner-sovereignty rules.
* [x] Implementation, if any, uses existing schema/API where possible; any contract change updates tests and docs.
* [x] Verification commands are recorded in this PRD before moving to review/completed.

## Out of Scope

* No automatic platform publication of AI-generated tavern/NPC/story content.
* No platform token billing, recharge, settlement, or revenue-share system.
* No visitor-to-visitor social network, ranking, combat, levels, or equipment unless explicitly re-scoped by user and docs.

## Technical Notes

* Created during 2026-04-30 backlog hardening at user request: “把所有的规划全部拆成子任务，防止未来丢失”.
* This task is intentionally a planning/backlog placeholder until selected for implementation.

## Completion Outcome (2026-05-04)

Completed through Trellis as a docs/research/design task. See `safe-character-card-template-guidelines.md`.

### Done

* Mapped safe role-card guidance to existing TavernCharacter fields only.
* Documented risky prompt rewrite pattern and owner confirmation boundary.
* Added an example safe role card that avoids PII, jailbreak, secret extraction, and unsafe control.

### Deferred / Not Done

* No new schema fields, no backend persistence change, and no new automatic draft publication behavior.

## Verification (2026-05-04)

* Task metadata was updated and parsed locally after edits.
* `git diff --check` is the whitespace/path sanity check for this docs-only batch.
* No runtime build/test is required for this specific completion batch because no backend/frontend/source/schema files were changed by these eight task completions. Future implementation tasks must run the focused commands listed in the referenced specs.

### Verification Commands Run (2026-05-04)

* Custom `task.json` parse — passed (`non_completed_count=0`).
* `& 'C:\Users\phpxi\miniconda3\python.exe' .\.trellis\scripts\task.py list --status in_progress` — passed (`Total: 0 task(s)`).
* `git -c safe.directory=D:/work/ai- diff --check` — passed; output only included CRLF conversion warnings from the existing working tree.
* `node .\frontend\scripts\character-prompt-risk-linter-test.mjs` — passed (`character-prompt-risk-linter-test: ok`).
