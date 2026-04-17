# FableMap 共享任务清单：轻量酒馆体验壳与记忆系统

> **创建日期**：2026-04-17
> **状态**：待实现 / 可认领
> **来源**：参考 VisionTale 轻量 Web 酒馆形态 + FableMap 现有赛博酒馆方向
> **用途**：给后续 AI / 人类协作者统一拆任务、认领、实现、验收。

---

## 0. 总目标

把 FableMap 从“功能已经很多的赛博酒馆原型”推进到：

> **小白能 3 分钟开店，访客能直接进入附近酒馆，店主能看见角色、世界书、记忆和访客回访价值的地图锚定轻量酒馆平台。**

核心参考点不是复制 VisionTale，而是吸收它的：

- 开箱即用配置向导
- 作品 / 预设 / 世界书 / 正则的模块化组织
- 干净卡片化 UI
- 显性记忆面板
- UGC 资源闭环

FableMap 必须保留自己的差异点：

- **真实地图锚点**
- **赛博酒馆而非纯文游**
- **店主主权**
- **Token 自主**
- **访客与地点 / NPC 的回访关系**

---

## 1. 当前基线

截至 2026-04-17，以下能力已存在，可在新任务中复用：

| 能力 | 当前状态 | 主要位置 |
|------|----------|----------|
| 酒馆 CRUD | 已实现 | `fablemap/tavern.py`, `fablemap/web/router.py` |
| 地图酒馆发现 | 已实现 | `WorldStagePanel`, `WorldStageTavernDiscoveryLane`, `WorldMap` |
| 酒馆入场 | 已实现 | `TavernEntryPanel`, `/api/taverns/{id}/enter` |
| 角色管理 | 已实现 | `CharacterManagementModal`, `CharacterEditor` |
| SillyTavern 角色卡导入 | 已实现 | `char_card_parser.py`, `tavernService.js` |
| LLM 多后端配置 | 已实现 | `LLMConfigForm`, `llm_clients.py` |
| Prompt 分层构建 | 已实现 | `prompt_builder.py` |
| WorldInfo 注入 | 已实现 | `world_info_injector.py` |
| 聊天历史写回 | 已实现 | `TavernStore` chat history |
| Token 统计 | 已实现 | `token_counter.py`, owner panel |
| VisitorState 回访关系 | 已实现 | `VisitorState`, owner visitor panel |
| 店主会话搜索 / 导出 | 已实现 | `TavernOwnerPanel`, `/api/chats/*` |
| 记忆雏形 | 部分实现 | `memory.py`, `memory_graph.py`, `prompt_builder.py` |

因此下一阶段不应重新造轮子，而应重点做：

1. 信息架构重组
2. 新手向导
3. 预设卡
4. 显性记忆
5. 世界书 UI
6. Prompt / 输出修正高级能力
7. UGC 酒馆包与模板分发

---

## 2. 产品原则与禁止偏航

### 2.1 必须坚持

- 地图是入口，酒馆是体验本体。
- 普通用户默认只看必要字段；高级配置必须折叠。
- 店主创作内容，平台只托管、组织、注入和回放。
- API Key / Token 成本默认由店主承担。
- 所有 AI 输出或记忆都必须可落库、可导出、可删除、可解释。
- 记忆必须有可视化 UI，不能只藏在 Prompt 里。

### 2.2 不做 / 暂缓

- 不做平台积分、充值、抽成系统。
- 不把 FableMap 改成纯 Web 酒馆 / 纯文游市场。
- 不让地图视觉继续膨胀成主工程。
- 不把正则、Prompt 参数等复杂能力默认暴露给小白。
- 不做访客间实时社交。
- 不做平台自动批量生成酒馆内容作为主路径。

---

## 3. 任务分组总览

| 优先级 | 主题 | 目标 |
|--------|------|------|
| P0 | 轻量体验壳 | 用户第一次打开能理解：发现酒馆 / 创建酒馆 / 我的酒馆 / 设置 |
| P0 | 3 分钟开店向导 | 店主能从地点、酒馆、角色、AI 到开门一口气完成 |
| P0 | LLM 预设卡 | DeepSeek / OpenAI 兼容 / Claude-Gemini / Ollama 等一键填充 |
| P0 | 记忆面板 MVP | 访客和店主能看见“AI 记得什么” |
| P1 | 世界书 UI | 酒馆世界书可编辑、可测试命中、可调注入顺序 |
| P1 | 酒馆包 / 模板 | 酒馆可以导入导出、复用、分享 |
| P1 | 酒馆内三栏工作台 | 左角色，中聊天，右上下文 / 记忆 / 世界书 |
| P1 | 输出修正 | 把“正则”包装成小白能理解的输出护栏 |
| P2 | Prompt Block 引擎 | 从硬编码分层升级为可开关段落系统 |
| P2 | 高级记忆 | 事实 / 情感 / 事件 × 短 / 中 / 长期记忆 |
| P2 | 市场闭环 | 地图附近酒馆 + 可复用模板库 |

---

## 4. P0：立即实现任务

### FM-VT-P0-01：首页信息架构瘦身 `[done 2026-04-17]`

**目标**：把当前偏工程化入口改成普通用户能理解的主导航。

建议导航：

```text
发现酒馆 / 创建酒馆 / 我的酒馆 / 模板 / 设置
```

首屏文案应弱化：

- 地点切片
- 写回
- 扰动
- 世界密度
- 编排事件

强化：

- 附近有什么酒馆
- 我能不能直接进去
- 怎么开一间自己的酒馆
- NPC 会不会记得我

