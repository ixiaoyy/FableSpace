# 清退旧 Schema 配置与部署引用

## Goal

只清退旧数据库表、环境变量、部署配置和残留迁移入口。

## Requirements

- 只清退已无运行引用的旧数据库表、迁移、环境变量和部署配置。
- 执行前列出精确表、列、配置键、部署引用和备份/回滚依据。
- 禁止在应用启动时静默删除数据。
- 保留认证、系统级 LLM、PlayerStoryState 和新 StoryWorld 运行所需配置。

## Acceptance Criteria

- [ ] 清退清单经过引用审计且目标明确。
- [ ] 迁移可显式执行并在失败时停止。
- [ ] 新 Schema 可从空库初始化。
- [ ] README、环境示例、Compose 和部署文档不引用已删配置。
- [ ] Python 语法检查、前端构建和部署配置检查通过。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
