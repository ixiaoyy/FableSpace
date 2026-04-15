# FableMap 世界 Schema v0.2

> **状态**：本文档已更新以反映赛博酒馆平台的数据模型。旧 `world` Schema 作为历史参考保留。新的核心数据模型为 `Tavern`、`TavernCharacter`、`LLMConfig` 等。

---

## 一、核心概念映射

| 旧概念（叙事引擎版） | 新概念（赛博酒馆版） | 说明 |
|---------------------|---------------------|------|
| Place / POI | Tavern | 地图上的可进入场所 |
| Faction | TavernCharacter | 酒馆内的 AI NPC |
| World Info | WorldInfoEntry | 关键词触发的背景注入 |
| World | TavernScene | 酒馆场景设定 |
| Player State | VisitorState | 访客与酒馆的关系 |
| OSM Data | 地图底图 | 不变 |
| Fantasy Name | Tavern Name | 自定义 |

---

## 二、Tavern（酒馆）

酒馆是 FableMap 赛博酒馆平台的核心实体。

```typescript
/**
 * 酒馆 — 地图上的一个可进入场所
 */
interface Tavern {
  // ── 身份 ──────────────────────────
  id: string;                    // UUID，唯一标识
  name: string;                  // 酒馆名称（如「第三中学传达室」）
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

  // ── 酒馆内容 ──────────────────────
  characters: TavernCharacter[];  // 酒馆内的 NPC 列表
  world_info: WorldInfoEntry[];   // 世界知识（关键词注入）
  scene_prompt?: string;          // 场景氛围提示词（附加上下文）
}
```

---

## 三、TavernCharacter（酒馆角色）

酒馆角色是酒馆内的 AI NPC。格式兼容 SillyTavern Character Card V2。

```typescript
/**
 * 酒馆角色 — 酒馆内的 AI NPC
 * 兼容 SillyTavern Character Card V2 格式
 */
interface TavernCharacter {
  id: string;                    // UUID
  tavern_id: string;             // 所属酒馆

  // ── 角色信息 ──────────────────────
  name: string;                  // 角色名称（如「刘大爷」）
  description: string;           // 角色描述（给主人看）
  personality: string;           // 性格设定
  scenario: string;             // 场景设定（AI 的舞台指令）

  // ── AI 对话核心 ───────────────────
  system_prompt: string;         // 系统提示词（AI 的角色扮演指令）
  first_mes: string;             // AI 首次发言（开场白）
  mes_example: string;           // 示例回复格式（给 AI 参考风格）

  // ── 扩展 ──────────────────────────
  alternate_greetings?: string[]; // 备用开场白
  tags: string[];               // 标签（["门卫", "退休教师", "男性"]）

  // ── 立绘 ──────────────────────────
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

---

## 四、WorldInfoEntry（世界知识条目）

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

## 五、LLMConfig（LLM 配置）

LLM 配置由酒馆主人提供，用于驱动酒馆内的 AI 对话。API Key 和敏感信息仅主人可见。

```typescript
/**
 * LLM 配置 — 酒馆主人提供的 AI 后端配置
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

## 六、VisitorState（访客状态）

记录访客与特定酒馆的关系状态。

```typescript
/**
 * 访客状态 — 访客与酒馆的关系
 */
interface VisitorState {
  visitor_id: string;           // 访客 user_id
  tavern_id: string;            // 酒馆 id

  visit_count: number;          // 访问次数
  first_visit?: string;         // 首次访问时间
  last_visit?: string;          // 最近访问时间

  relationship: {
    strength: number;          // 关系强度 0.0–1.0
    stage: 'stranger' | 'acquaintance' | 'known' | 'trusted' | 'allied';
  };
}
```

---

## 七、ChatMessage（对话消息）

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

## 八、SillyTavern 角色卡字段映射

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

---

## 九、旧世界 Schema（历史参考）

以下为旧的 world Schema，保留为历史参考。新的赛博酒馆平台不再使用这套概念体系。

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

## 版本历史

- v0.2 (2026-04-14): 按赛博酒馆平台方向重写，替换为 Tavern/TavernCharacter/LLMConfig 模型。旧 Schema 降级为历史参考。
- v0.1 (2026-03-10): 初始版本，基于 AI 生成叙事引擎方向。
