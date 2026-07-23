# 删除创作者与 SillyTavern

## Goal

只删除创建、店主、owner、角色卡导入导出、包和私有配置能力。

## Requirements

- 只删除用户创作、店主/owner、SillyTavern 和故事包能力。
- 覆盖创建向导、管理页、owner API、角色卡导入导出、解析器、package、私有 LLM 配置和 Token 统计。
- 系统故事内容注册表与系统级 LLM 配置必须保持可用。
- 不删除地图、Home/社交或旧 Space 基础合同。

## Acceptance Criteria

- [ ] 无创建、店主、管理、导入、导出或故事包入口。
- [ ] API 路由不再注册对应写入能力。
- [ ] 文档和前端不再宣传 SillyTavern 或创作者生态。
- [ ] 系统故事运行和系统 LLM 不受影响。
- [ ] Python、前端构建和残留引用审计通过。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
