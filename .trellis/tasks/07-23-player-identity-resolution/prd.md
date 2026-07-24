# 接入强制登录玩家身份

## Goal

只实现可信登录会话解析、私有故事 API 门禁与安全回跳边界。

## Requirements

- 首页、角色发现、角色公开处境和固定 PlayerRole 入场信息允许未登录读取。
- 开始、恢复、推进和重新开始故事必须具有有效登录会话。
- `player_id` 只由服务端从已验证账号身份解析；无有效会话时返回 `401` 且不得创建或修改任何玩家状态。
- 客户端不得提交任意 `player_id` 读取他人状态。
- 未登录点击进入故事时转到现有登录入口；登录成功后只允许安全返回本站原角色路径。
- 平台不创建匿名玩家标识，不实现匿名进度绑定、迁移、合并或冲突处理。
- 会话在互动中失效时拒绝当前私有请求，不自动重放写请求；重新登录后从服务端已提交状态恢复。
- 不实现 StoryWorld 状态模型、故事交互主体或新的账号系统；只改认证边界和必要登录门禁表面。

## Acceptance Criteria

- [ ] 未登录可读取公开角色信息，但所有私有故事请求返回 `401` 且数据库无新增或修改。
- [ ] 已登录账号得到稳定的服务端 `player_id`，同一账号可跨设备恢复自己的状态。
- [ ] 两个登录账号的 PlayerStoryState、StoryRun、关系、选择和记忆严格隔离。
- [ ] 伪造玩家 ID 无法读取或写入他人数据。
- [ ] 登录回跳拒绝外部、协议相对和非允许路径，不形成开放重定向。
- [ ] 会话过期后的写请求不落库，重新登录后不重复提交该动作。
- [ ] Python 语法检查和定向认证验证通过。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
