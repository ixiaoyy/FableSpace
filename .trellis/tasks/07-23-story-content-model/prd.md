# 定义系统故事内容模型

## Goal

只建立 StoryWorld、Character、PlayerRole、章节选择和发布注册表合同。

## Requirements

- 只建立系统故事的只读领域模型和内容注册表。
- 定义 `StoryWorld`、`Character`、`PlayerRole`、章节、选择、结局、关系规则和 `draft / published / archived`。
- 校验引用、唯一 ID、固定 PlayerRole、内容版本和发布状态。
- 不实现数据库状态、聊天 API、前端或旧代码删除。

## Acceptance Criteria

- [ ] 两个最小样例可通过注册表校验。
- [ ] 错误角色引用、重复 ID、缺失 PlayerRole 和非法发布状态会被拒绝。
- [ ] 领域类型不包含坐标、owner、密码、SillyTavern 或 Space 字段。
- [ ] Python 语法检查和定向构造验证通过。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
