# 实现故事运行时 API

## Goal

只实现角色发现、故事入场、消息、选择、状态和重新开始 API。

## Requirements

- 只实现新 StoryWorld 运行时应用服务与 HTTP API。
- 覆盖角色发现、入场/恢复、状态读取、消息、选择、关系反馈、结局和重新开始。
- 公开接口只返回 `published` 内容；私有接口从服务端玩家上下文读取身份。
- 自由输入只能触发允许的故事动作或普通对话；关键状态由确定性规则写入。
- 不实现前端或旧 API 删除。

## Acceptance Criteria

- [ ] 三个 P0 角色可发现并携带 StoryWorld 摘要。
- [ ] 玩家可开始、恢复、推进、完成和重新开始。
- [ ] 非法选择、错误角色/世界组合和跨玩家读取被拒绝。
- [ ] 响应不泄露隐藏 Prompt、内部好感数值或私有记忆。
- [ ] Python 语法检查和定向真实 API 验证通过。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
