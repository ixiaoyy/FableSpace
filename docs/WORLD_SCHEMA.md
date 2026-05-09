# FableMap 世界 Schema v0.8

> **状态**：本文档已更新以反映空间平台的数据模型。旧 `world` Schema 作为历史参考保留。新的核心数据模型为 `Tavern`、`TavernCharacter`、`LLMConfig` 等。

---

## 一、核心概念映射

| 旧概念（叙事引擎版） | 新概念（空间版） | 说明 |
|---------------------|---------------------|------|
| Place / POI | Tavern | 地图上的可进入场所 |
| Faction | TavernCharacter | 空间内的 AI NPC |
| World Info | WorldInfoEntry | 关键词触发的背景注入 |
| World | TavernScene | 空间场景设定 |
| Player State | VisitorState | 访客与空间的关系 |
| OSM Data | 地图底图 | 不变 |
| Fantasy Name | Tavern Name | 自定义 |

---

## 二、Tavern（空间）

空间是 FableMap 空间平台的核心实体。

```typescript
/**
 * 空间 — 地图上的一个可进入场所
 */
interface Tavern {
  // ── 身份 ──────────────────────────
  id: string;                    // UUID，唯一标识
  name: string;                  // 空间名称（如「第三中学传达室」）
  description: string;           // 场景描述（给访客看）

  // ── 地图位置 ─────────────────────
  lat: number;                   // 纬度
  lon: number;                   // 经度
  address?: string;              // 地址（可选，OSM 反查）

  // ── 归属 ─────────────────────────
  owner_id: string;              // 主人 user_id
  created_at: string;             // ISO 时间戳

  // ── 访问控制 ──────────────────────
  access: 'public' | 'password' | 'private';
  password_hash?: string;        // 密码 hash（仅 access=password 时）

  // ── 运营状态 ──────────────────────
  status: 'open' | 'closed';    // open = LLM 可用，closed = LLM 不可用
  roleplay_mode: 'ai_only' | 'hybrid'; // NPC 驱动模式：纯 AI 或店主审批的玩家混合扮演
  layout_style: 'lobby' | 'npc-chat' | 'quest-play' | 'hybrid-room'; // 空间页默认体验布局
  place_type: PlaceType;         // 地点类型；缺省 tavern，Home 默认私密

  // ── 空间内容 ──────────────────────
  characters: TavernCharacter[];  // 空间内的 NPC 列表
  character_claims: CharacterClaim[]; // 玩家扮演 NPC 的认领记录
  world_info: WorldInfoEntry[];   // 世界知识（关键词注入）
  gameplay_definitions: GameplayDefinition[]; // 店主配置的结构化玩法定义
  skill_packs: SkillPackSetting[]; // 店主显式启用的 NPC 能力包配置
  scene_prompt?: string;          // 场景氛围提示词（附加上下文）

  // ── 时间系统 (v0.6) ──────────────
  timezone?: string;             // IANA 时区（如 'Asia/Shanghai'），不填则从 lat/lon 推断
  operating_hours: OperatingHours; // 营业时间配置

  // ── Place/Home MVP (v0.7) ─────────
  home_members: HomeMember[];        // 仅 Home 使用；owner/private payload 可见
  place_relationships: PlaceRelationship[]; // 从本地点发起的跨地点关系记录
}

/**
 * 营业时间配置 (v0.6)
 */
type OperatingHours =
  | { mode: 'always_open' }  // 默认，始终营业
  | {
      mode: 'scheduled';
      open_at: string;         // "09:00"
      close_at: string;        // "22:00" 或 "26:00" 表示次日凌晨
      enabled_days: number[];  // 0=周一, 6=周日，如 [0,1,2,3,4] 表示工作日
    };

/**
 * 时间状态信息（API 响应时计算）
 */
interface TavernTimeStatus {
  timezone: string;              // IANA 时区
  local_time_display: string;    // "22:47"
  is_open: boolean;             // 当前是否营业
}


type PlaceType =
  | 'tavern'
  | 'cafe'
  | 'milk-tea-shop'
  | 'restaurant'
  | 'convenience-store'
  | 'bookstore'
  | 'school'
  | 'hospital'
  | 'home';

type Gender =
  | 'unspecified'
  | 'female'
  | 'male'
  | 'nonbinary'
  | 'other';
```

约束：

- `place_type` 缺省为 `tavern`，旧数据读取时必须向后兼容。
- `home` 是保留地点类型，默认 `access='private'`，不进入公开发现列表。
- 非 Home 的公开地点仍按原 Tavern 访问控制展示。
- `hospital` 是公开 Place 类型；可用于护理陪伴、分诊便签和现实求助边界提醒，但不得把 NPC 内容当作医学诊断、处方或急救替代。
- 非法 `place_type` 不得静默存储到新数据；创建/更新 API 必须拒绝或归一化为文档定义的有限枚举。

---

## 三、Place / Home / Member / Relationship（v0.7）

`Place` 是当前 Tavern 兼容层上的概念扩展，不是脱离真实地图的新自由空间。MVP 中所有 Place/Home 仍复用 `Tavern` 的 `id/lat/lon/owner_id/access/status` 等字段。

