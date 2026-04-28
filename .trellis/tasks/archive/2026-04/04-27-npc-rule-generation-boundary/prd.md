# design: 平台规则化生成 NPC 边界

## Goal

为 FableMap 评估并设计“平台可以按照规则自动生成 NPC”的产品边界：明确它与当前“主人主权 / 平台不替店主创作内容”原则的关系，定义可接受的生成范围、用户确认流程、数据落点、安全边界和后续文档变更路径。本任务只写设计，不实现代码。

## What I already know

* 用户在“新猫娘默认酒馆”头脑风暴中提出：平台可以按照规则自动生成 NPC。
* 当前权威文档 `docs/WHAT_NOT_TO_BUILD.md` 明确写着不做平台自动生成 NPC / 酒馆描述 / 对话内容 / 故事。
* `README.md`、`docs/PRODUCT_BRIEF.md`、`docs/FABLEMAP_TAVERN_PLATFORM.md` 当前强调主人主权：酒馆内容、角色、氛围、访问规则由店主决定。
* `docs/WORLD_SCHEMA.md` 已有 `TavernCharacter` 和 SillyTavern 字段映射，若只是生成草稿并由店主确认，未必需要新增 schema。
* 用户选择本轮“先写设计文档，不实现”。

## Product tension to resolve

当前冲突不是技术能不能做，而是平台角色是否改变：

* 旧口径：平台只托管 / 帮助导入 / 提供模板，不替店主创作 NPC。
* 新候选口径：平台可在明确规则下生成 NPC 草稿，但需要主人确认、可编辑、可导出，并且不能自动上线或覆盖店主内容。

## Requirements (evolving)

* 设计文档必须区分“生成草稿 / 模板补全 / 自动上线内容”。
* 必须保留主人主权：店主确认前不发布、不写入公开酒馆、不替店主承担创作责任。
* 必须保持 TavernCharacter / WorldInfo / SillyTavern 兼容，除非后续单独批准 schema 变更。
* 必须明确安全边界：版权/IP、色情/未成年/非自愿、真实个人隐私、敏感地点、仇恨骚扰、危险行为。
* 必须说明对 `docs/WHAT_NOT_TO_BUILD.md` 等权威文档的建议改法，但本任务是否直接改 docs 需用户确认。

## Acceptance Criteria

* [ ] 产出一份设计文档，说明“规则化生成 NPC”的允许/禁止范围。
* [ ] 给出 2-3 个可选产品模式及推荐方案。
* [ ] 给出最小 MVP 流程：输入、生成、审核、编辑、保存、发布、导出。
* [ ] 给出需要更新的权威文档清单。
* [ ] 不改代码，不新增 schema。

## Definition of Done

* 设计经用户确认。
* 若写入仓库文档，文档路径明确，内容无 TODO/占位/矛盾。
* 不声称实现完成。

## Out of Scope

* 不实现自动生成 API、前端入口或默认酒馆。
* 不改 TavernCharacter schema。
* 不直接上线任何平台生成 NPC。
* 不把用户前面给出的猫娘越界提示词当作生成规则。

## Feasible approaches

**Approach A: 规则化草稿生成 + 店主确认（Recommended）**

* 平台根据店主输入的酒馆主题、地点、语气、禁忌、标签生成 NPC 草稿。
* 草稿进入编辑器，店主必须确认后才保存/发布。
* 优点：兼顾低门槛和主人主权；能替代“平台自动创作”的硬禁令。
* 风险：需要严格标注“AI 草稿”，并防止一键生成变成平台内容工厂。

**Approach B: 模板拼装 / 参数化生成**

* 平台只提供已审核模板块，按规则组合为角色草稿，不调用 LLM 或弱化生成性。
* 优点：安全可控、测试简单、成本低。
* 风险：角色同质化，创作惊喜少。

**Approach C: 平台自动生成并默认上线**

* 平台替空酒馆自动生成 NPC 并发布。
* 优点：最快填充内容。
* 风险：直接破坏主人主权和当前文档边界；不推荐。

## User Decision Update 2026-04-27 - Generated NPC Status

* 用户选择产品状态名：`AI 草稿`。
* 设计含义：平台生成结果默认只是未发布草稿，必须由店主审核、编辑并确认后，才能保存为 TavernCharacter 或发布到酒馆。
* 文档口径：后续避免把该能力直接称为“自动生成 NPC 并上线”；统一称为“AI 草稿生成 / 规则化 NPC 草稿”。

## Draft State Requirement

* AI 草稿不应自动进入公开 Tavern payload。
* AI 草稿不应覆盖已有 NPC。
* AI 草稿必须可编辑、可丢弃、可重新生成。
* 店主确认后才转换为现有 `TavernCharacter` 字段，不新增 schema 是 MVP 默认选择。

## User Decision Update 2026-04-27 - MVP Input Scope

* 用户选择 MVP 输入范围：轻量输入。
* 店主触发“生成 AI 草稿”前，平台最少需要：
  * 酒馆名称 / 简介（优先复用已有 Tavern 字段）；
  * 角色风格标签（如猫系、傲娇、线索人、酒保、守望者）；
  * 禁忌词 / 禁止方向（如不要色情、不要现实名人、不要恐怖、不要暴力等）。
* 设计取舍：优先降低店主创作门槛；复杂世界观、说话风格和开场目标可以作为高级选项，不进入 MVP 必填项。

## Final Design Decision

* 推荐方案已定：AI 草稿 + 店主确认。
* MVP 输入：酒馆名称/简介 + 风格标签 + 禁忌方向。
* MVP 输出：只生成 NPC 角色卡字段，不自动生成 WorldInfo/玩法/头像。
* 设计文档：docs/superpowers/specs/2026-04-27-ai-npc-drafts-design.md。


## Completion Result 2026-04-27

设计已按推荐方案完成：

* 产品状态名：`AI 草稿`。
* MVP 输入：酒馆名称/简介 + 角色风格标签 + 禁忌词/禁止方向。
* MVP 输出：只生成 NPC 角色卡字段（name、description、personality、scenario、system_prompt、first_mes、mes_example、tags）。
* 关键边界：店主确认前不保存为 TavernCharacter、不进入公开 payload、不覆盖已有 NPC、不自动上线。
* 设计文档：`docs/superpowers/specs/2026-04-27-ai-npc-drafts-design.md`。
* 实施计划：`docs/superpowers/plans/2026-04-27-catgirl-default-tavern.md`。

## Product Docs Update 2026-04-27

已按“AI 草稿”设计补齐权威产品文档：

* `README.md`：核心理念和店主路径加入 AI 草稿需店主确认的口径。
* `docs/PRODUCT_BRIEF.md`：主人主权、内容来源、开店流程和当前取舍加入 AI 草稿边界。
* `docs/FABLEMAP_TAVERN_PLATFORM.md`：核心理念、价值观、开店场景和新增“AI 草稿辅助创作”场景。
* `docs/WHAT_NOT_TO_BUILD.md`：升级到 v1.4，把“不生成 NPC”收敛为“不绕过店主确认自动发布内容”，允许未发布 AI 草稿。
* `docs/WORLD_SCHEMA.md`：升级到 v0.5，说明 AI 草稿是非持久临时状态，确认后映射为现有 TavernCharacter，MVP 不新增 schema。

### Verification

* 文档检索：`rg -n "AI 草稿|未经店主确认|v1.4|v0.5" ...` 确认新口径写入目标文档。
* Focused pytest：`py -3 -m pytest -q tests/test_default_public_welfare_taverns.py tests/test_default_public_welfare_gameplays.py --tb=short` 通过：`13 passed in 0.92s`。
