# 接入匿名与账号玩家标识

## Goal

只实现游客设备标识、登录账号映射和跨设备绑定边界。

## Requirements

- 只实现服务端玩家标识解析与账号绑定边界。
- 未登录请求使用受控匿名访客标识；登录请求使用账号身份。
- 客户端不得提交任意 `player_id` 读取他人状态。
- 明确同设备回访、账号绑定和跨设备恢复的行为。
- 不实现 StoryWorld 状态模型、故事 API 或前端。

## Acceptance Criteria

- [ ] 匿名玩家在同一设备得到稳定标识。
- [ ] 不同设备/匿名会话默认隔离。
- [ ] 登录后可按确认规则绑定或迁移当前匿名进度。
- [ ] 伪造玩家 ID 无法读取或写入他人数据。
- [ ] Python 语法检查和定向认证验证通过。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