```typescript
interface HomeMember {
  id: string;                         // member_<hex>
  home_id: string;                    // 所属 Home Tavern.id
  name: string;                       // 主人确认的展示名
  display_name?: string;              // 学校/列表中显示的昵称
  member_type: 'conversational_character' | 'silent_member' | 'display_object';
  speech_mode: 'character' | 'silent' | 'display';
  description?: string;               // 主人确认的展示描述
  avatar?: string;                    // 项目内资源路径或 URL
  character_id?: string;              // 仅 conversational_character 可绑定 TavernCharacter
  created_at: string;
  metadata?: Record<string, unknown>;
}

type PlaceRelationshipType =
  | 'school_enrollment'     // 学生-学校关系；学校成员摘要的来源
  | 'care_link'             // 照护 / 托管关系
  | 'membership'            // 成员归属关系
  | 'work_affiliation'      // 工作 / 志愿关系
  | 'story_link';           // 主人确认的叙事关联

interface PlaceRelationship {
  id: string;                         // rel_<hex>
  relation_type: PlaceRelationshipType;
  source_tavern_id: string;           // 当前 MVP 为 Home Tavern.id
  source_member_id: string;           // HomeMember.id
  target_tavern_id: string;           // 目标 Place/Tavern.id
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  display_name?: string;              // 目标地点 owner 可见摘要昵称
  visibility: 'target_summary';
  source_role?: string;               // 如 student/home_member，由 source owner 确认
  target_role?: string;               // 如 school/care_place，由 source owner 提议
  requested_by: string;               // Home owner user_id
  decided_by?: string;                // target place owner user_id
  created_at: string;
  decided_at?: string;
  note?: string;
}

interface SchoolMemberSummary {
  relationship_id: string;
  home_tavern_id: string;
  member_id: string;
  display_name: string;
  member_type: HomeMember['member_type'];
  speech_mode: HomeMember['speech_mode'];
  avatar?: string;
}
```

约束：

- Home 必须有真实 `lat/lon`；公开展示可隐藏或模糊，但不能是无锚点自由空间。
- `silent_member` 与 `display_object` 默认不进入 NPC 对话链路；被问到时产品层应按沉默对象处理，不能平台自动补全人格。
- 只有 `conversational_character` 且主人显式绑定 / 配置 `character_id` 时，才可作为可对话角色参与 TavernCharacter 流程。
- `school_enrollment` 只是 PlaceRelationshipType 的一种；同主人 Home → target Place 可自动 `approved`，跨主人必须先 `pending`，由目标地点 owner 批准。
- 只有 `relation_type='school_enrollment'` 且目标地点为 `place_type='school'` 的已批准关系，才投影为 `SchoolMemberSummary`。
- 学校成员摘要不得采集或展示真实未成年人身份信息；只展示主人确认的昵称 / 虚构身份。
- Relationship 是地点治理记录，不是好友、私信、动态墙或全局社交图谱；不得开放任意访客写入或公开浏览完整关系图。

布局约束：

- `layout_style` 只决定空间详情页的默认展示结构，不生成或改写空间内容。
- 缺失或不支持的 `layout_style` 必须兼容读取为 `lobby`。
- 合法值为：`lobby`（大厅型）、`npc-chat`（NPC 会话型）、`quest-play`（任务/玩法型）、`hybrid-room`（混合房间型）。

---

## 四、CharacterClaim（玩家扮演 NPC 认领）

`CharacterClaim` 记录某个玩家申请 / 获准扮演某个既有 NPC 的状态。它是空间内的治理记录，不是跨空间私信、好友关系或全局在线状态。

```typescript
interface CharacterClaim {
  id: string;                 // claim_<hex>
  character_id: string;       // 被认领的 TavernCharacter.id
  player_id: string;          // 申请扮演者 user_id
  player_name?: string;       // 展示名
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  requested_at: string;       // ISO 时间戳
  decided_at?: string;        // 店主审批 / 撤销时间
  note?: string;              // 店主备注
}
```

约束：

- 只有 `roleplay_mode = 'hybrid'` 时访客可以申请认领。
- 店主可以批准、拒绝或撤销认领。
- 同一角色同一时间最多只有一个 `approved` 认领。
- 认领只绑定当前空间和当前 NPC，不创建访客好友、私信、动态墙或跨空间社交关系。

---

## 五、TavernCharacter（空间角色）

空间角色是空间内的 AI NPC。格式兼容 SillyTavern Character Card V2。

```typescript
/**
 * 空间角色 — 空间内的 AI NPC
 * 兼容 SillyTavern Character Card V2 格式
 */
interface TavernCharacter {
  id: string;                    // UUID
  tavern_id: string;             // 所属空间

  // ── 角色信息 ──────────────────────
  name: string;                  // 角色名称（如「刘大爷」）
  description: string;           // 角色描述（给主人看）
  personality: string;           // 性格设定
  scenario: string;             // 场景设定（AI 的舞台指令）
  gender: Gender;                // NPC 性别；缺省 unspecified，不由平台自动推断

  // ── AI 对话核心 ───────────────────
  system_prompt: string;         // 系统提示词（AI 的角色扮演指令）
  first_mes: string;             // AI 首次发言（开场白）
  mes_example: string;           // 示例回复格式（给 AI 参考风格）

  // ── 扩展 ──────────────────────────
  alternate_greetings?: string[]; // 备用开场白
  tags: string[];               // 标签（["门卫", "退休教师", "男性"]）
  hobbies: string[];            // 兴趣与爱好标签（["黑胶唱片", "复古游戏"]）

  // ── 立绘 ──────────────────────────
  avatar: string;                // 默认立绘 URL
  sprites: Record<string, string>; // 表情立绘映射 (e.g. { "joy": "url" })
  appearance: dict[str, Any];    // 角色长相/外貌 preset 信息
  talkativeness: float;          // 0.0-1.0，群聊发言积极度
}
  sprites?: TavernSpriteSet;     // 表情精灵图
}

/**
 * 表情精灵图集合
 */
interface TavernSpriteSet {
  neutral?: string;     // 路径或 URL
  happy?: string;
  sad?: string;
  angry?: string;
  curious?: string;
  suspicious?: string;
  // 可扩展更多情绪
}
```

