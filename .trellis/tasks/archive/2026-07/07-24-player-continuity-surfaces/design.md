# 回访与关系界面设计

## 1. 边界

本任务只重组 `story-world-character` 前台。公开详情继续由现有 Character 详情响应驱动，私有区域只消费现有 `StoryRun`；不增加接口、字段、前端假数据或旧 Space 兼容。

## 2. 页面状态

```text
公开 Character 详情
  -> checking
  -> anonymous: 首次登录
  -> expired: 写操作期间会话失效
  -> authenticated + loading
  -> authenticated + no run
  -> authenticated + active run
  -> authenticated + completed run
  -> access/read error
```

`SESSION_EXPIRED_EVENT` 只把状态切换为 `expired`、清空输入和停止 pending；页面不自动刷新身份或重放导致事件的写请求，重新登录由玩家显式触发。

## 3. 信息层级

- Hero：StoryWorld、Character、当前处境、固定 PlayerRole。
- 主故事区：章节处境、事件时间线、人工选择、自由回应或本轮结局。
- 连续性侧栏：关系阶段、最近变化原因、已有安全结局摘要。
- 状态面板：首次登录、会话失效、加载、读取失败和首次开始。

桌面端主故事区与连续性侧栏并排；移动端保持主故事区在前，连续性内容在后。侧栏不新增全局导航或独立回忆产品面。

## 4. 数据投影

- 关系只读取 `run.relationship.label`、`attitude` 和 `last_change_reason`。
- 历史结局只读取 `run.completed_run_summaries`；不推导日期、轮次计数或故事外记忆。
- 当前节点和事件继续读取 `run.current_node` 与 `run.events`。
- 详情和运行时数据为空时显示短状态，不用静态样例补齐。

## 5. 失败与恢复

- 未登录：展示登录动作，返回当前 Character 深链。
- 会话失效：明确显示“登录已失效”，清空待发送文本；用户重新登录后由服务端恢复真实轮次。
- 私有状态读取失败：保留公开详情，显示重试动作。
- 写操作失败：保留服务端最后一次成功返回的 `run`，显示错误，不乐观推进。

## 6. 视觉方向

延续安妮页面的深夜档案感：暖灰纸张文字、煤蓝背景、克制金色强调。连续性侧栏采用“夹在故事旁的回访札记”构图，不复制通用仪表盘卡片。动效只用于首次显现并遵守 reduced-motion。
