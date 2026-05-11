# brainstorm: Orphan Signal 风格参考落地

- **Status**: COMPLETED
- **Assignee**: Antigravity
- **Last Updated**: 2026-05-11

## Goal

基于用户提供的两张 `Orphan Signal / 孤信号` 参考图，梳理 FableMap 可以吸收的视觉语言、交互隐喻与 MVP 落地点，让后续实现既有“深空信号 / 终端面板 / 回响收件箱”的记忆点，又不偏离 FableMap 当前的真实坐标空间 UGC 主线。

## What I already know

* 用户明确要求“使用 Trellis 头脑风暴”，并提供两张参考图：
  * 参考图 1：深空科幻封面，黑洞 / 星云 / 飞船 / HUD 扫描线 / 单色终端命令，强调“孤独信号、求救、回响、坐标原点”的氛围。
  * 参考图 2：网页游戏式三栏终端 UI，顶部状态条显示坐标与资源，左侧是 `COMMAND` 指令面板，中间是 `COMMS` 星际信箱，右侧是 `LOG` 系统日志；整体为暗色、青紫边框、等宽字体、高密度信息面板。
* FableMap 当前定位不是太空游戏，而是“真实地图上的空间 UGC 平台”：坐标 / 定位 → 真实底图 → 浏览空间 → 进入空间 → 配置 AI NPC → 对话互动 → 写回记忆 → 回访反馈。
* 必须保留真实坐标锚点、主人主权、AI 草稿需店主确认、SillyTavern 兼容、Token 由店主承担等边界。
* `docs/WHAT_NOT_TO_BUILD.md` 明确禁止：
  * 脱离真实地图的自由空间；
  * 平台绕过店主确认自动生成并发布内容；
  * 战斗 / 等级 / 装备 / 排行榜；
  * 为了“更像游戏”或“更炫地图表现”偏离空间体验。
* 现有前端已有 React Router + Vite + Tailwind 的新路由体系：
  * 首页：`frontend/app/routes/home.tsx`
  * 探索页：`frontend/app/routes/discover.tsx`
  * 创建页：`frontend/app/routes/create.tsx`
  * 空间页：`frontend/app/routes/tavern.tsx`
* 现有前端已有一套 `SoulLink` 黑 / 亮色参考稿落地机制：
  * `frontend/app/components/soul-link-reference-artboards.tsx`
  * `frontend/app/components/home-black-reference.tsx`
  * `frontend/app/components/discover-black-reference.tsx`
  * 资产目录：`frontend/app/assets/soul-link-05-10/`
* 当前视觉规范要求用户可见页面达到 consumer-grade cyber tavern bar，同时保持窄屏可用；视觉/交互改动至少运行 `npm --prefix .\frontend run build`，需要人工视觉验收前还要用 Playwright 做桌面 + 窄屏自验收并记录截图。
* 如果后续引入或生成 bitmap 资产，不能只停留在聊天预览、`.codex/generated_images` 或临时目录，必须落到项目内规范路径；非 NPC UI / 参考图不强制同目录 prompt sidecar，但需要记录来源和处理方式。

## Assumptions (temporary)

* 用户目前要的是需求/方案头脑风暴，而不是立刻实现。
* 两张图是风格与交互参考，不是要求 1:1 复刻原图中的品牌、文案、太空游戏机制或 MMO 数值系统。
* 最适合 FableMap 的落地方向是把“信号 / 回响 / 坐标终端”转译为真实坐标空间发现与回访体验，而不是把产品改成深空生存游戏。
* 当前优先考虑前端 UI / 文案 / 信息架构层面的 MVP；除非用户明确选择更深方案，否则不改后端 Schema、API 或持久化结构。

## Requirements (evolving)

* 用参考图提炼一套可执行的 FableMap 风格方向：
  * 关键词：孤信号、真实坐标、回响、终端、扫描、收件箱、系统日志、低饱和深空底色、青绿 / 青蓝发光、少量紫色异常信号。
  * 避免：太空 MMO、资源采集、战斗威胁、平台自动生成剧情、脱离真实坐标。
* 保持 FableMap 产品隐喻：
  * `Signal` = 真实坐标上的空间入口 / NPC 留下的回响；
  * `Command` = 访客或店主的明确操作；
  * `Comms` = 空间 / NPC / 回访反馈的消息流；
  * `Log` = 系统状态、写回、权限、AI 草稿生命周期的透明记录；
  * `Origin` = 真实地图坐标，不是虚构宇宙坐标。
* MVP 不新增后端字段；如果需要展示状态，优先从现有 `listTaverns`、`getTavern`、访问权限、开放状态、角色数量、visit_count、记忆/回访相关现有数据派生。
* 若落地为 UI 改动，必须保留现有路由和服务边界，不在组件里散落 direct fetch。
* 若落地为视觉稿 / 参考资产，必须写明是参考 / 草图 / 待验收，不可声称已经替换运行时资产。

