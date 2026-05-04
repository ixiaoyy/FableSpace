# Voice Greeting TTS Synthesis and Playback

## Goal

在 no-audio preview 之后，设计可控 TTS 合成、音频存储和播放边界。

## Source Planning

* Parent task: `.trellis/tasks/04-29-npc-role-prompt-safety-brainstorm/`
* Source note: voice-greeting deferred not done
* Status: backlog task created to prevent this planning item from being lost; not yet implemented.

## Requirements

* 不做 voice cloning/upload，除非另有安全设计。
* 不自动播放扰民；需要用户手势/设置。
* provider 成本和配置归店主控制，不暴露 secrets。

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

Completed through Trellis as a docs/research/design task. See `voice-greeting-tts-playback-design.md`.

### Done

* Inspected backend/frontend voice preview and TTS service boundaries.
* Recorded explicit-click playback, no auto-play, no persistent audio, no voice cloning/upload boundary.
* Defined future persistent-audio gates if storage is later requested.

### Deferred / Not Done

* No persistent audio cache, voice cloning/upload, auto-play behavior, or provider-specific new integration.

## Verification (2026-05-04)

* Task metadata was updated and parsed locally after edits.
* `git diff --check` is the whitespace/path sanity check for this docs-only batch.
* No runtime build/test is required for this specific completion batch because no backend/frontend/source/schema files were changed by these eight task completions. Future implementation tasks must run the focused commands listed in the referenced specs.

### Verification Commands Run (2026-05-04)

* Custom `task.json` parse — passed (`non_completed_count=0`).
* `& 'C:\Users\phpxi\miniconda3\python.exe' .\.trellis\scripts\task.py list --status in_progress` — passed (`Total: 0 task(s)`).
* `git -c safe.directory=D:/work/ai- diff --check` — passed; output only included CRLF conversion warnings from the existing working tree.
* `node .\frontend\scripts\voice-greeting-test.mjs` — passed (`voice-greeting-test: ok`).
