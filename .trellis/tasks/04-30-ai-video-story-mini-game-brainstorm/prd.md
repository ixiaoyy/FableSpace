# Brainstorm: AI video story mini-game direction

## Goal

探索是否把“AI 生成剧情视频 + 选择题/复活/短关卡”的小游戏跑量模式，转译成 FableMap 的赛博酒馆原生能力：让店主为真实坐标酒馆配置一个可传播、可试玩、可回访的短剧情互动入口，而不是让平台自动生产和发布酒馆内容。

## User Signal / Raw Input

用户在 2026-04-30 提供的观察：

* “各平台搜【显眼包本包】都能找到。”
* “这个小游戏全是 AI 生成的剧情视频，然后把他们做成了游戏，看着挺好玩。”
* “看数据也都不错，是现在小游戏行业不错的跑量方向。”
* 用户附图强调了两个关键画面：
  * 画面一：竖屏古装剧情画面，上方目标“帮助樵夫存活 4 次”，中间是剧情人物，底部给 3 个选择项，并用红框强调当前错误/关键选项；底部文案“这是游戏画面不是视频”。
  * 画面二：失败/结算画面，上方同样保留目标，中间提示“太难了 一次都没存活下来 再来”，底部有“立即复活”和“再来一次”按钮；底部继续强调“这是游戏画面不是视频”。

这条用户信号的核心不是“做一个独立小游戏”，而是：**AI 短剧视频素材 + 极低门槛互动选择 + 强短视频传播包装**，可能是值得 FableMap 借鉴的增长/体验模式。

## What I already know

* 用户提供的参考方向：各平台搜索“显眼包本包”能看到类似小游戏；它把 AI 生成剧情视频做成小游戏，观感轻量、短平快，看起来是当前小游戏行业的跑量方向之一。
* 用户提供的截图特征：竖屏视频式画面、顶部目标（如“帮助樵夫存活 4 次”）、中间剧情冲突、底部 2–3 个选择按钮、失败后复活/再来一次按钮，并强调“这是游戏画面不是视频”。
* FableMap 当前主线不是传统小游戏平台，而是“真实地图 → 酒馆发现 → 进入酒馆 → 配置 AI NPC → 对话互动 → 写回记忆 → 回访反馈”。
* 项目硬约束：酒馆必须挂接真实坐标；内容由店主确认；AI 只能生成未发布草稿；不能做平台自动生成并发布的剧情/酒馆/NPC；不能做战斗、等级、装备、排行榜等传统 RPG 系统。
* 代码侧已有轻量玩法底座：`GameplayDefinition` / `GameplaySession` 支持节点、choices、fallback events；前端已有 `GameplayDefinitionEditor.jsx` 和 `GameplaySessionPanel.jsx`，能显示“玩法进行中”、选择按钮和自由输入。

## Assumptions (temporary)

* 这个方向对 FableMap 的价值不在“照抄小游戏”，而在把短剧爽点变成酒馆的传播入口、访客试玩入口和店主创作模板。
* MVP 应优先复用现有 gameplay_definitions，不新增 Tavern schema，不引入视频生成管线。
* “AI 生成剧情视频”在 FableMap 中应先作为店主上传/引用/确认的展示素材，或以后另开 task 做 AI 草稿生成与资产审核；本 brainstorm 不默认上线自动视频生成。

## Pattern Breakdown

从截图和搜索结果拆出来的可借鉴玩法结构：

| 层 | 参考小游戏做法 | FableMap 可转译方式 |
|----|----------------|---------------------|
| 视觉包装 | 竖屏短剧/视频画面，看起来像刷短视频 | 酒馆短剧卡 / 手机竖屏剧情面板；先用背景图、角色头像、场景氛围，不急着接视频生成 |
| 目标表达 | “帮助 X 存活 4 次”这类强目标 | “帮老板撑过 3 位难缠客人”“帮深夜便利店完成 4 次救场” |
| 互动方式 | 2–3 个大按钮选项，低门槛 | 复用 `GameplaySessionPanel` choices，移动端做更强 CTA |
| 情绪节奏 | 夸张冲突、误会、反转、失败提示 | 酒馆内 NPC/店主确认的轻剧情，避免平台自动编故事 |
| 失败/重玩 | 复活、再来一次、教程感 | FableMap 只做“重新开始/换个选择”；不做广告复活、内购、惩罚数值 |
| 传播钩子 | “这是游戏画面不是视频”反差文案 | “这是你家附近酒馆里的互动短剧”/“真实地点里的 AI NPC 小剧场” |

