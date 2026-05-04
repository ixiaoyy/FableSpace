# Confirmed Short-video Asset Pipeline Research

## Goal

如果短剧模板验证有效，再研究店主确认的封面图/短视频素材与玩法节点结合。

## Source Planning

* Parent task: `.trellis/tasks/04-30-ai-video-story-mini-game-brainstorm/`
* Source note: AI video story mini-game future evolution
* Status: backlog task created to prevent this planning item from being lost; not yet implemented.

## Requirements

* 不做平台自动生成公开视频。
* 外部影视/名人/版权素材高风险，默认不鼓励上传。
* 先研究资产权利、保存、删除和引用路径。

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

## 2026-05-04 Research Notes

This task was completed as **research-only**. It intentionally did not implement a short-video pipeline because current project constraints require owner-confirmed content, explicit media provenance, deletion support, and no platform auto-generated publication.

Files/docs inspected:

* `docs/WHAT_NOT_TO_BUILD.md`
* `docs/WORLD_SCHEMA.md`
* `docs/IMAGE_ASSETS_SPEC.md`
* `.trellis/spec/frontend/image-asset-guidelines.md`
* `.trellis/spec/frontend/visual-souvenir-preview-boundary.md`
* `.trellis/spec/guides/cross-layer-thinking-guide.md`
* Existing frontend gameplay/media references under `frontend/app/product/` and `frontend/app/lib/`

Research output:

* See `.trellis/tasks/04-30-confirmed-short-video-asset-pipeline-research/research.md`.
* Decision: do **not** build automatic short-video generation now.
* Safe next product step, if needed later: owner-confirmed cover/teaser asset attachment for already-published short-drama gameplay.
* Short video remains blocked until a future backend/media design supports rights attestation, asset records, deletion/purge, provenance, and AI/synthetic labeling.

No code, schema, API, or storage contract changed.

## Verification

* `& 'C:\Users\phpxi\miniconda3\python.exe' ./.trellis/scripts/task.py validate .trellis/tasks/04-30-confirmed-short-video-asset-pipeline-research` — passed.
* No frontend/backend tests required for this task because it is docs/research only and changed no executable behavior.
