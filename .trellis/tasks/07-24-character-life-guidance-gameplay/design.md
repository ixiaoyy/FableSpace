# 角色人生抉择与成长玩法：技术设计

## Summary

在 `StoryWorld` 内增加多个审核故事内容单元，使 Character 可以复用于不同故事。每个故事拥有独立 StoryRun、进度和结局；同一玩家与同一 Character 的长期关系在同世界故事间共享。

首个实现只提供长明宫内部预览：林晚照的个人成长故事《封口之信》第一章。玩家从林晚照页面主动前往魏观海页面查证，再返回林晚照处触发确定性 Character 决定。

群像故事与个人成长故事共用同一运行时。故事类型只影响内容校验和 Character 页面呈现，不产生第二套玩法引擎。

## Evidence and Dependencies

当前实现的关键限制：

- `apps/api/src/fablespace_api/domain/story_world.py` 将 `entry_chapter_id`、`chapters` 和 `endings` 直接挂在 StoryWorld 上，只能表达一个故事入口。
- `apps/api/src/fablespace_api/infrastructure/story_state_models.py` 的 `PlayerStoryStateModel.active_story_run_id` 按玩家与 StoryWorld 只有一个活动指针。
- `CharacterRelationshipModel` 以 `story_run_id + character_id` 为主键，关系不能跨故事延续。
- `apps/api/src/fablespace_api/application/story_worlds.py` 的消息处理固定使用 `world.characters[0]`，当前投影也没有按 Character 可见性过滤完整对话。
- `apps/web/app/routes/story-world-character.tsx` 把 Character 详情、世界唯一 StoryRun 与对话工作区放在同一路由中。
- 当前新内容注册表只包含安妮宽街；长明宫的新 StoryWorld 内容仍由 `.trellis/tasks/07-23-palace-snow-edict-story/` 负责。

实施依赖：

1. 以“重写雪夜封宫故事”最终落地的新 StoryWorld 内容为长明宫基线。
2. 以新的 StoryWorld 运行时 API 为基线，不从 `core/default_spaces.py`、旧 Space 或旧 GameplayDefinition 复制合同。
3. 如果上述任务在本任务实施前修改了同一领域、迁移或路由，先重新读取权威文档和完整 diff，再重排迁移编号与文件所有权。

## Content Model

### StoryWorld

StoryWorld 继续拥有：

- 稳定世界正史与规则；
- 一个固定 PlayerRole；
- 世界级 Character 注册表；
- 世界级 `content_version`；
- 多个审核故事内容单元。

StoryWorld 不再直接拥有唯一入口章节、章节集合和结局集合。

### ReviewedStory

在 StoryWorld 内增加审核内容子结构 `ReviewedStory`，不是新的数据库持久化领域实体：

| 字段 | 含义 |
|---|---|
| `id` | StoryWorld 内稳定 `story_id` |
| `title` | 故事标题 |
| `summary` | Character 卡片使用的具体处境摘要 |
| `kind` | `ensemble` 或 `growth` |
| `publication_status` | `draft` / `published` / `archived` |
| `focus_character_id` | `growth` 必需；`ensemble` 为空 |
| `participants` | 本故事 Character 参与信息 |
| `entry_chapter_id` | 本故事入口章节 |
| `chapters` | 本故事闭合剧情图 |
| `endings` | 本故事可达结局；draft 第一章允许没有可达最终结局 |

`growth` 与 `ensemble` 只用于校验和展示：

- `growth` 必须且只能指定一个焦点 Character。
- `ensemble` 至少包含两个参与 Character。
- 两者使用相同 StoryRun、StoryNode、StoryChoice、StoryEvent 和状态写回。

### StoryCharacterParticipation

Character 的稳定人格与关系规则保留在世界级 Character。随故事变化的字段移入参与子结构：

| 字段 | 含义 |
|---|---|
| `character_id` | 同 StoryWorld Character |
| `current_situation` | 该 Character 在本故事的处境 |
| `opening_line` | 从该 Character 合法入场时的开场 |
| `can_start` | 是否允许从该 Character 开始本故事 |

这避免魏观海、萧明珠或未来 Character 在不同故事中被迫共用同一开场处境。

### Character-scoped Nodes

StoryNode 增加必需的 `character_id`，表示当前节点允许玩家拜访和对话的 Character。

