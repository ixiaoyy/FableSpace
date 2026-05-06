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
- 酒馆内容由主人创作；平台可提供未发布、需店主确认的 `AI 草稿`，但不绕过主人自动发布内容
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
│  Canvas 2D   │  TavernPanel │  LLM Client   │  SQLAlchemy DB │
│  Map Markers │  ChatPanel   │  Prompt Builder│ taverns/chats │
│  POI Overlay │  CharList    │  WorldInfo    │ visitor_state │
│  Map Controls│  Entry Flow  │  CharCard     │ memories/tokens│
│              │  Gameplay UI │  AI Director  │ side stores   │
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
- [`backend/src/fablemap_api/core/llm_clients.py`](../backend/src/fablemap_api/core/llm_clients.py)
- [`backend/src/fablemap_api/infrastructure/models.py`](../backend/src/fablemap_api/infrastructure/models.py) 的 `llm_configs` 表（旧 `taverns_keyvault.json` 仅作为迁移输入）

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

### 2.5 State Cards / Canon Ledger API

职责：
- 从 chat / group chat 中生成 `pending` 连续性候选卡，覆盖任务、资源、冲突、事件台账等长期会话变化。
- 让访客或店主通过专用 API 将候选卡决定为 `confirmed / rejected / superseded`。
- 保证 AI 候选变化不会直接覆盖 Tavern、TavernCharacter、WorldInfoEntry、访问规则或 LLM 配置等店主正史。

当前落点：
- [`backend/src/fablemap_api/core/state_cards.py`](../backend/src/fablemap_api/core/state_cards.py)
- [`backend/src/fablemap_api/application/services/state_cards.py`](../backend/src/fablemap_api/application/services/state_cards.py)
- [`backend/src/fablemap_api/api/v1/state_cards.py`](../backend/src/fablemap_api/api/v1/state_cards.py)
- `TavernStore` 私有桶 `_state_cards`

原则：
- StateCard 是连续性台账，不是 RPG 属性 / 战斗 / 装备系统。
- `_state_cards` 不进入公开 Tavern payload，不随酒馆包导出。
- `fixed_canon=true` 或 `canon_scope=tavern` 的卡只能由店主维护。

### 2.6 Tavern GM Layer Preview API

职责：
- 基于当前回合可观察文本，预览任务、资源、冲突/机会、事件台账等结构化候选。
- 复用 StateCard / Canon Ledger 候选格式，所有结果仍是 `pending`，必须通过确认流程才能进入结构化正史。
- 保持 deterministic / preview-only：不调用 LLM，不写入 `_state_cards`，不修改店主设定、角色卡、WorldInfo 或访问规则。

当前落点：
- [`backend/src/fablemap_api/core/gm_layer.py`](../backend/src/fablemap_api/core/gm_layer.py)
- [`backend/src/fablemap_api/application/services/state_cards.py`](../backend/src/fablemap_api/application/services/state_cards.py)
- [`backend/src/fablemap_api/api/v1/state_cards.py`](../backend/src/fablemap_api/api/v1/state_cards.py)

原则：
- GM Layer 是“候选提案层”，不是自动剧情作者或自动正史写入器。
- 访客只能为自己的 `visitor_id` 预览；店主可为任意访客预览。
- 返回 `preview_only=true`、`applied=false`，并带 `metadata.gm_layer="structured_conflict_v1"`。

### 2.7 Serial Episode Export API

职责：
- 将指定访客会话的可见 chat 记录与状态卡整理为 Markdown / JSON 剧集草稿。
- 默认只引用 `confirmed` StateCard；可选 pending 必须标为待确认候选。
- 作为记录导出，不做 LLM 改写、不自动续写、不保存导出结果。

当前落点：
- [`backend/src/fablemap_api/core/episode_builder.py`](../backend/src/fablemap_api/core/episode_builder.py)
- [`backend/src/fablemap_api/application/services/runtime.py`](../backend/src/fablemap_api/application/services/runtime.py)
- [`backend/src/fablemap_api/api/v1/chat.py`](../backend/src/fablemap_api/api/v1/chat.py)

原则：
- 请求必须显式带 `visitor_id`；不提供“导出所有访客会话”的默认入口。
- 导出过滤 `system` / hidden prompt，只包含可观察 user / assistant 记录。
- 返回 `persisted=false`，不修改 Tavern、ChatMessage、StateCard 或记忆。

