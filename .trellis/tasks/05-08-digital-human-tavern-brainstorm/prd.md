# brainstorm: 数字人制作酒馆

## Goal

设计一个真实坐标锚定的「数字人制作酒馆」：店主或访客进入酒馆后，可以在 NPC 辅助下把自己的身份、口吻、边界、外观描述、开场白、用途说明整理成可审核、可编辑、可导出的数字人档案。该数字人不只服务当前项目 NPC，也应可迁移到视频、直播、社媒、脚本创作或其他平台；FableMap 的 TavernCharacter / SillyTavern 角色卡只是首个适配出口。只有用户明确确认后，草稿才可保存或导出。

## What I already know

- 用户目标：做一个可以制作数字人的酒馆，用户能在 NPC 的辅助下做自己的数字人。
- 用户补充：数字人不仅是当前项目里的角色，也可以用于视频或其他地方，因此应按“可迁移数字人档案 / identity package”设计，FableMap NPC 是其中一个适配出口。
- 项目硬约束：FableMap 空间必须挂接真实坐标；空间内容、角色、氛围、访问规则由主人决定；AI 只能辅助生成草稿，不能自动发布空间内容。
- 已有产品主线：坐标输入 / 定位 → 真实底图 → 浏览空间 → 进入空间 → 配置 AI NPC → 对话互动 → 写回记忆 → 回访反馈。
- 既有 AI 草稿机制：平台可生成未发布 NPC 草稿，字段包含 name / description / personality / scenario / system_prompt / first_mes / mes_example / tags；店主审核、修改、丢弃或重新生成后，才转换为 TavernCharacter。
- 角色卡需要兼容 SillyTavern Character Card V2，可导入 / 导出，不锁定用户。
- Token 与 LLM 配置仍由空间主人承担；平台不做充值、结算、抽成或 Token 市场。
- 现有前端已有角色编辑、AI 草稿、外观预设、Prompt 风险检查与表情立绘 URL 字段，可复用为数字人草稿的基础能力。

## Assumptions (temporary)

- 「数字人」在本任务里先按“可迁移的数字分身档案 / identity package”理解：包含身份设定、口吻、边界、外观风格、用途说明与若干适配出口；不默认包含 3D 建模、语音克隆、真人照片复刻或视频驱动。
- MVP 应优先实现为一个特殊酒馆类型 / 工作室模板，并输出可迁移档案；不是新增平台级内容生成系统，也不直接集成外部视频生成平台。
- NPC 的角色是“访谈式辅助编辑器”：提问、整理、提示风险、生成可编辑草稿；不是未经确认替用户发布数字人。
- 若涉及真人身份、肖像、声音、联系方式、私人经历等敏感内容，应默认要求用户确认授权与可见范围。

## Expansion Sweep

1. Future evolution
   - 数字人草稿未来可扩展为：TavernCharacter、访客私有 persona、SillyTavern 导出包、头像/表情 prompt 资产清单。
   - 现在值得保留的扩展点：草稿来源、草稿状态、确认记录、可见范围、导出兼容字段。
2. Related scenarios
   - 应与已有 CharacterEditor、AI 草稿辅助创作、Prompt 风险检查、角色卡导入导出保持一致。
   - 应与特殊酒馆类型（如修行空间）的薄层识别 / 模板初始化思路一致：只做识别、展示、模板 seed，不改变核心 Tavern schema。
3. Failure & edge cases
   - AI 访谈输出可能包含 PII、真人冒充、越权系统提示、平台无法验证的身份声明，保存前需要风险提示或阻断。
   - 草稿生成失败时应允许本地模板 fallback 或继续手工编辑；未确认草稿不得进入公开 tavern payload。

## Research Notes

### Constraints from docs

- `docs/FABLEMAP_TAVERN_PLATFORM.md` 明确：主人主权，AI 草稿不能自动上线；空间内容由主人确认；角色卡兼容 SillyTavern；Token 消耗由主人承担。
- `docs/WHAT_NOT_TO_BUILD.md` 明确避免平台级自动生成空间内容、Token 付费/充值系统、无锚点自由空间、跨空间社交等方向。
- `docs/WORLD_SCHEMA.md` / Tavern 平台文档约束 TavernCharacter、VisitorState、LLMConfig、WorldInfoEntry 等结构，Schema 变更需谨慎。

### Existing code patterns found

