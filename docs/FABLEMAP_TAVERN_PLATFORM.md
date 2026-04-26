# FableMap 赛博酒馆平台 — 产品设计文档

> **文档定位**：主线设计文档。定义 FableMap 的新方向——从叙事引擎转向赛博酒馆 UGC 平台。
> **版本**：v0.1 (2026-04-14)
> **状态**：起草中，待评审

---

## 一句话定位

**FableMap 是一个赛博酒馆平台：地图上的每个区域都是一个虚拟场所，用户可以开店、配置 AI NPC、接待访客。**

---

## 1. 核心理念

### 1.1 核心隐喻：赛博酒馆

现实中的酒馆（tavern）是旅人的歇脚处、消息的集散地、故事的孕育场。FableMap 把这个隐喻搬上地图：

- **地图即世界**：真实地图上的每个区域（学校、小区、公园、商场、咖啡馆……）都可以成为一个"酒馆"
- **酒馆即内容**：每个酒馆的内容（角色、场景、对话）由主人创作，不由平台生成
- **AI 即灵魂**：酒馆内的 NPC 默认由 AI 驱动，也可以在店主审批下由玩家临时扮演
- **Token 即燃料**：酒馆的运营燃料是 LLM token，由主人自行承担

这不是"AI 生成游戏地图"，而是"每个人都可以在地图上开一间自己的赛博酒馆"。

### 1.2 核心价值观

| 价值观 | 含义 |
|--------|------|
| **真实锚点** | 酒馆必须坐落在真实地图上，不能是虚假的虚构位置 |
| **主人主权** | 酒馆的内容、角色、氛围、访问规则完全由主人决定 |
| **最小平台** | 平台只做地图、注册、搜索、入口，不管酒馆内部的内容和对话 |
| **开源可移植** | 角色卡格式兼容 SillyTavern，数据可导出，不锁定用户 |
| **真实连接** | 酒馆可以反映真实地点的真实氛围（学校、派出所、社区），也可以完全虚构 |

### 1.3 与旧方向的核心差异

| 维度 | 旧方向 | 新方向 |
|------|--------|--------|
| **平台角色** | 内容生成方（平台生成幻想世界） | 内容平台方（用户生成酒馆内容） |
| **内容来源** | AI 生成 + OSM 数据 | 人工配置 + AI 驱动 |
| **核心体验** | 探索平台生成的世界 | 在酒馆中和 AI NPC 对话 |
| **商业模型** | 不明确 | Token 消耗由主人承担（简化版） |
| **用户角色** | 探索者 | 探索者 + 店主 + NPC 扮演者 |
| **叙事风格** | 幻想/奇幻 | 现实映射 + 自由创作 |

---

## 2. 用户角色与核心场景

### 2.1 用户角色

FableMap 有三类用户角色，同一个用户可以同时扮演多种身份：

```
用户
 ├── 探索者 (Explorer)
 │      打开地图 → 浏览酒馆 → 进入感兴趣的酒馆 → 和 NPC 聊天
 │
 ├── 店主 (Tavernkeeper)
 │      打开地图 → 选择地点 → 创建酒馆 → 添加角色 → 配置 LLM → 开门迎客
 │
 └── NPC 扮演者 (Performer)
        进入开启 hybrid 的酒馆 → 申请认领已有 NPC → 等待店主审批 → 在酒馆内扮演该角色
```

### 2.2 核心场景

#### 场景 A：店主开店

```
1. 探索地图，找到一个喜欢的地点（或选择任意空白坐标）
2. 点击"创建酒馆"
3. 填写酒馆基本信息：
   - 酒馆名称：「第三中学传达室」
   - 场景描述：「校门口的传达室，老式电话、搪瓷茶缸、堆积的报纸，刘大爷值守了40年」
4. 设置访问权限：
   - 公开（任何人都能进）
   - 密码（进门前要输密码）
   - 私人（只有自己能用）
5. 添加 NPC 角色：
   - 导入 SillyTavern 角色卡 JSON
   - 或手动填写：姓名、性格、场景设定、系统提示词、首次发言
6. 配置 LLM 后端：
   - 选择 backend: OpenAI / Claude / Ollama / OpenRouter
   - 填入 API Key
   - 选择模型
7. 保存 → 酒馆上线 → 地图上出现标记 → 游客可以进入
```

#### 场景 B：探索者逛街