### 2.8 Voice Greeting Preview API

职责：
- 为指定 NPC 预览 `first_mes` / `alternate_greetings` 中将要朗读的问候文本。
- 返回可供前端后续显式调用 `/tts` 的 `tts_request`，但 preview 本身不合成音频。
- 复用 Tavern `VoiceConfig`，只暴露非敏感配置状态。

当前落点：
- [`backend/src/fablemap_api/core/voice_greeting.py`](../backend/src/fablemap_api/core/voice_greeting.py)
- [`backend/src/fablemap_api/application/services/runtime.py`](../backend/src/fablemap_api/application/services/runtime.py)
- [`backend/src/fablemap_api/api/v1/runtime.py`](../backend/src/fablemap_api/api/v1/runtime.py)

原则：
- 返回 `preview_only=true`、`audio_generated=false`，不消耗 owner TTS/API Key。
- 不新增 voice cloning、voice sample 上传或声音数据留存逻辑。
- 私密酒馆仍按可见性边界限制访问。

### 2.9 Visual Souvenir Preview API

职责：
- 从指定访客回合的可观察文本生成共享瞬间纪念图提示词预览。
- 只返回 prompt / negative prompt / privacy notes，不生成图片、不写入文件、不保存资产。
- 为未来图片生成流程提供复核入口，同时遵守图片资产落盘规范。

当前落点：
- [`backend/src/fablemap_api/core/visual_souvenir.py`](../backend/src/fablemap_api/core/visual_souvenir.py)
- [`backend/src/fablemap_api/application/services/runtime.py`](../backend/src/fablemap_api/application/services/runtime.py)
- [`backend/src/fablemap_api/api/v1/runtime.py`](../backend/src/fablemap_api/api/v1/runtime.py)

原则：
- 返回 `image_generated=false`、`requires_confirmation=true`。
- 不使用真实人物复刻、私人联系方式、API Key 或 hidden prompt。
- 本切片没有图片 deliverable，因此不产生 `.codex/generated_images` 或项目图片资源变更。

### 2.10 Tavern Skill Packs API

职责：
- 让店主显式启用/关闭 NPC 能力包，MVP 内置 `local-rumor` 环境传闻。
- 提供 owner 可读的能力说明、Prompt 边界和配置项，避免“AI 自己决定会做什么”。
- 在 runtime 中把已启用技能包转成受控上下文；`local-rumor` 只引用已有 NeighborhoodRumor。

当前落点：
- [`backend/src/fablemap_api/core/skill_packs.py`](../backend/src/fablemap_api/core/skill_packs.py)
- [`backend/src/fablemap_api/application/services/skill_packs.py`](../backend/src/fablemap_api/application/services/skill_packs.py)
- [`backend/src/fablemap_api/api/v1/skill_packs.py`](../backend/src/fablemap_api/api/v1/skill_packs.py)
- [`backend/src/fablemap_api/application/services/runtime.py`](../backend/src/fablemap_api/application/services/runtime.py)

原则：
- `skill_packs` 是 Tavern 内容配置，owner 可改；访客不能修改。
- 技能包不能自动改写 TavernCharacter、WorldInfoEntry、记忆、StateCard 正史、访问规则或 LLM 配置。
- `revisit-care`、`visual-souvenir` 的真实图片生成/主动通知等涉及隐私和成本控制的能力仍明确延期；当前仅提供 no-image 预览边界。

---

### 2.11 Preset Import Preview / Apply API

职责：
- 店主粘贴社区 / SillyTavern 风格预设 JSON 时，先得到“可参考 / 需复核 / 已阻断”的风险报告。
- 识别风格、对话密度、世界书位置提示、运行参数等安全参考项。
- 显示并阻断越狱、绕过安全、强制 chain-of-thought、代替用户发言、PII / 私人地址、露骨或强迫性内容。
- 店主显式选择 supported 子集后，可先生成 apply diff；只有 `confirm=true` 才写入安全子集。

当前落点：
- [`backend/src/fablemap_api/core/preset_import.py`](../backend/src/fablemap_api/core/preset_import.py)
- [`backend/src/fablemap_api/application/services/owner_config.py`](../backend/src/fablemap_api/application/services/owner_config.py)
- [`backend/src/fablemap_api/api/v1/owner_config.py`](../backend/src/fablemap_api/api/v1/owner_config.py)