**建议改动文件**

- `frontend/src/App.jsx`
- `frontend/src/appShellConfig.js`
- `frontend/src/styles.css`
- `frontend/src/services/appShellViewModel.js`

**验收标准**

- 首屏只出现 2–4 个普通用户可理解的核心动作。
- 仍能进入现有地图发现与店主管理链路。
- 旧的调试 / 地点切片高级入口不删除，但折叠到“高级 / 调试”。

**实现记录**

- `frontend/src/App.jsx` 首屏主操作已改为 4 个普通入口：发现酒馆、创建酒馆、我的酒馆、设置。
- “创建酒馆”会直接切到店主后台并打开 5 步创建向导，同时带入当前地图坐标。
- “设置”折叠了重新选择新手引导、地图高级设置、调试后台，避免首屏直接暴露工程入口。
- `frontend/src/TavernOwnerPanel.jsx` 新增 `createSignal` / `createInitialLat` / `createInitialLon`，支持外部直达创建向导。
- `frontend/src/services/appShellViewModel.js` 已把首屏指标从“地点切片 / 空间容器”等工程描述改为附近酒馆、当前位置、NPC 记忆。
- `frontend/src/WorldEntryPanel.jsx` 与 `WorldSliceResultPanel.jsx` 已弱化“地点切片”等术语，改为附近地点、附近内容、地图和酒馆入口。
- `frontend/src/styles.css` 已新增首页设置折叠面板和按钮状态样式。
- 验证：`npm --prefix .\frontend run build` 通过；`pytest` 170 passed；`compileall` 通过。

---

### FM-VT-P0-02：首次使用分流向导 `[done 2026-04-17]`

**目标**：第一次进入时让用户选择身份路径。

路径 A：我只是来玩的

```text
设置昵称 → 选择附近酒馆 → 进入对话
```

路径 B：我要开一间酒馆

```text
设置昵称 / 店主身份 → 选地点 → 创建酒馆
```

**建议改动文件**

- `frontend/src/VisitorNicknameModal.jsx`
- 新增 `frontend/src/FirstRunModeModal.jsx`
- `frontend/src/App.jsx`

**验收标准**

- 首次打开不再只要求昵称，而是明确分流。
- 用户选择后写入 `localStorage`，下次不重复打扰。
- 可在设置中重置新手引导。

**实现记录**

- 新增 `frontend/src/FirstRunModeModal.jsx`，把首次昵称输入升级为“我只是来玩的 / 我要开一间酒馆”两条路径。
- `frontend/src/App.jsx` 已写入 `fablemap_first_run_mode`，下次打开不重复弹出。
- 选择“只是来玩”会回到发现酒馆；选择“我要开店”会直接切到店主后台。
- 首页操作区新增“重置引导”按钮，用于清除首次路径选择并重新展示分流向导。
- `frontend/src/styles.css` 已新增首次分流卡片、移动端折叠和重置按钮样式。
- 验证：`npm --prefix .\frontend run build` 通过；`pytest` 169 passed。

---

### FM-VT-P0-03：3 分钟开店向导 `[done 2026-04-17]`

**目标**：将现有 `TavernCreatePanel` 改造成分步式开店流程。

建议步骤：

```text
Step 1 地点：当前坐标 / 地图点选 / 手动输入
Step 2 酒馆：名称 / 简介 / 访问权限 / 封面风格
Step 3 角色：导入角色卡 / 手动创建第一个 NPC
Step 4 AI：选择预设 / API Key / Base URL / 测试连接
Step 5 开门：测试一句对话 / 保存 / 开门营业
```

**建议改动文件**

- `frontend/src/TavernCreatePanel.jsx`
- `frontend/src/LLMConfigForm.jsx`
- `frontend/src/CharacterManagementModal.jsx`
- `frontend/src/services/tavernService.js`

**验收标准**

- 可以不离开向导完成“地点 → 酒馆 → 角色 → AI → 开门”。
- 每一步只展示必要字段。
- Step 4 支持“稍后配置 AI”，但完成后酒馆状态应明确显示为歇业 / 未配置。
- 测试连接失败时给出可执行错误提示。

**实现记录**

- `frontend/src/TavernCreatePanel.jsx` 已从 3 步改为 5 步向导：地点、酒馆、角色、AI、开门。
- Step 1 仅处理地图坐标并校验经纬度范围；Step 2 处理名称、简介、场景氛围和访问规则。
- Step 3 保留 JSON / PNG 角色卡导入和手动创建 NPC，并增加无角色友好提示。
- Step 4 复用 `LLMConfigForm` 的 AI 配方卡和测试连接；可跳过 AI 配置。
- Step 5 增加开门前摘要卡，明确展示地图锚点、酒馆门牌、角色数、AI 状态。
- `frontend/src/styles.css` 已补向导步骤卡、摘要卡、坐标说明和移动端折叠样式。
- 验证：`npm --prefix .\frontend run build` 通过；`pytest` 171 passed；`compileall` 通过。

---

### FM-VT-P0-04：LLM 预设卡 `[done 2026-04-17]`

**目标**：用“配置配方”替代一堆裸参数。

内置预设建议：

| 预设 | 适用场景 | 默认配置 |
|------|----------|----------|
| DeepSeek 中文文游 | 低成本、中文、文风稳定 | `deepseek` / OpenAI 兼容 |
| OpenAI 兼容 | 通用 API、中转站 | `openai-compatible/custom` |
| Claude / Gemini 长上下文 | 长剧情、世界书多 | 长上下文模型 |
| Ollama 本地测试 | 本地隐私、无云 API | `ollama` |
| 极简演示 | 无真实 API 时验证流程 | 规则降级 / mock |

