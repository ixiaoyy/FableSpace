# FableMap 系统架构（赛博酒馆平台版）

## 文档定位

本文档描述 FableMap **赛博酒馆平台**的系统架构。

它以 [FABLEMAP_TAVERN_PLATFORM.md](FABLEMAP_TAVERN_PLATFORM.md) 为产品主线，描述从产品设计到技术实现的映射关系。

当前产品方向：

> **地图浏览 → 酒馆发现 → 进入酒馆 → 配置 AI NPC → 对话互动 → 写回记忆 → 回访反馈**

---

## 核心理念

FableMap 赛博酒馆平台不是"AI 生成游戏地图"，而是"每个人都可以在地图上开一间自己的赛博酒馆"。

核心原则：
- 真实地图是空间锚点，酒馆必须坐落在真实坐标上
- 酒馆内容由主人创作，平台不生成内容
- AI 是酒馆的灵魂，驱动 NPC 与访客对话
- Token 消耗由店主承担，平台不介入计费
- 角色卡格式兼容 SillyTavern，数据可导出

---

## 系统分层总览

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
│              │  Gameplay UI │  AI Director  │  _gameplay_sessions│
└──────────────┴──────────────┴──────────────┴────────────────┘
```

---

## 第一层：Reality Kernel（现实内核）

职责：
- 接收坐标、半径、定位等地理输入
- 拉取 OSM / Overpass 数据作为真实空间骨架
- 提供道路、POI、区域等稳定空间锚点
- 为酒馆提供真实地图位置

当前落点：
- [`backend/src/fablemap_api/core/overpass.py`](../backend/src/fablemap_api/core/overpass.py)
- [`backend/src/fablemap_api/core/api_service.py`](../backend/src/fablemap_api/core/api_service.py)

原则：
- 酒馆必须挂接真实地理坐标
- 不让 AI 替代真实空间骨架

---

## 第二层：Tavern Platform Core（酒馆平台核心）

这是赛博酒馆平台独有的核心层，包含酒馆 CRUD、角色管理、访问控制。

### 2.1 Tavern CRUD

职责：
- 酒馆创建、读取、更新、删除
- 酒馆状态管理（open / closed）
- 访问权限控制（public / password / private）
- 公开分享 payload：只暴露店主公开填写的酒馆摘要、坐标、入口链接与角色头像，不泄露密码、API Key、Prompt、对话或运行时状态

当前落点：
- [`backend/src/fablemap_api/core/tavern.py`](../backend/src/fablemap_api/core/tavern.py)（规划）
- [`backend/src/fablemap_api/core/web/router.py`](../backend/src/fablemap_api/core/web/router.py)
- [`backend/src/fablemap_api/api/v1/taverns.py`](../backend/src/fablemap_api/api/v1/taverns.py)
- [`backend/src/fablemap_api/domain/tavern_share_policy.py`](../backend/src/fablemap_api/domain/tavern_share_policy.py)

### 2.2 Character Management

职责：
- 酒馆角色（NPC）的添加、编辑、删除
- SillyTavern 角色卡导入（JSON / PNG）
- 角色状态与对话上下文管理

当前落点：
- [`backend/src/fablemap_api/core/char_card_parser.py`](../backend/src/fablemap_api/core/char_card_parser.py)（规划）
- [`frontend/app/product/services/characterEngine.js`](../frontend/app/product/services/characterEngine.js)

### 2.3 LLM Configuration

职责：
- 酒馆主人的 LLM 配置管理（API Key、模型、参数）
- API Key 加密存储与隔离（仅 owner 可见）
- Token 使用统计

当前落点：
- [`backend/src/fablemap_api/core/llm_clients.py`](../backend/src/fablemap_api/core/llm_clients.py)（规划）
- `fablemap_data/taverns_keyvault.json`（规划）

### 2.4 Gameplay Definition / Session API

职责：
- 店主管理单间酒馆内的 `GameplayDefinition`（草稿 / 发布 / 停用）
- 访客开始、继续、推进、放弃自己的 `GameplaySession`
- 店主可查看本酒馆玩法会话摘要；访客不能读取其他访客会话

当前落点：
- [`backend/src/fablemap_api/core/gameplay.py`](../backend/src/fablemap_api/core/gameplay.py)
- [`backend/src/fablemap_api/core/tavern.py`](../backend/src/fablemap_api/core/tavern.py)
- [`backend/src/fablemap_api/core/web/service.py`](../backend/src/fablemap_api/core/web/service.py)
- [`backend/src/fablemap_api/core/web/router.py`](../backend/src/fablemap_api/core/web/router.py)

原则：
- `gameplay_definitions` 是 Tavern 内容，随酒馆包导出。
- `_gameplay_sessions` 是运行时私有桶，不进入公开 Tavern payload，不随酒馆包导出。
- 玩法是轻量文本互动，不引入脚本引擎、战斗、等级、装备或排行榜。

---

## 第三层：Map Display（地图展示层）

职责：
- 接入 Canvas 2D 地图（现有 WorldMap.jsx）
- 展示酒馆标记（按类型区分：公开/密码/私人）
- 地图交互：点击标记进入酒馆详情
- 为地点层提供稳定空间入口

当前落点：
- [`frontend/app/product/WorldMap.jsx`](../frontend/app/product/WorldMap.jsx)
- `frontend/app/product/mapAssets/`（历史参考）

原则：
- 地图只负责真实空间承载，不负责酒馆内容生成
- 酒馆标记是地图上的"入口"，不是地图的"目的地"

---

## 第四层：Tavern Experience（酒馆体验层）

这是用户进入酒馆后看到的主体验层。

### 4.1 Tavern Entry（酒馆入场）

职责：
- 酒馆简介展示
- 角色列表展示（带立绘）
- 访问权限验证（公开/密码/私人）
- 入场动画

当前落点：
- [`frontend/app/product/WorldStageActivePoiPanel.jsx`](../frontend/app/product/WorldStageActivePoiPanel.jsx)
- [`frontend/app/product/TavernEntryPanel.jsx`](../frontend/app/product/TavernEntryPanel.jsx)

### 4.2 Chat Panel（对话面板）

职责：
- NPC 对话界面（聊天气泡、输入框、发送）
- 角色头像与状态展示
- 对话历史展示
- 情绪精灵图切换

当前落点：
- [`frontend/app/product/ChatPanel.jsx`](../frontend/app/product/ChatPanel.jsx)
- [`frontend/app/product/services/apiClient.js`](../frontend/app/product/services/apiClient.js)

### 4.3 Tavern Owner Panel（店主管理面板）

职责：
- 酒馆信息编辑
- 角色卡编辑器（添加、编辑、导入）
- LLM 配置 UI（API Key 输入、模型选择）
- 访客统计与对话历史查看
- Token 使用统计

当前落点：
- [`frontend/app/product/TavernOwnerPanel.jsx`](../frontend/app/product/TavernOwnerPanel.jsx)
- `frontend/app/product/CharacterEditor.jsx`

### 4.4 Gameplay UI（结构化玩法体验）

职责：
- 店主在独立 `GameplayManager` 中轻配置玩法目标、氛围、素材、禁止事项和结算文案；高级节点折叠隐藏。
- 访客在聊天区看到已发布玩法，能开始 / 继续 / 选择 / 自由输入 / 完成 / 放弃。
- 默认公益酒馆提供贴合主题的 published 玩法，便于无外部 API Key 时体验 fallback 主持。

当前落点：
- [`frontend/app/product/GameplayManager.jsx`](../frontend/app/product/GameplayManager.jsx)
- [`frontend/app/product/GameplayDefinitionEditor.jsx`](../frontend/app/product/GameplayDefinitionEditor.jsx)
- [`frontend/app/product/TavernGameplayLauncher.jsx`](../frontend/app/product/TavernGameplayLauncher.jsx)
- [`frontend/app/product/GameplaySessionPanel.jsx`](../frontend/app/product/GameplaySessionPanel.jsx)
- [`frontend/app/product/TavernOwnerPanel.jsx`](../frontend/app/product/TavernOwnerPanel.jsx)
- [`frontend/app/product/TavernChatRoom.jsx`](../frontend/app/product/TavernChatRoom.jsx)
- [`frontend/app/product/services/tavernService.js`](../frontend/app/product/services/tavernService.js)

---

## 第五层：AI Dialogue Layer（AI 对话层）

这是酒馆 NPC 与访客对话的核心引擎。

### 5.1 LLM Client Factory

职责：
- 支持多种 LLM 后端：OpenAI / Claude / Ollama / OpenRouter
- 统一的调用接口
- 错误处理与降级策略

当前落点：
- `backend/src/fablemap_api/core/llm_clients.py`（规划）

### 5.2 Prompt Builder

职责：
- 构建分层 Prompt（场景设定 → 角色系统提示 → 角色信息 → WorldInfo 注入 → 对话历史）
- 借鉴 SillyTavern PromptManager 的分层注入模式

当前落点：
- `backend/src/fablemap_api/core/prompt_builder.py`（规划）

### 5.3 WorldInfo Injector

职责：
- 关键词匹配触发背景信息注入
- 支持选择性注入（selective）与常驻注入（constant）
- 注入概率控制与深度限制

当前落点：
- `backend/src/fablemap_api/core/world_info_injector.py`（规划）

### 5.4 Chat History & Memory

职责：
- 对话历史持久化（JSONL 格式）
- 访客状态跟踪（visit_count, relationship, stage）
- Token 统计记录

当前落点：
- [`backend/src/fablemap_api/core/writeback.py`](../backend/src/fablemap_api/core/writeback.py)
- `fablemap_data/chat_history/`（规划）

### 5.5 AI Director / Gameplay Fallback

职责：
- 将店主玩法定义、当前节点、访客输入和酒馆上下文整理为结构化推进请求。
- 校验 AI 返回的 `action / next_node_id / event_type / narration / completed`。
- AI 不可用、返回非法 JSON 或指向不存在节点时，按当前节点 fallback 事件池推进。

当前落点：
- [`backend/src/fablemap_api/core/gameplay.py`](../backend/src/fablemap_api/core/gameplay.py)
- [`backend/src/fablemap_api/core/web/service.py`](../backend/src/fablemap_api/core/web/service.py)

原则：
- AI Director 是主持引擎，不替平台自动发布普通店主的酒馆内容。
- fallback 使用 `session_id + turn_count + node_id` 生成可回放 seed，并写入 `GameplayEvent`。
- 完成结算默认只写 `GameplaySession.completion`，不自动写长期记忆。

---

## 第六层：Data Persistence（数据持久层）

职责：
- 酒馆配置持久化（不含 api_key 明文）
- 对话历史持久化
- 访客状态持久化
- Token 统计持久化

当前落点：
```
fablemap_data/
├── writeback-state.json    # 玩家状态、POI 状态
├── taverns.json            # 所有酒馆配置（不含 api_key；含 gameplay_definitions）
├── taverns_keyvault.json   # 酒馆主人的 LLM API Key（加密）
├── _gameplay_sessions      # TavernStore 私有桶（逻辑上挂在 taverns 数据内，不公开导出）
└── chat_history/
    ├── {tavern_id}/
    │   ├── {visitor_id}_{char_id}.jsonl  # 对话历史
    │   └── visitor_states.json            # 访客状态
    └── _meta/
        └── token_stats.json               # Token 使用统计