```
1. 打开地图，看到散落在各处的酒馆标记
   - 🔓 公开酒馆（绿色标记）
   - 🔒 密码酒馆（橙色标记）
   - 👤 私人酒馆（灰色标记，不可见或仅主人可见）
2. 点击感兴趣的酒馆
3. 查看酒馆简介和角色列表
4. 进入酒馆：
   - 公开酒馆 → 直接进入
   - 密码酒馆 → 弹窗输入密码 → 验证通过后进入
5. 在酒馆内：
   - 选择一个 NPC 开始聊天
   - NPC 默认由酒馆主人的 LLM 驱动；hybrid 模式下可由店主审批通过的玩家扮演
   - 对话历史会被保存
6. 离开酒馆，下次还可以再来（NPC 会记住之前的对话）
```

#### 场景 C：店主维护

```
1. 打开"我的酒馆"面板
2. 查看酒馆状态：
   - 访客数量
   - Token 使用统计
   - 对话记录
3. 管理角色：
   - 添加新角色
   - 编辑现有角色
   - 删除角色
4. 管理访问：
   - 修改访问权限
   - 更新密码
5. 配置 LLM：
   - 更换 API Key
   - 切换模型
   - 调整参数
```

---

## 3. 数据模型

### 3.1 全局概念对应

```
FableMap 旧概念          FableMap 新概念（赛博酒馆）
───────────────────────────────────────────────
Place / POI              Tavern（酒馆）
Faction                  TavernCharacter（酒馆角色）
World Info               WorldInfoEntry（世界知识条目）
World                    TavernScene（酒馆场景）
Player State             VisitorState（访客状态）
OSM Data                 地图底图（不变）
Fantasy Name             Tavern Name（自定义）
Fantasy Type             Tavern Type（自定义或映射）
```

### 3.2 Tavern（酒馆）

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
  roleplay_mode: 'ai_only' | 'hybrid'; // 纯 AI 或店主审批的玩家混合扮演

  // ── 酒馆内容 ──────────────────────
  characters: TavernCharacter[];  // 酒馆内的 NPC 列表
  character_claims: CharacterClaim[]; // 玩家扮演 NPC 的认领记录
  world_info: WorldInfoEntry[];   // 世界知识（关键词注入）
  scene_prompt?: string;          // 场景氛围提示词（附加上下文）
}
```

### 3.3 TavernCharacter（酒馆角色）

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

### 3.4 WorldInfoEntry（世界知识条目）

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

### 3.5 LLMConfig（LLM 配置）

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

### 3.6 VisitorState（访客状态）

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

### 3.7 ChatMessage（对话消息）

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

## 4. 用户交互流程

### 4.1 地图浏览与发现

```
┌──────────────────────────────────────────────────────────────┐
│                     世界地图                                  │
│                                                              │
│     ┌────┐      🏫 第三中学           ┌────┐                │
│     │ 🔓 │  ┌──────────┐              │ 🔒 │ ← 密码酒馆      │
│     │公开│  │ 翠园小区  │              │密码│                │
│     └────┘  │ 🔓 🔓 🔓  │              └────┘                │
│             └──────────┘                                    │
│                                                              │
│  🏪 便利店    📍 当前位置   ☕ 星巴克咖啡                    │
│                                                              │
│  图例:  🔓 公开   🔒 密码   👤 私人（灰/不可见）           │
└──────────────────────────────────────────────────────────────┘
        ↓ 点击酒馆标记
┌────────────────────────────┐
│  第三中学传达室            │
│  校门口的传达室，刘大爷    │
│  值守了40年...             │
│                            │
│  🧑‍🦳 刘大爷（传达员）      │
│  👩‍🏫 李老师（语文教师）     │
│                            │
│  [ 进入酒馆 ]              │
└────────────────────────────┘
```

### 4.2 进入酒馆

```
入口检查流程：

    用户点击"进入酒馆"
          │
          ▼
    ┌─────────────┐
    │ access 是什么？ │
    └──────┬──────┘
           │
    ┌──────┼──────┬──────────┐
    ↓      ↓      ↓
 public  password  private
    │      │        │
    │      ↓        │
    │  输入密码     │
    │      │        │
    │  验证通过？   │
    │    /   \      │
    │  否   是      │
    │   \   /       │
    │    失败  进入  │
    │      │        │
    └──────┴────────┘
