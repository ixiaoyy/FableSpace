# future: replay npc review

## Goal

对局回放与 NPC 复盘：从游戏事件生成摘要、策略建议和可确认状态卡。

## Status

Backlog / future evolution task, created from .trellis/tasks/05-13-agent-tank-tavern/prd.md after user confirmed simple MVP first.

## Scope

未来任务；当前 MVP 只保留简单结算文案。

## Requirements (draft)

* Preserve FableMap tavern mainline: real-coordinate tavern, owner-authored content, NPC interaction, memory/revisit.
* Do not introduce platform-level ranking, matchmaking, level/equipment, wagering, or visitor social graph.
* Do not execute untrusted user-submitted code in FableMap backend.
* Keep outputs tavern-local and visitor-session scoped unless a later protocol explicitly expands them.

## Acceptance Criteria (draft)

* [ ] Has a dedicated PRD before implementation.
* [ ] Lists allowed files, forbidden scope, and validation commands.
* [ ] Updates docs/specs if API/Schema contracts change.

## Out of Scope

* Current MVP NPC Duel v0: 猜拳心理战.