```

---

## 概念映射：旧 → 新

| 旧架构层 | 新架构层 | 说明 |
|---------|---------|------|
| Place / POI | Tavern | 地图上的可进入场所 |
| Faction | TavernCharacter | 酒馆内的 AI NPC |
| World Info | WorldInfoEntry | 关键词触发的背景注入 |
| World | TavernScene | 酒馆场景设定 |
| Player State | VisitorState | 访客与酒馆的关系 |
| GameplayDefinition | 酒馆玩法定义 | 店主发布的结构化轻玩法 |
| GameplaySession | 玩法会话 | 访客在某酒馆的一局玩法进度 |
| mapRenderer | TavernMapPanel | 地图 + 酒馆标记 |
| placePanel | TavernEntryPanel | 酒馆入场面板 |
| 角色引擎 | TavernCharacter Engine | 扩展为支持 SillyTavern |

---

## 核心 API 端点

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/taverns` | 列出附近/全部酒馆 |
| POST | `/api/taverns` | 创建酒馆 |
| GET | `/api/taverns/{id}` | 获取酒馆详情 |
| PUT | `/api/taverns/{id}` | 更新酒馆 |
| DELETE | `/api/taverns/{id}` | 删除酒馆 |
| GET | `/api/v1/taverns/{id}/share` | 获取公开安全的分享 payload；public/password 可匿名读取，private 仅店主可读 |
| GET | `/api/taverns/{id}/characters` | 列出酒馆角色 |
| POST | `/api/taverns/{id}/characters` | 添加角色 |
| PUT | `/api/taverns/{id}/characters/{cid}` | 更新角色 |
| DELETE | `/api/taverns/{id}/characters/{cid}` | 删除角色 |
| POST | `/api/taverns/{id}/chat` | 发送消息并获取 AI 回复 |
| GET | `/api/taverns/{id}/chat` | 获取对话历史 |
| POST | `/api/taverns/{id}/enter` | 进入酒馆（验证密码） |
| GET | `/api/v1/taverns/{id}/roleplay` | 获取玩家扮演 NPC 模式与当前用户可见认领 |
| PUT | `/api/v1/taverns/{id}/roleplay` | 店主开启 / 关闭混合扮演模式 |
| POST | `/api/v1/taverns/{id}/roleplay/claims` | 访客申请认领已有 NPC |
| PUT | `/api/v1/taverns/{id}/roleplay/claims/{claim_id}` | 店主批准、拒绝或撤销认领 |
| GET | `/api/taverns/{id}/gameplays` | 获取当前用户可见玩法定义 |
| PUT | `/api/taverns/{id}/gameplays` | 店主保存玩法定义 |
| GET | `/api/taverns/{id}/gameplay-sessions` | 列出玩法会话（访客本人或店主视图） |
| POST | `/api/taverns/{id}/gameplay-sessions` | 开始或恢复一局玩法 |
| POST | `/api/taverns/{id}/gameplay-sessions/{sid}/advance` | 选项 / 文本推进玩法 |
| POST | `/api/taverns/{id}/gameplay-sessions/{sid}/abandon` | 放弃一局玩法 |