约束：

- `gender` 是自声明 / 店主填写的有限枚举字段；缺失或旧数据读取时必须兼容为 `unspecified`。
- 访客 `gender` 仅绑定当前 `tavern_id + visitor_id` 的 `VisitorState`，不得扩展为全局用户资料、匹配推荐或公开社交筛选。
- 平台不得从姓名、头像、对话或 AI 草稿中自动推断 / 覆盖游客或 NPC 性别。

---

## 六、AI 草稿（非持久 Schema）

`AI 草稿` 是平台辅助店主创作 NPC 的临时状态，不是新的持久化 Schema。MVP 中，平台只生成未发布的角色卡字段草稿：

```typescript
interface NpcDraftPreview {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  system_prompt: string;
  first_mes: string;
  mes_example: string;
  tags: string[];
}
```

约束：

- 店主确认前，AI 草稿不得进入公开 `Tavern` payload。
- 店主确认前，AI 草稿不得覆盖已有 `TavernCharacter`。
- 店主确认前，AI 草稿不得随空间包导出。
- 店主确认后，草稿按现有 `TavernCharacter` 字段保存；AI 草稿本身不新增持久字段。
- 若未来要保存草稿历史、审核状态或多版本草稿，必须另行设计持久化模型并更新本文档。

---

## 七、WorldInfoEntry（世界知识条目）

世界知识条目用于在对话中注入背景信息。当用户消息包含特定关键词时，对应的条目内容会被追加到 system prompt 中。

```typescript
/**
 * 世界知识条目 — 关键词触发的上下文注入
 */
interface WorldInfoEntry {
  id: string;
  tavern_id: string;

  keys: string[];               // 触发关键词（精确匹配）
  keys_secondary?: string[];    // 次要关键词（模糊匹配）

  content: string;             // 注入内容（通常是带 {{user}} / {{char}} 的对话格式）

  // ── 注入规则 ──────────────────────
  selective: boolean;           // true = 选择性注入（关键词匹配才注入）
  constant: boolean;           // true = 常驻注入（始终存在）
  depth: number;               // 搜索深度（对话历史往前看多少条）
  order: number;              // 注入顺序（数字越小越先）
  probability: number;         // 注入概率 0–100

  disable: boolean;            // 禁用开关
}
```

---

## 八、LLMConfig（LLM 配置）

LLM 配置由空间主人提供，用于驱动空间内的 AI 对话。API Key 和敏感信息仅主人可见。

```typescript
/**
 * LLM 配置 — 空间主人提供的 AI 后端配置
 * 敏感字段（api_key）仅 owner 可见
 */
interface LLMConfig {
  backend: 'openai' | 'anthropic' | 'ollama' | 'openrouter';
  model: string;                // 模型名（如 gpt-4o-mini, claude-3-haiku-20240307）

  // ── 连接 ──────────────────────────
  api_key: string;              // API Key（主人私藏，后端不返回给非 owner）
  base_url?: string;           // 自定义端点（如兼容 OpenAI 的代理）

  // ── 参数 ──────────────────────────
  temperature?: number;         // 温度参数，默认 0.8
  max_tokens?: number;         // 最大 token 数
  top_p?: number;              // top_p 参数

  // ── 统计 ──────────────────────────
  token_used?: number;         // 累计使用 token（仅 owner 可见）
}
```

---

## 九、VisitorState（访客状态）

记录访客与特定空间的关系状态。

```typescript
/**
 * 访客状态 — 访客与空间的关系
 */
interface VisitorState {
  visitor_id: string;           // 访客 user_id
  tavern_id: string;            // 空间 id
  gender: Gender;                // 访客自声明性别；缺省 unspecified，空间内作用域

  visit_count: number;          // 访问次数
  first_visit?: string;         // 首次访问时间
  last_visit?: string;          // 最近访问时间

  relationship: {
    strength: number;          // 关系强度 0.0–1.0
    stage: AffinityStage;     // 好感度阶段
  };
}

/**
 * 好感度阶段 (AffinityStage)
 *
 * 从陌生人到知己，共 6 个阶段。
 * 新访客默认 stranger，每次访问后计算变化。
 * 超过 7 天未访问触发小幅衰减（-0.02），超过 30 天触发大幅衰减（-0.05）。
 * 衰减后阶段可能降级。
 */
type AffinityStage =
  | 'stranger'        // 陌生人  [0, 0.15)
  | 'acquaintance'    // 点头之交  [0.15, 0.30)
  | 'familiar'        // 熟面孔  [0.30, 0.50)
  | 'friend'          // 朋友    [0.50, 0.70)
  | 'close_friend'    // 挚友    [0.70, 0.90)
  | 'best_friend';    // 知己    [0.90, 1.00]

/**
 * 好感度阶段元数据（GET /api/v1/affinity/stages 返回）
 */
interface AffinityStageDefinition {
  stage: AffinityStage;
  name_zh: string;
  name_en: string;
  strength_min: number;
  strength_max: number;
  tone: string;   // CSS tone class: neutral | cyan | blue | green | violet | gold
}
```

