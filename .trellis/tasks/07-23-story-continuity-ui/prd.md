# 实现登录后回访与关系状态

## Goal

只实现登录后回访恢复、关系状态和会话失效处理。

## Requirements

- 本任务是回访连续性阶段协调父任务，不直接修改前端代码。
- 完整界面与跨设备/会话数据接入由两个独立子任务依次实施。
- 未登录玩家可以浏览公开角色信息，但点击进入故事时必须先完成登录。
- 登录成功后安全返回原角色入口，并恢复该账号已有活动轮次或明确开始新轮次。
- 会话失效时不得假装保存成功，也不得自动重放消息、选择或重新开始请求。
- 展示关系阶段、最近变化原因和已有结局摘要，不显示内部好感数值。
- 不实现故事对话主体或认证后端。

## Acceptance Criteria

- [ ] 未登录浏览角色公开信息不被整站门禁阻断，点击进入故事时显示明确登录动作。
- [ ] 登录后刷新、再次进入或跨设备访问可恢复该账号的活动轮次。
- [ ] 登录回跳保持原角色深链；失败或会话过期状态真实可见。
- [ ] 会话失效后的写操作不显示为已保存，重新登录后不重复提交。
- [ ] 不泄露其他玩家关系、记忆或结局。
- [ ] typecheck、build 和移动端验收通过。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
