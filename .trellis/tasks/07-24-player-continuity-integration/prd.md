# 接入跨设备恢复与会话失效

## Goal

在界面完成后接入跨设备恢复、登录回跳和会话失效的完整数据语义。

## Requirements

- 以前一子任务的界面状态为唯一前台消费面，补齐跨设备恢复、登录回跳和会话失效的数据语义。
- 开始前重新核对 StoryWorld 运行时 API 与服务端会话合同；本任务不得依赖旧 Space 或客户端 `player_id`。
- 恢复、选择、消息与重新开始必须保持账号范围隔离、幂等边界和不自动重放写操作。
- 本任务不重新设计页面视觉，不引入独立回忆产品面。

## Acceptance Criteria

- [ ] 登录后刷新、再次进入和跨设备访问恢复同一账号的真实活动轮次或结局摘要。
- [ ] 登录回跳保持原 Character 深链。
- [ ] 会话失效后的写操作不显示成功，重新登录后不重复提交。
- [ ] 不泄露其他玩家关系、消息、记忆或结局。
- [ ] API/Schema 文档与相关最小真实验证同步完成。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
