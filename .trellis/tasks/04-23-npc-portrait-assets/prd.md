# NPC形象素材

## Goal

为 FableMap 生成第一批可直接接入前端的 NPC 形象素材，让酒馆在“店主未上传头像 / 未导入 sprites”时，仍能展示**真实可用的 tavern-themed NPC portrait**，替换当前仅作风格参考的 `npc-style-cast` 占位方案。

## What I already know

* 当前已有的 NPC 视觉参考图位于 `frontend/app/assets/npc-style-cast/tavern-npc-style-cast.png`，它是风格板，不是最终可交付头像资产。
* `frontend/app/features/tavern-npc-stage/index.tsx` 现在的 fallback 逻辑是：
  * `character.sprites?.neutral`
  * `character.avatar`
  * `character.image_url`
  * 否则退回 `npcStyleCastSheet` 的裁切背景。
* `.trellis/spec/frontend/npc-art-guidelines.md` 明确要求：fallback 必须是**真实酒馆主题 NPC 立绘/半身像**，不能是几何占位或空头像；并且当前规范倾向把 fallback 资产放在 `frontend/app/assets/npc-style-cast/`。
* `docs/IMAGE_ASSETS_SPEC.md` 里已有一套更早的规划：在 `frontend/public/character-portraits/` 下提供 archetype 头像资源，原型包括：
  * `merchant`
  * `guardian`
  * `healer`
  * `scholar`
  * `wanderer`
  * `spirit`
* `docs/IMAGE_ASSETS_SPEC.md` 计划每个 archetype 生成 2 个变体，总计 12 张角色头像。
* 这次任务是**前端显示素材任务**，不是角色卡字段、后端接口或持久化任务。

## Assumptions (temporary)

* 先做 MVP：只解决“无 owner 头像时的真实可用 fallback”。
* 不修改 `TavernCharacter` schema，不把平台生成的 fallback 图写回角色卡。
* 首轮素材范围按 `merchant / guardian / healer / scholar / wanderer / spirit` 六类 archetype 展开，每类至少 2 张变体。
* 生成风格以“原创 anime/game-style tavern portrait”为准，不能做成抽象头像、icon、几何占位图。

## Open Questions

* **MVP 的 canonical 资产路径应以哪个为准？**
  * A. 对齐当前运行时与前端 spec：`frontend/app/assets/npc-style-cast/`
  * B. 对齐旧图片规范：`frontend/public/character-portraits/`
  * C. hybrid：运行时 stage fallback 继续走 `app/assets`，同时为将来 chat/header 预置 `public/character-portraits/`

## User Decision

* 2026-04-23：用户确认 **A**。
* 本 task 的 canonical 资产路径固定为 `frontend/app/assets/npc-style-cast/`。
* 首轮实现使用 `frontend/app/assets/npc-style-cast/portraits/` 作为实际运行时目录，并把 `docs/IMAGE_ASSETS_SPEC.md` 同步到这套契约。

## Requirements (evolving)

* 提供真实可用的 NPC 形象素材，不能再用 style board 裁切图充当最终头像。
* 形象必须明显属于“酒馆内部 NPC”语义：吧台、酒杯、木架、灯笼、菜单板、终端光、地图桌等 tavern cue 至少出现 2 个。
* 保持当前 owner-authored 图像优先级不变：
  * `sprites.neutral` > `avatar` > `image_url` > project fallback art
* 新素材仅用于 display fallback，不得写回角色卡字段。
* 需要统一 `docs/IMAGE_ASSETS_SPEC.md` 与 `.trellis/spec/frontend/npc-art-guidelines.md` 的路径/加载契约，避免双规范冲突。
* 需要定义 archetype / style 到具体素材文件的映射方式，避免组件内写死不可维护的大量条件。

## Acceptance Criteria (evolving)

* [ ] 仓库中存在一套**单一 canonical 路径**的 NPC 头像素材目录与命名规范。
* [ ] 至少覆盖 `merchant / guardian / healer / scholar / wanderer / spirit` 六类 archetype，每类 2 个变体。
* [ ] `TavernNpcStage` 的 no-avatar 路径不再显示 style board 裁切，而是显示真实 tavern-themed NPC 画像。
* [ ] 店主上传 / 导入的 `sprites.neutral`、`avatar`、`image_url` 仍然优先覆盖 fallback。
* [ ] `npm --prefix .\\frontend run build` 通过。
* [ ] 若改到服务/规则脚本，再补跑 `npm --prefix .\\frontend test`。
* [ ] task 文档与相关规范已同步更新。

## Out of Scope (explicit)

