# 安妮故事垂直链路设计

## 1. 设计边界

本任务交付一个只支持安妮的纵向切片，不先建设多 StoryWorld 平台。所有新接口和表使用 StoryWorld / Character / PlayerRole / PlayerStoryState / StoryRun 术语，不扩展旧 Space 合同。

```text
首页安妮卡片
  -> /story-worlds/{story_world_id}/characters/{character_id}
  -> 公开安妮详情 + 固定“乞丐”身份
  -> 创建或恢复匿名 StoryRun
  -> 安妮讨水开场
  -> 自由回应（不推进关键状态）
  -> 人工选择（确定性推进）
  -> 一个审核结局
  -> 刷新恢复 / 重新开始
```

魏观海、萧明珠和多故事抽象不在本轮实现。

## 2. 系统内容

新增只读系统内容模块，构造唯一 `StoryWorldRegistry`：

- StoryWorld：`history_broad_street_water_1854`
- Character：`char_history_broad_street_annie`
- PlayerRole：`role_history_broad_street_beggar`
- 发布版本：独立稳定 `content_version`
- 一个章节，包含讨水入口、核对水源、提交可核验证词和终局节点
- 至少一个主结局与一个安全退出结局

人工选择负责节点、关键选择、故事标记、关系变化和结局。自由输入只生成安妮的可观察回复，不推进节点、不写关键标记、不创建结局。

固定史实和剧情设定使用 `CanonEntry` 分层。发布内容不含 `needs_verification`。历史来源沿用已核验的权威来源并在任务验收记录中逐项复核。

## 3. 公开详情 API

新增：

```text
GET /api/v1/story-worlds/{story_world_id}/characters/{character_id}
```

只返回已发布内容的玩家可见投影：

- StoryWorld：ID、标题、摘要、题材、内容版本
- Character：ID、名称、当前处境、开场预览、关系初始阶段
- PlayerRole：ID、名称、性别、背景、入场理由、角色可见信息
- 入口信息和页面需要的非私有视觉标识

不返回 Character secret、完整系统提示、隐藏正史、其他玩家数据或 LLM 配置。

## 4. 匿名玩家边界

运行时 API 不接受客户端 `player_id`。服务端从 HttpOnly Cookie `fablespace_player_id` 解析匿名标识；不存在时生成随机 UUID 并在响应中设置 Cookie。

Cookie：

- `HttpOnly`
- `SameSite=Lax`
- `Secure` 跟随现有会话 Cookie 配置
- 路径 `/`

账号绑定和跨设备合并不在本轮。

## 5. 最小持久化

只新增本切片需要的四张表：

| 表 | 职责 |
|---|---|
| `player_story_states` | `(player_id, story_world_id)` 唯一状态、活动轮次、回访次数、全部安全结局摘要 |
| `story_runs` | 内容版本、状态、当前节点、关键选择、故事标记、事件和结局 |
| `character_relationships` | 当前轮次内安妮的 affinity、阶段、变化原因和标记 |
| `story_events` | 按轮次顺序追加玩家消息、角色回复、选择和状态变化 |

本轮不建立通用记忆表；`private_memories` 保持空 collection。事件存储可观察内容和确定性变化来源，不存 chain-of-thought。

同一玩家与 StoryWorld 同时最多一个活动轮次。开始、选择、完成、结局摘要和重新开始均在事务中更新。新轮次不复制旧轮次 affinity、标记、事件或选择。

新增且仅新增一个 `004_annie_story_runtime.sql`，不修改旧迁移，不删除旧表。

## 6. 运行时 API

```text
GET  /api/v1/story-worlds/{story_world_id}/runs/current
POST /api/v1/story-worlds/{story_world_id}/runs
POST /api/v1/story-worlds/{story_world_id}/runs/{run_id}/messages
POST /api/v1/story-worlds/{story_world_id}/runs/{run_id}/choices
POST /api/v1/story-worlds/{story_world_id}/runs/restart
```

- `POST /runs` 幂等创建或恢复活动轮次。
- `messages` 接收纯文本自由回应，长度受限；调用系统 LLM 后原子追加玩家和安妮两条可观察事件。失败不推进剧情状态。
- `choices` 只接受当前节点发布内容中存在且前置条件满足的 choice ID，确定性应用节点、标记和关系效果。
- 到达终局节点时完成轮次、写安全结局摘要并清空活动指针。
- `restart` 只在无活动轮次或上一轮完成后创建全新轮次。
- 所有私有 API 都用 Cookie 玩家身份复核 StoryRun 所属关系。

## 7. 系统 LLM

本轮只接现有部署级 `apps/api/config/system_public_welfare_llm.json` 与 `OPENCODE_API_KEY`，不新增 owner 或 StoryWorld 私有配置。

新运行时通过窄接口调用现有 `core.llm_clients`：

- 输入只包含安妮已审核 Character、固定 PlayerRole、当前节点、固定正史、关系阶段和本轮可观察消息。
- Prompt 明确禁止改写节点、选择、关系、结局和固定史实。
- 输出只取纯文本角色回复；不解析或持久化模型生成状态。
- 无 Key 或调用失败时返回受控 503，不写半条消息、不使用伪对白兜底。
- 定向验证注入本地 fake responder，不发真实外部请求。

## 8. 前端

新增一个聚焦安妮的响应式 StoryWorld Character 页面：

- 详情态：安妮、宽街处境、固定“乞丐”身份、进入动作。
- 运行态：开场消息、消息时间线、自由输入、当前人工选择、关系阶段与原因。
- 结局态：结局标题/摘要、回访摘要和重新开始。
- 加载、未找到、错误、LLM 暂不可用均使用真实受控状态。

首页只把安妮的主动作改到新路由；魏观海和萧明珠保持原代码与行为，不在本轮迁移。

视觉不依赖未登记图片。优先复用仓库内代码生成的 `HistoricalBroadStreetVisual` 和已有 CSS/图标，避免引用临时图片目录。

## 9. 失败与回滚

- 内容注册失败：应用启动失败，不降级为旧 Space。
- 详情不存在或未发布：404，不泄露其他内容。
- Cookie 身份与 StoryRun 不匹配：404/403 受控响应，不泄露记录是否存在。
- LLM 失败：保留原状态，前端允许重试。
- 选择重复：相同 choice 幂等返回当前状态；不同节点的旧 choice 拒绝。
- 回滚只移除本任务新增路由、模块和四张新表；已有玩家数据时必须先备份，不能启动时静默删表。