---

## Gameplay 调用流程

```
访客点击玩法入口 / 继续
        │
        ▼
POST /api/taverns/:id/gameplay-sessions
        │
        ▼
创建或恢复 GameplaySession → 返回当前 scene / choices
        │
        ▼
访客选择选项或输入自由文本
        │
        ▼
POST /api/taverns/:id/gameplay-sessions/:sid/advance
        │
        ├── 有合法选项：按 choice.next_node_id 推进
        ├── 有可用 AI：AI Director 返回结构化事件
        └── 无 AI / 非法 AI：fallback_events 可回放随机推进
        │
        ▼
保存 GameplayEvent + Session 状态 → 返回 scene 或 completion
```

---

## LLM 调用流程

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

---

## 安全架构

### API Key 保护

- 酒馆主人的 `api_key` **仅本人可见**
- `/api/taverns/:id` 返回的酒馆详情**不包含** `api_key`
- 后端在调用 LLM 时，从加密存储中读取 key，不经过前端
- 建议对 `taverns_keyvault.json` 进行加密存储（AES 或类似方式）

### 访问控制

- 密码酒馆使用 bcrypt hash 验证
- 私人酒馆仅对 owner 可见
- 每个酒馆的操作（编辑、删除、添加角色）需要验证 owner 身份
- 玩法定义保存仅限 owner；非 owner 只能看到 `published` 玩法
- 玩法会话按 `visitor_id` 隔离；普通访客不能读取或推进其他访客的 session