* 后端 API、schema、数据库、角色卡格式变更。
* 平台为店主“自动生成并保存”角色头像。
* place atmosphere、faction emblem 等其他图片资源。
* 一次性完成所有酒馆 UI 的头像系统重构（如 ChatPanel / Header / 列表项全部接入），除非在本 task 中明确追加。

## Research Notes

### Runtime / spec 现状

**Approach A: `frontend/app/assets/npc-style-cast/` 作为 canonical runtime 目录（Recommended）**

* How it works:
  * 直接对齐当前 `TavernNpcStage` 的导入方式与 `.trellis/spec/frontend/npc-art-guidelines.md`
  * 把当前 style board fallback 替换为真实 NPC bitmap 资产（单图、分图或 manifest）
* Pros:
  * 与现有运行时最贴合，前端改动最小
  * 更适合构建时静态导入和 tree-shaking
  * 与 frontend spec 一致
* Cons:
  * 需要修正 `docs/IMAGE_ASSETS_SPEC.md` 中的旧路径规划

**Approach B: `frontend/public/character-portraits/` 作为 canonical 目录**

* How it works:
  * 保留旧图片规范路径
  * 前端改为通过 URL 规则拼接 `/character-portraits/${archetype}-${variant}.png`
* Pros:
  * 与已有图片规范一致
  * 后续如果 chat/header 多处复用，URL 直取简单
* Cons:
  * 需要修改 `TavernNpcStage` 现有 fallback 契约
  * 与当前 frontend spec 冲突，需要同步修 spec

**Approach C: hybrid**

* How it works:
  * 当前 stage fallback 使用 `app/assets`
  * 同时生成 `public/character-portraits` 为将来聊天区/通用 archetype 头像预留
* Pros:
  * 兼顾当前运行时和未来扩展
* Cons:
  * 首轮任务范围最大
  * 容易出现两套资产重复维护

## Technical Notes

* 相关运行时文件：
  * `frontend/app/features/tavern-npc-stage/index.tsx`
  * `frontend/app/features/tavern-npc-stage/portraitCatalog.ts`
  * `frontend/app/assets/npc-style-cast/tavern-npc-style-cast.png`
* 相关规范：
  * `.trellis/spec/frontend/npc-art-guidelines.md`
  * `docs/IMAGE_ASSETS_SPEC.md`
* 当前最需要先收敛的是：**“资产最终放哪、组件怎么取、文档以哪套契约为准”**。

## Implementation Notes (2026-04-23)

* 新增 canonical runtime 资产目录 `frontend/app/assets/npc-style-cast/portraits/`，落地 12 张 tavern-themed portrait：
  * `merchant/guardian/healer/scholar/wanderer/spirit`
  * 每类 `a/b` 两个变体
* 新增 `frontend/app/features/tavern-npc-stage/portraitCatalog.ts`：
  * 统一 archetype catalog
  * 根据 `appearance ids + tags + text + tavern text + preferred archetypes` 做匹配
  * 用稳定哈希选择变体，避免每次渲染随机跳变
* `TavernNpcStage` fallback 路径已从旧的 `tavern-npc-style-cast.png` 裁切图改成真实 portrait 资产。
* owner-authored 图像优先级保持不变：
  * `sprites.neutral` → `avatar` → `image_url` → project fallback portrait
* `frontend/app/assets/npc-style-cast/README.md` 与 `docs/IMAGE_ASSETS_SPEC.md` 已同步到新的 canonical 路径和加载契约。
* fallback 仍是 display-only：没有写回 `TavernCharacter`，没有改 schema / backend / persistence。

## Pause Checkpoint (2026-04-23)

* 用户要求先中断当前任务，把当前进度写回 Trellis 后再提交推送。
* 当前已落地：
  * `frontend/app/assets/npc-style-cast/portraits/` 下 12 张 runtime fallback portrait
  * `frontend/app/features/tavern-npc-stage/portraitCatalog.ts` 统一映射与稳定选图
  * `frontend/app/features/tavern-npc-stage/index.tsx` 改为优先 owner-authored 图，缺省时走真实 tavern-themed portrait fallback
  * `frontend/app/assets/npc-style-cast/README.md` 与 `docs/IMAGE_ASSETS_SPEC.md` 已同步到 canonical 路径契约
* 暂停前仍未做的收尾：
  * 浏览器人工视觉检查
  * 评估 portrait PNG 体积是否需要再压缩
  * 任务最终关闭前再做一次完整收口说明

## Validation (pause checkpoint, 2026-04-23)

* `npm --prefix .\frontend run typecheck` — passed
* `npm --prefix .\frontend run build` — passed
* `npm --prefix .\frontend test` — not rerun（本任务未改 service/rule scripts）