---

## 十、ChatMessage（对话消息）

对话历史记录。

```typescript
/**
 * 对话消息
 */
interface ChatMessage {
  id: string;
  tavern_id: string;
  character_id: string;
  visitor_id: string;

  role: 'user' | 'assistant';
  content: string;

  timestamp: string;           // ISO 时间戳

  // token 统计（仅 owner 可见）
  token_count?: number;
}
```

---

## 十一、Gameplay（空间玩法）

Gameplay 是空间内容的一部分：`GameplayDefinition` 随 Tavern 导出 / 导入；访客运行时进度进入 `GameplaySession`，不混入 `ChatMessage`，也不进入公开 Tavern payload。

```typescript
/**
 * 玩法定义 — 店主发布在单间空间内的可玩体验
 */
interface GameplayDefinition {
  id: string;
  title: string;                 // 最长 48 字
  status: 'draft' | 'published' | 'disabled';
  summary?: string;              // 访客可见简介
  entry_label?: string;          // 入口按钮文案
  mode: 'ai_directed_branch' | string;

  owner_brief: {
    goal: string;                // 玩法目标
    tone?: string;               // 主持语气
    materials: string[];         // 可用素材
    forbidden: string[];         // 安全 / 隐私边界
  };

  nodes: GameplayNode[];
  completion: {
    complete_node_ids: string[];
    reward_text: string;
    memory_atom: { enabled: boolean }; // 默认 false，首版不自动写长期记忆
  };
}

interface GameplayNode {
  id: string;
  kind: 'scene' | 'complete' | string;
  narration: string;
  choices: GameplayChoice[];
  fallback_events: GameplayFallbackEvent[];
}

interface GameplayChoice {
  id: string;
  label: string;
  next_node_id?: string;
  completes?: boolean;
}

interface GameplayFallbackEvent {
  id: string;
  text: string;
  next_node_id?: string;
}

/**
 * 玩法会话 — 某个访客在某间空间的一局玩法进度
 */
interface GameplaySession {
  id: string;
  tavern_id: string;
  gameplay_id: string;
  visitor_id: string;
  character_id?: string;
  state: 'started' | 'in_progress' | 'completed' | 'abandoned';
  current_node_id: string;
  turn_count: number;
  variables: Record<string, unknown>;
  events: GameplayEvent[];
  completion?: {
    summary: string;
    reward_text: string;
    completed_at: string;
  };
  created_at: string;
  updated_at: string;
}

interface GameplayEvent {
  id: string;
  type: 'started' | 'choice' | 'ai_director' | 'random_event' | 'completed' | 'abandoned' | string;
  timestamp: string;
  narration: string;
  from_node_id?: string;
  to_node_id?: string;
  choice_id?: string;
  seed?: string;                 // fallback 可回放随机种子
  source?: 'system' | 'choice' | 'ai' | 'fallback' | string;
  metadata?: Record<string, unknown>;
}
```

约束：

- 访客只能通过专用 Gameplay API 读取自己的 `GameplaySession`；店主可查看本空间 session 摘要。
- `_gameplay_sessions` 是 `TavernStore` 私有桶，不写入公开 Tavern payload，不随空间包导出。
- AI Director 只能在店主给出的玩法定义和安全边界内主持；没有可用 AI 或 AI 返回非法结构时，使用节点 `fallback_events`。
- 玩法不等于战斗 / 等级 / 装备 / 排行榜系统；不得要求真实危险行动或索取敏感身份信息。

---

## 十一-A、Engagement（空间纪念币 / 礼物 / 抽奖券）

Engagement 是绑定 **当前访客 × 当前空间** 的轻量回访循环，不是平台钱包、付费补抽或可交易库存系统。

```typescript
interface EngagementConfig {
  coin_label: string; // 默认“纪念币”
  earn_limits: {
    daily_per_visitor: number;
    weekly_per_visitor: number;
  };
  reward_rules: Array<{
    source_type: 'gameplay_completion' | string;
    source_id: string;          // 通常为 GameplayDefinition.id
    amount: number;
    daily_claim_limit: number;
  }>;
  gift_catalog: Array<{
    id: string;
    name: string;
    icon?: string;
    price: number;
    affinity_delta: number;
    cooldown_hours: number;
    status?: 'published' | string;
  }>;
  bonus_draw: {
    enabled: boolean;
    voucher_price: number;
    daily_limit: number;
    weekly_limit: number;
    hidden_unlock_allowed: boolean;
  };
}

interface VisitorEngagementProgress {
  wallet: {
    balance: number;
    lifetime_earned: number;
    lifetime_spent: number;
  };
  ledger: Array<{
    id: string;
    type: 'earn' | 'spend';
    source_type: string;
    source_id: string;
    amount: number;
    created_at: string;
  }>;
  daily_counters: Record<string, {
    earned: number;
    gift_affinity_by_character: Record<string, number>;
    bonus_draws_used: number;
  }>;
  gift_history: Array<{
    id: string;
    gift_id: string;
    character_id: string;
    amount: number;
    affinity_delta: number;
    cap_applied: boolean;
    narration: string;
    created_at: string;
  }>;
  bonus_draw_vouchers: Array<{
    id: string;
    earned_at: string;
    redeemed: boolean;
    redeemed_at?: string;
  }>;
  claimed_session_ids: string[];
}
```

