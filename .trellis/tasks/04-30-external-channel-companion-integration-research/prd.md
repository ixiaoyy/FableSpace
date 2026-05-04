# External Channel Companion Integration Research

## Goal

保留外部频道/伴侣模式集成研究，但不把它作为 FableMap MVP 中心。

## Source Planning

* Parent task: `.trellis/tasks/04-29-npc-role-prompt-safety-brainstorm/`
* Source note: NanoMate external channels future distribution
* Status: backlog task created to prevent this planning item from being lost; not yet implemented.

## Requirements

* 仅研究/设计，不接入私域平台或跨站社交图谱。
* 不绕过店主主权和平台边界。
* 需要在 State Cards/GM/Skill Packs 稳定后再评估。

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

Completed through Trellis as a docs/research/design task. See `external-channel-research.md`.

### Done

* Defined allowed future shapes as deep links, owner-configured previews, or read-only owner-approved exports.
* Blocked off-platform chat mirrors, cross-tavern social graphs, and external auto-publication.
* Recorded future provider-specific research gates before implementation.

### Deferred / Not Done

* No external channel connector, webhook, bot, social graph, or private prompt export.

## Verification (2026-05-04)

* Task metadata was updated and parsed locally after edits.
* `git diff --check` is the whitespace/path sanity check for this docs-only batch.
* No runtime build/test is required for this specific completion batch because no backend/frontend/source/schema files were changed by these eight task completions. Future implementation tasks must run the focused commands listed in the referenced specs.

### Verification Commands Run (2026-05-04)

* Custom `task.json` parse — passed (`non_completed_count=0`).
* `& 'C:\Users\phpxi\miniconda3\python.exe' .\.trellis\scripts\task.py list --status in_progress` — passed (`Total: 0 task(s)`).
* `git -c safe.directory=D:/work/ai- diff --check` — passed; output only included CRLF conversion warnings from the existing working tree.
