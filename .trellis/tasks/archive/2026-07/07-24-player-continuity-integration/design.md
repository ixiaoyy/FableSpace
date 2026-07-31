# 跨设备恢复与会话失效设计

## 边界

本任务复用已存在的数据流，不增加后端协议：

```text
Character 故事深链
  -> GET /api/v1/auth/status
  -> GET /api/v1/story-worlds/{story_world_id}/runs/current
  -> 服务端会话身份
  -> PlayerStoryState(player_id, story_world_id)
  -> 活动 StoryRun / 最近完成 StoryRun
```

公开 Character 详情仍可匿名读取；所有运行时读写仍由后端从可信会话解析账号。

## 前端状态合同

- `anonymous`：没有可用会话，只显示登录动作。
- `authenticated`：已确认身份，可加载或操作服务器轮次。
- `expired`：受保护请求返回 `401`；清空缓存、私有轮次、输入和 pending。
- `error`：身份或只读恢复失败；只提供重新读取。
- `failedAction != null`：写入结果未确认；保留最后一次已确认的轮次，但冻结新的写操作。

`run-loaded` 是解除写入冻结的唯一动作。它只由 `GET runs/current` 成功结果触发，并清除失败状态、pending exchange 与未确认草稿。

## 失败恢复

```text
写请求失败
  -> 不修改已确认 run
  -> failedAction
  -> 禁用消息、选择和入口写操作
  -> 玩家点击“重新载入”
  -> GET auth/status + GET runs/current
  -> 成功：采用服务器 run，解除冻结
  -> 失败：保持不可写，显示读取失败
```

不会自动重发导致失败的 POST。选择已有服务端 source 去重；开始已有活动轮次复用语义；自由消息和重新开始通过“失败后必须先读”避免在响应不确定时盲目重复。

## 缓存与竞态

- `session.ts` 提供单一访问状态缓存失效函数，强制刷新、登出和 `401` 共用。
- `SESSION_EXPIRED_EVENT` 先清缓存，再切换页面状态。
- reducer 在 `expired` 状态忽略迟到的 action success/failure，避免过期会话的响应重新展示为成功。
- 不增加轮询；页面加载、显式重载和重新进入负责获取跨设备服务器真相。

## 兼容与回滚

- 不修改 API 响应、数据库、StoryWorld 内容或路由。
- 回滚只涉及前端缓存失效和写失败冻结；服务端状态不需迁移。
- 旧 Space 能力不作为本任务兼容目标。
