# 实现角色发现与新路由

## Goal

只实现首页角色卡、StoryWorld 深链和旧入口切换。

## Requirements

- 本任务是角色发现阶段协调父任务，首页卡片、身份门禁清理与长明宫详情深链由独立子任务实施。
- 首页展示安妮、魏观海、萧明珠三张真实 API 角色卡。
- 路由使用 `/story-worlds/:storyWorldRef/characters/:characterRef`。
- 故事世界作为角色背景展示，不建立世界目录或身份选择页。
- 不实现完整聊天、关系回访或旧路由批量删除。

## Acceptance Criteria

- [ ] 首页成功、加载、空和错误状态只使用真实数据。
- [ ] 三个角色链接进入正确 StoryWorld 与 Character。
- [ ] 不存在占位角色、虚构统计或全局身份选择入口。
- [ ] 360px 无横向溢出，关键点击目标可用。
- [ ] typecheck 和 build 通过。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