## Acceptance Criteria (evolving)

* [ ] 明确选定一个 MVP 落地点（首页、探索页、空间内页、或纯风格规范）。
* [ ] PRD 记录用户确认的方案、MVP 范围和明确不做项。
* [ ] 若进入实现：不改 Schema / API，除非另开任务并同步文档与测试。
* [ ] 若进入实现：桌面和窄屏都能使用；主要按钮不被固定导航遮挡。
* [ ] 若进入实现：运行 `npm --prefix .\frontend run build`。
* [ ] 若需要人工视觉验收：使用 Playwright 在桌面 + 窄屏打开目标页面，保存截图/报告到任务或 artifacts 路径。
* [ ] 若新增 / 生成 / 替换图片资产：资产进入项目路径，并记录尺寸 / hash / 来源或处理方式。

## Definition of Done (team quality bar)

* 需求与范围在本 PRD 中收敛，包含 out-of-scope。
* 如果只做 brainstorm：无需运行前端 build，但要报告未实现、未验证。
* 如果进入实现：
  * Tests/build added or updated where appropriate.
  * `npm --prefix .\frontend run build` 成功。
  * 涉及规则脚本时运行 `npm --prefix .\frontend test`。
  * 涉及视觉/交互人工验收前完成 Playwright 自验收截图。
  * 文档/任务记录更新。

## Out of Scope (explicit)

* 不把 FableMap 改成太空 MMO / 生存游戏 / 资源采集游戏。
* 不实现战斗、等级、装备、威胁系统、排行榜。
* 不新增无真实坐标的“宇宙空间”。
* 不让平台自动生成并发布空间、NPC、剧情或世界书内容。
* 不引入大型 UI 框架、状态管理库或新的地图渲染依赖。
* 不在本 brainstorm 阶段移动、删除、重命名既有文档或资产目录。
* 不声称参考图已进入项目资产，除非后续明确保存到仓库内路径并验证。

## Technical Notes

### Docs inspected

* `README.md`：确认项目定位、当前原型状态、核心前后端模块、启动/构建命令。
* `docs/INDEX.md`：确认主线文档与阅读顺序。
* `docs/PRODUCT_BRIEF.md`：确认空间 UGC 平台、主人主权、真实坐标与当前取舍。
* `docs/FABLEMAP_TAVERN_PLATFORM.md`：确认核心场景、数据模型、空间/角色/LLM/玩法边界。
* `docs/ARCHITECTURE.md`：确认系统层次、真实内核、空间平台核心、地图展示、空间体验、AI 对话层。
* `docs/WORLD_SCHEMA.md`：确认 Tavern / TavernCharacter / WorldInfoEntry / VisitorState / ChatMessage 等 Schema 是权威约束。
* `docs/WHAT_NOT_TO_BUILD.md`：确认负面边界。
* `.trellis/workflow.md`：确认 Trellis 任务、上下文、验证流程。
* `.trellis/spec/frontend/index.md`、`component-guidelines.md`、`quality-guidelines.md`、`image-asset-guidelines.md`：确认前端组件、视觉质量、验证和图片落盘规则。

### Code / asset context inspected

* `frontend/app/routes/home.tsx`：已有首页 hero、搜索、主题切换、`SoulLinkHomeReference` 入口。
* `frontend/app/routes/discover.tsx`：已有探索页、搜索/筛选、雷达/卡片模式、`SoulLinkDiscoverReference`、`TavernPreviewModal`。
* `frontend/app/routes/create.tsx`：已有创建空间步骤、真实坐标、AI 草稿生命周期和店主确认边界文案。
* `frontend/app/routes/tavern.tsx`：已有空间详情、分享、chat workbench、回访/互动相关组件。
* `frontend/app/components/soul-link-reference-artboards.tsx`：已有 artboard slice + real DOM overlay 的黑/亮主题机制，可作为后续视觉参考或替换/扩展点。
* `frontend/app/styles.css`、`frontend/app/product/styles.css`：已有暗色发光 cyber tavern token，可扩展为“signal terminal”主题变量。
* `frontend/package.json`：确认 build/test/typecheck/Playwright 脚本。

### Current Trellis setup

* Task directory: `.trellis/tasks/05-11-brainstorm-orphan-signal-style-reference/`
* Dev type initialized: `frontend`
* Scope: `frontend-ui-brainstorm`
* Added context:
  * `.trellis/spec/frontend/component-guidelines.md`
  * `.trellis/spec/frontend/quality-guidelines.md`
  * `.trellis/spec/frontend/image-asset-guidelines.md`

## Research Notes

### What similar tools / patterns imply from the reference

