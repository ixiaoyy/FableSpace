# future: agent strategy arena

## Goal

让 Agent 通过受控策略 JSON/DSL 参与游戏，而不是上传/执行任意 JS。

## Status

Backlog / future evolution task, created from .trellis/tasks/05-13-agent-tank-tavern/prd.md after user confirmed simple MVP first.

## Scope

未来任务；涉及协议/API/安全评审。

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