- `frontend/app/product/CharacterEditor.jsx`：已有角色卡编辑、外观预设、表情立绘 URL、Prompt 风险检查、保存前校验。
- `frontend/app/product/aiCharacterDrafts.js`：已有 AI 草稿请求、fallback 描述、draft response → editor draft 的映射。
- `frontend/app/lib/special-tavern-types.js`：已有“特殊酒馆类型”薄层模式，可用于数字人工作室的类型识别、标签、模板 seed。
- `frontend/app/lib/tavern-drafts.js`、`frontend/app/lib/taverns.ts`、`frontend/app/product/TavernCreatePanel.jsx`：与酒馆创建 / 草稿 / tavern 数据流相关。

### Feasible approaches here

**Approach A: 数字人工作室酒馆（Recommended）**

- How it works: 新增一个特殊酒馆类型 / 模板，例如 `digital-human-studio`。酒馆内有“数字人造型师 / 角色档案师 NPC”，通过访谈辅助用户整理数字人草稿，最后放入 CharacterEditor 审核保存。
- Pros: 最贴合用户请求；复用现有 TavernCharacter / AI 草稿 / CharacterEditor；风险最小；不需要立即改 Schema。
- Cons: MVP 更像“角色卡工作室”，不是完整数字人资产生产线。

**Approach B: 访客私有数字分身**

- How it works: 访客在某个酒馆中制作只属于自己的 persona / visitor profile，先写入 VisitorState 或本地草稿，不成为公开 NPC；后续可选择导出或申请保存。
- Pros: 更符合“做自己的数字人”，隐私默认更安全。
- Cons: 可能需要新增或明确 VisitorState 扩展字段；与现有 TavernCharacter 编辑器复用度稍低。

**Approach C: 完整数字人资产工坊**

- How it works: 一次性覆盖文本角色卡 + 头像 prompt + 表情组 prompt + 资产 sidecar + 导出包。
- Pros: 体验完整，能产出更像“数字人”的资产包。
- Cons: 范围大；涉及图片资产规范、生成图落库、prompt sidecar、视觉验收与更多安全边界，不适合作为第一版 MVP。


## Decision (ADR-lite)

**Context**: 用户确认优先做方案 1，即「数字人工作室酒馆」。该方向需要尽快形成可用 MVP，同时遵守真实坐标、主人主权、AI 草稿不上线、SillyTavern 兼容与 Token 由店主承担等约束。

**Decision**: MVP 采用 `digital-human-studio` 特殊酒馆薄层方案：在现有 Tavern / TavernCharacter / CharacterEditor / AI 草稿机制上增加一个数字人工作室类型、创建模板与 NPC 辅助访谈文案。核心产物从“项目内 NPC 草稿”升级为“可迁移数字人档案”，FableMap TavernCharacter / SillyTavern 角色卡是首个适配出口；视频、直播、社媒等用途先产出用途说明 / prompt / 台词风格建议，不直接生成视频资产。AI 或本地模板只产出未发布草稿，用户审核后才能保存或导出。

**Consequences**:

- 优点：复用现有角色卡与草稿链路，避免新增核心 Schema，交付风险低；同时把数字人定位为可迁移档案，不锁死在 FableMap 内。
- 代价：第一版数字人主要是“可迁移文本档案 + FableMap/角色卡适配”，不含 3D、语音、真人影像或真实视频生成。
- 后续：可在独立任务中扩展访客私有 persona、头像/表情 prompt 资产、导出包与更细的隐私确认流程。



### Adapter Decision: 视频 / 短剧出镜 prompt

**Context**: 用户确认第一个非 FableMap 适配出口选择“视频 / 短剧出镜 prompt”。数字人档案需要能被复制到外部视频、短剧、口播或分镜创作工具中，而不只是保存为项目内 NPC。

**Decision**: MVP 在数字人档案中增加视频 / 短剧适配输出：角色一句话定位、出镜身份、外观与服化道风格、说话节奏、口头禅、短视频场景建议、可复制出镜 prompt、示例口播 / 对白、禁忌与授权边界。该输出不直接调用视频生成器，不生成真人影像，不做语音克隆。

**Consequences**:

- 优点：数字人可立即迁移到视频脚本、口播、短剧角色或外部生成工具，符合“数字人不只用于当前项目角色”的定位。
- 代价：第一版只交付文本适配层，视频画面、声音、动作资产仍需外部工具或后续任务完成。

## Technical Approach