**建议改动文件**

- `frontend/src/LLMConfigForm.jsx`
- 新增 `frontend/src/LLMPresetCards.jsx`
- `frontend/src/services/tavernService.js`
- 可选：后端新增默认预设接口 `/api/llm/presets`

**验收标准**

- 用户点击预设卡即可自动填充 backend、model、base_url、temperature、max_tokens 等字段。
- 仍允许高级用户手动覆盖。
- 每张卡有“适合 / 优点 / 注意事项”。

**实现记录**

- `frontend/src/LLMConfigForm.jsx` 已新增 `LLM_PRESETS` 与一键配置卡片。
- 内置 DeepSeek 中文文游、OpenAI 兼容中转、长上下文剧情、Ollama 本地测试、极简稳定 5 个配方。
- `frontend/src/TavernCreatePanel.jsx` 已支持 Ollama / 本地后端仅凭 `base_url` 随创建酒馆保存 AI 配置。
- `fablemap/tavern.py` 已允许本地无 Key 后端进入 open 状态，并避免前端保存空 `api_key` 时误清除同 backend 既有密钥。
- `tests/test_tavern_token_usage.py` 已覆盖密钥保留和 Ollama base_url-only 配置。

---

### FM-VT-P0-05：记忆面板 MVP `[done 2026-04-17]`

**目标**：先让用户看见已有记忆和回访关系，不急着做复杂自动提炼。

访客侧显示：

- 我来过几次
- 当前关系阶段
- 最近一次到访
- 最近对话摘要 / 最近关键消息
- NPC 对我的称呼

店主侧显示：

- 常客列表
- 回访次数
- 关系阶段
- 最近消息
- 可查看会话

**建议改动文件**

- `frontend/src/TavernChatRoom.jsx`
- `frontend/src/TavernOwnerPanel.jsx`
- 新增 `frontend/src/TavernMemoryPanel.jsx`
- `fablemap/web/router.py`
- `fablemap/web/service.py`
- `fablemap/tavern.py`

**验收标准**

- 酒馆对话页能打开“记忆”面板。
- 面板能展示 VisitorState 和最近会话信息。
- 店主可从访客关系列表跳转到会话详情。
- 没有记忆时有友好空状态，而不是空白。

**实现记录**

- `fablemap/tavern.py` 入场返回已包含当前访客 `visitor_state`，匿名入场返回 `null`。
- `fablemap/web/service.py` 聊天成功后返回更新后的 `visitor_state`，前端可即时刷新关系强度。
- `frontend/src/TavernEntryPanel.jsx` 会把入场状态带入聊天房间。
- `frontend/src/TavernChatRoom.jsx` 已新增访客侧“记忆”按钮和 `TavernMemoryPanel`，展示关系阶段、到访次数、首次 / 最近到访、本轮短期记忆与稳定注入事实。
- 店主侧原有 `OwnerVisitorStatePanel` / 会话详情联动继续作为经营视角的记忆 MVP。
- 已补 `tests/test_tavern_visitor_state_api.py` 与 `tests/test_tavern_llm_degradation.py` 覆盖。

---

### FM-VT-P0-06：小白文案与高级模式折叠 `[done 2026-04-17]`

**目标**：把工程术语改成用户语义。

建议替换：

| 当前 / 工程术语 | 用户语义 |
|-----------------|----------|
| LLM Config | AI 配置 |
| WorldInfo | 世界书 |
| Writeback | 记忆写入 / 留下痕迹 |
| Token Used | AI 消耗 |
| Degraded | 临时降级 |
| Prompt | 角色指令 / 剧情指令 |
| Regex | 输出修正 |

**建议改动文件**

- 全局 JSX 文案
- `frontend/src/styles.css`
- `docs/PRODUCT_BRIEF.md`

**验收标准**

- 普通页面不出现不解释的 LLM / Prompt / WorldInfo / Regex。
- 高级页面可以保留专业术语，但必须有说明。

**实现记录**

- `frontend/src/App.jsx` 已把“高级地图设置 / 调试后台 / 重置引导”折叠进首页“设置”面板。
- `frontend/src/LLMConfigForm.jsx` 可见文案已从“AI 后端配置 / AI 后端”调整为“AI 配置 / AI 服务”；高级 token 参数改为“最长回复预算”。
- `frontend/src/TavernOwnerPanel.jsx` 已把 Token / LLM / VisitorState 等店主普通视图文案改为 AI 消耗、模型使用量、访客关系与聊天记忆。
- `frontend/src/TavernCreatePanel.jsx`、`CharacterEditor.jsx`、`TavernChatRoom.jsx` 已把 Prompt / 系统提示词等可见文案改为角色指令 / 剧情指令，并把 AI 后端错误改为 AI 服务错误。
- `frontend/src/WorldEntryPanel.jsx`、`WorldSliceResultPanel.jsx`、`WorldStagePanel.jsx`、`WorldStagePoiFilterLane.jsx`、`WorldDensityIndicator.jsx`、`WorldStageDisturbancePanel.jsx` 已弱化“地点切片 / 扰动注入”等工程词，改为附近内容、附近地点、高级环境信号、留下痕迹。
- `frontend/src/TavernDetailPanel.jsx` 已把 Token 消耗改为 AI 消耗。
- 验证：`npm --prefix .\frontend run build` 通过；`pytest` 169 passed；`compileall` 通过。