约束：

- `EngagementConfig` 由店主维护，但 **不进入公开 Tavern payload**；访客通过专用 engagement API 读取安全子集。
- 没有显式店主配置时，可从已发布 `GameplayDefinition` 推导默认 `reward_rules`；默认奖励仍是每空间、每访客的非付费纪念币。
- `VisitorEngagementProgress` 是访客私有运行时数据；当前实现挂在 `VisitorState.metadata._engagement_progress`，不得作为公开 Tavern 内容导出。
- 纪念币不能充值、提现、转让、跨空间流通，也不得与店主或平台结算。
- bonus draw voucher 只能由纪念币兑换，且必须受每日 / 每周限额约束；它不是付费补抽，也不是平台级抽卡经济。
- 礼物目录必须来自店主确认的配置或默认模板；平台不能绕过店主自动发布礼物内容。

---

## 十二、Tavern Skill Packs（空间技能包）

Tavern Skill Packs 是店主显式启用的 NPC 能力包：它让 NPC “可以做某类被允许的事”，但不改变 TavernCharacter 身份、世界书、访问规则、LLM 配置或 StateCard 正史。MVP 只内置 `local-rumor`（环境传闻）技能包。

```typescript
type SkillPackId = 'local-rumor';

interface SkillPackDefinition {
  id: SkillPackId | string;
  label: string;
  description: string;
  category: string;
  default_enabled: boolean;
  capabilities: string[];  // owner 可读的能力说明
  prompt_notes: string[];  // 注入给运行时的边界说明
  config_schema?: Record<string, unknown>;
}

interface SkillPackSetting {
  id: SkillPackId | string;
  enabled: boolean;
  config: {
    limit?: number;        // local-rumor 每轮最多参考传闻数，1-5，默认 3
    [key: string]: unknown;
  };
}
```

约束：

- `skill_packs` 是 Tavern 持久字段，默认空数组；API 展示时会合并为安全的 disabled 默认设置。
- 店主通过 `GET/PUT /api/v1/taverns/{tavern_id}/skill-packs` 查看和保存；非店主不能修改。
- `local-rumor` 只能引用已有 NeighborhoodRumor；没有传闻时不得编造目标空间、现实地点或事实。
- 技能包提示必须说明“传闻不是正史”，不得自动写入记忆、状态卡、角色卡、世界书或空间事实。
- `revisit-care`、`visual-souvenir` 等需要主动通知、图片/音频隐私、成本与资源留存规则的能力不属于本 Schema 版本。

---

## 十三、StateCard / Canon Ledger（连续性状态卡）

StateCard 是长期空间会话的连续性台账：AI / NPC 可以提出“候选变化”，但这些变化默认是 `pending`，不会直接覆盖店主配置的 Tavern、TavernCharacter、WorldInfoEntry、访问规则或 LLM 配置。访客或店主确认后，状态卡才进入 `confirmed` 正史记录。

StateCard 存储在 `TavernStore` 私有桶 `_state_cards` 中，不进入公开 Tavern payload，不随空间包导出。

```typescript
type StateCardCategory = 'character' | 'task' | 'resource' | 'conflict' | 'event_log';
type StateCardStatus = 'pending' | 'confirmed' | 'rejected' | 'superseded';
type StateCardScope = 'visitor' | 'tavern';

interface StateCard {
  id: string;
  tavern_id: string;
  category: StateCardCategory;
  status: StateCardStatus;
  canon_scope: StateCardScope;     // visitor: 某访客连续性；tavern: 空间级正史
  title: string;                   // 最长 80 字
  summary: string;                 // 最长 600 字；只写可观察摘要，不写 chain-of-thought
  visitor_id?: string;
  character_id?: string;
  source: 'chat' | 'group_chat' | 'gameplay' | 'manual' | 'system' | string;
  source_message_ids: string[];
  proposed_by: string;
  confirmed_by?: string;
  created_at: string;
  updated_at: string;
  fixed_canon: boolean;            // true 时只能由店主维护
  metadata: {
    contradiction_candidate?: boolean;
    decision_note?: string;
    decided_by?: string;
    decided_at?: string;
    [key: string]: unknown;
  };
}
```

约束：

- Chat / group chat 只能生成 `pending` 候选卡；候选卡可以覆盖 `task`、`resource`、`conflict`、`event_log` 等连续性变化。
- `confirmed / rejected / superseded` 必须通过专用状态卡 API 决定；确认动作只更新状态卡，不修改 Tavern 固定字段。
- 非店主访客只能确认 / 忽略自己的 `visitor` scope 卡；`tavern` scope 或 `fixed_canon=true` 只能由店主维护。
- 若候选变化疑似引用未确认资源、任务或关系，后端可标记 `metadata.contradiction_candidate=true`，前端应提醒用户核对。
- 状态卡不得成为传统 RPG 属性、战斗装备、排行榜或公开社交资料。

