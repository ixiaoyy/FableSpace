# 实现故事对话选择界面

## Goal

只实现角色对话、人工选择、状态反馈和结局交互表面。

## Requirements

- 只实现单个角色的故事互动表面。
- 展示一句故事处境和固定 PlayerRole 后进入开场。
- 支持自由输入、人工选择、章节状态、角色态度变化、结局和重新开始。
- 不显示内部好感数值，不允许回退关键选择。
- 不实现首页、账号绑定或旧界面删除。

## Acceptance Criteria

- [ ] 安妮、魏观海、萧明珠均可进入并对话。
- [ ] 选择提交与自由输入有明确加载、成功和错误状态。
- [ ] 关系变化以语气、关系阶段和原因呈现。
- [ ] 结局前无回退；结局后可重新开始。
- [ ] 移动端输入区和选择控件可用，typecheck 与 build 通过。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
