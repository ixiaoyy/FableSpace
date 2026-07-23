# 主线集成迁移与验收

## Goal

完成新主线集成、旧 Schema 清退、构建验证、端到端验收和权威文档一致性复核。

## Requirements

- 只负责已完成子任务的集成、显式迁移执行、跨层验证和终态一致性，不承接新的功能开发。
- 检查游客首次进入、同设备回访、登录绑定、角色切换、好感变化、关键选择、结局和重新开始。
- 验证安妮历史正史、不同 StoryWorld 数据隔离、私有状态权限和系统级 LLM 配置。
- 对旧路由、API、Schema、环境变量和产品术语做终态残留审计。
- 数据库清退只执行已审核迁移；执行前确认目标表和备份/回滚依据。

## Acceptance Criteria

- [ ] Python 语法检查通过。
- [ ] 前端 typecheck 与 build 通过。
- [ ] 桌面和 360px 移动端主链路验收通过。
- [ ] 两个 P0 故事的真实数据闭环通过。
- [ ] 旧产品入口与合同残留审计通过，或每个保留项有明确理由。
- [ ] 权威文档与代码终态一致。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
