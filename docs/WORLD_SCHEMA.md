# FableSpace 世界 Schema

本文档只记录当前空间平台的 durable data contract。实现字段以 `apps/api/src/fablespace_api/core/`、`apps/api/src/fablespace_api/contracts/` 和 `apps/api/src/fablespace_api/infrastructure/models.py` 为准；若代码与本文冲突，先修正文档或代码，不要静默漂移。

命名说明：对外 API、领域文档和前端统一使用 Space / `space_id`。当前数据库物理表仍保留 legacy `taverns` 表名，旧 `tavern` place type 输入会归一为 `space`，这是兼容策略，不代表新增一套并行 Schema。

## 概念映射

| 旧概念 | 当前概念 | 说明 |
|--------|----------|------|
| Place / POI | Space | 地图上的可进入空间 |
| Faction | SpaceCharacter | 空间内 NPC |
| World Info | WorldInfoEntry | 关键词触发的背景注入 |
| World | SpaceScene / scene prompt | 空间场景与氛围 |
| Player State | VisitorState | 访客与空间 / NPC 的关系 |
| OSM Data | 地图底图 | 真实坐标锚点 |

## Space

Space 是核心实体：一个挂接真实坐标、由店主维护、可进入的空间。

| 字段 | 类型 / 取值 | 约束 |
|------|-------------|------|
| `id` | string | 唯一 ID |
| `name` | string | 店主确认的空间名 |
| `description` | string | 访客可见描述 |
| `lat` / `lon` | number | 必须是真实坐标 |
| `address` | string? | 可选地址或反查结果 |
| `owner_id` | string | 空间主人 |
| `created_at` | ISO string | 创建时间 |
| `access` | `public` / `password` / `private` | 访问控制 |
| `password_hash` | string? | 仅密码空间使用，不返回明文 |
| `status` | `open` / `closed` | LLM 或空间运行状态 |
| `roleplay_mode` | `ai_only` / `hybrid` | 玩家扮演 NPC 仅在单空间内由店主审批 |
| `layout_style` | `lobby` / `npc-chat` / `quest-play` / `hybrid-room` | 仅决定展示布局，不生成内容 |
| `place_type` | 有限枚举 | 缺省 `space`；legacy `tavern` 输入归一为 `space`；`home` 默认私密 |
| `special_type` | `""` / `cultivation` / `divination` 等 | 只作为薄层类型，不改变主线边界 |
| `characters` | SpaceCharacter[] | 空间 NPC |
| `world_info` | WorldInfoEntry[] | 世界知识 |
| `gameplay_definitions` | GameplayDefinition[] | 店主配置的玩法定义 |
| `skill_packs` | SkillPackSetting[] | 店主显式启用能力包 |
| `scene_prompt` | string? | 场景氛围提示 |
| `operating_hours` | OperatingHours | 营业时间 |
| `home_members` | HomeMember[] | 仅 Home 使用 |
| `place_relationships` | PlaceRelationship[] | 地点治理关系 |

硬约束：

- Space 必须有真实 `lat/lon`。
- 非法 `place_type` 不得静默存储。
- `home` 默认 `private`，不进入公开发现。
- 公开分享 payload 不得泄露密码、API Key、hidden prompt、对话、运行时私有状态。

## SpaceCharacter

SpaceCharacter 是空间内 NPC，优先兼容 SillyTavern Character Card V2。

| 字段 | 类型 / 取值 | 约束 |
|------|-------------|------|
| `id` | string | 唯一 ID |
| `space_id` | string | 所属 Space |
| `name` | string | 角色名 |
| `description` | string | 店主视角描述 |
| `personality` | string | 性格设定 |
| `scenario` | string | 场景设定 |
| `gender` | `unspecified` / `female` / `male` / `nonbinary` / `other` | 不得由平台自动推断 |
| `system_prompt` | string | 角色系统提示 |
| `first_mes` | string | 开场白 |
| `mes_example` | string | 示例回复 |
| `alternate_greetings` | string[]? | 备用开场 |
| `tags` / `hobbies` | string[] | 标签和兴趣 |
| `avatar` | string? | 默认头像 URL |
| `sprites` | Record<string,string> | 表情图 |
| `appearance` | object? | 外貌 preset |
| `talkativeness` | number | 群聊发言积极度 |
| `current_space_id` / `home_space_id` | string? | NPC 流动相关 |
| `simulation_state` / `traits` | object? / string[] | NPC 仿真相关 |

约束：

