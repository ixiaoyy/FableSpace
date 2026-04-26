# NPC 反面人设与话术模板 - PRD / 头脑风暴

> 状态：brainstorm  
> 创建日期：2026-04-24  
> 暂不实现，先沉淀需求和边界。

## Goal

允许 FableMap 的 NPC 定义覆盖更丰富的人格光谱：不只做温柔、正面、会安慰人的 NPC，也支持店主创建毒舌、油腻、薄情、反讽等“反面人设”NPC。平台提供可编辑模板，店主确认后写入角色卡，用来增强戏剧张力、吐槽感和“魔法打败魔法”的传播玩法。

## What I already know

- FableMap 主线是“真实地图 → 酒馆 → 店主配置 AI NPC → 访客对话 → 记忆回访”。
- 权威文档强调：酒馆内容、角色、氛围和访问规则由店主决定；平台不自动生成和发布酒馆内容。
- `docs/WORLD_SCHEMA.md` 中 `TavernCharacter` 已有 `description / personality / scenario / system_prompt / first_mes / mes_example / tags` 等字段，足够承载“反面人设模板”，MVP 不需要新增 Schema 字段。
- README 已描述当前角色编辑器存在“NPC 性格模板、推荐筛选与访客第一印象预览”，说明“模板辅助创作”在现有产品边界内成立。
- 现有实现落点：
  - `frontend/app/product/personalityTemplates.js`：内置 `NPC_PERSONALITY_TEMPLATES`、推荐、过滤、应用到 draft 的逻辑。
  - `frontend/app/product/CharacterEditor.jsx`：展示 NPC 性格模板、分类、搜索、填充/覆盖与第一印象预览。
  - `frontend/scripts/personality-templates-test.mjs`：已有模板数量、应用、过滤、推荐测试。
- 当前模板整体偏温和、帮助、引导、现实互助；已有“轻微毒舌 / 冷幽默”，但没有明确的“反面人设 / 关系反讽 / 油腻话术”分类。

## Requirements (evolving)

- 允许 NPC 模板覆盖负面 / 反面 / 有缺陷人格，而不是默认所有 NPC 都提供情绪兜底。
- 反面模板必须是**角色扮演与反讽**，不是现实操纵教程。
- 模板应继续保持店主可编辑、可覆盖、可删除；平台不自动发布 NPC 内容。
- 初始模板建议聚焦：
  - 毒舌酒保 / 毒舌柜台
  - 油腻相亲对象模拟器
  - 渣男 / 海后语录反讽
  - 薄情冷淡调酒师
- 模板字段应直接映射现有 TavernCharacter / SillyTavern 兼容字段。
- 模板需要写明“不可说内容 / 安全边界”，避免输出升级成现实骚扰、仇恨、侵犯隐私或高风险建议。

## Acceptance Criteria (if implemented later)

- [x] 角色编辑器能看到”反面人设 / 关系反讽”类模板。（复用现有 UI，无需改动）
- [x] 店主可用填空或覆盖模式应用模板，应用结果仍是普通 TavernCharacter 字段。（复用现有逻辑）
- [x] 首批至少 3 个反面模板有完整 `description / personality / scenario / system_prompt / first_mes / mes_example / tags / keywords`。（snarky-bartender, smarmy-dating-sim, cold-dealer）
- [x] 模板说明中明确其为反讽 / 角色扮演用途，不鼓励现实操纵。（system_prompt 已内置边界）
- [x] `frontend/scripts/personality-templates-test.mjs` 覆盖新增分类的过滤、推荐或数量变化。（已更新并通过）
- [x] 不新增平台自动生成 NPC、访客社交、付费、排行等出界能力。

## Technical Approach Options

### Approach A：扩充现有 NPC 性格模板库（推荐）

- 在 `frontend/app/product/personalityTemplates.js` 增加“反面人设 / 关系反讽”分类与 3–4 个模板。
- 复用现有 `CharacterEditor.jsx` 模板 UI、搜索、推荐、填空/覆盖逻辑。
- 更新 `frontend/scripts/personality-templates-test.mjs`。

优点：成本最低，不改 Schema，不破坏 SillyTavern 兼容，最符合“平台提供脚手架、店主确认内容”。  
缺点：传播 demo 的戏剧性不如专门酒馆 / 玩法强。

### Approach B：做“魔法打败魔法”示例酒馆 / 玩法

- 基于现有模板，做一个官方示例酒馆或玩法，用来演示油腻话术复述、反击和翻译潜台词。
- 可做成默认公益 / 官方示例内容的一部分，便于用户立即体验。

优点：更有传播力和演示效果。  
缺点：更像内容包，需要更谨慎处理“平台是否在创作内容”的边界。

### Approach C：先写内容规范，不动代码

- 在任务文档或后续 docs 中沉淀“反面 NPC 模板规范”。
- 后续有明确 UI / 内容需求再实现。

优点：风险最低。  
缺点：不能立即改善店主创建体验。

## Decision (ADR-lite)

✅ **已决策（2026-04-24）：采用 Approach A：扩充现有 NPC 性格模板库。**

理由：
- 成本最低，不改 Schema，不破坏 SillyTavern 兼容。
- 店主选择 → 确认 → 写入角色卡的流程已存在。

已实现（2026-04-24）：
- `personalityTemplates.js` 新增”反面人设”分类，包含 3 个模板。
- `personality-templates-test.mjs` 新增反面模板验证（类别过滤、apply、推荐）。
- Typecheck 和 Build 均通过。

可选后续方向：
- Approach B：做”魔法打败魔法”示例酒馆包（更有传播力，但需谨慎处理平台创作边界）。
- 公开反面模板市场（需内容审核机制）。

## Out of Scope

- 不做平台自动生成并公开发布酒馆 / NPC。
- 不做访客之间的社交、挑战、排行、互相攻击。
- 不提供现实关系操纵、骚扰、胁迫、跟踪等建议。
- 不新增 Schema 字段，除非后续实现证明现有字段不足。
- 不引入新依赖或大型内容审核系统作为本 MVP 的前置。

## Definition of Done (for this brainstorm)

- [x] Trellis task 已创建。
- [x] 用户关于反面 NPC、毒舌、渣男语录、海后、薄情寡性、”魔法打败魔法”的脑暴已落档。
- [x] 已记录与项目边界、现有代码落点、后续可选方向的关系。
- [x] 已确认采用 Approach A 并实现代码。
- [x] 测试通过，Typecheck 和 Build 均通过。

## Technical Notes

- 依据文档：`README.md`、`docs/PRODUCT_BRIEF.md`、`docs/FABLEMAP_TAVERN_PLATFORM.md`、`docs/WORLD_SCHEMA.md`、`docs/WHAT_NOT_TO_BUILD.md`、`.trellis/workflow.md`、`.trellis/spec/frontend/index.md`、`.trellis/spec/backend/index.md`、`.trellis/spec/guides/index.md`。
- 现有前端模板实现：`frontend/app/product/personalityTemplates.js`。
- 现有模板 UI：`frontend/app/product/CharacterEditor.jsx`。
- 现有脚本测试：`frontend/scripts/personality-templates-test.mjs`。
- 验证策略：本轮只改 Trellis 文档和 task metadata，无需跑前后端测试；若后续改模板代码，至少运行 `npm --prefix .\frontend test` 和 `npm --prefix .\frontend run build`。

## Open Question

首个落地方向更偏哪一个：A 扩充现有 NPC 性格模板库、B 做“魔法打败魔法”示例酒馆 / 玩法、还是 C 先只保留为内容规范？