API 端点：

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/v1/taverns/{id}/state-cards` | 列出当前用户可见状态卡，可按 `status/category/canon_scope/visitor_id/character_id` 过滤 |
| POST | `/api/v1/taverns/{id}/state-cards` | 创建手动状态卡或候选卡；访客只能创建自己的 `pending visitor` 卡 |
| PUT | `/api/v1/taverns/{id}/state-cards/{card_id}/decision` | 将卡决定为 `confirmed / rejected / superseded` |

---

## 十四、SillyTavern 角色卡字段映射

SillyTavern 角色卡 V2 JSON 导入时的字段映射：

| SillyTavern 字段 | FableMap 字段 |
|-----------------|--------------|
| `data.name` | `name` |
| `data.description` | `description` |
| `data.personality` | `personality` |
| `data.scenario` | `scenario` |
| `data.system_prompt` | `system_prompt` |
| `data.first_mes` | `first_mes` |
| `data.mes_example` | `mes_example` |
| `data.tags` | `tags` |
| `data.character_book.entries` | `world_info` |
| `data.alternate_greetings` | `alternate_greetings` |

说明：`gender` 是 FableMap 扩展字段，不属于 SillyTavern Character Card V2 标准映射；导入旧角色卡时缺省为 `unspecified`，若导入 payload 显式提供 `gender` 则按上方 `Gender` 枚举归一化。

---

## 十五、旧世界 Schema（历史参考）

以下为旧的 world Schema，保留为历史参考。新的空间平台不再使用这套概念体系。

旧 Schema 核心结构（Place/Faction/World 体系）：

```json
{
  "world_id": "h3_or_grid_key",
  "seed": "stable-seed",
  "source": {
    "lat": 51.5237,
    "lon": -0.1585,
    "radius_m": 300,
    "provider": "overpass"
  },
  "region": {},
  "pois": [],
  "roads": [],
  "landmarks": [],
  "factions": [],
  "historical_echoes": [],
  "memory_anchors": [],
  "sprites": [],
  "state": {}
}
```

详细字段说明请参考 `docs/WORLD_SCHEMA.md` 的历史版本。

---

## 十六、NpcPublicBond（NPC 公开关系 / 结缘系统）

访客与 NPC 建立公开的长期/永久关系（结缘），经店主审批后生效，关系对其他用户可见。

### 16.1 关系类型枚举（PublicBondType）

系统内置枚举，MVP 不开放店主自定义，分两类：

**严格 1:1 排他（capacity: 1）**

| 枚举值 | 中文名 | 英文名 | 说明 |
|--------|--------|--------|------|
| `sweetheart` | 情侣 | Sweetheart | 浪漫亲密关系 |
| `brother` | 兄弟 | Brother | 男性友谊 |
| `sister` | 姐妹 | Sister | 女性友谊 |
| `best_friend` | 闺蜜 / 知己 | Best Friend | 亲密同性友谊 |
| `confidant` | 红颜知己 | Confidante | 女性对男性知己 |
| `male_confidant` | 蓝颜知己 | Male Confidant | 男性对女性知己 |
| `sibling_younger` | 兄妹 | Older Brother | 兄 + 妹妹 |
| `sibling_older` | 姐弟 | Older Sister | 姐 + 弟弟 |
| `sworn_sibling` | 结拜兄妹 | Sworn Sibling | 结义兄弟/姐妹 |

**非排他（可多人，capacity: N）**

| 枚举值 | 中文名 | 英文名 | 说明 |
|--------|--------|--------|------|
| `master` | 师徒 | Master-Disciple | 师父/徒弟 |
| `junior_sister` | 师姐 | Junior Sister | 师姐（女）|
| `junior_brother` | 师兄 | Junior Brother | 师兄（男）|
| `disciple_sister` | 师妹 | Disciple Sister | 师妹（女）|
| `disciple_brother` | 师弟 | Disciple Brother | 师弟（男）|
| `guardian` | 守护 | Guardian | 守护者 |
| `contract_beast` | 契约兽 | Contract Beast | 契约灵宠 |

> `best_friend`（公开关系类型）与 `AffinityStage.best_friend`（好感度阶段）是不同概念，内部明确区分。

### 16.2 触发条件

访客与 NPC 的 `VisitorState.relationship.strength >= 0.70`（AffinityStage.close_friend 或以上）时，展示申请入口。

### 16.3 NpcPublicBond 数据模型

```typescript
/**
 * NPC 公开关系记录
 */
interface NpcPublicBond {
  id: string;
  tavern_id: string;
  character_id: string;
  visitor_id: string;
  bond_type: PublicBondType;       // 关系类型枚举值
  status: PublicBondStatus;        // pending | active | revoked | expired
  created_at: string;             // ISO 时间戳
  approved_at?: string;           // 审批通过时间
  revoked_at?: string;             // 撤销时间
  expires_at?: string;            // 过期时间（MVP 不启用）
  approved_by?: string;            // 审批人 ID（店主或 platform_admin）
  revoked_by?: string;            // 撤销人 ID
  visitor_note?: string;          // 访客申请留言
  owner_note?: string;            // 店主审批/拒绝备注
  revoke_reason?: string;         // 撤销原因
  metadata?: Record<string, unknown>;  // 扩展字段，含 queue_position
}