- 新增或扩展特殊酒馆类型：`digital-human-studio`，用于识别、展示与创建模板 seed。
- 模板 seed 只预填 tavern 摘要、场景氛围、语气、禁忌方向与推荐标签，不自动创建公开角色。
- 将核心产物定义为“数字人档案”：身份定位、使用场景、口吻、边界、外观风格、记忆/禁忌、示例台词、导出用途说明。
- 复用现有 AI 草稿 / CharacterEditor：数字人档案可映射为可编辑 TavernCharacter 草稿，保存前经过 Prompt 风险检查与用户确认。
- 增加“适配出口”概念：MVP 至少支持 FableMap / SillyTavern 角色卡适配，以及视频 / 短剧出镜 prompt；直播/社媒先作为后续扩展，不调用外部生成器。
- 初版尽量不改后端核心 Schema；如需数据持久化，优先走已有 tavern draft / character draft 字段，或先在 PRD 中记录后续 Schema 方案。
- 前端改动需至少通过 `npm --prefix .\frontend run build`。

## Implementation Plan (small PRs)

1. **PR1 / 薄层类型与模板**：在特殊酒馆类型中加入 `digital-human-studio`，补齐展示文案、关键词、draft seed 与禁忌方向。
2. **PR2 / 创建与编辑体验**：让创建酒馆 / 角色草稿流程能识别“数字人工作室”，并把默认风格标签、禁忌方向和角色编辑提示切到数字人语境。
3. **PR3 / 可迁移档案与视频适配出口**：在 UI/文案中明确数字人可用于 FableMap 与视频/短剧；MVP 先产出可复制的视频出镜 prompt、口播/对白示例、场景建议与禁忌边界，并映射到角色卡字段。
4. **PR4 / 安全与验收**：确保未确认草稿不发布，补充最小测试或构建验证，必要时更新 Trellis spec / docs notes。

## Requirements (evolving)

- 数字人制作必须发生在真实坐标锚定的 tavern / 特殊酒馆中，而不是无锚点自由空间。
- NPC 只做辅助访谈、整理与风险提示，不能自动发布或覆盖用户/店主内容。
- 草稿必须可编辑、可丢弃、可重新生成；保存前需要显式确认。
- 初版优先复用 TavernCharacter / CharacterEditor / AI 草稿字段，保持 SillyTavern 兼容。
- MVP 采用“数字人工作室酒馆”方案：特殊酒馆薄层 + NPC 辅助访谈 + 可编辑角色卡草稿。
- 数字人的主产物应是可迁移档案，而不是仅限 FableMap 内部 NPC；角色卡、视频 prompt、直播人设、社媒简介都应可从同一档案派生。
- 第一个非 FableMap 适配出口确定为视频 / 短剧出镜 prompt：需要输出可复制的人设、出镜风格、场景建议、示例口播/对白和禁忌边界。
- 敏感内容（真人身份、联系方式、私人地址、API Key、隐私记忆）不得暴露给访客或写入公开 payload。

## Open Questions

- 已确认并进入实现（2026-05-08）。

## Acceptance Criteria (evolving)

- [x] PRD 记录数字人酒馆的目标、约束、MVP 范围、非目标与风险边界。
- [x] 明确选择 A/B/C 之一作为 MVP 技术方向：已选 A / 数字人工作室酒馆。
- [x] 新增/修改的 UI 能让用户通过数字人档案师 NPC 模板与角色编辑器产出可审核的数字人草稿。
- [x] 未确认草稿不会进入公开 Tavern payload，不覆盖已有 NPC；模板只预填表单，角色保存仍走现有确认路径。
- [x] 保存后的角色字段仍兼容 TavernCharacter / SillyTavern 角色卡要求；数字人档案为只读派生文本，不新增持久化字段。
- [x] 数字人档案文案明确可迁移用途，并提供视频 / 短剧出镜 prompt 作为第一个非 FableMap 适配出口。
- [x] 视频 / 短剧适配输出包含：一句话定位、外观风格、口吻节奏、场景建议、示例口播/对白、禁忌与授权边界。
- [x] 改前端时至少运行 `npm --prefix .\frontend run build`；涉及脚本测试时运行 `npm --prefix .\frontend test`。

## Definition of Done (team quality bar)

- Trellis 任务与 PRD 已更新。
- 实现前完成代码范围与规范读取。
- 代码改动有最小真实验证；验证失败需如实记录。
- 如涉及跨层协议 / 资产 / Schema，补充相应测试与文档。
- 汇报包含改动文件、原因、验证结果、风险与未做事项。

## Out of Scope (explicit)

