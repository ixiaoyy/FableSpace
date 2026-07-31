# 多故事权威合同与迁移边界：技术设计

## Summary

当前代码不能把“内容模型切换”和“数据库迁移”安全拆开：应用启动后会优先读取
`managed_story_worlds.payload_json`，而该 JSON 正是现有单故事 Schema。为避免先
部署新 decoder 后线上内容全部无法加载，本叶子任务只先冻结最终合同和原子迁移边界。

后续实现任务在获得明确 Schema / 数据变更批准后，使用一次受控切换完成内容文档、
运行时状态与代码更新；不保留旧 JSON decoder 或新旧双写。

## Checked Baseline

| 证据 | 当前事实 | 设计影响 |
|---|---|---|
| `domain/story_world.py` | StoryWorld 直接拥有唯一 entry / chapters / endings | 最终移动到 ReviewedStory |
| `content/__init__.py` | 注册表已有安妮与长明宫两个发布世界 | 两者都必须显式映射 story_id |
| `content/palace_snow_edict.py` | 长明宫有魏观海、萧明珠和两个 PlayerRole | 世界级 PlayerRole 必须是一到多个 |
| `managed_story_content_store.py` | 数据库 JSON 优先于内置 seed，既有文档不被覆盖 | decoder 与 payload 数据必须原子切换 |
| `story_state_models.py` | 世界级活动轮次、run 级关系、StoryRun 无 story_id | 多故事状态需要同一迁移版本 |
| `apps/web/app/routes.ts` | 规范前端路由是 Character 短路由 | 不新增 `/story-worlds/...` 前端深链 |
| 已归档 chat-first 任务 | 故事页只承载聊天、恢复和写入 | 故事选择留在 Character 详情，故事页不恢复介绍 |

本轮没有连接数据库，因此不知道生产 `payload_json` 是否仍恰好等于内置 seed，也不
知道是否存在管理员编辑。后续迁移预检必须把这两项作为真实证据补齐。

## Target Content Contract

### StoryWorld

StoryWorld 保留：

- `id`、标题、摘要、题材、世界发布状态与 `content_version`；
- 一个或多个世界级 PlayerRole；
- 跨故事稳定 Character；
- 世界正史与规则；
- 一个或多个 ReviewedStory。

StoryWorld 删除唯一 `entry_chapter_id`、`chapters` 与 `endings`。

### ReviewedStory

| 字段 | 合同 |
|---|---|
| `id` | StoryWorld 内稳定 `story_id`，不由标题或顺序推导 |
| `title` / `summary` | Character 详情使用的审核内容文案 |
| `kind` | `ensemble` 或 `growth`，仅用于校验与呈现 |
| `publication_status` | `draft` / `published` / `archived` |
| `focus_character_id` | growth 必需且必须是参与 Character；ensemble 为空 |
| `participants` | StoryCharacterParticipation 集合 |
| `entry_chapter_id` | 本故事入口章节 |
| `chapters` / `endings` | 只在本 story 内闭合的剧情图 |
| `character_decisions` | 可选的确定性 Character 决定集合 |

ID 只要求在同一个 StoryWorld 内唯一；章节、节点、选择和结局只要求在同一个
ReviewedStory 内唯一。跨 story 引用一律拒绝。

### StoryCharacterParticipation

Character 继续保存跨故事稳定的人格、动机、秘密、语言和关系规则。以下随故事变化的
字段移动到参与结构：

- `character_id`
- `current_situation`
- `opening_line`
- `can_start`

published story 至少有一个 `can_start=true` 的参与 Character。一个 Character 可以
参与多个 story，但普通公开响应只列出 published story。

### Character-scoped Nodes

现有雪夜封宫入口是系统叙事，后续又分别进入魏观海、萧明珠或查证动作；因此节点
不能假定所有内容都由某一 Character 发言。目标合同区分：

- Character 节点：必须引用本 story 的参与 Character，消息与选择请求只能从该
  Character 路由进入。
- 系统 / 行动节点：没有 Character 发言者，只呈现审核叙事或玩家行动，不授予任一
  Character 新知识。