原则：
- `/preset-import/preview` 只预览，不写入 `Tavern.runtime_presets`、`prompt_blocks`、`world_info`、`characters`、记忆或 StateCard。
- `/preset-import/apply` 仍必须 owner-only；`confirm=false` 只返回 diff，不落库；`confirm=true` 只写入店主选中的 supported 项。
- `warning` / `blocked` 项不得通过 apply 写入，运行参数只允许生成不含密钥的自定义 runtime preset。
- 端点仅店主可用，响应不得回显 API Key、授权头、keyvault 或上传 JSON 中的密钥。
- `blocked` 项必须可见，便于店主识别风险，但不能被转换为可用 Prompt。

---

### 2.12 Owner Dialogue Preview Dry-run API

职责：

- 为店主管理台组装真实 Tavern / NPC / WorldInfo / Prompt Block 对话预览。
- 默认只 dry-run prompt，不调用模型；只有店主显式请求 `call_model=true` 时才尝试外部 LLM 测试。
- 返回 `dry_run=true`、`persisted=false`、`model_called=true|false`，并标明 history / memory / writeback 均未写入。

当前落点：

- [`backend/src/fablemap_api/application/services/owner_config.py`](../backend/src/fablemap_api/application/services/owner_config.py)
- [`backend/src/fablemap_api/api/v1/owner_config.py`](../backend/src/fablemap_api/api/v1/owner_config.py)
- [`frontend/app/product/OwnerDialoguePreviewSimulator.jsx`](../frontend/app/product/OwnerDialoguePreviewSimulator.jsx)
- [`frontend/app/lib/taverns.ts`](../frontend/app/lib/taverns.ts)

原则：

- 端点仅店主可用，不向访客暴露内部 prompt。
- `call_model=false` 是默认路径，不消耗 owner token。
- dry-run 不写 chat history、memory atoms、visitor state、writeback 或公开 Tavern payload。

---

### 2.13 Relationship Graph Schema / Storage

职责：

- 表达 owner / system 在其治理范围内确认或候选的 tavern↔tavern、character↔character 关系边。
- 用固定 `behavior_type`（friendly / allied / neutral / rival / hostile）与 `strength_preset`（weak / normal / strong）保持传播逻辑可测试。
- 保存 visitor-private 的双轴投影：`affinity` 保持 0.0–1.0，`hostility` 记录负向紧张度，不污染既有 `VisitorState.relationship_strength`。

当前落点：

- [`backend/src/fablemap_api/core/relationship_graph.py`](../backend/src/fablemap_api/core/relationship_graph.py)
- [`backend/src/fablemap_api/application/services/relationship_graph.py`](../backend/src/fablemap_api/application/services/relationship_graph.py)
- [`backend/src/fablemap_api/api/v1/relationship_graph.py`](../backend/src/fablemap_api/api/v1/relationship_graph.py)
- [`backend/src/fablemap_api/infrastructure/relationship_graph_store.py`](../backend/src/fablemap_api/infrastructure/relationship_graph_store.py)
- [`backend/src/fablemap_api/infrastructure/models.py`](../backend/src/fablemap_api/infrastructure/models.py) 的 `relationship_edges` / `visitor_relationship_projections` 表

原则：

- `pending` / `disabled` edges 不参与传播；AI 候选必须先确认或符合 delegated/system governance。
- 跨 owner edge 是 source owner 的 perspective，不是平台客观真相，不能劫持 target owner 的 UI、prompt 或传播规则。
- MVP 传播是一跳确定性计算；更具体 edge 会压过同一目标 scope 的 tavern-wide edge，角色变化可按 owner-controlled influence weight 弱回流到父 Tavern。
- 这是 NPC / 酒馆 lore 与 visitor projection 机制，不是访客社交图谱、私信、阵营战或排行榜。

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
- 角色对话 prompt dry-run：默认只后端组装 prompt，店主确认后才可测试一次模型，且不写历史 / 记忆 / writeback。

当前落点：
- [`frontend/app/product/TavernOwnerPanel.jsx`](../frontend/app/product/TavernOwnerPanel.jsx)
- `frontend/app/product/CharacterEditor.jsx`
- [`frontend/app/product/OwnerDialoguePreviewSimulator.jsx`](../frontend/app/product/OwnerDialoguePreviewSimulator.jsx)

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

### 4.5 State Card Review UI（连续性确认）

职责：
- 在聊天区展示本轮 `pending` 状态卡变化摘要。
- 明确告诉用户“AI 只是提出候选，确认后才加入正史”。
- 支持访客确认自己的 visitor-scope 卡，或忽略本次候选。