---

## 5. P1：第二阶段任务

### FM-VT-P1-01：酒馆内三栏工作台

**目标**：进入酒馆后采用轻量酒馆式布局。

建议布局：

```text
左侧：角色列表 / 对话列表 / 回访记录
中间：聊天区
右侧：上下文面板
      - 当前角色卡
      - 地点设定
      - 命中世界书
      - 当前记忆
      - AI 参数摘要
```

**建议改动文件**

- `frontend/src/TavernChatRoom.jsx`
- `frontend/src/TavernInterior.jsx`
- `frontend/src/ChatPanel.jsx`
- 新增 `frontend/src/TavernContextPanel.jsx`
- `frontend/src/styles.css`

**验收标准**

- 进入酒馆后不再只有单一聊天区。
- 右侧上下文能解释“这轮 AI 大概读到了什么”。
- 移动端自动折叠为底部抽屉或标签页。

---

### FM-VT-P1-02：上下文可视化面板

**目标**：把 Prompt 注入内容变成可解释 UI。

示例展示：

```text
本轮 AI 已读取：
- 酒馆场景：第三中学传达室
- 角色：刘大爷
- 访客关系：常客，来过 5 次
- 命中世界书：校史 / 档案柜
- 长期记忆：你上次问过毕业照
```

**建议改动文件**

- `fablemap/prompt_builder.py`
- `fablemap/web/service.py`
- `frontend/src/TavernContextPanel.jsx`
- `frontend/src/services/tavernService.js`

**验收标准**

- Chat API 返回可选 `context_debug` / `injected_context` 摘要。
- 默认不给模型原始完整 Prompt，避免泄露敏感配置；只返回安全摘要。
- 店主可在高级模式查看更详细信息。

---

### FM-VT-P1-03：世界书编辑器 `[done 2026-04-17]`

**目标**：为已有 `world_info` 提供真正可用的 UI。

功能：

- 新增 / 编辑 / 删除世界书条目
- 常驻条目
- 关键词触发条目
- 次级关键词
- 扫描深度
- 注入顺序
- 概率
- 启用 / 禁用

**建议改动文件**

- 新增 `frontend/src/WorldBookEditor.jsx`
- `frontend/src/TavernOwnerPanel.jsx`
- `frontend/src/services/tavernService.js`
- `fablemap/tavern.py`
- `fablemap/web/router.py`

**验收标准**

- 店主能不写 JSON 管理世界书。
- 修改后保存到 Tavern `world_info`。
- 支持从角色卡导入来的 world_info 继续编辑。

**实现记录**

- 新增 `frontend/src/WorldBookEditor.jsx`，提供世界书条目列表 + 编辑区的双栏 UI。
- 支持新增 / 编辑 / 删除 / 复制条目，以及常驻条目、关键词、次级关键词、扫描深度、注入顺序、触发概率、启用 / 暂停。
- `frontend/src/services/tavernService.js` 新增 `saveWorldInfo`，通过 Tavern 更新接口保存到 `world_info`。
- `frontend/src/TavernOwnerPanel.jsx` 的酒馆卡新增“世界书”入口，并在总览和卡片上展示世界书数量。
- `frontend/src/styles.css` 补充世界书编辑器桌面 / 移动端样式，保持与角色管理面板一致的轻量工作台体验。
- 验证：`npm --prefix .\frontend run build` 通过；`pytest` 169 passed；`compileall` 通过。

---

### FM-VT-P1-04：世界书命中测试器 `[done 2026-04-17]`

**目标**：让创作者知道某句话会触发哪些世界书。

UI：

```text
输入测试消息：刘大爷，我想看毕业照

命中：
[x] 校史
[x] 档案柜
[ ] 操场传闻
```

**建议改动文件**

- `fablemap/world_info_injector.py`
- 新增 API `/api/taverns/{id}/world-info/test`
- `frontend/src/WorldBookTester.jsx`

**验收标准**

- 输入任意文本可返回命中条目、命中关键词、注入顺序。
- 不调用 LLM，仅测试本地注入逻辑。

**实现记录**

- `fablemap/web/service.py` 新增 `test_world_info_payload`，可对已保存或前端传入的临时 `world_info` 执行确定性关键词命中测试。
- `fablemap/web/router.py` 新增 `POST /api/taverns/{tavern_id}/world-info/test`，限制为店主使用，避免普通访客拿到创作者调试视图。
- `frontend/src/services/tavernService.js` 新增 `testWorldInfo`。
- `frontend/src/WorldBookEditor.jsx` 内置“命中测试”区：输入一句测试消息后展示命中数量、命中词、条目顺序、扫描深度和暂停 / 概率状态；测试不调用 AI、不保存。
- `tests/test_tavern_router_compat.py` 增加世界书命中测试 API 回归，覆盖常驻条目、关键词条目、临时未保存条目和权限拦截。
- 验证：`npm --prefix .\frontend run build` 通过；`pytest` 171 passed；`compileall` 通过。

---

### FM-VT-P1-05：酒馆包 Tavern Package 导入 / 导出 `[done 2026-04-17]`

**目标**：让酒馆设定成为可传播 UGC。

建议格式：

```json
{
  "type": "fablemap_tavern_package",
  "version": "1.0",
  "tavern": {},
  "characters": [],
  "world_info": [],
  "prompt_preset": {},
  "memory_policy": {},
  "cover": ""
}
```

注意：导出时不得包含 API Key、访客私密聊天记录、访客私密记忆。