- 跨 Character Choice：目标节点若属于另一 Character，响应显式投影目标 Character；
  前端由玩家点击头像后提交并导航，不自动跳转。

具体 Python 字段名在后续代码任务中确定，但不得用“当前页面 Character”覆盖事件真实
来源，也不得让系统叙事伪装成 Character 消息。

### Deterministic CharacterDecision

CharacterDecision 绑定一个决定 Character 与触发节点，包含有序 DecisionRule：

- 条件只读取审核 choice 写入的 flags、查证结果、玩家承诺行动、当前 Character 与
  长期关系区间；
- 结果只指向同一 story 节点，并写入审核 flags、关系变化与可观察原因；
- 必须有无条件兜底规则；
- 记录规则 ID、输入事实、结果节点和原因，不记录模型思维链；
- 自由输入和 AI 文本不能设置关键决定 flags 或选择规则。

## Public and Frontend Contract

后端继续使用 `/api/v1/story-worlds/...`，最终运行时路由显式包含 `story_id`。

前端保持：

```text
/characters/:characterSlug
/characters/:characterSlug/story?storyId=...&playerRoleId=...
```

- Character 详情以“命途 / 世事”展示可进入的审核 story 与本轮 PlayerRole。
- story 页只恢复或创建指定 StoryRun，然后直接显示聊天时间线、快捷选择和输入框。
- `storyId` 与 `playerRoleId` 都必须来自公开详情白名单；登录回跳白名单同步允许这两
  个 ASCII ID 参数。
- 单故事 Character 也不得把数组顺序写入持久化合同；后端始终锁定明确 story_id。
- 首页仍只发现 published Character；draft allowlist 不影响首页。

## Atomic Migration Boundary

后续代码切换至少包含以下同一版本影响：

1. 把两个内置 StoryWorld 转成 `stories[]`，安妮和雪夜封宫各有明确 story_id。
2. 把 `managed_story_worlds.payload_json` 中的单故事结构转换为同一新结构，同时把
   Character 的处境与开场移入 participation。
3. 给 StoryRun 增加非空 `story_id`，按已审核世界映射回填既有轮次。
4. 新增每玩家、世界、story 的进度记录，迁移活动轮次与完成摘要。
5. 把 CharacterRelationship 重键为玩家、世界、Character，并保留最后来源 run /
   event；关系写回与来源事件保持同一事务。
6. 删除世界级状态中不再权威的活动轮次与完成摘要字段，避免双写。
7. 同步 codec、管理内容 API、运行时 API、Store、前端 client 与登录回跳白名单。

本需求最多一个数据库迁移。因为项目规则禁止未经批准创建迁移，下一任务开始 SQL 前
必须先向用户提交精确表、列、JSON 数据转换、备份、失败阻断与回滚方案。

## Rollout and Rollback

- 迁移前只读审计实际 StoryWorld ID、管理 JSON 版本、活动 StoryRun 和关系归属；该
  审计需要用户另行授权数据库访问。
- 未知 StoryWorld、无法唯一映射的 run、关系来源冲突或 JSON 结构异常都阻止执行。
- MySQL DDL 可能隐式提交；执行前备份所有受影响表和管理内容 JSON。
- 新代码与迁移作为同一发布单元，不允许新 decoder 先于数据转换上线。
- 失败后停止应用写入并从整组备份恢复，不用反向 SQL 猜测旧状态。

## Alternatives Rejected

- **先加新字段并兼容读取旧 JSON**：形成长期双合同，且会掩盖未迁移管理内容。
- **依赖 `seed_missing()` 覆盖线上文档**：会丢失管理员已审核编辑，现有实现也明确
  禁止覆盖。
- **用 content_version 代替 story_id**：版本是内容快照，不是玩家选择的故事身份。
- **把林晚照做成新 StoryWorld**：无法共享长明宫 Character 关系与世界规则。
- **新增 `/story-worlds/...` 前端页面**：违反 Character-first 规范短路由和 chat-first
  入场边界。
