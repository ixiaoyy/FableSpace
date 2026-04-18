# FableMap 当前任务清单（赛博酒馆平台版）

## 下一轮共享任务入口

VisionTale 轻量 Web 酒馆参考后的新一轮待办，统一放在：

> [AI_SHARED_TASKLIST.md](AI_SHARED_TASKLIST.md)

该共享清单覆盖：

- 轻量首页 / 新手路径
- 3 分钟开店向导
- LLM 预设卡
- 显性记忆面板
- 酒馆内三栏工作台
- 世界书编辑器与命中测试
- 酒馆包导入导出
- 输出修正 / 正则护栏
- Prompt Block 段落引擎
- 结构化记忆与自动提炼

后续认领和实现优先从 `AI_SHARED_TASKLIST.md` 的 `FM-VT-*` 任务 ID 开始。

---

## 战略转型

FableMap 已从「AI 生成游戏地图」的战略方向，转向「赛博酒馆 UGC 平台」。

**核心转变**：
- 平台不再生成内容，而是提供酒馆托管平台
- 内容由用户（店主）创作，而非平台生成
- AI 驱动 NPC 对话，而非生成地图画面

---

## 当前最高优先级

### Phase 1: 数据结构 + 最小可运行

| 任务 | 状态 | 说明 |
|------|------|------|
| T1.1 扩展 `placeProtocol.js` | `done` | tavern.py 模块已实现 |
| T1.2 后端 `tavern.py` | `done` | 酒馆 CRUD 核心模块 |
| T1.3 `/api/taverns/*` 路由 | `done` | 酒馆 CRUD API 端点 |
| T1.4 前端 `tavernService.js` | `done` | 酒馆服务层 |
| T1.5 酒馆地图标记 | `done` | WorldMap.jsx 复用 POI 标记层展示酒馆，点击触发 activeTavernId |
| T1.6 酒馆创建面板 | `done` | TavernCreatePanel.jsx 已实现 |
| T1.7 Chat Panel 接入 | `done` | TavernChatRoom 已实现 |
| T1.8 酒馆入场 | `done` | enter_tavern API 已实现 |
| T1.9 Chat 历史 writeback | `done` | 对话历史持久化 |

### Phase 2: 角色管理 + SillyTavern 导入

| 任务 | 状态 | 说明 |
|------|------|------|
| T2.1 角色卡编辑器 UI | `done` | CharacterManagementModal 完整实现：角色列表、添加/编辑/删除（含删除确认 UI）、SillyTavern PNG+JSON 角色卡导入；替换 TavernOwnerPanel 中原有 CharacterManagerModal |
| T2.2 JSON 粘贴导入 | `done` | import_character_card API |
| T2.3 PNG 上传导入 | `done` | tavernService.js 解析 PNG tEXt chunk (chara/ccv3) |
| T2.4 角色列表展示 | `done` | CharacterSidebar 已实现 |
| T2.5 角色切换 | `done` | TavernChatRoom 已实现 |

### Phase 3: LLM 接入

| 任务 | 状态 | 说明 |
|------|------|------|
| T3.1 `llm_clients.py` | `done` | 客户端工厂（OpenAI/Claude/Ollama）已实现 |
| T3.2 Prompt 构建器 | `done` | 场景 + 角色 + 历史 prompt_builder.py 已实现 |
| T3.3 WorldInfo 注入器 | `done` | 关键词匹配 world_info_injector.py 已实现 |
| T3.4 真实 LLM 调用 | `done` | Chat Panel 接入真实 LLM，`test_llm` 端点已添加 |
| T3.5 Token 统计 | `done` | 用 TokenCounter 替代字符长度估算 |
| T3.6 闭店状态检测 | `done` | LLM 不可用时自动降级为规则响应，标记 closed |

> Phase 3 已于 2026-04-15 完成。LLM 对话链路已完整：前端 TavernChatRoom → tavernService.sendChat → POST /api/taverns/{id}/chat → service.tavern_chat_payload → llm_clients → LLM API。

### Phase 4: 店主管理 + 地图整合

| 任务 | 状态 | 说明 |
|------|------|------|
| T4.1 我的酒馆面板 | `done` | 店主控制台 MVP：酒馆摘要、筛选、刷新、创建/编辑/AI 配置/删除入口 |
| T4.2 LLM 配置 UI | `done` | TavernCreatePanel Step 2 接入 LLMConfigForm（24 后端）；新增 /api/llm/test-config 端点，支持创建酒馆前测试 LLM 连接 |
| T4.3 Token 统计面板 | `done` | 店主控制台展示总 Token、平均用量、酒馆用量排行；后端同步 token_used 到可展示 payload |
| T4.4 酒馆搜索发现 | `done` | 地图发现页展示附近酒馆，支持搜索、入口/状态筛选、排序与 marker/入场联动 |
| T4.5 标记分类显示 | `done` | 地图酒馆 marker、图例与发现列表按公开/密码/私人分类展示 |

### Phase 5: 打磨

