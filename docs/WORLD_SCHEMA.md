# FableSpace 故事世界 Schema

本文档定义角色故事平台的目标 durable data contract。产品边界见 [FABLESPACE_SPACE_PLATFORM.md](FABLESPACE_SPACE_PLATFORM.md)，负面清单见 [WHAT_NOT_TO_BUILD.md](WHAT_NOT_TO_BUILD.md)。

当前代码仍处于旧 Space 合同向新领域迁移的开发阶段。旧表、旧 API 和旧类型与本文不一致是待实施任务，不构成兼容要求；新代码不得为了复用旧实现而把坐标、owner、密码、营业状态或 SillyTavern 字段带入新 Schema。

## 命名与边界

领域文档、API 和前端统一使用：

| 概念 | 代码命名 | 说明 |
|---|---|---|
| 故事世界 | `StoryWorld` / `story_world_id` | 系统策划、审核并版本化发布的完整故事边界 |
| 角色 | `Character` / `character_id` | 属于一个 StoryWorld、由 AI 在边界内演绎的人物 |
| 玩家身份 | `PlayerRole` / `player_role_id` | 属于一个 StoryWorld 的固定故事身份 |
| 玩家故事状态 | `PlayerStoryState` | 按玩家与 StoryWorld 隔离的长期私有状态 |
| 故事轮次 | `StoryRun` | 一次从开始到结局的可回放运行实例 |
| 角色关系 | `CharacterRelationship` | 一个 StoryRun 内玩家与具体 Character 的关系状态 |

`NPC` 只描述 Character 由 AI 演绎的运行方式，不作为持久化实体名。`Space`、`SpaceCharacter`、`VisitorState`、`space_id` 和 `play_identity_id` 不是新合同的别名。

## 数据分层

系统内容与玩家运行时数据必须分开：

```text
版本化系统内容
  StoryWorld
    -> PlayerRole
    -> Character[]
    -> 章节 / 节点 / 选择 / 状态转换 / 结局
    -> 正史边界

玩家私有运行时数据
  PlayerStoryState
    -> 当前 StoryRun
      -> CharacterRelationship[]
      -> 关键选择 / 故事标记
      -> 私有记忆 / 消息 / 可回放事件
    -> 已完成轮次摘要
```

系统内容以仓库内可审查、可校验、可版本化的内容注册表维护，不通过 owner CRUD 写入。数据库保存玩家身份映射和运行时私有数据，不复制一套可被运行时改写的 StoryWorld 正史。

## StoryWorld

StoryWorld 是系统策划、人工审核并可版本化发布的完整故事世界。

### 必需字段

| 字段 | 类型 / 取值 | 约束 |
|---|---|---|
| `id` | string | 稳定且唯一 |
| `title` | string | 玩家可见名称 |
| `summary` | string | 玩家可见的简短故事处境 |
| `genre` | string | 内容题材，不改变运行合同 |
| `publication_status` | `draft` / `published` / `archived` | 唯一发布生命周期 |
| `content_version` | string | 每次可发布内容版本的稳定标识 |
| `player_role` | PlayerRole | P0 恰好一个固定身份 |
| `characters` | Character[] | 至少包含一个属于本世界的角色 |

StoryWorld 还必须包含经过审核的章节或节点、关键选择、允许的状态转换、结局和正史边界。这些嵌套结构的具体字段由“系统故事内容模型”任务定义；在该任务完成前，不得由实现自行扩展为脚本执行、任意状态对象或运行时可编辑 Prompt。

### 约束

- 公开发现和新轮次只能使用 `published` 内容。
- `draft` 不进入公开 API 或玩家运行时。
- `archived` 停止新玩家开始，但保留既有 StoryRun 的内容版本、进度和回滚依据。
- Character、PlayerRole、章节、选择和结局引用必须在同一 StoryWorld 与同一内容版本内闭合。
- StoryWorld 不包含 `owner_id`、`lat`、`lon`、现实地址、访问密码、营业状态、用户发布配置或私有 LLM 配置。
- 历史地点是内容事实，不是 StoryWorld 的通用坐标字段。

