# 移除首页全局身份门槛

## Goal

让首次访问者不再先选择全局身份，而是直接进入角色发现首页；每个故事的固定 PlayerRole 仍由后续故事入场页展示。

## Requirements

- 只修改首页路由和首页角色发现组件的身份相关契约。
- 首页不得读取、写入或清除 `VisitorPlayIdentity`，也不得渲染 `VisitorPlayIdentityOnboarding`。
- 首页角色列表、加载 / 空 / 错误状态、头像与卡片同步以及现有角色链接保持不变。
- 不在首页新增乞丐、小太监或其他故事身份选择器。
- 不删除身份组件或浏览器存储工具；其全局清退留给独立任务。

## Acceptance Criteria

- [x] 无 `fablespace.visitor-play-identity.v1` 本地记录时，访问首页直接看到角色发现界面。
- [x] 首页不再显示全局身份选择、当前身份或重新选择身份入口。
- [x] 三张真实角色卡及加载、空、错误状态仍按原合同工作。
- [x] 本任务只产生首页身份门槛相关代码变化。
- [x] `npm --prefix .\apps\web run typecheck` 与 `npm --prefix .\apps\web run build` 通过。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