- MVP 不直接做 3D 数字人建模、动作捕捉、视频驱动、真实视频生成或语音克隆；可以输出给这些工具使用的文本档案 / prompt 建议。
- 不做现实名人 / 他人肖像的无授权复刻或深度伪造。
- 不做平台自动发布空间内容；AI 输出必须是待审核草稿。
- 不做平台级 Token 充值、结算、抽成或市场。
- 不做跨空间社交、访客间好友 / 私信 / 全局在线状态。
- 不擅自新增核心 Schema 字段；如确需新增，另开设计确认。

## Technical Notes

- Task directory: `D:\work\ai-\.trellis\tasks\05-08-digital-human-tavern-brainstorm`
- Current task id: `digital-human-tavern-brainstorm`
- Docs inspected:
  - `D:\work\ai-\docs\PRODUCT_BRIEF.md`
  - `D:\work\ai-\docs\FABLEMAP_TAVERN_PLATFORM.md`
  - `D:\work\ai-\docs\WORLD_SCHEMA.md`
  - `D:\work\ai-\docs\WHAT_NOT_TO_BUILD.md`
- Candidate implementation files if MVP proceeds:
  - `D:\work\ai-\frontend\app\lib\special-tavern-types.js`
  - `D:\work\ai-\frontend\app\product\aiCharacterDrafts.js`
  - `D:\work\ai-\frontend\app\product\CharacterEditor.jsx`
  - `D:\work\ai-\frontend\app\product\TavernCreatePanel.jsx`
  - `D:\work\ai-\frontend\app\lib\tavern-drafts.js`
- Commands run during brainstorm:
  - `py -3 .\.trellis\scripts\task.py create "brainstorm: 数字人制作酒馆" --slug digital-human-tavern-brainstorm --priority P2 --description "设计一个可在 NPC 辅助下制作自己数字人的特殊酒馆"`
  - `py -3 .\.trellis\scripts\task.py start .\.trellis\tasks\05-08-digital-human-tavern-brainstorm`

## Decision Log

  - 用户确认第一个非 FableMap 适配出口为视频 / 短剧出镜 prompt（2026-05-08）。


## Implementation Notes (2026-05-08)

### Done

- Added `digital-human-studio` special tavern type as a thin frontend template layer.
- `/create?special_tavern_type=digital-human-studio` now shows digital-human workshop copy, fills owner-confirmable template text, and initializes a `数字人档案师` assistant NPC greeting.
- `CharacterEditor` now derives a portable digital-human identity pack from existing TavernCharacter draft fields and exposes a read-only video / short-drama prompt with copy action.
- Character AI draft defaults now support custom fallback tag/forbidden lists; digital-human taverns use digital-human style tags and safety boundaries.
- Tavern special-type card now explains that digital-human output can map to FableMap / SillyTavern and video / short-drama prompt text.
- Added frontend code-spec: `D:\work\ai-\.trellis\spec\frontend\digital-human-studio-boundary.md` and updated frontend spec index.

### Implementation files

- `D:\work\ai-\frontend\app\lib\digital-human-studio.js`
- `D:\work\ai-\frontend\app\lib\special-tavern-types.js`
- `D:\work\ai-\frontend\app\routes\create.tsx`
- `D:\work\ai-\frontend\app\routes\tavern.tsx`
- `D:\work\ai-\frontend\app\product\CharacterEditor.jsx`
- `D:\work\ai-\frontend\app\product\CharacterManagementModal.jsx`
- `D:\work\ai-\frontend\app\product\aiCharacterDrafts.js`
- `D:\work\ai-\frontend\app\product\styles.css`
- `D:\work\ai-\frontend\scripts\digital-human-studio-test.mjs`
- `D:\work\ai-\frontend\scripts\playwright-digital-human-studio-check.mjs`
- `D:\work\ai-\frontend\scripts\special-tavern-types-test.mjs`
- `D:\work\ai-\frontend\scripts\ai-character-drafts-test.mjs`
- `D:\work\ai-\frontend\package.json`
- `D:\work\ai-\.trellis\spec\frontend\digital-human-studio-boundary.md`
- `D:\work\ai-\.trellis\spec\frontend\index.md`

### Verification

- `node .\frontend\scripts\special-tavern-types-test.mjs` → passed.
- `node .\frontend\scripts\digital-human-studio-test.mjs` → passed.
- `node .\frontend\scripts\ai-character-drafts-test.mjs` → passed.
- `npm --prefix .\frontend test` → passed.
- `npm --prefix .\frontend run build` → passed.
- `node .\frontend\scripts\playwright-digital-human-studio-check.mjs` → passed.
  - Report: `D:\work\ai-\.trellis\tasks\05-08-digital-human-tavern-brainstorm\artifacts\playwright\report.md`
  - Screenshots: `D:\work\ai-\.trellis\tasks\05-08-digital-human-tavern-brainstorm\artifacts\playwright\desktop-create-digital-human-studio.png`, `D:\work\ai-\.trellis\tasks\05-08-digital-human-tavern-brainstorm\artifacts\playwright\mobile-tavern-digital-human-studio.png`
