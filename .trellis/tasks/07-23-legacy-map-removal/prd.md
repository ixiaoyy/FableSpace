# 删除地图与坐标能力

## Goal

只删除地图、坐标、附近发现、AMap 配置和对应引用。

## Requirements

- 只删除地图、坐标和附近发现能力。
- 审计并移除 `lat` / `lon`、AMap 环境变量、地图适配器、附近/城市入口和坐标创建步骤。
- 历史故事地点改由内容事实与来源表达，不进入通用 StoryWorld 坐标 Schema。
- 不删除 owner、SillyTavern、Home 或旧 Space 核心合同。

## Acceptance Criteria

- [ ] 公共前后端不再要求或返回通用坐标。
- [ ] 地图入口、适配器和 AMap 配置无可达引用。
- [ ] 历史故事仍能表达真实地点与来源。
- [ ] Python 语法检查、前端 typecheck/build 和残留审计通过。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