**建议改动文件**

- `fablemap/tavern.py`
- `fablemap/web/router.py`
- `fablemap/web/service.py`
- `frontend/src/TavernOwnerPanel.jsx`
- `frontend/src/services/tavernService.js`

**验收标准**

- 店主可导出当前酒馆包 JSON。
- 用户可导入酒馆包，并选择新坐标挂载。
- 导入后角色、世界书、预设完整保留。
- 敏感字段不会进入导出文件。

**实现记录**

- `fablemap/web/service.py` 新增 `export_tavern_package_payload` / `import_tavern_package_payload`。
- `fablemap/web/router.py` 新增：
  - `GET /api/taverns/{tavern_id}/package`
  - `POST /api/tavern-packages/import`
- 酒馆包格式使用 `type=fablemap_tavern_package`、`version=1.0`，包含 tavern 基础信息、characters、world_info、groups、bookmarks、chat_templates、prompt_preset、memory_policy、voice_config、cover。
- 导出时过滤 API Key、密码哈希、访客聊天、访客记忆和 token 使用量等敏感 / 私密数据。
- 导入时创建新酒馆并要求坐标挂载；原密码酒馆默认转为私人酒馆，不复制密码。
- `frontend/src/services/tavernService.js` 新增 `exportTavernPackage` / `importTavernPackage`。
- `frontend/src/TavernOwnerPanel.jsx` 新增店主侧“导入酒馆包”和每个酒馆卡片“导出包”入口。
- `tests/test_tavern_backup_restore.py` 增加酒馆包导出 / 导入安全回归，覆盖 API Key、密码、访客聊天不外泄，以及角色 / 世界书 / 坐标导入。
- 验证：`npm --prefix .\frontend run build` 通过；`pytest` 171 passed；`compileall` 通过。

---

### FM-VT-P1-06：酒馆模板卡片 UI `[done 2026-04-17]`

**目标**：把“作品卡市场”的形态改造成 FableMap 的模板库。

卡片字段：

- 封面
- 酒馆名
- 一句话简介
- 标签
- 适合放置的位置类型
- 作者
- 角色数
- 世界书条目数
- 安装 / 预览

**建议改动文件**

- 新增 `frontend/src/TavernTemplateGallery.jsx`
- 新增 `frontend/src/TavernTemplateCard.jsx`
- 可选：`fablemap/presets.py`

**验收标准**

- 本地至少内置 2–3 个模板。
- 模板安装时必须选择真实坐标。
- 不把模板库做成脱离地图的普通文游市场。

**实现记录**

- 新增 `frontend/src/tavernTemplates.js`，内置 3 个可安装酒馆包模板：
  - 第三中学传达室
  - 雨夜便利店
  - 旧书店后室
- 新增 `frontend/src/TavernTemplateGallery.jsx`，提供模板搜索、标签筛选、模板卡片、角色 / 世界书数量展示和安装面板。
- `frontend/src/App.jsx` 新增首页主入口“模板”，并把模板视图作为地图 / 我的酒馆之外的第三条普通路径。
- 模板安装复用 `tavernService.importTavernPackage`，安装时必须填写 / 使用真实经纬度，安装后进入“我的酒馆”继续编辑。
- 模板仍是地图锚定的酒馆包，不提供脱离地图的纯文游市场入口。
- `frontend/src/styles.css` 新增模板库桌面 / 移动端卡片样式。
- 验证：`npm --prefix .\frontend run build` 通过；`pytest` 171 passed；`compileall` 通过。

---

### FM-VT-P1-07：输出修正 / 风格护栏 `[done 2026-04-17]`

**目标**：把“正则”包装为普通用户能理解的输出修正能力。

默认规则：

- 移除“作为 AI”
- 移除免责声明
- 禁止代替玩家行动
- 禁止突然总结剧情
- 禁止突然升华主题
- 保持角色口吻

高级模式：

- 自定义正则匹配
- 替换文本
- 作用阶段：发送前 / 回复后
- 启用 / 禁用

**建议改动文件**

- 新增 `fablemap/output_rules.py`
- `fablemap/web/service.py`
- `frontend/src/OutputRulesEditor.jsx`
- `frontend/src/TavernOwnerPanel.jsx`

**验收标准**

- 回复返回前应用启用的输出修正规则。
- 店主可开关默认规则。
- 高级正则错误不会导致聊天失败，应提示规则无效。

**实现记录**

- 新增 `fablemap/output_rules.py`，内置“去除 AI 自称 / 去除 OOC 开头 / 去除总结式标题 / 压缩多余空行 / 玩家主导权示例”等规则。
- `fablemap/tavern.py` 为酒馆持久化 `output_rules`；酒馆包导入 / 导出已包含输出护栏但仍不包含 API Key、访客聊天或密码。
- `fablemap/web/service.py` 在 AI 回复落库前调用输出护栏；无效正则会进入 `errors`，不会中断聊天主链路。
- 新增 `/api/taverns/{id}/output-rules` GET / PUT 与 `/test` 预览接口，店主可加载、保存、测试规则。
- 新增 `frontend/src/OutputRulesEditor.jsx`，店主后台酒馆卡片增加“护栏”入口；支持开关、编辑正则/文本替换、恢复默认、复制、自定义规则与快速预览。
- 新增 `tests/test_tavern_output_rules.py` 覆盖默认规则、无效正则容错、API 保存/预览/越权。
- 验证：`tests/test_tavern_output_rules.py` 2 passed；`pytest` 173 passed；`compileall` 通过；`npm --prefix .\frontend run build` 通过。