- 消息和选择请求中的 Character 必须与当前节点 Character 一致。
- Choice 的 `next_node_id` 若指向另一 Character 的节点，前端将其呈现为可选角色头像入口。
- 点击头像先提交审核 Choice，再导航至同一 `story_id` 下目标 Character 页面；不自动跳转，不在当前页面渲染目标 Character 对话。
- 系统叙事可以使用专门的非对话节点，但不能伪装为另一 Character 发言。

### Deterministic Character Decision

增加审核内容子结构 `CharacterDecision` 与有序 `DecisionRule`：

- 规则读取本故事 flags、已审核建议、玩家承诺行动、查证结果、长期关系内部值和当前 Character。
- 每条规则明确目标节点、可观察决定原因和状态变化来源。
- 必须存在兜底规则，且所有结果节点属于同一 ReviewedStory。
- AI 只生成 Character 可观察回应，不能选择 DecisionRule、结果节点或写入结果 flags。
- 自由输入不能设置用于关键决定的 flags。玩家必须通过审核建议与行动选择进入决策解析。

《封口之信》第一章的规则最终只解析为：

- `accepted_letter`
- `denied_knowledge`
- `requested_review`

三个结果均进入活动节点 `review_in_three_days`，不完成 StoryRun。

## Runtime State

### State Ownership

| 状态 | 作用域 |
|---|---|
| PlayerRole、世界正史 | StoryWorld |
| 长期关系 affinity / stage / reason | player + StoryWorld + Character |
| 活动轮次指针、回访次数、完成摘要 | player + StoryWorld + story |
| 节点、flags、选择、事件、消息、私有记忆、结局 | StoryRun |

### StoryRun

StoryRun 增加必需 `story_id`，并锁定：

```text
player_id + story_world_id + story_id + content_version
```

所有读取和写入继续复核 `player_id + story_world_id`，同时验证 `story_id` 与锁定内容版本。调用方不能用 run ID 绕过故事范围。

### Per-story Progress

新增持久化子表 `player_story_progresses`：

| 字段 | 约束 |
|---|---|
| `player_id + story_world_id + story_id` | 主键 |
| `active_story_run_id` | 本故事唯一活动轮次 |
| `visit_count` | 本故事进入次数 |
| `last_visited_at` | 本故事最近进入时间 |
| `completed_run_summaries` | 仅本故事完成摘要 |

`player_story_states` 继续按 `player_id + story_world_id` 唯一保存固定 PlayerRole 和世界级访问状态，不再作为故事活动指针或结局摘要的来源。

### Long-term CharacterRelationship

`character_relationships` 改为按以下键唯一：

```text
player_id + story_world_id + character_id
```

保留内部 affinity、可见 stage、最近变化原因和最后来源事件。第一版不读取或写入跨故事关系里程碑。

故事专属成长、证据、恐惧、野心和决定依据全部保存在 StoryRun flags / events，不写进长期关系 flags。

关系变化必须与来源 StoryEvent 同事务提交；重放同一审核 Choice 通过 `story_run_id + source_id` 幂等，不能重复累加长期关系。

### Message Visibility

投影从 `story_messages` 读取可回放消息，并按当前 Character 过滤：

- Character 消息只属于其 `character_id`。
- 玩家对某 Character 说的话只把该 Character 写入 `visible_to_character_ids`。
- 玩家从魏观海处得知的事实不会自动对林晚照可见；只有玩家返回后明确说出或审核动作允许传递，才写入林晚照可见事件。
- 系统叙事不授予 Character 知识。

LLM 上下文只包含当前 Character 可见消息、允许的故事状态、长期关系和审核世界内容。

## API Contract

Character 详情保持：

```text
GET /api/v1/story-worlds/{story_world_id}/characters/{character_id}
```

响应增加该 Character 可见的审核故事卡片。公开请求只返回 published 内容；内部预览仅在显式预览允许列表和有效登录会话同时满足时返回 allowlisted draft。

Character-first 运行时路由：

```text
GET  /api/v1/story-worlds/{story_world_id}/characters/{character_id}/stories/{story_id}/runs/current
POST /api/v1/story-worlds/{story_world_id}/characters/{character_id}/stories/{story_id}/runs
POST /api/v1/story-worlds/{story_world_id}/characters/{character_id}/stories/{story_id}/runs/{run_id}/messages
POST /api/v1/story-worlds/{story_world_id}/characters/{character_id}/stories/{story_id}/runs/{run_id}/choices
POST /api/v1/story-worlds/{story_world_id}/characters/{character_id}/stories/{story_id}/runs/restart
```