```

### 4.3 酒馆内交互

```
┌─────────────────────────────────────────┐
│  第三中学传达室            [ 返回地图 ]  │
├─────────────────────────────────────────┤
│                                         │
│  🧑‍🦳 刘大爷                              │
│  *抬起头，推了推老花镜* 哎呦，来啦？    │
│  进来坐，报纸要看自己拿啊。             │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  [对话区 - ChatPanel]                   │
│                                         │
│  👤 你: 大爷，这学校有多少年历史了？   │
│                                         │
│  🧑‍🦳 刘大爷: *沉思片刻* 嘿，那可有的说 │
│  了。我爸那会儿就在这儿教书，我顶替他 │
│  的班，一晃眼……四十年啦。             │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  [输入框 ....................... ] [发送]│
└─────────────────────────────────────────┘
```

### 4.4 店主管理

```
┌──────────────────────────────────────────────────────┐
│  我的酒馆                          [ + 添加酒馆 ]   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ 🏫 第三中学传达室                    [编辑]    │  │
│  │    公开 | 🔓 营业中                            │  │
│  │    角色: 2 | 访客: 15 | Token: 12,340          │  │
│  │    [ 访客记录 ] [ 对话历史 ]                   │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ ☕ 星巴克咖啡                        [编辑]    │  │
│  │    密码 | 🔒 营业中                            │  │
│  │    角色: 1 | 访客: 3 | Token: 5,120            │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │ 👤 翠园小区居委会                    [编辑]    │  │
│  │    私人 | ⚠️ LLM 未配置                        │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 5. 技术架构

### 5.1 系统分层

```
┌─────────────────────────────────────────────────────────────┐
│                    FableMap 赛博酒馆平台                     │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  地图展示层   │  酒馆体验层  │  AI 对话层    │  数据持久层    │
├──────────────┼──────────────┼──────────────┼────────────────┤
│  Canvas 2D   │  TavernPanel │  LLM Client   │  writeback.json│
│  Map Markers │  ChatPanel   │  Prompt Builder│  taverns.json  │
│  POI Overlay │  CharList    │  WorldInfo    │  chat_history   │
│  Map Controls│  Entry Flow  │  CharCard     │  user_state     │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

### 5.2 后端模块

```
fablemap/
├── tavern.py                 # 酒馆核心: Tavern CRUD, 状态管理
├── llm_clients.py            # LLM 客户端工厂: OpenAI / Claude / Ollama
├── char_card_parser.py       # SillyTavern 角色卡解析 (JSON / PNG tEXt)
├── world_info_injector.py    # 世界知识注入器 (关键词匹配)
├── api_service.py            # (已有) API 逻辑
├── writeback.py              # (已有) 状态持久化
│
├── web/
│   ├── router.py             # API 路由: /api/taverns/*, /api/chat
│   └── service.py            # 响应构建
│
└── cli.py                    # (已有) 命令行入口
```

### 5.3 前端模块

```
frontend/src/
├── services/
│   ├── tavernService.js      # 酒馆 CRUD, LLM 调用
│   ├── characterEngine.js    # (已有) 角色数据结构
│   ├── placeProtocol.js      # (已有) Place 协议
│   └── apiClient.js          # (已有) API 客户端
│
├── components/
│   ├── TavernMapPanel.jsx    # 酒馆地图面板 (扩展现有 WorldMap)
│   ├── TavernEntryPanel.jsx  # 酒馆入场 (密码验证等)
│   ├── TavernInterior.jsx    # 酒馆内部 (角色列表 + ChatPanel)
│   ├── ChatPanel.jsx         # (已有) 对话面板
│   ├── TavernOwnerPanel.jsx  # 店主管理面板 (添加角色、配置 LLM)
│   └── CharCardEditor.jsx   # 角色卡编辑器
│
└── hooks/
    ├── useTavernSession.js   # 酒馆会话 (进入、状态、权限)
    └── useTavernChat.js      # 酒馆对话 (发消息、收回复)
```

### 5.4 核心 API 端点

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/taverns` | 列出附近/全部酒馆 |
| POST | `/api/taverns` | 创建酒馆 |
| GET | `/api/taverns/{id}` | 获取酒馆详情 |
| PUT | `/api/taverns/{id}` | 更新酒馆 |
| DELETE | `/api/taverns/{id}` | 删除酒馆 |
| GET | `/api/taverns/{id}/characters` | 列出酒馆角色 |
| POST | `/api/taverns/{id}/characters` | 添加角色 |
| PUT | `/api/taverns/{id}/characters/{cid}` | 更新角色 |
| DELETE | `/api/taverns/{id}/characters/{cid}` | 删除角色 |
| POST | `/api/taverns/{id}/chat` | 发送消息并获取 AI 回复 |
| GET | `/api/taverns/{id}/chat` | 获取对话历史 |
| POST | `/api/taverns/{id}/enter` | 进入酒馆（验证密码） |

### 5.5 LLM 调用流程

