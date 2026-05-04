# Adult Content Governance Design

## Goal

仅作为治理/边界设计任务保留：如未来支持成人空间，必须先设计年龄声明、合意、访问控制、分级、退出机制。

## Source Planning

* Parent task: `.trellis/tasks/04-29-npc-role-prompt-safety-brainstorm/`
* Source note: NPC role prompt safety adult/consent caveat
* Status: backlog task created to prevent this planning item from being lost; not yet implemented.

## Requirements

* 当前默认模板不包含成人/强制内容。
* 不实现成人内容系统；先做安全/合规设计。
* 必须可退出、可治理、店主审核明确。

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

Completed through Trellis as a docs/research/design task. See `governance-design.md`.

### Done

* Inspected product/architecture/schema/not-to-build docs and current prompt-risk linter boundary.
* Recorded future gates for age/consent/access/exit/moderation/retention design.
* Deferred any adult-content runtime or schema implementation until a separate approved compliance task.

### Deferred / Not Done

* No adult content system, labels, discovery surface, schema fields, routes, or default templates.
* No legal/compliance claim beyond requiring future specialist review.

## Verification (2026-05-04)

* Task metadata was updated and parsed locally after edits.
* `git diff --check` is the whitespace/path sanity check for this docs-only batch.
* No runtime build/test is required for this specific completion batch because no backend/frontend/source/schema files were changed by these eight task completions. Future implementation tasks must run the focused commands listed in the referenced specs.

### Verification Commands Run (2026-05-04)

* Custom `task.json` parse — passed (`non_completed_count=0`).
* `& 'C:\Users\phpxi\miniconda3\python.exe' .\.trellis\scripts\task.py list --status in_progress` — passed (`Total: 0 task(s)`).
* `git -c safe.directory=D:/work/ai- diff --check` — passed; output only included CRLF conversion warnings from the existing working tree.