- 平台不得从姓名、头像、对话或 AI 草稿自动推断 / 覆盖性别。
- Owner 图像优先级高于项目 fallback：`sprites.neutral` -> `avatar` -> `image_url` -> fallback。
- 角色卡导入时，SillyTavern 字段按名称映射；FableSpace 扩展字段必须保持向后兼容。

## AI 草稿

AI 草稿是非持久发布态，用于辅助店主创作。

可包含：`name`、`description`、`personality`、`scenario`、`system_prompt`、`first_mes`、`mes_example`、`tags`。

约束：

- 店主确认前不得进入公开 Space payload。
- 店主确认前不得覆盖已有 SpaceCharacter。
- 店主确认前不得随空间包导出。
- 确认后按 SpaceCharacter 保存；草稿本身不新增持久字段。

## WorldInfoEntry

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一 ID |
| `space_id` | string | 所属空间 |
| `keys` / `keys_secondary` | string[] | 触发关键词 |
| `content` | string | 注入内容 |
| `selective` / `constant` | boolean | 注入模式 |
| `depth` | number | 检索对话深度 |
| `order` | number | 注入顺序 |
| `probability` | number | 注入概率 0-100 |
| `disable` | boolean | 禁用开关 |

WorldInfo 只做上下文注入，不是平台自动生成正史。

## LLMConfig

| 字段 | 类型 | 约束 |
|------|------|------|
| `backend` | `openai` / `anthropic` / `ollama` / `openrouter` / `custom` 等 | 按代码支持范围 |
| `model` | string | 模型名 |
| `api_key` | string | 敏感字段，仅 owner / 后端内部可见 |
| `base_url` | string? | 自定义端点 |
| `temperature` / `max_tokens` / `top_p` | number? | 调用参数 |
| `token_used` | number? | owner 可见统计 |

约束：

- 访客响应不得包含 API Key。
- 店主 Key 不写共享 `.env`，不写日志。
- Token 统计不用于平台充值或结算。

## VisitorState

| 字段 | 类型 | 说明 |
|------|------|------|
| `visitor_id` | string | 访客 ID |
| `space_id` | string | 空间 ID |
| `gender` | Gender | 空间内自声明；缺省 `unspecified` |
| `visit_count` | number | 访问次数 |
| `first_visit` / `last_visit` | ISO string? | 访问时间 |
| `relationship.strength` | number | 0.0-1.0 |
| `relationship.stage` | AffinityStage | 好感阶段 |

AffinityStage：`stranger`、`acquaintance`、`familiar`、`friend`、`close_friend`、`best_friend`。

约束：

- 访客性别只作用于 `space_id + visitor_id`，不得扩展为全局资料或公开社交筛选。
- VisitorState 是访客私有运行时状态，不进入公开 Space payload。

## ChatMessage

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一 ID |
| `space_id` | string | 空间 ID |
| `character_id` | string | NPC ID |
| `visitor_id` | string | 访客 ID |
| `role` | `user` / `assistant` / `system` 等代码支持值 | 消息角色 |
| `content` | string | 可观察文本 |
| `timestamp` | ISO string | 时间 |
| `token_count` | number? | owner 可见 |

导出或公开接口不得暴露 hidden prompt、API Key 或其他访客私密信息。

## Gameplay

GameplayDefinition 是店主发布在单个 Space 内的轻量玩法定义。

核心字段：

- `id`
- `title`
- `status`: `draft` / `published` / `disabled`
- `summary`
- `entry_label`
- `mode`
- `owner_brief`: 目标、语气、素材、禁止事项
- `nodes`: 场景、选项、fallback 事件
- `completion`: 完成节点、奖励文案、是否写 memory atom

GameplaySession 是某个访客的一局运行时进度。

核心字段：

- `id`
- `space_id`
- `gameplay_id`
- `visitor_id`
- `character_id`
- `state`: `started` / `in_progress` / `completed` / `abandoned`
- `current_node_id`
- `turn_count`
- `variables`
- `events`
- `completion`

约束：

- Definition 是 Space 内容，可随空间包导出。
- Session 是运行时私有数据，不进入公开 Space payload。
- 玩法是轻量文本互动，不做战斗、等级、装备、排行榜。

## StateCard

StateCard 是长期连续性台账。AI 可以提出候选，但默认是 `pending`。