| 任务 | 状态 | 说明 |
|------|------|------|
| T5.1 情绪精灵图 | `done` | 聊天回复后推断表情，消息头像与角色栏按 expression 切换 sprite，并展示情绪标签 |
| T5.2 错误处理 | `done` | parseCharacterCard 中 character_book 异常结构（entries 为非数组）时不会抛异常，优雅降级为空 world_info |
| T5.3 LLM 降级策略 | `done` | 后端：聊天 API 返回结构化降级信息（闭店、未配置、LLM 错误均规则回应）；前端：handleSend 按 HTTP 状态码 401/403/429/5xx 显示差异化友好提示 |
| T5.4 移动端适配 | `done` | styles.css 新增 @media (max-width: 720px)，覆盖 TavernChatRoom、酒馆创建面板的移动端布局 |
| T5.5 性能优化 | `done` | 酒馆发现搜索索引缓存、地图 marker 上限与列表逐步加载，降低大量酒馆渲染压力 |
| T5.6 访客昵称系统 | `done` | localStorage 存储 `fablemap_visitor_nickname`；首次访问弹出 VisitorNicknameModal 引导设置；ChatMessage 用户消息旁显示昵称 |
| T5.7 访客昵称后端贯通 | `done` | 聊天请求携带 visitor_name，后端写入 chat history，并作为 Prompt 的 user_name/当前访客称呼使用 |
| T5.8 店主身份写操作贯通 | `done` | 前端店主控制台创建/编辑/删除酒馆、AI 配置和角色管理请求携带 X-User-Id，创建 payload 兜底写入 owner_id |
| T5.9 店主访客会话反馈 | `done` | 店主控制台新增最近对话会话面板；/api/chats 对 owner 返回全访客会话摘要，并包含 visitor_name/tavern_name/last_role |
| T5.10 访客状态与回访关系 | `done` | 入场请求携带 X-User-Id 并总是调用 enter_tavern；新增 /api/taverns/{id}/visitors，店主控制台展示 VisitorState 回访次数、关系阶段和消息数 |
| T5.11 会话详情、导出与隐私边界 | `done` | 店主控制台可打开访客会话详情并生成/复制导出文本；聊天历史、导出、搜索和批量编辑接口限制为访客本人或酒馆主人访问 |
| T5.12 访客关系记忆注入 Prompt | `done` | 聊天时将 VisitorState 的关系阶段、到访次数、历史消息数、关系强度和最近到访时间作为系统事实注入 Prompt，让 NPC 对回访者具备连续性记忆 |
| T5.13 回访面板会话联动 | `done` | 店主控制台访客关系面板新增“查看会话”，可从单个访客状态直接打开该访客最近聊天详情，并在缺少本地摘要时按 owner 身份按需拉取会话 |
| T5.14 店主会话关键词搜索 | `done` | 店主控制台新增按酒馆搜索访客聊天记录，可从命中消息直接打开完整会话；后端搜索接口补空查询、结果上限和权限回归测试 |

### Phase 6: 语音对话

| 任务 | 状态 | 说明 |
|------|------|------|
| T6.1 语音输入与合成 (STT/TTS) | `done` | 访客点击麦克风按钮使用浏览器 Web Speech API 输入语音；AI 回复后显示 🔊 播放按钮调用 TTS；店主控制台 AI 配置弹窗增加语音设置面板，支持 ElevenLabs/OpenAI/Edge/Silero 等 TTS 提供商，语速调节，测试播放 |

### Phase 7: 轻量酒馆体验壳 (FM-VT P1)

| 任务 | 状态 | 说明 |
|------|------|------|
| P1-01 三栏工作台 | `done` | TavernChatRoom 从双栏升级为三栏布局：左侧角色列表，中间聊天区，右侧上下文面板（角色/场所/世界书/记忆/AI 五个标签页）；新增 TavernContextPanel.jsx 组件；header 新增"上下文"按钮切换右侧面板 |
| P1-02 上下文可视化面板 | `done` | TavernContextPanel 展示当前角色卡、场所设定、命中世界书条目、访客记忆和 AI 参数摘要；世界书标签页显示所有条目及状态 |
| P1-03 世界书编辑器 | `done` | WorldBookEditor.jsx 完整实现：条目列表、增删改、关键词/内容编辑、顺序/深度/概率/常驻设置；集成到 TavernOwnerPanel 世界书管理入口 |
| P1-04 世界书命中测试器 | `done` | POST /api/worldinfo/test 端点（确定性关键词/正则匹配，无 LLM）；WorldBookEditor 内置命中测试区；新增独立 WorldBookTester.jsx 组件（支持酒馆上下文、历史消息扫描）；styles.css 新增 .wbt-* 样式 |
| P1-05 酒馆包导入 / 导出 | `done` | 店主可导出不含 API Key/密码/访客聊天的酒馆包，并可在指定坐标导入为新酒馆 |
| P1-06 酒馆模板卡片 UI | `done` | 新增 3 个内置酒馆模板和模板安装页，支持搜索、标签筛选和一键挂载 |
| P1-07 输出修正 / 风格护栏 | `done` | 新增输出护栏规则引擎、店主编辑器、保存/预览 API；AI 回复落库前自动应用启用规则，无效正则不中断聊天 |
| P1-08 店主控制台重新分组 | `done` | 店主后台新增总览 / 酒馆 / 访客 / AI / 高级工具分组导航；高级工具台集中角色、世界书、护栏和酒馆包入口；抽出 OwnerConsoleSections.jsx |