### LLM 调用安全

- 系统 prompt 注入防注入检查
- 禁止酒馆主人通过 system_prompt 构造恶意 prompt 影响平台
- 对话内容存储在酒馆级别，不跨酒馆共享
- AI Director prompt 必须保持安全边界：不索取敏感身份信息，不给医疗 / 法律 / 金融结论，不要求真实危险行动

---

## 明确不再作为主线的方向

1. 继续以自绘 Web-2D 地图作为产品核心
2. 平台自动生成酒馆内容
3. 复杂的地图视觉资源包体系
4. "地图是否看起来像 RPG 城镇图"这一类审美目标
5. 平台级别的 Token 付费/充值系统
6. 无边界访客社交（好友、动态墙、跨酒馆私信、全局在线状态）；店主审批的单酒馆玩家扮演 NPC 属于允许的酒馆治理能力

---

## 架构判断标准

如果一个新需求满足以下条件，说明它方向正确：

1. 它强化了"地图浏览 → 酒馆发现 → 入场 → 对话 → 写回 → 回访"链路
2. 它提升了酒馆创建的便利性、角色配置的灵活性或对话体验的真实感
3. 它符合"平台做地图和入口，酒馆主人做内容"的最小平台原则

如果一个新需求满足以下特征，则应谨慎：

1. 主要目标是让地图更炫，而不是让酒馆体验更好
2. 需要新增大量自绘几何、资源包和渲染细节
3. 平台生成酒馆内容（而非主人创作）
4. 会把前端重新拖回旧地图主舞台路线
