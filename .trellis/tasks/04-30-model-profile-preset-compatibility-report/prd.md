# Model Profile and Preset Compatibility Report

## Goal

为不同模型/预设兼容性报告保留任务入口，帮助店主理解 preset 风险与能力边界。

## Source Planning

* Parent task: `.trellis/tasks/04-29-npc-role-prompt-safety-brainstorm/`
* Source note: Player experience analysis / Model Profile & Preset Compatibility Report
* Status: backlog task created to prevent this planning item from being lost; not yet implemented.

## Requirements

* 只做报告/建议，不自动套用高风险 preset。
* 不暴露 hidden prompt 或 provider secrets。
* 可与 preset import preview 联动。

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

Completed through Trellis as a docs/research/design task. See `model-profile-compatibility-report.md`.

### Done

* Mapped report dimensions: context budget, instruction hierarchy, structured output, runtime variance, privacy/secrets, and owner confirmation.
* Confirmed no hard-coded current model limits or provider-specific claims are added.
* Confirmed existing PresetImportPreviewResponse is sufficient for MVP interpretation.

### Deferred / Not Done

* No automatic preset application, persistent report store, or provider-specific model registry.

## Verification (2026-05-04)

* Task metadata was updated and parsed locally after edits.
* `git diff --check` is the whitespace/path sanity check for this docs-only batch.
* No runtime build/test is required for this specific completion batch because no backend/frontend/source/schema files were changed by these eight task completions. Future implementation tasks must run the focused commands listed in the referenced specs.

### Verification Commands Run (2026-05-04)

* Custom `task.json` parse — passed (`non_completed_count=0`).
* `& 'C:\Users\phpxi\miniconda3\python.exe' .\.trellis\scripts\task.py list --status in_progress` — passed (`Total: 0 task(s)`).
* `git -c safe.directory=D:/work/ai- diff --check` — passed; output only included CRLF conversion warnings from the existing working tree.
* `node .\frontend\scripts\preset-import-preview-test.mjs` — passed (`preset-import-preview-test: ok`).