当前落点：
- [`frontend/app/product/StateCardReviewPanel.jsx`](../frontend/app/product/StateCardReviewPanel.jsx)
- [`frontend/app/product/TavernChatRoom.jsx`](../frontend/app/product/TavernChatRoom.jsx)
- [`frontend/app/lib/taverns.ts`](../frontend/app/lib/taverns.ts)
- [`frontend/app/product/services/tavernService.js`](../frontend/app/product/services/tavernService.js)

### 4.6 Skill Pack Manager UI（技能包管理）

职责：
- 在店主管理面板中提供技能包入口，展示每个包“允许做什么”和“边界说明”。
- 支持 owner 启用/关闭 `local-rumor`，并配置每轮最多参考传闻数。
- UI 文案必须说明技能包不会写入正史、不会改角色卡、不会绕过店主设置。

当前落点：
- [`frontend/app/product/SkillPackManager.jsx`](../frontend/app/product/SkillPackManager.jsx)
- [`frontend/app/product/TavernOwnerPanel.jsx`](../frontend/app/product/TavernOwnerPanel.jsx)
- [`frontend/app/lib/taverns.ts`](../frontend/app/lib/taverns.ts)
- [`frontend/app/product/services/tavernService.js`](../frontend/app/product/services/tavernService.js)

---

### 4.7 Preset Import Preview / Apply UI（预设导入预览与确认应用）

职责：
- 在店主管理面板的酒馆卡片 / 高级工具中提供“预览导入”入口。
- 允许店主粘贴预设 JSON，先在前端做 JSON 解析错误提示，再调用后端生成风险报告。
- 展示 supported / warning / blocked 分组、运行参数摘要；warning / blocked 明确不可直接应用。
- supported 条目默认可选，店主可选择写入目标（Prompt 段落 / 世界书 / 角色卡），先预览 diff，再确认应用。

当前落点：
- [`frontend/app/product/PresetImportPreviewModal.jsx`](../frontend/app/product/PresetImportPreviewModal.jsx)
- [`frontend/app/product/TavernOwnerPanel.jsx`](../frontend/app/product/TavernOwnerPanel.jsx)
- [`frontend/app/product/OwnerConsoleSections.jsx`](../frontend/app/product/OwnerConsoleSections.jsx)
- [`frontend/app/lib/taverns.ts`](../frontend/app/lib/taverns.ts)
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
- 对话历史持久化（数据库默认，JSONL 仅作为旧兼容/导出形态）
- 访客状态跟踪（visit_count, relationship, stage）
- 连续性状态卡候选生成与确认（`StateCard` / `_state_cards`）
- 结构化 `memory_atoms` 检索当前是 keyword / shared-field 轻量检索；未配置真实 embedding/graph backend 时不得在 source 或 UI 中宣称 graph/vector 语义。
- Token 统计记录

当前落点：
- [`backend/src/fablemap_api/core/writeback.py`](../backend/src/fablemap_api/core/writeback.py)
- [`backend/src/fablemap_api/core/state_cards.py`](../backend/src/fablemap_api/core/state_cards.py)
- [`backend/src/fablemap_api/core/memory_graph.py`](../backend/src/fablemap_api/core/memory_graph.py)
- [`backend/src/fablemap_api/core/vectors.py`](../backend/src/fablemap_api/core/vectors.py)
- `chat_messages` / `visitors` / `memory_atoms` 等 SQLAlchemy 表（默认数据库存储）

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
FABLEMAP_DATABASE_URL / FABLEMAP_MYSQL_URL
└── SQLAlchemy 数据库
    ├── taverns / characters / world_info / llm_configs
    ├── chat_messages / visitors / memory_atoms
    ├── gameplay_sessions / tavern_messages / state cards 兼容字段
    ├── owner_configs / visitor_notes / notifications / neighborhood_rumors
    ├── homes / home_visits
    ├── relationship_edges / visitor_relationship_projections
    └── writeback_states