```
用户发送消息
     │
     ▼
┌─────────────────┐
│ /api/taverns/:id/chat │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 权限检查         │ ── 密码验证 ──→ 拒绝
│ 状态检查         │ ── closed ──→ 返回"酒馆歇业"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 构建 Prompt      │
│ 1. 场景设定      │
│ 2. 角色系统提示  │
│ 3. WorldInfo 注入│
│ 4. 对话历史      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 调用 LLM         │ ── 用酒馆主人的 API Key
│ (OpenAI/Claude/ │
│  Ollama...)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 保存对话        │
│ 记录 token 统计 │
└────────┬────────┘
         │
         ▼
    返回 AI 回复
```

### 5.6 Prompt 构建策略

借鉴 SillyTavern PromptManager 的分层注入模式：

```javascript
function buildTavernPrompt(tavern, character, chatHistory) {
    const messages = [];

    // Layer 1: 场景设定 (system)
    if (tavern.scene_prompt) {
        messages.push({
            role: 'system',
            content: `你位于 ${tavern.name}。\n${tavern.scene_prompt}`
        });
    }

    // Layer 2: 角色系统提示 (system)
    if (character.system_prompt) {
        messages.push({
            role: 'system',
            content: character.system_prompt
        });
    }

    // Layer 3: 角色信息 (system)
    messages.push({
        role: 'system',
        content: `角色信息：
姓名：${character.name}
性格：${character.personality}
场景设定：${character.scenario}

开场白：${character.first_mes}`
    });

    // Layer 4: WorldInfo 注入 (system)
    const lastUserMsg = getLastUserMessage(chatHistory);
    const matchedEntries = matchWorldInfo(tavern.world_info, lastUserMsg);
    if (matchedEntries.length > 0) {
        messages.push({
            role: 'system',
            content: '【背景知识】\n' + matchedEntries.map(e => e.content).join('\n\n')
        });
    }

    // Layer 5: 对话历史 (messages)
    for (const msg of chatHistory.slice(-20)) {
        messages.push({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
        });
    }

    return messages;
}
```

### 5.7 数据持久化

```
fablemap_data/
├── writeback-state.json    # (已有) 玩家状态、POI 状态
├── taverns.json            # 所有酒馆配置（不含 api_key 明文）
├── taverns_keyvault.json   # 酒馆主人的 LLM API Key（加密存储）
└── chat_history/
    ├── {tavern_id}/
    │   ├── {visitor_id}_{char_id}.jsonl  # 对话历史
    │   └── visitor_states.json            # 访客状态
    └── _meta/
        └── token_stats.json               # Token 使用统计
```

---

## 6. 角色卡导入（SillyTavern 兼容）

SillyTavern 角色卡有两种格式，FableMap 支持两种导入方式：

### 6.1 方式一：粘贴 JSON（推荐）

主人直接复制 SillyTavern 导出的 JSON，粘贴到角色卡编辑器。

系统解析字段映射：

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

### 6.2 方式二：上传 PNG

上传 SillyTavern 角色卡 PNG（含 tEXt chunk），系统提取并解析。

```
PNG → 读取 tEXt chunk (chara/ccv3)
    → base64 decode
    → JSON 解析
    → 字段映射
    → 存入 TavernCharacter
```

---

## 7. 酒馆状态与"闭店"机制

酒馆主人配置自己的 LLM，Token 消耗由主人承担。

### 7.1 状态定义

| 状态 | 条件 | 访客体验 |
|------|------|----------|
| `open` | LLM 配置有效 | 正常聊天 |
| `closed` | LLM 配置缺失/无效/API 错误 | 提示"此店暂时歇业" |

### 7.2 Token 统计

- 每次对话请求记录 token 消耗
- 主人可在管理面板查看累计使用量
- 平台不介入计费，Token 消耗由主人的 LLM API 账户承担

---

## 8. 安全考虑

### 8.1 API Key 保护

- 酒馆主人的 `api_key` **仅本人可见**
- `/api/taverns/:id` 返回的酒馆详情**不包含** `api_key`
- 后端在调用 LLM 时，从加密存储中读取 key，不经过前端
- 建议对 `taverns_keyvault.json` 进行加密存储（AES 或类似方式）

### 8.2 访问控制

- 密码酒馆使用 bcrypt hash 验证
- 私人酒馆仅对 owner 可见
- 每个酒馆的操作（编辑、删除、添加角色）需要验证 owner 身份

### 8.3 LLM 调用安全

- 系统 prompt 注入防注入检查
- 禁止酒馆主人通过 system_prompt 构造恶意 prompt 影响平台
- 对话内容存储在酒馆级别，不跨酒馆共享

---

## 9. 不做什么（边界）