---

### FM-VT-P1-08：店主控制台重新分组 `[done 2026-04-17]`

**目标**：避免 `TavernOwnerPanel` 继续变成巨型页面。

建议 tab：

```text
总览 / 酒馆 / 角色 / 世界书 / 记忆 / 访客 / AI / 数据
```

默认展示：

```text
总览 / 酒馆 / 角色 / AI / 访客
```

高级展开：

```text
世界书 / 记忆 / 输出修正 / Prompt 调试 / 数据导出
```

**建议改动文件**

- `frontend/src/TavernOwnerPanel.jsx`
- 拆分子组件：
  - `OwnerOverviewPanel.jsx`
  - `OwnerTavernsPanel.jsx`
  - `OwnerVisitorsPanel.jsx`
  - `OwnerMemoryPanel.jsx`
  - `OwnerDataPanel.jsx`

**验收标准**

- `TavernOwnerPanel.jsx` 行数和职责明显下降。
- 所有现有功能入口仍可找到。
- 普通店主先看到经营核心，而不是调试细节。

**实现记录**

- `frontend/src/TavernOwnerPanel.jsx` 新增店主分组导航：总览 / 酒馆 / 访客 / AI / 高级工具。
- 默认只展示总览摘要和建议下一步；酒馆列表、访客会话、AI 消耗、高级创作工具按分组进入，减少首屏信息密度。
- 新增 `frontend/src/OwnerConsoleSections.jsx`，抽出分组导航、建议操作卡和高级工具台，降低主面板职责。
- “高级工具”集中角色、世界书、输出护栏、AI 配置、酒馆包导入 / 导出入口；普通经营视图仍保留必要酒馆卡片操作。
- `frontend/src/styles.css` 新增分组导航、建议操作卡、高级工具台与移动端响应式样式。
- 验证：`npm --prefix .\frontend run build` 通过；`pytest` 173 passed；`compileall` 通过。

---

## 6. P2：高级系统任务

### FM-VT-P2-01：结构化记忆模型

**目标**：从“访问次数 + 关系阶段”升级为内容型剧情记忆。

建议模型：

```ts
MemoryAtom {
  id: string
  scope: "visitor_character" | "visitor_tavern" | "tavern_public" | "place"
  dimension: "fact" | "emotion" | "event" | "preference" | "promise"
  horizon: "short" | "mid" | "long"
  subject: string
  content: string
  importance: number
  confidence: number
  source_message_ids: string[]
  created_at: string
  updated_at: string
  pinned: boolean
  visibility: "private" | "owner" | "public"
}
```

**建议改动文件**

- `fablemap/memory.py`
- `fablemap/tavern.py`
- `fablemap/web/router.py`
- `fablemap/web/service.py`
- 新增 tests：`tests/test_tavern_memory_atoms.py`

**验收标准**

- 可创建、查询、更新、删除记忆原子。
- 记忆按 scope / dimension / horizon 检索。
- 私密记忆不被店主或其他访客越权读取。

---

### FM-VT-P2-02：记忆自动提炼流水线

**目标**：从聊天中提炼事实 / 情感 / 事件 / 承诺。

流程：

```text
聊天结束或每 N 条消息
→ 提取候选记忆
→ 去重 / 合并
→ 打分
→ 写入短期 / 中期 / 长期
→ 下次 Prompt 注入
```

**建议改动文件**

- `fablemap/memory.py`
- `fablemap/llm_clients.py`
- `fablemap/web/service.py`

**验收标准**

- 不配置 LLM 提炼器时，系统仍可用。
- 可用规则启发式作为 fallback。
- 自动记忆必须能在 UI 中查看、删除、标错。

---

### FM-VT-P2-03：记忆注入预算与优先级

**目标**：避免记忆越多 Prompt 越爆。

策略：

- pinned > long > mid > short
- 当前角色相关 > 当前酒馆相关 > 地点公共记忆
- 最近命中 > 旧记忆
- 高重要度 > 低重要度

**建议改动文件**

- `fablemap/prompt_builder.py`
- `fablemap/memory.py`
- `fablemap/token_counter.py`

**验收标准**

- PromptBuilder 支持 `memory_budget_tokens`。
- 超预算时自动裁剪低优先级记忆。
- Chat API 可返回被注入的记忆摘要。

---

### FM-VT-P2-04：Prompt Block 段落引擎 `[done 2026-04-17]`

**目标**：从固定分层 PromptBuilder 升级为可开关段落系统。

建议模型：

```ts
PromptBlock {
  id: string
  name: string
  enabled: boolean
  type:
    | "scene"
    | "character"
    | "world_info"
    | "visitor_state"
    | "short_memory"
    | "mid_memory"
    | "long_memory"
    | "style_guard"
    | "author_note"
    | "output_rule"
  order: number
  template: string
  token_budget?: number
}
```

**建议改动文件**

- `fablemap/prompt_builder.py`
- 新增 `fablemap/prompt_blocks.py`
- `frontend/src/PromptBlockEditor.jsx`

**验收标准**

- 普通用户只看到开关。
- 高级用户能调整顺序、模板和预算。
- 老的 PromptBuilder 行为有兼容层，不破坏现有测试。

**实现记录**

