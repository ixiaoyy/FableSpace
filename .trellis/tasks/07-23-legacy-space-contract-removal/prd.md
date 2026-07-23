# 删除旧 Space 合同与路由

## Goal

只在新链路可用后删除 Space 类型、API、前端路由和兼容别名。

## Requirements

- 只在新 StoryWorld 链路通过后删除旧 Space 核心合同。
- 覆盖 `Space`、`SpaceCharacter`、`VisitorState`、`space_id`、`/spaces`、中文 Space 路由和 legacy alias。
- 逐项迁移仍被新链路引用的通用代码，不保留兼容包装器。
- 不负责旧数据库表物理删除或环境配置清退。

## Acceptance Criteria

- [ ] 新代码只使用 `StoryWorld`、`Character`、`PlayerRole`、`PlayerStoryState`。
- [ ] 前后端无可达 `/spaces` 或中文 Space 路由。
- [ ] 旧类型和服务不再被运行入口导入。
- [ ] 保留的 `space` 文本命中仅为历史记录或明确非领域含义。
- [ ] Python、typecheck、build 和残留审计通过。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