* “终端面板”适合表达可追踪状态、系统边界和明确操作；对 FableMap 来说，这能强化“主人确认”“AI 草稿未发布”“写回记录”等透明性。
* “信号 / 收件箱 / 日志”适合表达异步回访与 NPC 留言，但必须避免做成访客间社交网络。
* “雷达 / 坐标 / 扫描”适合探索页的信息架构，但真实坐标仍要来自地图/地点，不应变成虚构星图。
* “资源条 / 威胁 / 船体状态”在参考图中很有氛围，但在 FableMap 中容易误导为生存游戏或数值系统，需要转译为非游戏化的状态：开放状态、访问规则、角色数、记忆状态、Token 只对店主可见。

### Constraints from FableMap

* 地图只是入口，空间体验、NPC 对话、记忆回访才是核心。
* AI 可辅助生成未发布草稿，但不能绕过店主确认。
* 不做传统游戏系统和访客社交网络。
* 前端应复用现有 React Router 路由、`frontend/app/lib/` 服务、已有 design tokens / UI primitives。
* 参考图若作为 owner design draft 要 1:1 复刻，需要明确“1:1”目标、落库路径和截图验收；当前尚未确认。

### Feasible approaches here

**Approach A: Signal Terminal 视觉规范 / 轻皮肤（Recommended for MVP）**

* How it works:
  * 先写一份“孤信号风格转译规范”或直接在现有首页 / 探索页黑色主题中加入终端式 copy、panel token、状态条、扫描线、坐标徽标。
  * 主要改 CSS / route UI / 文案，不改后端和 Schema。
* Pros:
  * 风险低、与现有 `SoulLink` artboard 机制相容。
  * 可快速验证风格是否更贴近用户想要的氛围。
  * 不触碰产品边界。
* Cons:
  * 交互深度较浅，可能只是“看起来像”。

**Approach B: Discovery Signal Console（探索页信号控制台）**

* How it works:
  * 在 `/discover` 增加或强化一个三栏信号控制台：
    * 左：坐标 / 筛选 / 派发探索命令；
    * 中：空间信号列表 / NPC 回响；
    * 右：系统日志 / 写回 / 访问规则说明。
  * 使用现有 tavern list 数据派生 signal strength、status copy、open/private labels。
* Pros:
  * 最贴近第二张参考图，也最贴近 FableMap 的“发现真实坐标空间”主链路。
  * 不需要后端新增数据即可做出交互感。
* Cons:
  * UI 改动范围中等，需要处理桌面三栏和移动端折叠。
  * 需要谨慎避免“系统日志”伪造不存在的用户社交或平台剧情。

**Approach C: Tavern Interior Mission/Comms Layer（空间内回响终端）**

* How it works:
  * 在单个空间页或聊天 workbench 内加入 `COMMAND / COMMS / LOG` 信息结构：
    * Command = 访客可执行的对话/玩法入口；
    * Comms = NPC 对话、留言、回访提示；
    * Log = 本空间内的记忆写回/状态卡/访问提示。
* Pros:
  * 与“空间体验”和 NPC 对话更深结合，可能形成独特产品记忆点。
* Cons:
  * 更容易跨到玩法、记忆、状态卡等多模块，范围较大。
  * 需要更多现有数据流梳理和测试，可能不适合作为第一版风格验证。

## Expansion Sweep

### Future evolution

* 如果风格验证成功，可以沉淀为 `signal terminal` 主题 token / component primitives，让首页、探索页、空间内页共享同一套 panel / badge / log list。
* 后续可把“回访反馈”和“写回记忆”做成透明日志，但仍保持空间内、访客自身、店主边界内，不变成全局社交动态。

### Related scenarios

* 创建页可用“确认发射信标 / 开门上线”文案强化店主确认，但不应让 AI 草稿像已发布内容。
* 店主管理页可用“舰长日志 / 系统检查”隐喻展示 API Key、Token 统计、角色卡状态，但 API Key 仍不得访客可见。

### Failure / edge cases

* 移动端三栏终端必须折叠为可读的单列 / tabs，不能横向溢出。
* 终端日志不能展示虚假的平台生成剧情或敏感 owner 配置。
* 若使用截图切片作为参考稿，要区分“参考图层”和“真实可交互 DOM”，并做截图验收。
* 若后续生成宇宙背景图，必须落到项目资源路径并记录来源；若只是聊天参考图，不能声称已替换项目资产。

## Open Questions

* Blocking / preference: 第一版 MVP 应落在哪个层面？
  * A. 视觉规范 / 首页轻皮肤；
  * B. `/discover` 探索页信号控制台；
  * C. `/tavern/:id` 空间内回响终端。

## Decision (ADR-lite)

**Context**: 用户提供了 Orphan Signal 参考图，但 FableMap 有明确的空间 UGC、真实坐标和非游戏化边界，需要决定怎样转译，而不是直接照搬太空生存 MMO。  
**Decision**: Pending user preference.  
**Consequences**: 选择 A 可最快验证视觉方向；选择 B 最贴近参考图并服务主链路；选择 C 体验最深但需要更多跨模块设计与测试。