## Character

Character 必须属于一个 StoryWorld，并包含 AI 演绎所需的稳定人物合同。

### 必需字段

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | string | 在系统内容中稳定且唯一 |
| `story_world_id` | string | 必须引用所属 StoryWorld |
| `name` | string | 玩家可见角色名 |
| `motive` | string | 当前事件中主动追求的目标 |
| `secret` | string | 不应无条件向玩家公开的已审核信息 |
| `voice` | string | 语言、语气和表达边界 |
| `current_situation` | string | 当前事件中的处境 |
| `opening_line` | string | 角色入口的已审核开场 |
| `relationship_rules` | structured content | 自然对话与关键选择如何影响关系 |

### 约束

- 同一 StoryWorld 的 Character 必须有可区分的动机、秘密、语言、交易和拒绝边界，不能只替换姓名。
- Character 不能脱离 StoryWorld 成为通用聊天角色。
- Character 不能修改 StoryWorld 正史、PlayerRole 或确定性剧情状态。
- 角色展示资源属于系统内容版本；图片 URL、对象 key 和 prompt sidecar 继续遵守 [IMAGE_ASSETS_SPEC.md](IMAGE_ASSETS_SPEC.md)。
- Character 不要求兼容 SillyTavern 字段，也不提供角色卡导入或导出。

## PlayerRole

PlayerRole 是玩家在一个 StoryWorld 内自动生效的固定故事身份。

### 必需字段

| 字段 | 类型 | 约束 |
|---|---|---|
| `id` | string | 在所属 StoryWorld 内稳定 |
| `story_world_id` | string | 必须引用所属 StoryWorld |
| `name` | string | 前台使用的简短身份名 |
| `gender` | string | 已审核的故事设定，不由玩家选择或平台推断 |
| `background` | string | 与时代、制度和正史一致 |
| `entry_reason` | string | 解释玩家为何进入当前事件 |
| `character_visible_information` | structured content | Character 可以据此识别和回应玩家的内容 |

### 约束

- P0 每个 StoryWorld 恰好一个 PlayerRole。
- PlayerRole 不能跨 StoryWorld 复用，也不是账号权限、现实身份或公开社交资料。
- 客户端不能提交任意身份 Prompt、替换 PlayerRole 或声明超出故事合同的能力。
- 1854 年宽街使用“乞丐”；长明宫·雪夜封宫使用“小太监”。

## PlayerStoryState

PlayerStoryState 是一个玩家在一个 StoryWorld 中的长期私有状态。

### 必需字段

| 字段 | 类型 | 约束 |
|---|---|---|
| `player_id` | string | 由服务端身份边界解析 |
| `story_world_id` | string | 所属 StoryWorld |
| `player_role_id` | string | 必须是所属 StoryWorld 的固定 PlayerRole |
| `active_story_run_id` | string? | 当前活动轮次；无活动轮次时为空 |
| `visit_count` | integer | 非负回访次数 |
| `last_visited_at` | ISO timestamp? | 最近回访时间 |
| `completed_run_summaries` | collection | 已完成轮次的结局摘要，不携带上一轮可变状态 |

### 唯一性与身份

- `player_id + story_world_id` 唯一定位一条 PlayerStoryState。
- 未登录时，`player_id` 来自服务端认可的匿名访客标识；同一设备可以恢复。
- 登录后才承诺账号绑定与跨设备恢复。
- 客户端不得提交、替换或冒充任意 `player_id`。
- PlayerStoryState 不跨 StoryWorld 传播，也不进入公开发现、公开资料、排行榜或其他玩家响应。

## StoryRun

StoryRun 表示一次从开始到结局的故事轮次。

### 必需字段

