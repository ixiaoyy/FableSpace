# Persistent Preset Library Import Model Design

## Goal

在 preview converter 之后，设计是否需要持久化 preset library/import model。

## Source Planning

* Parent task: `.trellis/tasks/04-29-npc-role-prompt-safety-brainstorm/`
* Source note: Preset Import future persistent model
* Status: backlog task created to prevent this planning item from being lost; not yet implemented.

## Requirements

* 先评估 preview 是否有用，再决定新增模型。
* 不静默应用 jailbreak/NSFW/CoT forcing 模块。
* 若新增 schema，必须同步 WORLD_SCHEMA/tests/docs。

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

Completed through Trellis as a docs/research/design task. See `persistent-preset-library-model-design.md`.

### Done

* Inspected preview-only preset contracts and existing Tavern runtime preset fields.
* Sketched a future owner-scoped PresetLibraryEntry without implementing it.
* Recorded required schema/docs/tests gates for any future persistence task.

### Deferred / Not Done

* No new schema, persistence, endpoints, UI, or automatic apply behavior.

## Verification (2026-05-04)

* Task metadata was updated and parsed locally after edits.
* `git diff --check` is the whitespace/path sanity check for this docs-only batch.
* No runtime build/test is required for this specific completion batch because no backend/frontend/source/schema files were changed by these eight task completions. Future implementation tasks must run the focused commands listed in the referenced specs.

### Verification Commands Run (2026-05-04)

* Custom `task.json` parse — passed (`non_completed_count=0`).
* `& 'C:\Users\phpxi\miniconda3\python.exe' .\.trellis\scripts\task.py list --status in_progress` — passed (`Total: 0 task(s)`).
* `git -c safe.directory=D:/work/ai- diff --check` — passed; output only included CRLF conversion warnings from the existing working tree.
* `node .\frontend\scripts\preset-import-preview-test.mjs` — passed (`preset-import-preview-test: ok`).