## Additional Reference Set: 时月东方 / 占卜 H5 + AI 解读浮层

### User-provided reference summary

用户继续提供第二组参考图，主要是移动端 H5 / 小程序式东方术数产品：

* 参考图 3：移动浏览器页面 `时月东方`，顶部简洁导航；首页以欢迎卡片 + 工具宫格呈现，工具包含“随便 / 今日运势 / 六爻占卜 / 梅花易数 / 奇门遁甲 / 塔罗占卜”等；整体是白底、浅粉紫背景、圆角卡片、低密度说明文案。
* 参考图 4：梅花易数结果页，展示起卦时间、干支信息、主卦/变卦/互卦、爻位图形、AI 深度解读、核心答案；右下有“留不留”之类明确操作按钮。
* 参考图 5：表单 + 结果 + AI 浮层的组合，顶部 tab（个人 / 合盘 / 占卜），中间是个人信息或占卜问题输入，底部有“历史记录 / 开始排盘 / 开始占卜”；结果页显示结构化结果卡；右侧浮层像 AI 聊天助手，对卦象给出“核心结论 / 关键判断 / 建议”。

### Style / UX DNA extracted for FableMap

这组图与第一组 `Orphan Signal` 形成明显互补：

* 第一组是“暗色信号终端”：强氛围、高密度、深空、系统日志、坐标扫描。
* 第二组是“轻量移动问事工具”：低门槛、表单驱动、结果结构化、AI 解读浮层、历史记录、移动端优先。

可吸收的 UX 模式：

* **工具宫格入口**：把复杂能力拆成可理解的功能卡，而不是一开始暴露完整控制台。
* **问题先行**：用户先输入一个具体问题，再进入结构化结果；这适合 FableMap 的“我想问这个空间 / NPC 什么”。
* **结构化结果 + AI 解读**：先给 deterministic / schema-safe 的结果摘要，再由 AI 或 NPC 作可读解释；这符合 FableMap 避免端到端散文幻觉的原则。
* **历史记录**：适合回访、记忆、已问过的问题、NPC 留言，但必须限定在个人与空间内，不做全局社交流。
* **移动端优先**：卡片、tab、固定主按钮、浮层助手都适合 FableMap 当前需要窄屏可用的要求。

### Product translation options

**Translation 1: “问路 / 问空间”轻量入口**

* 将占卜产品的“输入问题 → 起卦 → AI 解读”转译为 FableMap 的“输入来意 → 选择空间 / NPC → 得到入口建议”。
* 示例：用户在真实坐标附近输入“今天想找一个安静说话的地方”，系统只基于公开空间 metadata / 标签 / 开放状态推荐入口，不生成空间内容。
* 边界：不是算命，不承诺预测，不替店主创作空间设定。

**Translation 2: “NPC 占卜师 / 解读者”作为店主可配置空间模板**

* 把参考图中的术数能力作为某类 Tavern 的店主自愿模板：如“占卜小屋 / 解忧所 / 今日签文”。
* 店主确认后，空间内 NPC 可以根据店主设定提供娱乐性解读。
* 边界：必须标注娱乐参考；不能平台默认生成并发布 NPC；不做医疗/法律/金融等高风险建议。

**Translation 3: “回访记忆排盘”信息架构**

* 不引入真正术数算法，而是借鉴“排盘结果页”的结构化信息架构：把一次空间互动拆成“问题 / 触发时间 / 关键角色 / 情绪线索 / 记忆候选 / NPC 建议”。
* 可用于 StateCard / Canon Ledger / 回访反馈的可视化，但后续实现会跨状态卡与记忆模块，范围更大。

**Translation 4: “移动端 first-run 工具箱”**

* 首页或探索页移动端先呈现一个“你想做什么”工具宫格：探索附近、问一个 NPC、创建空间、查看回响、继续上次记忆。
* 视觉使用第二组图的低密度卡片和主按钮，暗色模式再融合第一组信号终端风格。

### Combined design direction: Signal + Divination without turning into fortune-telling

可以把两组参考合成为一个更适合 FableMap 的产品隐喻：

> **FableMap 不是算命网站，也不是太空游戏；它是“在真实坐标上接收回响、向空间提问、由店主配置的 NPC 给出回应”的移动优先空间终端。**

落地语言建议：

* `占卜 / 起卦` → `提问 / 发出信号 / 请求回响`
* `卦象 / 排盘` → `空间信号卡 / 入口建议 / 记忆摘要`
* `AI 深度解读` → `NPC 解读 / 空间回应 / 回访建议`
* `功德箱` → 不建议直接使用，容易引出付费/打赏/功德概念；可改为 `支持空间主人` 或暂不做。
* `合盘` → 可转译为“人与空间的匹配度”或“角色关系回顾”，但要避免社交/算命承诺。

### New feasible approaches after adding this reference set

**Approach D: Mobile Question Box MVP（Recommended if the goal is conversion / usability）**