- 新增 `fablemap/prompt_blocks.py`，提供默认段落、类型归一化和粗略 token 预算裁剪。
- `PromptBuildConfig` 新增 `prompt_blocks`；为空时保持旧 PromptBuilder 分层行为，配置后按段落开关 / 顺序组装系统上下文。
- 默认段落覆盖酒馆场景、角色指令、角色信息、访客关系、世界书动态注入、角色口吻护栏和作者备注。
- `fablemap/tavern.py` 支持 `prompt_blocks` 落库、导入导出与更新；酒馆包会携带段落结构但不包含 API Key。
- 新增 `GET/PUT/POST /api/taverns/{id}/prompt-blocks(/preview)`，店主可读取、保存和无 LLM 预览最终 messages。
- 新增 `frontend/src/PromptBlockEditor.jsx`，在店主酒馆卡和高级工具台提供“段落”入口，支持开关、排序、模板、预算、复制、恢复默认和组装预览。
- `tests/test_tavern_prompt_blocks.py` 覆盖默认段落注入、世界书关闭、预算裁剪、归一化和 API 权限。
- 验证：`npm --prefix .\frontend run build` 通过；`py -3 -m compileall -q fablemap` 通过；`pytest` 177 passed。

---

### FM-VT-P2-05：预设管理器 `[done 2026-04-17]`

**目标**：把模型参数、Prompt Block、记忆策略、输出修正组合成“运行预设”。

预设字段：

- 名称
- 适合模型
- temperature / max_tokens / top_p
- 启用的 Prompt Blocks
- 记忆策略
- 输出修正规则

**建议改动文件**

- `fablemap/presets.py`
- `frontend/src/PresetManager.jsx`
- `frontend/src/LLMConfigForm.jsx`

**验收标准**

- 店主可选择内置预设。
- 店主可复制并编辑自己的预设。
- 酒馆导出包可包含预设，但不包含 API Key。

**实现记录**

- 新增 `fablemap/presets.py`，定义运行预设结构、内置预设、密钥剥离、记忆策略归一化和自定义预设过滤。
- `Tavern` 新增 `runtime_presets`、`active_preset_id`、`memory_policy`，支持落库、更新、导入和导出。
- 新增运行预设 API：
  - `GET /api/taverns/{id}/runtime-presets`
  - `PUT /api/taverns/{id}/runtime-presets`
  - `POST /api/taverns/{id}/runtime-presets/apply`
- 应用预设时同步 AI 参数、Prompt Blocks、输出护栏和记忆策略；同 AI 服务下会保留当前 API Key，预设本身永不保存密钥。
- 酒馆包导出包含自定义运行预设、默认运行预设、当前激活预设和记忆策略；仍过滤 API Key、token 使用量、访客聊天和私密记忆。
- 新增 `frontend/src/PresetManager.jsx`，店主可查看内置预设、复制为自定义、编辑模型参数、从当前酒馆捕获组合配置、保存和应用。
- 店主酒馆卡和高级工具台新增“预设”入口。
- `tests/test_tavern_runtime_presets.py` 覆盖密钥剥离、默认预设、自定义保存、应用、导出和权限边界。
- 验证：`npm --prefix .\frontend run build` 通过；`py -3 -m compileall -q fablemap` 通过；`pytest` 180 passed。

---

### FM-VT-P2-06：高级记忆图 / RAG 预研

**目标**：为后续 NetworkX 图数据库 / 向量检索做接口预留。

不急于实现完整 RAG，先做抽象：

- MemoryStore 接口
- KeywordMemoryStore
- VectorMemoryStore stub
- GraphMemoryStore stub

**建议改动文件**

- `fablemap/memory.py`
- `fablemap/memory_graph.py`
- `fablemap/vectors.py`

**验收标准**

- 当前 JSON 存储可作为默认实现。
- 不引入强依赖，不阻塞本地运行。

---

## 7. 体验与视觉任务

### FM-VT-UX-01：轻量浅色 / 暗色主题切换

参考 VisionTale 的浅色干净界面，但保留 FableMap 赛博气质。

**验收标准**

- 设置页可切换浅色 / 暗色。
- 酒馆创建、对话、店主后台均可读。

---

### FM-VT-UX-02：卡片化酒馆发现列表

字段：

- 封面 / 地点缩略图
- 名称
- 简介
- 标签
- 距离
- 角色数
- 访问权限
- 营业状态

**验收标准**

- 地图 marker 和列表选择联动。
- 支持搜索、标签筛选、距离排序。

---

### FM-VT-UX-03：移动端酒馆体验

重点：

- 三栏布局折叠
- 输入框固定底部
- 角色列表变成抽屉
- 记忆 / 世界书 / 上下文变成标签页

**验收标准**

- 720px 以下可完整完成发现、入场、聊天、开店核心链路。

---

## 8. 测试与验收任务

### FM-VT-QA-01：开店向导回归测试

覆盖：

- 公开酒馆
- 密码酒馆
- 私人酒馆
- 无 AI 配置
- API 测试成功
- API 测试失败
- 导入角色卡
- 手动创建角色

---

### FM-VT-QA-02：记忆权限测试

覆盖：

- 访客只能看自己的私密记忆
- 店主能看酒馆经营相关记忆，但不能读取不该读取的私密字段
- 其他访客不能读取别人的记忆
- 导出酒馆包不包含访客私密记忆

---

### FM-VT-QA-03：世界书注入测试

覆盖：

- 常驻条目
- 关键词触发
- 次级关键词
- depth
- order
- disabled
- probability
- 命中测试 API

---

### FM-VT-QA-04：Prompt / 输出修正测试

覆盖：

- Prompt Block 顺序稳定
- token budget 裁剪稳定
- 输出修正规则失败不影响聊天主链路
- 降级回应仍能落库