### Phase 8: Prompt 与运行预设 (FM-VT P2)

| 任务 | 状态 | 说明 |
|------|------|------|
| P2-01 结构化记忆模型 | `done` | 新增 MemoryAtom 模型、酒馆 `_memory_atoms` 持久化、CRUD API、前端 service 封装和 private / owner / public 可见性权限边界 |
| P2-02 记忆自动提炼流水线 | `done` | 聊天后用规则启发式提炼事实 / 情绪 / 事件 / 偏好 / 承诺，去重合并写入 MemoryAtom；前端可查看、固定、删除和标错 |
| P2-03 记忆注入预算与优先级 | `done` | PromptBuilder 支持结构化记忆预算注入，按置顶、期限、角色相关性、关键词命中、重要度和更新时间排序裁剪 |
| P2-04 Prompt Block 段落引擎 | `done` | 新增 prompt_blocks 数据模型、默认段落、兼容式 PromptBuilder 段落组装、店主段落编辑器、保存/预览 API；支持开关、排序、模板和粗略 token 预算 |
| P2-05 预设管理器 | `done` | 新增 runtime_presets / active_preset_id / memory_policy，店主可复制内置运行预设、编辑模型参数、捕获当前段落/护栏组合、保存并应用到酒馆；酒馆包导出包含预设但不含 API Key |
| P2-06 高级记忆图 / RAG 预研 | `done` | 新增 MemoryStore 接口、KeywordMemoryStore 默认 JSON 适配器、VectorMemoryStore / GraphMemoryStore stub；为后续向量检索和图数据库预留替换口，不引入新依赖 |

### Phase 9: 体验与视觉任务 (FM-VT UX)

| 任务 | 状态 | 说明 |
|------|------|------|
| UX-01 轻量浅色 / 暗色主题切换 | `done` | 设置页可切换浅色 / 暗色，使用语义化主题变量并持久化偏好 |
| UX-02 卡片化酒馆发现列表 | `done` | 酒馆发现列表已卡片化，支持搜索、筛选、排序、逐步加载和 marker 联动 |
| UX-03 移动端酒馆体验 | `done` | 720px 以下三栏折叠为单列，角色列表变为抽屉，输入区贴底，上下文 / 记忆面板变为底部抽屉 |

---

### Phase 10: QA 回归切片 (FM-VT QA)

| 任务 | 状态 | 说明 |
|------|------|------|
| QA-01 开店向导回归测试 | `done` | 新增 `tests/test_tavern_create_wizard_regression.py`，覆盖公开 / 密码 / 私人酒馆、无 AI 配置、AI 测试成功 / 失败、导入角色卡和手动创建角色 |
| QA-02 记忆权限测试 | `done` | 新增 `tests/test_tavern_memory_permissions.py`，覆盖访客 private、店主 owner/public、跨访客拒绝和酒馆包导出隐私边界 |
| QA-03 世界书注入测试 | `done` | 新增 `tests/test_tavern_world_info_injection.py`，覆盖常驻、关键词、次级关键词、depth、order、disabled、probability 和命中测试 API；补齐按条目 depth 扫描最近历史 |

---

## 关键参考文档

- [FABLEMAP_TAVERN_PLATFORM.md](FABLEMAP_TAVERN_PLATFORM.md) — 产品设计主线
- [ARCHITECTURE.md](ARCHITECTURE.md) — 系统架构
- [WHAT_NOT_TO_BUILD.md](WHAT_NOT_TO_BUILD.md) — 明确不做
- [AI_SHARED_TASKLIST.md](AI_SHARED_TASKLIST.md) — 任务认领

---

## 当前取舍

### 明确降低优先级

- 平台自动生成酒馆内容
- 复杂地图视觉资源包
- 生成式场景画面
- 地图审美目标

### 明确抬升优先级

- 酒馆创建与配置
- SillyTavern 角色卡导入
- LLM 对话接入
- 访问控制（公开/密码/私人）
- 写回与记忆

---

## 明确不再作为主线的方向

1. 继续以自绘 Web-2D 地图作为产品核心
2. 平台生成酒馆内容
3. 复杂地图视觉资源包体系
4. 地图审美目标
5. 平台级 Token 付费/充值系统
6. 酒馆间访客社交

---

## 架构判断标准

如果一个新需求满足以下条件，说明它方向正确：

1. 它强化了「地图浏览 → 酒馆发现 → 入场 → 对话 → 写回 → 回访」链路
2. 它提升了酒馆创建的便利性、角色配置的灵活性或对话体验的真实感
3. 它符合「平台做地图和入口，酒馆主人做内容」的最小平台原则

如果一个新需求满足以下特征，则应谨慎：

1. 主要目标是让地图更炫，而不是让酒馆体验更好
2. 需要新增大量自绘几何、资源包和渲染细节
3. 平台生成酒馆内容（而非主人创作）
4. 会把前端重新拖回旧地图主舞台路线