| 明确不做 | 原因 |
|----------|------|
| 平台付费/充值系统 | 过于复杂，先不做。Token 由主人自行在 LLM 官网充值 |
| 平台级别的 Token 市场 | 同上 |
| 自动生成酒馆内容 | 平台不生成内容，只托管主人创作的内容 |
| 无边界访客社交/聊天 | 不做好友、动态墙、跨酒馆私信或全局在线状态；玩家扮演 NPC 只允许在单个酒馆内由店主审批 |
| 自研地图渲染 | 使用现有 Canvas 2D 底图即可 |
| 强制幻想化转换 | 酒馆名称、描述完全由主人自定义 |

---

## 10. 实施阶段

### Phase 1: 数据结构 + 最小可运行 (1–2天)

- [ ] 扩展 `placeProtocol.js` 新增 `Tavern`, `TavernCharacter`, `LLMConfig` 类型
- [ ] 后端新增 `fablemap/tavern.py` 酒馆 CRUD
- [ ] 后端新增 `/api/taverns/*` 路由
- [ ] 前端新增 `tavernService.js`
- [ ] 酒馆地图标记（复用 WorldMap POI 标记）
- [ ] 酒馆创建面板（基础版）
- [ ] 最简 Chat Panel 接入（硬编码 system prompt，mock LLM）
- [ ] 酒馆入场（公开 + 密码）
- [ ] Chat 历史 writeback

### Phase 2: 角色管理 + SillyTavern 导入 (1–2天)

- [ ] 角色卡编辑器 UI
- [ ] JSON 粘贴导入（字段映射）
- [ ] PNG 上传导入（tEXt chunk 提取）
- [ ] 角色列表展示（带立绘）
- [ ] 角色切换（选择和哪个 NPC 聊天）

### Phase 3: LLM 接入 (1–2天)

- [ ] `llm_clients.py` 客户端工厂（OpenAI / Claude / Ollama）
- [ ] Prompt 构建器（场景 + 角色 + 历史）
- [ ] WorldInfo 注入器（关键词匹配）
- [ ] Chat Panel 真实 LLM 调用
- [ ] Token 统计记录
- [ ] 闭店状态检测（LLM 不可用时标记 closed）

### Phase 4: 店主管理 + 地图整合 (1–2天)

- [ ] "我的酒馆"管理面板
- [ ] LLM 配置 UI（API Key 输入）
- [ ] Token 使用统计面板
- [ ] 酒馆搜索与发现
- [ ] 地图酒馆标记分类显示（公开/密码/私人）

### Phase 5: 打磨 (持续)

- [ ] 情绪精灵图支持
- [ ] 角色卡导入错误处理
- [ ] LLM 降级策略（API 失败时的友好提示）
- [ ] 移动端适配
- [ ] 性能优化（大量酒馆时的地图渲染）

---

## 11. 文档导航

```
FableMap 赛博酒馆平台
├── docs/FABLEMAP_TAVERN_PLATFORM.md  ← 本文档 (主线)
├── docs/PRODUCT_BRIEF.md             ← 产品简报 (待更新)
├── docs/ARCHITECTURE.md               ← 系统架构 (待更新)
├── docs/WORLD_SCHEMA.md               ← 数据 Schema (参考)
├── docs/WORLD_WRITEBACK_PROTOCOL.md   ← 写回协议 (参考)
└── docs/INDEX.md                      ← 文档总览
```

---

## 附录 A：参考项目

- **SillyTavern** (D:\work\zuh\SillyTavern) — AI chat/roleplay 前端，角色卡格式为参考标准
- 角色卡规范：https://github.com/malfoyslastname/character-card-spec-v2
- SillyTavern 文档：https://docs.sillytavern.app/

## 附录 B：SillyTavern 角色卡 V2 格式

```json
{
  "spec": "chara_card_v2",
  "spec_version": "2.0",
  "data": {
    "name": "角色名称",
    "description": "角色描述",
    "personality": "性格设定",
    "scenario": "场景设定",
    "first_mes": "开场白",
    "mes_example": "示例回复",
    "creator_notes": "创作者备注",
    "system_prompt": "系统提示词",
    "post_history_instructions": "历史后置指令",
    "alternate_greetings": ["备用开场1", "备用开场2"],
    "tags": ["标签1", "标签2"],
    "creator": "创作者名",
    "character_version": "1.0",
    "character_book": {
      "extensions": {},
      "entries": [
        {
          "keys": ["关键词1", "关键词2"],
          "content": "注入内容（包含 {{user}} / {{char}} 的对话格式）",
          "constant": false,
          "selective": true,
          "depth": 4,
          "order": 100
        }
      ]
    },
    "extensions": {}
  }
}
```