* How it works:
  * 在首页或探索页移动端增加一个轻量“问一个坐标 / 问一个空间”入口。
  * 用户输入来意，前端基于现有公开 tavern metadata 做本地筛选/排序或跳到 `/discover?search=...`。
  * UI 借鉴第二组的白底/浅粉紫/卡片/主按钮，但 dark theme 可融合第一组终端信号外观。
* Pros:
  * 很适合移动端和新用户，不需要新后端。
  * 与 FableMap 主链路“空间发现”直接相关。
  * 不触碰敏感 Schema，不需要术数算法。
* Cons:
  * 视觉上不如 Orphan Signal 强烈，需谨慎保持 FableMap 品牌感。

**Approach E: Tavern Oracle Template（适合内容模板，但需更严格边界）**

* How it works:
  * 创建一个店主可选的 Tavern 类型 / 模板：“解忧占卜小屋”“今日回响站”等。
  * 只作为店主确认的空间模板和 NPC prompt seed，不自动发布。
* Pros:
  * 很贴合第二组参考图，能快速形成可传播的 demo。
* Cons:
  * 容易滑向“算命产品”；需要免责声明、安全边界、内容政策和店主确认流程。
  * 可能涉及新模板、NPC preset、文案测试。

**Approach F: Structured Echo Result Page（适合中长期）**

* How it works:
  * 借鉴“排盘结果页”，为一次空间互动生成结构化“回响报告”：问题、空间、NPC、关键记忆、建议下一步。
  * AI 解释作为独立浮层，不直接覆盖正史；确认后才写入状态卡/记忆。
* Pros:
  * 与 FableMap 的记忆/回访价值高度相关。
* Cons:
  * 跨 `chat / state cards / writeback / UI` 多层，需新任务和更完整验证。

### Updated recommendation

如果目标是**最快把两组参考都转成可用产品体验**，推荐 MVP 从 **Approach D: Mobile Question Box** 开始：

* 第一版只做入口和前端筛选/跳转，不调用 LLM，不生成空间内容。
* 视觉上移动端采用第二组的“浅色卡片 + 问题输入 + 工具入口”，暗色/桌面探索态采用第一组的“信号终端 + 回响日志”。
* 后续再评估是否把某些空间模板扩展为 `Tavern Oracle Template`，但必须由店主确认并标注娱乐参考。

### Updated Open Question

现在有两组参考后，MVP 方向可以重新收敛为：

1. **B：探索页信号控制台** — 更像 Orphan Signal，适合桌面/暗色氛围。
2. **D：移动端 Question Box** — 更像时月东方，适合新用户、移动端和转化。
3. **B + D 分层** — 桌面探索页走信号控制台，移动端首屏走 Question Box；实现范围最大但最完整。


## User Decision: Scope to a specific Tavern interior

用户最新决策：

> 做到特定酒馆里面，不用完全抄布局。

### Interpretation

本任务不再优先改首页、发现页或全局探索控制台，而是把两组参考的风格和交互模式转译到**某一个特定 Tavern 的内部体验**里。

关键约束：

* 不需要 1:1 复刻参考图布局。
* 参考图只作为氛围、信息结构和交互模式来源。
* MVP 应落在 `/tavern/:tavernId` 或现有 Tavern 内部组件附近，而不是全局 discovery/home。
* 第一组 `Orphan Signal` 主要贡献：信号、回响、终端、日志、坐标、深色氛围。
* 第二组 `时月东方` 主要贡献：移动端问事入口、结构化结果、AI/NPC 解读浮层、历史记录感。
* 产品转译必须仍是 FableMap Tavern 内体验，不是太空游戏，也不是平台级算命站。

### Revised MVP direction

**Approach G: Tavern-local Signal Oracle / 回响问事终端（Recommended）**

在单个 Tavern 内增加一个轻量“向这个空间提问 / 请求回响”的交互层：

* 用户进入特定 Tavern 后，可以看到一个入口，例如：
  * `向此空间发出信号`
  * `问一个回响`
  * `请求 NPC 解读`
  * `查看本次回响日志`
* 用户输入一个具体问题或选择快捷问题。
* UI 生成一个结构化“回响卡”，内容只来自：
  * 当前 Tavern 的公开信息；
  * 当前 Tavern 的 NPC 列表 / 角色公开描述；
  * 访客本轮输入；
  * 已有公开玩法/入口提示（如存在）。
* 如果接入现有聊天/NPC能力，AI/NPC 的解释必须作为对话或浮层回应，不自动改写 Tavern 内容、NPC 正史、WorldInfo 或记忆。
* 第一版可先做纯前端 demo/可点击 UI，不新增 Schema，不调用新后端。

### Candidate UI shape inside Tavern

不完全照抄布局，而是抽取为 3 个轻模块：

