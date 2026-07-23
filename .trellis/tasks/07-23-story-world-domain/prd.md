# 建立 StoryWorld 领域与持久化

## Goal

建立 StoryWorld、Character、PlayerRole、PlayerStoryState、故事轮次和关系状态的新后端合同。

## Requirements

- 本任务是后端阶段协调父任务，不直接修改业务代码。
- 子任务按内容模型、状态持久化、玩家标识、系统 LLM、运行时 API 分开实施。
- 每个子任务必须拥有独立验收和回滚点；不得把未完成工作回收到本父任务直接实现。
- 运行时 API 子任务依赖前四个基础子任务的稳定合同。

## Acceptance Criteria

- [ ] 五个子任务均完成各自质量检查。
- [ ] 新后端不依赖 Space、owner、坐标或 SillyTavern 合同。
- [ ] 父任务只记录集成结果，不包含额外未验收代码改动。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
