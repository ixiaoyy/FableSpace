# Homepage landing redesign

## Goal

重做 React Router 首页，让它从“技术模板感很重的暗色 landing”变成更像 FableMap 赛博酒馆入口的产品首页：第一屏更有记忆点、信息层级更清楚、CTA 更强、同时保留真实地图锚点 / 店主主权 / AI NPC / 回访记忆这条主线。

## What I already know

* 当前首页位于 `frontend/app/routes/home.tsx`，使用 `ProductShell` 包裹，主要是 hero + 一个 tabs 卡片 + 三张 feature cards。
* 当前视觉问题来自：标题过大但缺少视觉节奏、右侧卡片内容稀薄、首屏没有具体场景感、信息块彼此关系弱、整体像“技术站模板”而不是“赛博酒馆产品首页”。
* 当前原生前端路由为 `home / discover / create / tavern`。
* 用户明确希望首页重新设计，而且希望设计感明显提升。
* 本任务应保持产品主线：真实地点 → 酒馆发现 → 进入酒馆 → NPC 对话 → 写回记忆 → 回访。

## Assumptions (temporary)

* 本轮先做首页单页重设计，不扩散到 discover / create / tavern 页面。
* 不引入新依赖，只用现有 React Router + Tailwind + 自有 UI primitives。
* 允许改 `home.tsx`、必要时小幅改 `ProductShell` 或全局样式，但不改 API / schema / 路由结构。

## Open Questions

* 默认按 MVP 执行：先做高质感首屏 + 价值分区 + 更强 CTA，不等用户逐项确认。

## Requirements (evolving)

* 首页首屏要更像消费级产品入口，而不是后台模板。
* 要突出“真实地点开店、探索酒馆、AI NPC 对话、记忆回访”四个核心卖点。
* 首屏 CTA 清晰：探索 / 开店都要可见。
* 视觉上需要有更强的赛博酒馆氛围，但不能变成纯游戏海报，也不能喧宾夺主压过产品信息。
* 窄屏下仍可用。

## Acceptance Criteria (evolving)

* [ ] 首页首屏视觉层级明显优于当前版本，信息区块关系更清晰。
* [ ] `home.tsx` 改版后仍能直接进入 `/discover` 与 `/create`。
* [ ] 页面继续传达真实地图锚点、店主主权、AI NPC、记忆回访四个产品核心点。
* [ ] `npm --prefix .\frontend run build` 通过。
* [ ] `npm --prefix .\frontend run typecheck` 通过。

## Out of Scope (explicit)

* 不修改后端 API。
* 不重做 discover/create/tavern 页面。
* 不引入新 UI 框架或额外图片资产依赖。

## Technical Notes

* 相关文件：
  * `frontend/app/routes/home.tsx`
  * `frontend/app/shell/product-shell.tsx`
  * `frontend/app/styles.css`
* 设计方向：更强 hero 构图、分层信息卡、产品主线可视化、保持 Tailwind + 现有 Card/Button 体系。

## Implementation Notes (2026-04-23)

* 已完成 `frontend/app/routes/home.tsx` 首屏重构，去掉原先偏模板感的 `hero + tabs` 结构，改为：
  * 更强的双栏 hero：左侧价值主张 + CTA，右侧“附近酒馆 / 入口方式 / 店主控制 / 回访记忆”舞台卡片
  * 四个核心信号块：真实坐标、店主主权、AI NPC、回访记忆
  * 三张产品亮点卡：入口、体验、平台边界
  * 一段从地图发现到回访记忆的四步主链路说明
  * 探索者 / 店主双入口卡片
* 改版原则：
  * 首页更像产品入口，不像后台模板
  * 文案直接围绕 FableMap 主链路，不堆技术栈说明
  * 不引入任何新依赖，不改路由结构，不改 API / schema
* 用户后续在三张参考图中选择了**中间那版**，即：
  * 更强霓虹赛博酒馆氛围
  * 更明显的夜色、招牌、吧台和 AI NPC 舞台感
  * 但仍保持产品首页语义，不做成纯游戏海报
* 因此首页又进一步往“neon cyber tavern”方向收敛：
  * 更强的霓虹色彩（cyan / fuchsia / violet）
  * 更明显的招牌感、LIVE 标签、夜间营业氛围
  * 右侧 hero 舞台卡改成更像“附近霓虹酒馆索引”的产品视窗
  * 保留探索 / 开店 CTA 与主链路表达，不丢产品信息
* 用户随后明确指出：需要的是**完整布局和图片内容**，而不只是换一个色调。
* 因此本轮再次重构首页，重点不再是“色调优化”，而是：
  * 直接把首页做成更宽的营销页布局（home route 独立放宽容器）
  * hero 右侧使用真实 NPC portrait 作为主视觉，而不是空卡片
  * 增加“附近酒馆列表 + 头像缩略图 + 记忆卡片 + 主视觉人物卡”组合
  * 下半屏三张展示卡全部改成带真实图片的 scene cards
  * 探索者 / 店主双入口卡也改成带图片的大卡，而不只是纯文字块

## Implementation Notes (2026-04-23 exact-reference pass)

* 用户随后把确认过的中间版参考图放进仓库目录 `首页参考/image.png`，并明确要求：**首页布局完全一样，里面的图片也完全一样**。
* 因此本轮不再继续用 React/Tailwind 近似复刻，而是直接把该参考图复制为运行时资产 `frontend/app/assets/homepage-reference/neon-cyber-tavern-reference.png`。
* `frontend/app/routes/home.tsx` 现已改成：
  * 直接渲染该参考图本体；
  * 通过透明热点层保留 `/`、`/discover`、`/create` 的可点击入口；
  * 不再使用 `ProductShell` 组合布局，避免任何 header / hero / cards 复刻误差。
* 为避免留下无效扩展，`frontend/app/shell/product-shell.tsx` 已回退到不带 `className` 扩展参数的常规版本。
* 这一轮的目标不是“风格接近”，而是“视觉上直接等于用户指定参考图”。

## Validation (2026-04-23)

* `npm --prefix .\frontend run typecheck` — passed
* `npm --prefix .\frontend run build` — passed
* `curl.exe --noproxy '*' -sS -D - http://127.0.0.1:8950/` — 200 OK，确认本地 8950 正在服务本轮新 build

## Remaining Check

* 2026-04-24：用户已接受当前“直接使用参考图本体”的首页状态，并要求先提交推送。
* 后续若继续迭代，可在不改变本轮 checkpoint 的前提下再决定是否把位图首页重新拆回可编辑 DOM。
