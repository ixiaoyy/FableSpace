# 完成长明宫双角色故事交互界面

## Goal

在长明宫系统故事可用后，为魏观海、萧明珠补齐对话、选择、关系反馈与结局界面。

## Requirements

- 在长明宫 StoryWorld 内容和运行时合同可用后，复用通用 StoryWorld Character 表面支持魏观海、萧明珠。
- 两个角色共享同一 StoryRun 中央事件，但对白、关系、选择反馈和可见秘密必须来自各自真实角色投影。
- 支持活动轮次恢复、人工选择、自由回应、关系阶段、最近变化原因、结局和重新开始。
- 不显示 affinity，不允许关键选择回退，不用安妮文本或旧 Space 聊天作为兜底。
- 功能未接通时显示真实不可用/失败状态，不制造可提交的假交互。
- 移动端输入、选择、关系与结局界面保持完整。

## Acceptance Criteria

- [ ] 魏观海、萧明珠均可从各自 Character 深链进入同一长明宫故事。
- [ ] 两个角色的开场、选择反馈和关系表达可明确区分。
- [ ] 写操作有明确加载、失败和会话失效状态，不乐观伪造成功。
- [ ] 结局前不可回退关键选择，结局后可重新开始。
- [ ] 不依赖旧 Space 合同，typecheck、build 与移动端视觉验收通过。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