FableMap 应借鉴的是 **竖屏短剧情互动表达**，不是复制小游戏商业化系统。

## Open Questions

* MVP 应定位成“店主创作工具”、 “访客发现页传播入口”，还是“酒馆内玩法体验”？

## Requirements (evolving)

* 必须保持真实地点/酒馆锚点，不能变成无地图锚点的泛短剧小游戏。
* 必须保持主人主权：AI 生成或外部素材只能是草稿/素材，店主确认后才能公开。
* 优先考虑移动竖屏体验，因为参考玩法的核心传播形态是手机竖屏短内容。
* 尽量复用现有 `GameplayDefinition` choices/fallback 结构，避免先扩 Schema。
* 如果出现“视频/图片/封面素材”，必须是店主上传、项目内资源、或店主确认后的 AI 草稿资产；不能只停留在临时生成目录。
* 玩法文案必须表达为酒馆/地点内的轻剧情体验，不做脱离酒馆的泛古装/爽文/闯关游戏。

## Acceptance Criteria (evolving)

* [x] 形成一个与 FableMap 主线一致的 MVP 定义。
* [x] 明确哪些参考玩法可以借鉴，哪些会违反 `WHAT_NOT_TO_BUILD`。
* [x] 给出 2–3 个可实施方向与取舍。
* [x] 明确 MVP 不做自动视频生成、不做平台自动发布内容、不做传统游戏化数值系统。

## Definition of Done (team quality bar)

* Tests added/updated if implementation changes behavior.
* Frontend build passes if UI is changed.
* Docs/task notes updated if product behavior changes.
* No schema/API change without explicit review and test/doc sync.
* Owner-confirmed AI draft boundary remains intact.

## Out of Scope (explicit)

* 不做平台自动生成并发布剧情视频、酒馆内容或 NPC。
* 不做小游戏平台化、关卡排行榜、广告复活、内购、战斗/等级/装备。
* 不做脱离真实地图坐标的自由短剧空间。
* 不在本 brainstorm 内承诺视频生成供应商、费用、审核、版权合规方案。
* 不承诺“跑量数据”已经被独立验证；当前仅作为用户市场观察和方向假设。

## Candidate MVP Scopes

### MVP 1 — 酒馆内“短剧玩法模板”（推荐先做）

目标：把现有 `GameplayDefinition` 包装成更像竖屏短剧小游戏的体验。

可能交付：

* 新增 3–5 个店主可选模板：
  * “帮店主救场 3 次”
  * “听懂 NPC 的潜台词”
  * “帮便利店老板处理深夜怪客”
  * “帮学校门卫判断谁在说谎”
* 每个模板生成固定的 `nodes/choices/fallback_events` 草稿。
* 访客端展示为手机友好的剧情卡：目标、当前回合、NPC/场景、2–3 个大按钮。
* 支持“再来一次”，但不做广告复活或数值惩罚。

为什么优先：复用现有 gameplay，风险最低，能最快验证“短剧选择爽点”是否适配 FableMap。

### MVP 2 — 发现页“短剧预告入口”

目标：把酒馆发现页卡片改得更像短视频/小游戏广告入口，但点击后仍回到真实坐标酒馆。

可能交付：

* 对有玩法的酒馆显示短剧式标题，例如“帮深夜便利店撑过 4 个怪客”。
* 显示一个大 CTA：“进入小剧场”/“开始救场”。
* 酒馆卡片继续保留真实地点、访问权限、店主确认内容，不变成传统 POI 排行或小游戏列表。