1. **Question Box / 发信框**
   * 移动端优先，一句话输入：`你想向这个空间确认什么？`
   * 快捷 chips：`适合我现在进去吗`、`今天该找谁聊`、`有没有未完成回响`、`给我一个开场问题`。

2. **Echo Card / 回响卡**
   * 结构化展示：
     * `当前空间信号`：开放/访问/角色数量/最近访问等现有可公开信息；
     * `建议开场`：基于用户问题 + Tavern metadata 的前端文案；
     * `可找的 NPC`：列出 1-2 个公开角色；
     * `边界提示`：空间内容由店主确认，AI 回应不直接写入正史。

3. **Log / 小日志**
   * 只展示本次交互过程：`已读取空间公开信息`、`已生成入口建议`、`未写入记忆`。
   * 不伪造系统事件、不展示敏感 owner 配置。

### Visual direction

* 桌面/暗色：融合 Orphan Signal 的深色终端、细线框、扫描线、青绿/青蓝发光、日志感。
* 移动端/轻模式：融合时月东方的圆角卡片、问题输入、结构化答案、底部主按钮。
* 不复制参考图品牌、文案或完整布局；只复用信息结构和氛围。

### Implementation implications if approved later

Likely files:

* `frontend/app/routes/tavern.tsx`：把 Tavern-local 模块挂到特定 Tavern 页面中。
* 或新增局部组件：`frontend/app/components/TavernSignalOracle.tsx` / `frontend/app/features/...`。
* 若只对特定 Tavern 生效，可通过 tavern id / special type / query param / local allowlist 控制。
* 不改 `backend/`、不改 `docs/WORLD_SCHEMA.md`，除非后续决定持久化历史记录或接入真实 NPC 回应。

### Updated Requirements

* 第一版落在特定 Tavern 内部，不改全局首页/发现页主结构。
* 不 1:1 抄参考布局；只借鉴视觉语言、问题输入、结构化解读、日志感。
* 不新增后端 Schema，不新增平台级占卜产品能力。
* 不自动写入记忆；若显示日志，必须明确 `未写入记忆 / 未改写正史`。
* 如果接入 AI/NPC，需要明确由用户触发，且输出是当前 Tavern 内回应，不是平台自动发布内容。

### Updated Out of Scope

* 不做全站占卜工具箱。
* 不做发现页全局信号控制台作为本 MVP。
* 不做参考图 1:1 页面复刻。
* 不新增“功德箱”、付费、打赏或平台 Token 充值。
* 不做真实预测承诺、高风险建议或算命权威化表达。

### Updated Open Question

Blocking: 需要确定第一版绑定到哪一个“特定酒馆”。可选方式：

1. 绑定到一个现有 demo/public Tavern（需要确认 tavern id 或名称）。
2. 新增/使用一个本地示例 Tavern，如“孤信号酒馆 / 回响问事站”，只作为 demo seed 或前端特例。
3. 做成 Tavern 页面内的可复用组件，但第一版只在 URL query 或 allowlist tavern id 下显示。


## Existing Design Found: 占卜类型酒馆与玄学 NPC

用户提示“之前有设计一个这种 AI 占卜的酒馆”。本轮已在仓库中检索并确认已有 Trellis 任务与实现痕迹：

### Existing Trellis task

* Task: `.trellis/tasks/05-08-05-08-divination-tavern-npc-brainstorm/`
* PRD: `.trellis/tasks/05-08-05-08-divination-tavern-npc-brainstorm/prd.md`
* Status in task.json: `completed`
* Notes: 已加入 `divination` special_type，已实现 `星命观测所`、`塔罗密室` 模板，并加入专门交互 prompt 与 UI badge。

### Existing product / code anchors

* `docs/WORLD_SCHEMA.md`
  * 已存在 `special_type?: '' | 'cultivation' | 'divination'`。
* `.trellis/spec/backend/special-tavern-types.md`
  * 定义 `special_type='divination'` 为 Divination gameplay enabled (tarot, astrology, oracle)。
  * 强调这是薄类型层，不应污染真实地点 `place_type`。
* `frontend/app/product/tavernTemplates.js`
  * 已存在模板 `star-oracle-observatory` / `星命观测所`。
  * 已存在模板 `mystic-tarot-corner` / `塔罗密室`。
* `frontend/app/product/systemCharacterPresets.js`
  * 已存在 `fortune-stall-reader` / `塔罗占卜机·白璃` 角色预设。
* `frontend/app/product/TavernCreatePanel.jsx`
  * 已有 `special_type='divination'` 选项：`占卜空间`。
* `frontend/app/product/TavernOwnerPanel.jsx`
  * 已有 owner 可编辑的 `占卜空间 — 启用塔罗、星象与术数互动` 选项。
* `frontend/app/product/TavernContextPanel.jsx`
  * 已有 `🔮 占卜空间` badge。

### Important prior decision to preserve

已有占卜酒馆 PRD 已明确：

