# future: tavern web game library

## Goal

建设 FableMap 自有 Web 游戏库：游戏目录、启用/禁用、酒馆内展示与店主配置。

## Status

Backlog / future evolution task, created from .trellis/tasks/05-13-agent-tank-tavern/prd.md after user confirmed simple MVP first.

## Scope

未来任务；不进入当前 NPC Duel v0。

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