| 字段 | 类型 / 取值 | 约束 |
|------|-------------|------|
| `id` | string | 唯一 ID |
| `space_id` | string | 空间 ID |
| `category` | `character` / `task` / `resource` / `conflict` / `event_log` | 卡片类别 |
| `status` | `pending` / `confirmed` / `rejected` / `superseded` | 决策状态 |
| `canon_scope` | `visitor` / `space` | 作用域 |
| `title` / `summary` | string | 摘要，不写 chain-of-thought |
| `visitor_id` / `character_id` | string? | 可选关联 |
| `source` | string | 来源 |
| `source_message_ids` | string[] | 可追踪来源 |
| `proposed_by` / `confirmed_by` | string? | 决策人 |
| `fixed_canon` | boolean | true 时只能店主维护 |
| `metadata` | object | 冲突候选、决策说明等 |

约束：

- Chat / group chat 只能生成 pending 候选。
- 非店主访客只能确认 / 忽略自己的 visitor-scope 卡。
- Space-scope 或 fixed canon 只能由店主维护。
- StateCard 不得变成 RPG 属性、装备、排行榜或公开社交资料。

## Place / Home / Relationship

Home 复用 Space 基础字段，仍必须有真实 `lat/lon`。

HomeMember：

- `id`
- `home_id`
- `name` / `display_name`
- `member_type`: `conversational_character` / `silent_member` / `display_object`
- `speech_mode`: `character` / `silent` / `display`
- `description`
- `avatar`
- `character_id`
- `metadata`

PlaceRelationship：

- `id`
- `relation_type`: `school_enrollment` / `care_link` / `membership` / `work_affiliation` / `story_link`
- `source_space_id`
- `source_member_id`
- `target_space_id`
- `status`: `pending` / `approved` / `rejected` / `revoked`
- `display_name`
- `visibility`: `target_summary`
- `requested_by` / `decided_by`

约束：

- `silent_member` 和 `display_object` 默认不进入 NPC 对话链路。
- 跨主人关系默认 pending，由目标地点 owner 决定。
- 学校成员摘要不得展示真实未成年人身份信息。
- Relationship 是地点治理记录，不是好友、私信、动态墙或全局社交图谱。

## SkillPack

SkillPack 是店主显式启用的 NPC 能力包。

核心字段：

- `id`
- `enabled`
- `config`

当前内置 MVP：`local-rumor`。

约束：

- 非店主不能修改。
- 技能包不能自动改写 NPC、WorldInfo、记忆、StateCard、访问规则或 LLM 配置。
- `local-rumor` 只能引用已有 NeighborhoodRumor，不得编造现实地点或事实。

## RelationshipGraph

RelationshipGraph 表达 owner / system 在其治理范围内确认或候选的空间与角色关系，以及对单个访客的私有投影。

RelationshipEdge：

- `source_owner_id`
- `source_space_id`
- `source_node_type`: `space` / `character`
- `source_node_id`
- `target_owner_id`
- `target_space_id`
- `target_node_type`
- `target_node_id`
- `behavior_type`: `friendly` / `allied` / `neutral` / `rival` / `hostile`
- `strength_preset`: `weak` / `normal` / `strong`
- `status`: `pending` / `confirmed` / `rejected` / `disabled`
- `governance_mode`: `manual` / `assisted` / `delegated_ai` / `system_ai`

VisitorRelationshipProjection：

- `visitor_id`
- `node_type`
- `node_id`
- `space_id`
- `affinity`
- `hostility`
- `metadata`

约束：

- `pending` / `disabled` edge 不参与传播。
- 跨 owner edge 只是 source owner 视角，不能劫持 target owner。
- 访客投影是私有运行时数据，不得公开。
- 负向关系先降低 `affinity` 到 0，再把剩余量计入 `hostility`。

## NpcPublicBond

NpcPublicBond 是访客与 NPC 的公开长期关系申请 / 审批记录。

核心字段：

- `id`
- `space_id`
- `character_id`
- `visitor_id`
- `bond_type`
- `status`: `pending` / `active` / `revoked` / `expired`
- `created_at` / `approved_at` / `revoked_at` / `expires_at`
- `approved_by` / `revoked_by`
- `visitor_note` / `owner_note` / `revoke_reason`

约束：

- 申请必须审批后生效。
- 1:1 排他关系已有 active 时，新申请进入队列。
- 公开端点不得暴露 `visitor_id`。

## 版本与维护

- 新增字段、枚举或语义变化必须同步本文、相关 API contract 和测试。
- 旧数据读取必须向后兼容；缺失字段应有明确默认值。
- 不要把一次性 brainstorm、实现日志或历史长版本塞回本文。
- 详细版本历史如需保留，放 Trellis task，而不是主线 Schema 文档。