* 目标不是把 FableMap 变成独立算命工具或付费测算 App。
* 占卜能力应转译成**单间酒馆里的 NPC 体验、玩法模板和店主可控内容包**。
* MVP 采用 **主题模板优先**，不是技能包优先，也不是完整排盘算法引擎优先。
* 所有默认 NPC、世界书、玩法定义都必须是店主可查看、可编辑、可丢弃、确认后才发布。
* 不引入金币/VIP/付费测算。
* 不把占卜结果表述为确定命运或专业建议。

### Updated decision for this Orphan Signal + 时月东方 brainstorm

本任务不再创建全新的“孤信号酒馆 / 回响问事站”概念作为第一落点；应优先复用既有的 `divination` 酒馆设计。

**Recommended target:**

* 第一优先：把新参考图的“信号终端 + 移动问事 + 结构化解读”体验加到现有 `special_type='divination'` 的 Tavern 内部。
* 可选默认模板落点：
  * `星命观测所`：更适合融合 Orphan Signal 的“星象 / 坐标 / 观测 / 信号日志”。
  * `塔罗密室`：更适合融合时月东方的“问题输入 / 抽牌 / 结构化解读 / AI 浮层”。
* 不优先新增第三个占卜酒馆模板，除非后续发现两个现有模板都不适合承载“信号问事终端”。

### Revised MVP Scope

**MVP: Divination Tavern Interior Signal Panel**

在已有占卜类型酒馆内部增加/规划一个轻量交互层：

1. **Question / 发问**
   * 用户向本酒馆 NPC 输入问题。
   * UI 可以提供 3-4 个快捷问题，但问题仍由用户触发。

2. **Structured Reading / 结构化解读卡**
   * 使用酒馆公开信息、NPC 角色、模板文案和用户问题组织结果。
   * 可呈现“本次主题 / 关键信号 / NPC 建议 / 边界提示”。
   * 若未来接入算法或 AI，应保持“结构化材料”和“NPC 解读文本”分离。

3. **Signal Log / 信号日志**
   * 表示本次读取流程，不表示系统事实或正史写入。
   * 必须显示“未自动写入记忆 / 未改写酒馆设定”。

### Implementation note for future work

后续如果进入实现，先检查当前运行时数据中是否已有从 `星命观测所` 或 `塔罗密室` 模板创建的 tavern 实例：

* 若已有实例：优先绑定该具体 tavern id。
* 若没有实例：可在创建流程中选择 `special_type='divination'` + 对应模板，或在 demo seed 中创建一个。
* UI 逻辑应尽量判断 `tavern.special_type === 'divination'`，而不是硬编码新概念。
* 如果只想在单个 demo 酒馆显示，可在 `special_type='divination'` 基础上再加 allowlist / query flag，避免影响所有占卜酒馆。

### Added task context

本任务已把以下文件加入 implement context：

* `.trellis/tasks/05-08-05-08-divination-tavern-npc-brainstorm/prd.md`
* `.trellis/spec/backend/special-tavern-types.md`
* `frontend/app/product/tavernTemplates.js`
* `frontend/app/product/systemCharacterPresets.js`


## Clarification: References are for 文游 / text-adventure design

用户纠正：

> 我是想让你设计文游时进行参考。

### Correction to prior interpretation

前面把参考重点收敛到“特定占卜酒馆”过窄。正确理解是：

* 这些图是**设计酒馆内文游 / 结构化文字互动**时的参考。
* 不要求绑定到占卜酒馆；占卜酒馆只是其中一种可复用场景。
* 不要求完全抄布局；重点是参考其信息架构、交互节奏、视觉密度和反馈方式。
* 后续任何 `GameplayDefinition` / `GameplaySession` / 轻文字体验，都可以把这套参考作为 UI 与玩法组织方向。

因此，本任务后续优先记录为：**Text Adventure UI / Gameplay Design Reference**，而不是 “divination tavern feature”。

### Canonical mapping for FableMap 文游

将参考图元素转译到 FableMap 文游时，建议如下：

| Reference element | FableMap 文游 meaning | Notes / boundary |
| --- | --- | --- |
| `COMMAND / 指令面板` | 当前可执行动作、玩法目标、选择按钮、自由输入 | 只展示当前 session 可做动作，不做复杂脚本引擎 |
| `COMMS / 信箱` | NPC 回应、事件片段、线索列表、历史回响 | 限定在当前 Tavern / 当前访客 session 内 |
| `LOG / 系统日志` | 玩法事件流：started / choice / ai_director / fallback / completed | 不伪造平台事件，不暴露 owner 私密配置 |
| 顶部坐标 / 资源条 | Tavern 坐标、访问状态、当前步数、线索数、风险/边界提示 | 不做战斗、等级、装备、威胁数值 |
| “起卦/问题输入” | 访客输入来意 / 当前行动 / 想询问 NPC 的问题 | 用户主动输入，不能平台自动代写正史 |
| “AI 深度解读浮层” | AI Director / NPC 主持解释当前节点 | 必须受店主玩法定义和 forbidden 边界约束 |
| “历史记录” | GameplaySession events / 回访继续 | 只读自己的 session，不能变成全局社交动态 |