| 字段 | 类型 / 取值 | 约束 |
|---|---|---|
| `id` | string | 唯一轮次 ID |
| `player_id` | string | 必须与所属 PlayerStoryState 一致 |
| `story_world_id` | string | 必须与所属 PlayerStoryState 一致 |
| `content_version` | string | 轮次开始时锁定的 StoryWorld 版本 |
| `status` | `active` / `completed` | 唯一轮次生命周期 |
| `current_chapter_id` | string | 必须属于锁定内容版本 |
| `current_node_id` | string | 必须属于当前章节 |
| `key_choices` | collection | 已确认且不可回退的关键选择 |
| `story_flags` | collection | 仅由已审核剧情动作改变 |
| `character_relationships` | CharacterRelationship[] | 只包含本 StoryWorld 的角色 |
| `private_memories` | collection | 经过筛选的玩家私有记忆 |
| `events` | collection | 可回放的消息、选择与状态变化事件 |
| `ending_summary` | string? | 完成时写入；活动轮次为空 |

### 约束

- 每个 `player_id + story_world_id` 同时最多一个 `active` StoryRun。
- 关键选择在活动轮次中不能撤销；系统不提供章节回退或并行时间线。
- 完成后可以开始新 StoryRun。新轮次不继承上一轮好感度和故事标记；PlayerStoryState 只保留上一轮结局摘要。
- 部署新内容版本时不得静默重写旧 StoryRun 的 `content_version`、节点或事件。
- `events` 必须保留可观察输入、确定性剧情动作、状态变化原因和来源；不得存储 chain-of-thought。
- 消息、记忆和事件的具体嵌套字段由玩家状态与运行时 API 任务定义，但必须始终绑定当前玩家、StoryWorld、StoryRun 和必要的 Character 来源。

## CharacterRelationship

CharacterRelationship 保存一个 StoryRun 内玩家与具体 Character 的关系。

### 必需字段

| 字段 | 类型 | 约束 |
|---|---|---|
| `story_run_id` | string | 所属 StoryRun |
| `character_id` | string | 必须属于同一 StoryWorld |
| `affinity` | number | 内部连续值，不直接向玩家展示 |
| `stage` | string | StoryWorld 审核的关系阶段 |
| `last_change_reason` | string? | 最近一次有依据变化的可追踪原因 |
| `flags` | collection | 故事专属关键关系标记 |

### 约束

- `story_run_id + character_id` 唯一。
- 自然对话只能产生有依据、受限的小幅 `affinity` 变化。
- 已审核的关键选择可以产生较大变化，并打开或关闭分支。
- 重复闲聊不得无成本获得重大关系阶段、关键标记或结局。
- 前端只展示角色态度、关系阶段和变化原因，不展示 `affinity` 数值。
- 关系不跨 StoryWorld 或 StoryRun 传播。

## 剧情动作与 AI 写回

运行时状态变化遵循固定顺序：

```text
预设选择或自由输入
  -> 加载锁定的 StoryWorld 内容版本与 StoryRun
  -> 解析为允许的剧情动作，或保持普通对话
  -> 确定性规则校验前置条件并应用状态变化
  -> 构建 Character、PlayerRole、正史、关系和私有记忆上下文
  -> AI 生成角色可观察回应
  -> 输出校验
  -> 持久化消息、事件、受限关系变化和记忆候选
```

- AI 不能直接写 StoryWorld、章节、节点、关键选择、故事标记或结局。
- 自由输入未匹配已审核剧情动作时不能推进关键状态。
- AI 提出的关系变化或记忆只能作为候选，必须经过规则、上限、来源和隐私校验。
- 所有永久写回必须可追踪、可回放并能解释其规则来源。

## 历史正史

历史 StoryWorld 必须在系统内容中区分：

