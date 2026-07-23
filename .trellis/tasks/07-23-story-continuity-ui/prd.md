# 实现回访关系与登录提示

## Goal

只实现回访恢复、关系状态、匿名保存边界和账号绑定提示。

## Requirements

- 只实现回访、关系摘要、匿名保存边界和账号绑定提示。
- 游客可直接继续同设备进度，不在首次见角色前要求登录。
- 登录后显示跨设备保存结果；失败不得假装已绑定。
- 展示关系阶段、最近变化原因和已有结局摘要，不显示内部好感数值。
- 不实现故事对话主体或认证后端。

## Acceptance Criteria

- [ ] 游客刷新或再次进入可恢复活动轮次。
- [ ] 未登录状态清楚表达仅限当前设备，但不打断首轮互动。
- [ ] 登录绑定成功、失败和冲突状态真实可见。
- [ ] 不泄露其他玩家关系、记忆或结局。
- [ ] typecheck、build 和移动端验收通过。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