### Design principles for future 文游

1. **三层信息结构**
   * 左/上：目标与行动（Command）
   * 中：正文叙事与 NPC 通讯（Comms）
   * 右/下：事件日志与边界状态（Log）
   * 桌面可三栏；移动端应折叠为单列或 tabs，不横向溢出。

2. **结构化节点优先**
   * 使用现有 `GameplayDefinition.nodes[]`、`choices[]`、`fallback_events[]`。
   * 文游不是自由散文流；每一步应有目标、当前状态、可选动作或自由输入入口。

3. **AI 作为主持，不作为自动作者**
   * AI Director 只能在店主定义的玩法、素材、forbidden 内推进。
   * AI 返回非法或不可用时走 fallback event。
   * 不让 AI 直接发布/覆盖 Tavern、NPC、WorldInfo 或长期记忆。

4. **日志要真实可追踪**
   * Log 面板应来自 `GameplaySession.events` 或本地 UI 状态。
   * 可显示：开始、选择、fallback、AI 主持、完成、放弃。
   * 不显示“安全阈值/威胁/资源”等会误导为战斗或生存游戏的数值，除非是玩法内店主明确配置的非战斗指标。

5. **低压力可完成**
   * 每局文游应短、可收束、可放弃。
   * 完成默认只写 `GameplaySession.completion`，不自动写长期记忆。
   * 如果要转成记忆/正史，必须另走确认流程。

6. **移动端保留“问事工具”节奏**
   * 借鉴第二组图：输入问题 → 结构化结果 → AI/NPC 解读。
   * 移动端不要强行复刻三栏，而是：当前目标卡、正文卡、选择按钮、可展开日志。

### Recommended 文游 UI skeleton

For desktop:

```text
┌─────────────────────────────────────────────┐
│ Tavern / Coordinate / Session status         │
├──────────────┬────────────────┬─────────────┤
│ COMMAND      │ COMMS          │ LOG         │
│ 目标          │ 当前叙事        │ 事件流       │
│ 可选动作      │ NPC/AI 回应     │ 边界提示     │
│ 自由输入      │ 线索/物件卡      │ fallback    │
└──────────────┴────────────────┴─────────────┘
```

For mobile:

```text
[当前目标 / 第 N 步]
[正文叙事 / NPC 回应]
[选择按钮 / 自由输入]
[展开：日志 / 已发现线索 / 边界提示]
```

### Where this fits in current code

Existing architecture already supports the underlying model:

* `docs/WORLD_SCHEMA.md`
  * `GameplayDefinition` is Tavern content.
  * `GameplaySession` is private visitor runtime state.
  * Events include `started`, `choice`, `ai_director`, `random_event`, `completed`, `abandoned`.
* `docs/ARCHITECTURE.md`
  * Gameplay UI already supports start / continue / choose / free input / complete / abandon.
  * AI Director is a host engine, not a platform author.
* `frontend/app/product/GameplaySessionPanel.jsx`
  * Current visitor-facing anchor for rendering objective, narration, choices, free input and completion.
* `frontend/app/product/storyMicrogameTemplates.js`
  * Existing template patterns for node/choice-driven story microgames.
* `frontend/app/product/ownerGameplayTemplates.js`
  * Existing owner template forbidden list: no combat/levels/equipment/ranking, no sensitive identity collection, no professional advice.

### Future implementation implications

If later implementing this visual direction, the likely first slice is:

* Redesign or variant-enhance `GameplaySessionPanel.jsx` into a `signal-console` presentation for suitable gameplay sessions.
* Keep the underlying `GameplayDefinition` / `GameplaySession` schema unchanged.
* Use existing `events` as Log content.
* Use existing `scene.narration`, `choices`, `message` input as Comms / Command content.
* Add CSS only in scoped gameplay stylesheet, e.g. `frontend/app/product/tavernGameplay.css`, not global redesign.
* Add tests/snapshots/scripts only if the template or behavior logic changes; visual-only changes require build + Playwright desktop/mobile self-check before human review.

### Updated non-goals

* This reference does **not** require creating a new占卜酒馆.
* This reference does **not** require changing `special_type='divination'`.
* This reference does **not** require copying Orphan Signal's exact layout.
* This reference does **not** authorize combat, ship resources, threat systems, RPG progression, or MMO mechanics.
* This reference does **not** turn Gameplay into a general script engine.

### Updated task context

Added context for future 文游 design:

* `docs/WORLD_SCHEMA.md`
* `docs/ARCHITECTURE.md`
* `frontend/app/product/GameplaySessionPanel.jsx`
* `frontend/app/product/storyMicrogameTemplates.js`
* `frontend/app/product/ownerGameplayTemplates.js`