风险：如果没有酒馆内玩法承接，会变成空包装；适合放在 MVP 1 之后或与 MVP 1 小范围合并。

### MVP 3 — 店主 AI 短剧草稿助手（后续任务）

目标：让店主从酒馆设定生成“短剧玩法草稿”，但必须审核确认后才能发布。

可能交付：

* 店主输入：酒馆名、地点类型、NPC、禁忌方向、想要的情绪钩子。
* 系统输出：标题、目标、3–5 个节点、每节点 2–3 个选择、失败/完成文案。
* 草稿默认不发布，不进入公开 Tavern payload，不覆盖已有玩法。

风险：涉及 AI 草稿安全、提示词注入、版权/素材、成本，不适合作为第一步。

## Research Notes

### What similar content/products suggest

* Web search confirms“显眼包/我是显眼包”相关内容多以竖屏、短关卡、找物/解谜/选择题、教程攻略视频形态传播；但公开搜索结果不足以独立验证具体“跑量数据”。用户的“数据不错”先作为用户观察记录。
* 应用商店/社区页面显示“我是显眼包/超级显眼包”类产品常被包装为竖屏休闲、烧脑、解谜、剧情探索，说明“短剧情 + 低门槛选择/解谜”是可识别品类。
* 2026 年 AI 短剧/AI 漫剧生产工具和行业讨论明显增多，很多工具强调从剧本、角色、分镜到成片的低成本流水线；这支持“AI 短剧素材供给会变便宜”的趋势判断，但不等于 FableMap 应直接做自动视频发布平台。

### Sources checked

* Linux DO topic on “显眼包本包” trend note: https://linux.do/t/topic/2082253
* Xiaomi Game Center “超级显眼包” listing: https://game.xiaomi.com/gameVideo/62419586
* TapTap “我是显眼包” listing: https://www.taptap.cn/app/720449
* Bilibili examples for “我是显眼包” walkthrough clips: https://www.bilibili.com/video/BV1ckV7eLEqG/ and https://www.bilibili.com/video/BV1Sm42137tz/
* 剧火 AI short-drama creation platform: https://juhuo.cn/
* OiiOii AI story films feature page: https://oiioii.art/features/story-films.html
* 新浪/第一财经 article on AI video/short-drama industry discussion: https://finance.sina.com.cn/tech/roll/2026-04-16/doc-inhusenk7309658.shtml

### Constraints from FableMap

* `docs/PRODUCT_BRIEF.md` / `docs/FABLEMAP_TAVERN_PLATFORM.md`: FableMap 是赛博酒馆 UGC 平台，AI 是 NPC 对话与创作辅助，不替主人自动发布内容。
* `docs/WHAT_NOT_TO_BUILD.md`: 禁止无店主确认的自动发布、无锚点自由空间、传统 RPG/排行榜/战斗、端到端无结构化中间层。
* `docs/WORLD_SCHEMA.md`: `Tavern.gameplay_definitions` 已是店主配置的轻量玩法定义，可作为最小承载层。
* `frontend/app/product/GameplaySessionPanel.jsx`: 已有 narration + choices + submit 的访客体验骨架。
* `frontend/app/product/GameplayDefinitionEditor.jsx`: 已有店主编辑玩法名称、入口按钮、目标、素材、禁止事项、高级节点的入口。

### Feasible approaches here

**Approach A: “酒馆短剧玩法模板” inside existing GameplayDefinition (Recommended)**

* How it works: 给店主提供一组短剧式玩法模板，例如“救场 4 次”“听懂 NPC 暗示”“帮店主化解尴尬”，模板落到现有 `gameplay_definitions.nodes/choices`；访客在酒馆内用竖屏卡片体验 3–5 步。
* Pros: 最贴合现有能力；不改 schema；风险最低；能立即验证“剧情选择爽点”是否适配酒馆。
* Cons: 初期缺少真正视频画面，传播冲击力弱于参考小游戏。

