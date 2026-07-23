# 重写 Schema 与 AI 协作约束

## Goal

只重写 WORLD_SCHEMA 与 AGENTS 的 StoryWorld 合同和开发约束。

## Requirements

- 只修改 `docs/WORLD_SCHEMA.md` 和根 `AGENTS.md`。
- Schema 使用 `StoryWorld`、`Character`、`PlayerRole`、`PlayerStoryState` 及运行时轮次/关系合同。
- 删除坐标、owner、密码、SillyTavern、Space 和旧 VisitorState 硬约束。
- AGENTS 同步新的权威读取顺序、禁止方向、代码命名和最小验证要求。
- 不修改产品宣传文档或业务代码。

## Acceptance Criteria

- [ ] Schema 与父任务最终领域合同一致。
- [ ] AGENTS 不再要求实现已删除的旧产品能力。
- [ ] 文件路径、验证命令和安全约束仍真实可执行。
- [ ] 未引入未经确认的新字段或产品概念。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
