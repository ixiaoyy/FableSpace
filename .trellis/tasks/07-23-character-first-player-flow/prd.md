# 实现角色优先玩家前台

## Goal

实现角色发现、固定身份入场、对话选择、关系反馈和回访续写的前台唯一链路。

## Requirements

- 本任务是前端阶段协调父任务，不直接修改前端代码。
- 角色发现与路由、故事交互、回访连续性由三个独立子任务实施。
- 每个子任务都必须保持移动端可用，并运行自己的 typecheck / build 或被最终集成验证覆盖。
- 前端只能消费新 StoryWorld API，不得新增旧 Space 适配器。

## Acceptance Criteria

- [ ] 三个前端子任务均通过定向验收。
- [ ] 玩家可从首页进入角色、推进故事并回访。
- [ ] 不存在全局身份选择页或独立故事世界目录。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