**Approach B: “发现页短剧预告卡” as marketing surface**

* How it works: 在 discover/酒馆卡片上展示一个短剧式封面、冲突标题和 CTA，例如“帮奶茶店老板躲过差评 3 次”；点击后进入对应酒馆玩法。
* Pros: 更接近跑量传播入口；能提高发现页点击率；仍能保持内容归属酒馆。
* Cons: 需要更强 UI/视觉设计；如果没有玩法内容承接，会变成噱头。

**Approach C: “店主 AI 短剧草稿助手” for future task**

* How it works: 店主输入酒馆设定，系统生成未发布的短剧玩法草稿/分镜提示/选项文案，由店主编辑确认后保存。
* Pros: 最接近 AI 短剧生产趋势；能降低店主创作门槛。
* Cons: 必须严守 AI 草稿边界；涉及提示词安全、素材版权、审核、可能的视频生成成本，不适合作为第一步。

## Expansion Sweep

### Future evolution

* 如果 MVP 验证有效，可从“文字/卡片短剧玩法”演进到“店主确认的封面图/短视频素材 + 玩法节点”。
* 可与已有 Serial Episode Export / Visual Souvenir Preview 形成闭环：互动过程可导出为短剧文案或纪念卡，但仍需确认边界。

### Related scenarios

* 与 Create Tavern Step Wizard 有天然联系：创建酒馆时可选“给新店添加一个 3 步短剧体验”。
* 与 Discovery Polish 有天然联系：发现页用短剧式冲突卡片提升入口吸引力。

### Failure & edge cases

* “AI 生成视频”容易滑向平台替店主生产内容，必须保留为草稿/素材确认流程。
* 参考截图里的“复活/再来一次”可能引向广告变现/失败惩罚，本项目不应做广告复活和商业化数值闭环。
* 外部影视/名人/版权素材风险高，MVP 不应鼓励上传侵权素材。

## Initial Recommendation

优先把这个方向收敛成 **Approach A + 少量 Approach B**：先做“酒馆短剧玩法模板 + 竖屏选择体验”，并允许发现页/酒馆入口展示短剧式标题与 CTA。AI 视频生成和自动分镜先不进 MVP，后续作为“店主确认的 AI 短剧草稿助手”另开 task 评审。

## 2026-04-30 Backlog hardening: selected directions split into child tasks

本 brainstorm 的 3 个 MVP 方向和一个未来资产管线方向已拆成 Trellis 子任务（均为 planning，不代表已实现）：

- `04-30-tavern-short-drama-gameplay-template-mvp`
- `04-30-discovery-short-drama-teaser-cards`
- `04-30-owner-ai-short-drama-draft-assistant`
- `04-30-confirmed-short-video-asset-pipeline-research`

2026-05-03 update:

- `04-30-tavern-short-drama-gameplay-template-mvp` 已补齐缺失的 child task 目录，并基于现有 tracked frontend implementation 完成 Trellis 验证闭环；父任务进度现在为 1/4 done。

2026-05-04 update:

- `04-30-discovery-short-drama-teaser-cards` 已实现发现页/入口短剧预告卡，复用现有 published gameplay，不新增 API/Schema。
- `04-30-owner-ai-short-drama-draft-assistant` 已实现店主侧本地未发布短剧草稿助手，保留店主确认/保存/发布边界。
- `04-30-confirmed-short-video-asset-pipeline-research` 已完成 research-only 结论：现在不做自动短视频生成；未来只可在权利确认、存储/删除、来源证明和 AI/合成标识支持后推进店主确认的封面/短视频资产管线。
- 安装 Playwright 后补齐 `05-04-05-04-short-drama-playwright-self-acceptance`，对 native `/discover` 短剧入口完成桌面 + 窄屏 Chromium 自验收，报告路径：`artifacts/playwright/short-drama-ux/report.md`。
- 本 brainstorm 的 4 个拆分子任务已全部 completed；短视频资产管线只保留 research 结论，不视为已实现视频能力。