---

## 9. 推荐实施顺序

### 第一波：先把小白路径跑通

1. `FM-VT-P0-01` 首页信息架构瘦身
2. `FM-VT-P0-02` 首次使用分流向导
3. `FM-VT-P0-03` 3 分钟开店向导
4. `FM-VT-P0-04` LLM 预设卡
5. `FM-VT-P0-06` 小白文案与高级模式折叠

### 第二波：让“记忆”变成产品卖点

1. `FM-VT-P0-05` 记忆面板 MVP
2. `FM-VT-P1-02` 上下文可视化面板
3. `FM-VT-P2-01` 结构化记忆模型
4. `FM-VT-P2-02` 记忆自动提炼流水线
5. `FM-VT-P2-03` 记忆注入预算与优先级

### 第三波：完善创作者工具

1. `FM-VT-P1-03` 世界书编辑器
2. `FM-VT-P1-04` 世界书命中测试器
3. `FM-VT-P1-07` 输出修正 / 风格护栏
4. `FM-VT-P2-04` Prompt Block 段落引擎
5. `FM-VT-P2-05` 预设管理器

### 第四波：UGC 闭环

1. `FM-VT-P1-05` 酒馆包导入 / 导出
2. `FM-VT-P1-06` 酒馆模板卡片 UI
3. `FM-VT-UX-02` 卡片化酒馆发现列表
4. 后续再考虑远端市场 / 发布 / 审核。

---

## 10. 当前建议立即认领的最小切片

如果下一轮马上开工，推荐只认领下面 5 个：

| 顺序 | 任务 | 原因 |
|------|------|------|
| 1 | `FM-VT-P0-01` 首页信息架构瘦身 | 降低第一眼认知成本 |
| 2 | `FM-VT-P0-03` 3 分钟开店向导 | 直接对应 VisionTale 最有价值参考 |
| 3 | `FM-VT-P0-04` LLM 预设卡 | 立刻降低 AI 配置门槛 |
| 4 | `FM-VT-P0-05` 记忆面板 MVP | 放大 FableMap 已有 VisitorState 价值 |
| 5 | `FM-VT-P1-03` 世界书编辑器 | 把已有 world_info 能力产品化 |

---

## 11. 认领记录

| 任务 ID | 认领人 / Agent | 状态 | 分支 / 备注 |
|---------|----------------|------|-------------|
| FM-VT-P0-01 | Codex | done | 已完成首页信息架构瘦身；验证 `pytest` 169 passed，前端 build 通过 |
| FM-VT-P0-02 | Codex | done | 已实现首次使用分流向导；验证 `pytest` 169 passed，前端 build 通过 |
| FM-VT-P0-03 | Codex | done | 已实现 5 步 3 分钟开店向导；验证 `pytest` 169 passed，前端 build 通过 |
| FM-VT-P0-04 | Codex | done | 已实现 LLM 预设卡；验证 `pytest` 169 passed，`npm --prefix .\frontend run build` 通过 |
| FM-VT-P0-05 | Codex | done | 已实现访客侧记忆面板和 visitor_state API 返回；验证 `pytest` 169 passed，前端 build 通过 |
| FM-VT-P0-06 | Codex | done | 已完成小白文案替换与高级入口折叠；验证 `pytest` 169 passed，前端 build 通过 |
| FM-VT-P1-01 | Codex | done | 已实现三栏布局：新增 TavernContextPanel.jsx（角色/场所/世界书/记忆/AI 五标签上下文面板），集成到 TavernChatRoom；验证 `pytest` 171 passed，前端 build 通过 |
| FM-VT-P1-02 | Codex | done | TavernContextPanel 展示角色卡、场所设定、世界书条目、访客记忆和 AI 参数；与 P1-01 协同实现三栏上下文可视化 |
| FM-VT-P1-03 | Codex | done | 已实现世界书编辑器与店主入口；验证 `pytest` 171 passed，前端 build 通过 |
| FM-VT-P1-04 | Codex | done | 已实现世界书命中测试 API 与编辑器内置测试区；验证 `pytest` 171 passed，前端 build 通过 |
| FM-VT-P1-05 | Codex | done | 已实现酒馆包导入 / 导出与敏感字段过滤；验证 `pytest` 171 passed，前端 build 通过 |
| FM-VT-P1-06 | Codex | done | 已实现 3 个内置酒馆模板和模板安装 UI；验证 `pytest` 171 passed，前端 build 通过 |
| FM-VT-P1-07 | Codex | done | 已实现输出护栏规则引擎、店主编辑器和保存/预览 API；验证 `pytest` 173 passed，前端 build 通过 |
| FM-VT-P1-08 | Codex | done | 已完成店主控制台分组导航与高级工具台；抽出 OwnerConsoleSections；验证 `pytest` 173 passed，前端 build 通过 |
| FM-VT-P2-01 | 未认领 | todo |  |
| FM-VT-P2-02 | 未认领 | todo |  |
| FM-VT-P2-03 | 未认领 | todo |  |
| FM-VT-P2-04 | Codex | done | 已实现 Prompt Block 段落引擎、店主编辑器和保存/预览 API；验证 `pytest` 177 passed，前端 build 通过 |
| FM-VT-P2-05 | Codex | done | 已实现运行预设模型、店主预设管理器、保存/应用 API 和酒馆包导出；验证 `pytest` 180 passed，前端 build 通过 |
| FM-VT-P2-06 | 未认领 | todo |  |