```

未设置数据库 URL 时，默认使用 `<output_root>/fablemap.sqlite3`；只有显式设置 `FABLEMAP_STORAGE_BACKEND=json` 时才走旧 JSON 文件存储。

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
| Canon Ledger | StateCard | 待确认 / 已确认的长期连续性记录 |
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
| POST | `/api/v1/taverns/{id}/characters/ai-draft` | 店主生成未发布 NPC `AI 草稿`；不持久化，确认后才走角色创建 |
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
| GET | `/api/v1/taverns/{id}/relationship-edges` | 店主列出本酒馆 source-side 关系边 |
| POST | `/api/v1/taverns/{id}/relationship-edges` | 店主创建本酒馆 source-side 关系边或 pending candidate |
| PUT | `/api/v1/taverns/{id}/relationship-edges/{edge_id}` | 店主更新本酒馆 source-side 关系边 |
| POST | `/api/v1/taverns/{id}/relationship-edges/{edge_id}/decision` | 店主 / delegated/system AI 在 source-side 范围确认、拒绝或禁用关系边 |
| POST | `/api/v1/taverns/{id}/home-members` | Home owner 添加受控家庭成员；非对话成员默认沉默 |
| POST | `/api/v1/taverns/{id}/relationships` | Home owner 发起成员到目标地点的受控关系；跨主人默认 pending |
| POST | `/api/v1/taverns/{id}/relationships/school-enrollments` | Home owner 发起成员入学关系；兼容快捷入口，跨主人默认 pending |
| PUT | `/api/v1/taverns/{id}/relationships/{relationship_id}` | 目标地点 owner 批准、拒绝或撤销跨地点关系 |
| GET | `/api/v1/taverns/{id}/school-members` | 获取已批准学校成员摘要，不暴露 Home 精确私密信息 |
| GET | `/api/taverns/{id}/gameplays` | 获取当前用户可见玩法定义 |
| PUT | `/api/taverns/{id}/gameplays` | 店主保存玩法定义 |
| GET | `/api/taverns/{id}/gameplay-sessions` | 列出玩法会话（访客本人或店主视图） |
| POST | `/api/taverns/{id}/gameplay-sessions` | 开始或恢复一局玩法 |
| POST | `/api/taverns/{id}/gameplay-sessions/{sid}/advance` | 选项 / 文本推进玩法 |
| POST | `/api/taverns/{id}/gameplay-sessions/{sid}/abandon` | 放弃一局玩法 |
| GET | `/api/v1/taverns/{id}/skill-packs` | 获取可用技能包元数据与当前启用状态 |
| PUT | `/api/v1/taverns/{id}/skill-packs` | 店主保存技能包启用状态与安全配置 |
| POST | `/api/v1/taverns/{id}/preset-import/preview` | 店主预览社区预设导入风险；只生成报告，不应用或保存 |
| POST | `/api/v1/taverns/{id}/preset-import/apply` | 店主预览/确认应用 selected supported 预设子集；`confirm=false` 只返回 diff，`confirm=true` 写入安全子集 |
| POST | `/api/v1/taverns/{id}/dialogue-preview/dry-run` | 店主组装真实对话 prompt dry-run；默认不调用模型，不写历史/记忆/writeback |
| POST | `/api/v1/taverns/{id}/gm-layer/preview` | 预览 GM Layer 结构化任务/资源/冲突/事件候选；只生成报告，不应用或保存 |
| POST | `/api/v1/taverns/{id}/episodes/export` | 导出指定访客会话的 Markdown/JSON 剧集草稿；不调用 LLM、不保存 |
| POST | `/api/v1/taverns/{id}/voice-greeting/preview` | 预览 NPC 开场白和 TTS 请求参数；不合成音频、不保存 |
| POST | `/api/v1/taverns/{id}/visual-souvenir/preview` | 预览共享瞬间纪念图提示词；不生成图片、不保存 |
| GET | `/api/v1/taverns/{id}/state-cards` | 列出当前用户可见状态卡 |
| POST | `/api/v1/taverns/{id}/state-cards` | 创建手动状态卡或候选卡 |
| PUT | `/api/v1/taverns/{id}/state-cards/{card_id}/decision` | 确认、忽略或替换状态卡 |

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
- 后端在调用 LLM 时，从数据库中的 owner/tavern 私有配置读取 key，不经过前端
- 旧 `taverns_keyvault.json` 只能作为显式 JSON fallback / 迁移输入；生产下一阶段使用 `FABLEMAP_DATABASE_URL` 指向 MySQL

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
2. 平台绕过店主确认自动生成并发布酒馆内容
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
3. 平台绕过店主确认发布酒馆内容（未发布 `AI 草稿` 辅助除外）
4. 会把前端重新拖回旧地图主舞台路线