- `npm --prefix .\frontend run typecheck` → failed on pre-existing unrelated `TerritoryClaimPanel.tsx` / `TerritoryManagementPanel.tsx` inline-style CSSProperties errors from other uncommitted territory work; not caused by the digital-human changes.

### Not Done / Deferred

- No backend schema or persistence fields were added.
- No video, voice clone, 3D model, face-swap, or external generation service is called.
- The video / short-drama adapter is a text prompt only.


## Priority Reorder (2026-05-08)

用户要求重新排列优先级。当前按“数字人不只是 FableMap 角色，而是可迁移资产”的产品方向重新排序：

### P0 / 必须保住的边界

1. **用户确认与授权边界**
   - 数字人可以代表本人、虚构角色或已授权品牌人格，但必须显式确认来源与授权。
   - 不做未经授权的真人/名人复刻、语音克隆、视频换脸或深度伪造。
   - 不收集或导出手机号、身份证、私人地址、API Key 等敏感信息。

2. **可迁移数字人档案是主产物**
   - 主产物不是“项目内 NPC”，而是可迁移 identity package。
   - FableMap / SillyTavern 角色卡、视频/短剧出镜 prompt、直播/社媒人设都应从同一份档案派生。

3. **草稿不上线、不覆盖、不自动发布**
   - AI/NPC 只做访谈、整理、改写和风险提示。
   - 保存/导出前必须由用户确认。

### P1 / 下一轮最应该做

1. **数字人档案结构化编辑器**
   - 在现有角色编辑器基础上，把“身份定位、用途、口吻、外观、边界、示例台词、适配出口”拆成更清晰的数字人档案字段/区块。
   - 仍不新增后端 Schema，优先用前端派生/导出实现。

2. **视频 / 短剧出镜 prompt 质量提升**
   - 让输出更像可直接用于视频制作：镜头风格、出镜场景、口播节奏、短剧冲突、第一条视频脚本草案。
   - 保持文本输出，不接外部视频生成服务。

3. **NPC 访谈流程优化**
   - 数字人档案师按步骤问：用途 → 授权来源 → 身份定位 → 观众对象 → 口吻 → 外观 → 禁忌 → 导出格式。
   - 目标是降低用户从空白开始的成本。

### P2 / 有价值但排在后面

1. **导出格式包**
   - 一键复制/下载：FableMap 角色卡、SillyTavern JSON 文案、视频 prompt、短剧脚本 brief。
   - 先做文本/JSON，不做图片或视频资产。

2. **直播 / 虚拟主播适配出口**
   - 直播间开场、观众互动边界、弹幕回应风格、禁忌话题。
   - 在视频/短剧出口稳定后再做。

3. **社媒身份包**
   - 简介、内容栏目、发帖语气、头像 prompt、置顶帖草案。
   - 适合作为第三个外部出口。

### P3 / 暂缓或另开任务

1. **头像/表情图生成与资产落库**
   - 涉及 `docs/IMAGE_ASSETS_SPEC.md`、prompt sidecar、图片 hash、Playwright/视觉验收。
   - 需要独立图片资产任务。

2. **语音、视频、3D、动作捕捉**
   - 需要授权、合规和外部工具边界设计。
   - 当前 MVP 不做。

3. **后端数字人 Profile Schema**
   - 只有当前端 identity package 被验证稳定后，才考虑新增持久化 Schema。
   - 若做，必须另开 API / Schema / 数据迁移任务。

### Updated Next Action

下一步建议先做 **P1-1 数字人档案结构化编辑器**：把当前 CharacterEditor 里的派生 prompt 区块升级成更明确的数字人档案工作台，同时继续复用现有 TavernCharacter 保存路径。

## 2026-05-12 Closure Note

This task is closed as `brainstorm_complete`. Closed as brainstorm/design complete: PRD records the approved digital-human-studio tavern direction, MVP boundaries, existing patterns, P1/P2/P3 roadmap, and out-of-scope areas. No production code was changed in this closure.

Deferred / not done:
- Structured digital human editor and export package are future dedicated implementation tasks.