服务端校验：

- Story 属于 StoryWorld。
- Character 是 Story 参与者。
- start 时 `can_start=true`。
- message / choice 时 Character 与当前节点一致。
- run 属于当前登录玩家、StoryWorld 和 story。
- draft 只在预览允许列表中可访问。

旧的世界级 run 路由在同一切换中从新前端移除，不建立长期别名；安妮内容迁移为单个 published ReviewedStory。

## Frontend

### Routes

```text
/story-worlds/:storyWorldId/characters/:characterId
/story-worlds/:storyWorldId/characters/:characterId/stories/:storyId
```

- Character 详情页展示“命途 / 世事”卡片集合，只渲染内容名称、处境、必要状态与操作。
- 详情页不写解释分类、产品流程、draft 边界或数据模型的段落。
- 故事页加载 `story_id + character_id` 对应的 StoryRun 投影。
- 跨 Character Choice 以目标 Character 的真实头像和名字呈现；点击后提交 Choice，再导航到同 story 的目标 Character 路由。
- 时间线按事件真实 `character_id` 显示发言者，不再把所有 Character 消息标成当前详情 Character。
- 关系面板读取当前 Character 的长期关系投影。
- 移动端首屏保留 Character、当前处境和可执行动作，不增加玩法说明。

### Draft Preview

增加默认关闭的故事 allowlist 配置，例如 `FABLESPACE_DRAFT_STORY_PREVIEW_IDS`：

- 未配置时 draft 对公开详情和私有运行时均返回不可发现状态。
- 配置只接受明确 `story_id` 列表，不使用“开放所有草稿”的全局开关。
- draft 预览仍要求有效登录身份。
- 首页发现永远只读取 published Character / Story，不受预览 allowlist 影响。
- 生产部署不配置该值；内部本地验收临时配置精确 story ID。

## Migration

本需求只允许一个数据库迁移版本。实施时使用当时下一个可用编号，不能与并行任务冲突。

迁移内容：

1. 给 `story_runs` 增加非空 `story_id`，并为已有 StoryWorld 明确映射其既有单故事 ID。
2. 创建 `player_story_progresses`，把原 `active_story_run_id` 与 `completed_run_summaries` 迁移到对应 story 行。
3. 重建或重键 `character_relationships` 为玩家—世界—Character 长期关系，按每个 Character 最近有效来源确定迁移值。
4. 为长期关系增加最后来源 run / event 信息。
5. 删除 `player_story_states` 中不再权威的故事级活动指针和完成摘要，避免双写。
6. 增加 story 范围索引和必要外键。

迁移前必须只读审计当前所有 StoryWorld ID、活动 StoryRun 和关系记录，确认映射完整；该审计需要用户另行授权数据库访问，规划阶段不连接数据库。

迁移与回滚边界：

- 迁移前备份四张运行时表。
- 未识别的 StoryWorld 或无法唯一归属的活动轮次必须阻止迁移，不使用默认 story ID 猜测。
- 回滚依赖备份恢复，不在应用启动时静默改表或删状态。

## Alternatives Rejected

- **把成长故事做成新 StoryWorld**：无法共享长明宫 Character 和长期关系，违背产品意图。
- **用 `content_version` 区分不同故事**：版本是发布快照，不是玩家可选故事 ID，会破坏旧轮次锁定语义。
- **继续一个世界一个活动轮次**：切换故事会覆盖或阻塞另一故事进度，不满足独立进度。
- **保留 run 级关系并在响应时复制**：形成新旧双轨，无法可靠去重或解释来源。
- **让 AI 判断林晚照最终选择**：永久状态不可回放、不可验证，违反确定性剧情动作边界。
- **在同一页面渲染魏观海**：破坏 Character-first 对话入口和用户主动拜访。
- **首版实现关系里程碑**：增加来源、可见性、过滤和重玩去重复杂度，但不验证第一章核心假设。

## Rollout and Risks

- 本任务改动领域、迁移、API、内容和前端，应拆成可独立检查的子任务，最后做集成验收。
- 最大风险是与正在规划的长明宫内容、运行时 API 和 Character UI 任务发生合同或文件冲突；实施前必须重新基线化。
- draft 预览不得进入生产公开发现；预览 allowlist 缺省关闭是发布阻断条件。
- 林晚照完整故事和图片资产未完成前，不创建公开发布状态。
- 旧安妮故事必须先迁移到多故事内容模型并保持行为等价，再接入长明宫草稿。
