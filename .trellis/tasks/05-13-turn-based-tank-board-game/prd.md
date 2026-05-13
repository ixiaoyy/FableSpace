# future: turn-based tank board game

## Goal

在 FableMap 游戏库中设计回合制坦克棋，保留 AgentTank 味道但避免实时动作和任意代码执行。

## Status

Backlog / future evolution task, created from .trellis/tasks/05-13-agent-tank-tavern/prd.md after user confirmed simple MVP first.

## Scope

未来任务；需要单独规则、UI、测试和安全边界。

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
