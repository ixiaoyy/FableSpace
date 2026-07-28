# 重建 P0 两个系统故事

## Goal

按新合同交付安妮宽街与雪夜封宫两个系统故事及其固定 PlayerRole。

## Requirements

- 本任务是 P0 内容阶段协调父任务，不直接修改故事代码。
- 安妮宽街与雪夜封宫必须分别由独立子任务交付和验收。
- 两个故事共享领域合同，但各自维护 PlayerRole、角色关系、章节、选择、结局和回访摘要。
- 任一故事失败不得阻止另一个故事独立验证和回滚。

## Acceptance Criteria

- [ ] 安妮宽街子任务通过历史正史与内容验收。
- [ ] 雪夜封宫子任务通过角色、关系和分支验收。
- [ ] P0 内容注册表只发布两个故事、三个角色。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
