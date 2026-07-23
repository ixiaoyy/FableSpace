# 删除旧 Space 与供给侧能力

## Goal

在新主链路可运行后删除地图、Space、UGC、店主、SillyTavern 和旧兼容路由及代码。

## Requirements

- 本任务是旧能力清退协调父任务，不直接批量删除代码。
- 地图、创作者/SillyTavern、Home/社交、Space 合同、Schema/配置分别由独立子任务清退。
- 每个删除子任务开始前必须列出精确入口、引用和保留项。
- 删除顺序必须等待对应新主链路已通过验证；禁止使用整文件还原或破坏性 Git 操作。

## Acceptance Criteria

- [ ] 五个清退子任务分别完成引用审计、删除和最小真实验证。
- [ ] 保留的旧术语命中都有当前主线用途说明。
- [ ] 新主链路不依赖被删除模块。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