/**
 * 关系状态枚举
 */
type PublicBondStatus = "pending" | "active" | "revoked" | "expired";
```

### 16.4 NpcPublicBondQueue 数据模型

当 1:1 NPC 已有活跃关系时，新申请进入等待队列：

```typescript
/**
 * 公开关系等待队列
 */
interface NpcPublicBondQueue {
  id: string;
  tavern_id: string;
  character_id: string;
  visitor_id: string;
  bond_type: PublicBondType;
  position: number;               // 等待位置，1 为队列首位
  status: QueueStatus;            // waiting | promoted | expired
  created_at: string;             // ISO 时间戳
  promoted_at?: string;          // 晋升为 active 的时间
}

/**
 * 队列状态枚举
 */
type QueueStatus = "waiting" | "promoted" | "expired";
```

### 16.5 权限与审批规则

| 场景 | 审批方 |
|------|--------|
| 私人店 NPC | 店主（`Tavern.owner_id`） |
| 系统店纯 NPC | 平台管理员（`platform_admin`） |

**所有变更 NPC 公开身份的申请，都必须经审批生效，不得自动绑定。**

### 16.6 公开展示规则

- NPC 卡片显示"已结缘"徽标，悬停显示关系类型
- **不暴露访客身份**：公开端点 `GET /taverns/{tavern_id}/characters/{character_id}/public-bonds` 只返回 `bond_type` 与 `status`，不含 `visitor_id`

### 16.7 冲突处理

- **1:1 排他关系**：NPC 已有活跃 1:1 关系时，新申请自动进入等待队列（position 按申请顺序排列）；当前关系撤销/过期后，队列首位自动晋升为 `active`
- **非排他关系（capacity: N）**：可允许多个访客同时与同一 NPC 保持活跃关系

### 16.8 撤销规则

店主可随时撤销，撤销后该访客申请记录清除，NPC 可接受新申请。

### 16.9 API 端点摘要

| 方法 | 路径 | 说明 | 可见性 |
|------|------|------|--------|
| GET | `/api/v1/taverns/{tavern_id}/characters/{character_id}/public-bond` | 当前访客关系状态 | 访客认证 |
| GET | `/api/v1/taverns/{tavern_id}/characters/{character_id}/public-bonds` | NPC 所有公开关系 | 公开 |
| POST | `/api/v1/taverns/{tavern_id}/characters/{character_id}/public-bond/apply` | 访客申请结缘 | 访客认证 |
| POST | `.../public-bonds/{bond_id}/approve` | 店主审批通过 | 店主认证 |
| POST | `.../public-bonds/{bond_id}/reject` | 店主拒绝 | 店主认证 |
| POST | `.../public-bonds/{bond_id}/revoke` | 店主撤销 | 店主认证 |
| GET | `/api/v1/taverns/{tavern_id}/public-bond-queue` | 等待队列 | 店主可见 |
| DELETE | `/api/v1/taverns/{tavern_id}/public-bond-queue/{queue_id}` | 取消等待 | 访客认证 |
| GET | `/api/v1/public-bond/types` | 所有关系类型定义 | 公开 |

### 16.10 数据库表

对应 SQLAlchemy 表：`taverns`、`characters`、`world_info`、`visitors`、`chat_messages`、`memory_atoms`、`gameplay_sessions`、`llm_configs`、`tavern_messages`、`owner_configs`、`visitor_notes`、`notifications`、`neighborhood_rumors`、`homes`、`home_visits`、`writeback_states`、`npc_public_bonds`、`npc_public_bond_queues`，详见 `backend/src/fablemap_api/infrastructure/models.py`。

---


## 十七、RelationshipGraph（空间/角色关系图谱）

RelationshipGraph 表达店主 / 系统在其治理范围内确认的空间与角色关系，以及这些关系对单个访客的私有关系投影。它不是访客社交图谱、阵营战或排行榜系统。

```typescript
type RelationshipNodeType = 'tavern' | 'character';
type RelationshipBehaviorType = 'friendly' | 'allied' | 'neutral' | 'rival' | 'hostile';
type RelationshipStrengthPreset = 'weak' | 'normal' | 'strong';
type RelationshipGovernanceMode = 'manual' | 'assisted' | 'delegated_ai' | 'system_ai';
type RelationshipEdgeStatus = 'pending' | 'confirmed' | 'rejected' | 'disabled';