| 内容层 | Schema 约束 |
|---|---|
| 固定史实 | 有可追踪来源；时间或时间范围、地点、真实参与者、可证实同场关系、制度阶段和已知公开结果不可被运行时改变 |
| 剧情设定 | 明确为原创，且已核对不会改变任何固定史实 |
| 待核验 | 来源不足或存在实质争议；不得进入剧情因果、Character 定论或发布正史 |

三层内容的具体注册表结构由系统故事内容模型任务定义。实现不得把“史料未记载”自动归类为剧情设定，也不得让 AI 改变内容层级。原创或架空 StoryWorld 不受真实历史时间线约束，但仍受自身已发布正史和状态机约束。

## 系统 LLM 配置

模型、API Key、服务地址和生成参数属于部署级系统配置，不是 StoryWorld 或 owner 数据实体。

- 公开 API 和前端不得接收 API Key、隐藏 Prompt 或生成参数。
- 密钥不得写入日志、消息、事件或 PlayerStoryState。
- 运维指标不得暴露玩家对话、私有记忆或可还原密钥的信息。
- 平台不提供 owner / StoryWorld 私有 LLM 配置或 Token 计费字段。

## 公开与私有响应边界

公开响应可以包含：

- `published` StoryWorld 的发现摘要；
- Character 的公开入口信息；
- 所属 StoryWorld 摘要和固定 PlayerRole 的玩家可见入场信息。

玩家私有响应必须经过当前登录账号或匿名访客身份校验，才可以包含：

- PlayerStoryState；
- 当前 StoryRun；
- 自己的消息、选择、关系、记忆、事件和结局摘要。

任何公开响应都不得包含其他玩家标识、对话、进度、关系、记忆、隐藏正史、系统 Prompt 或密钥。

## 校验矩阵

| 条件 | 处理 |
|---|---|
| `publication_status` 或 StoryRun `status` 不在允许枚举 | 拒绝加载或写入，不静默归一 |
| published StoryWorld 缺少固定 PlayerRole、Character 或有效内容引用 | 拒绝发布 |
| Character、PlayerRole、章节、节点或关系跨 StoryWorld 引用 | 拒绝 |
| 客户端提交任意 `player_id` 或 PlayerRole | 拒绝或忽略客户端值，由服务端身份边界解析 |
| 运行时尝试改写锁定 `content_version` | 拒绝 |
| 未通过前置条件的剧情动作 | 不改变关键状态，并返回可观察的受控结果 |
| AI 输出尝试直接写正史、关键标记或结局 | 丢弃该写回并记录安全的诊断信息 |
| 私有状态被请求到错误玩家或公开端点 | 拒绝且不泄露记录是否存在 |

## 已删除的旧合同

以下内容不属于本 Schema，也不得作为新实现的兼容要求：

- `Space`、`SpaceCharacter`、`VisitorState`、`WorldInfoEntry` 和 `StateCard`；
- `Place`、`Home`、地点关系、公开关系图、NpcPublicBond 和 SkillPack；
- `lat` / `lon`、地图底图、POI、owner、访问密码和营业状态；
- SillyTavern 角色卡导入 / 导出与空间包；
- 全局 `play_identity`、玩家自声明性别和用户身份 Prompt；
- owner / 故事世界私有 LLMConfig 和 Token 统计；
- 旧 GameplayDefinition / GameplaySession 通用玩法合同。

旧代码与开发数据只能在独立清退任务中经过完整引用审计、备份和显式迁移后删除。不得保留长期新旧双轨，也不得在应用启动时静默清库。

## 版本与维护

- 新增字段、枚举或语义变化必须先获得产品确认，并同步本文、相关 API 合同和最小真实验证。
- 系统内容变化必须增加可追踪的 `content_version`；旧 StoryRun 继续引用原版本。
- 运行时表变更必须有显式迁移和回滚边界，不依赖兼容默认值掩盖协议变化。
- 本文不保存一次性 brainstorm、实现日志或历史长版本；过程记录留在 Trellis 任务、提交和发布说明中。
