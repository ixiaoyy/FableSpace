# 持久化玩家故事状态

## Goal

只建立 PlayerStoryState、StoryRun、关系、记忆和事件的数据库持久化。

## Requirements

- 只实现 `PlayerStoryState`、`StoryRun`、角色关系、消息、记忆和事件日志的持久化。
- `PlayerStoryState` 按玩家与 StoryWorld 唯一定位；关系与分支状态按 StoryRun 隔离。
- 保存内容版本、活动轮次、已完成结局摘要和可回放事件。
- 不实现 HTTP API、LLM、前端或旧表删除。

## Acceptance Criteria

- [ ] 可创建、恢复和完成一个 StoryRun。
- [ ] 新轮次不继承旧轮次好感与分支标记。
- [ ] 两个玩家和两个 StoryWorld 的数据严格隔离。
- [ ] 事件、关系变化和记忆来源可追踪。
- [ ] Python 语法检查和定向数据库验证通过。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