interface RelationshipEdge {
  id: string;
  source_owner_id: string;       // 声明该立场的 owner / system scope
  source_tavern_id: string;      // source node 所属 tavern
  source_node_type: RelationshipNodeType;
  source_node_id: string;
  target_owner_id: string;
  target_tavern_id: string;
  target_node_type: RelationshipNodeType;
  target_node_id: string;
  behavior_type: RelationshipBehaviorType;
  display_name: string;          // 店主可编辑展示名，逻辑仍使用 behavior_type
  description?: string;
  strength_preset: RelationshipStrengthPreset;
  status: RelationshipEdgeStatus;
  governance_mode: RelationshipGovernanceMode;
  confirmed_by?: string;
  confirmed_by_type?: 'owner' | 'delegated_ai' | 'system_ai' | string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

interface VisitorRelationshipProjection {
  visitor_id: string;
  node_type: RelationshipNodeType;
  node_id: string;
  tavern_id?: string;
  affinity: number;              // 0.0–1.0，兼容既有正向好感语义
  hostility: number;             // 0.0–∞，敌意 / 紧张度，不写入 relationship_strength
  last_event_at?: string;
  updated_at: string;
  metadata?: Record<string, unknown>; // source_edge_id / provenance 等
}
```

约束：

- `RelationshipEdge` 是 owner / system 视角的正史或候选；`pending` / `disabled` 不参与传播。
- 跨 owner 的一边声明只能作为 source owner 的 perspective；不得强迫 target owner 接受、展示或用于其 prompt / 传播。
- Same-owner 或 system/public-welfare scope 内的关系可在该治理范围内双向生效；跨 owner 仍以各自方向的 edge 表达。
- 访客投影为私有运行时数据；不得进入公开 Tavern payload，不得作为访客间社交资料。
- 负向效果先降低 `affinity` 到 0，再把剩余量计入 `hostility`；不得把负数强塞进既有 `VisitorState.relationship_strength`。
- 关系类型固定为 `friendly/allied/neutral/rival/hostile`，强度固定为 `weak/normal/strong`；展示名可定制但不能改变后端公式。
- AI 可按 `delegated_ai` / `system_ai` 自动确认 source-side perspective，但不能替另一个 owner 自动确认 target-side 关系。

对应 SQLAlchemy 表：`relationship_edges`、`visitor_relationship_projections`。

## 版本历史

- v1.5 (2026-05-06): 增加 RelationshipGraph 基础 Schema：owner/source-side `relationship_edges` 与 visitor-private `visitor_relationship_projections`，采用双轴 affinity/hostility、固定关系行为枚举、strength preset 与治理模式。
- v1.4 (2026-05-06): 运行时持久化默认切换为数据库存储；未配置数据库 URL 时使用 `<output_root>/fablemap.sqlite3`，JSON 文件存储仅保留为显式本地兼容模式。
- v1.3 (2026-04-30): `PlaceType` 增加公开 `hospital` 类型，用于医院 / 护士站 / 分诊便签等地点语义；医院类 NPC 内容必须保留现实医疗安全边界，不替代医生诊疗、处方或急救。
- v1.2 (2026-04-29): 增加 Tavern Skill Packs MVP：`Tavern.skill_packs` 持久字段、`local-rumor` 环境传闻技能包、店主 `GET/PUT /skill-packs` 配置端点；技能包只能启用显式能力，不自动改写角色、世界书、记忆或正史状态卡。
- v1.1 (2026-04-29): 增加 StateCard / Canon Ledger 连续性状态卡：Chat 可生成 pending 任务、资源、冲突、事件台账候选；确认后进入结构化正史记录；状态卡存储在 `_state_cards` 私有桶，不进入公开 Tavern payload 或空间包。
- v1.0 (2026-04-28): 增加 NpcPublicBond（NPC 公开关系 / 结缘系统）：16 种系统内置关系类型（9 种 1:1 排他 + 7 种多人），close_friend（strength ≥ 0.70）触发申请，经店主审批生效，1:1 冲突进入等待队列，店主可随时撤销。数据库表 `npc_public_bonds`、`npc_public_bond_queues`；完整 API 路由 + 服务层；前端 BondBadge / BondApplyModal 组件；`docs/WORLD_SCHEMA.md` 更新。
- v0.9 (2026-04-27): 增加好感度系统（Affinity System）：6 阶段好感度（stranger → acquaintance → familiar → friend → close_friend → best_friend），情感分析自动计算，衰减机制（7 天未访问 -0.02，30 天 -0.05）；更新 VisitorState.relationship.stage 枚举；新增 `GET /api/v1/affinity/stages` 接口；前端 AffinityBadge / AffinityProgress 组件。
- v0.8 (2026-04-27): 增加 `Gender` 枚举、`TavernCharacter.gender` 与 `VisitorState.gender`；游客性别为 tavern-scoped 自声明字段，NPC 性别为店主填写字段，旧数据默认 `unspecified`，不得自动推断或用于公开社交筛选。
- v0.7 (2026-04-27): 增加 Place/Home MVP Schema：`place_type`、`HomeMember`、可扩展 `PlaceRelationshipType`/`PlaceRelationship`、学校成员摘要与 Home 默认私密 / 跨主人审批边界；`school_enrollment` 是关系类型之一而非唯一关系。
- v0.6 (2026-04-27): 增加时间系统：`timezone`、`operating_hours`、`OperatingHours` 类型、`TavernTimeStatus` 接口。支持基于地理位置的时区推断和精确到分钟的营业时间管理。
- v0.5 (2026-04-27): 增加 AI 草稿边界说明；AI 草稿是未发布临时状态，确认后才映射为现有 TavernCharacter，MVP 不新增持久 Schema。
- v0.4 (2026-04-27): 增加 `layout_style`，用于持久化空间页默认布局样式，缺省为 `lobby`。
- v0.3 (2026-04-21): 增加 `gameplay_definitions`、`GameplayDefinition`、`GameplaySession`、`GameplayEvent`，明确玩法会话与公开 Tavern payload 的边界。
- v0.2 (2026-04-14): 按空间平台方向重写，替换为 Tavern/TavernCharacter/LLMConfig 模型。旧 Schema 降级为历史参考。
- v0.1 (2026-03-10): 初始版本，基于 AI 生成叙事引擎方向。
