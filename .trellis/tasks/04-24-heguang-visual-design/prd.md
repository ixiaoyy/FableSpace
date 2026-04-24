# 和光 NPC 视觉形象设计记录

## Goal

为官方公益 NPC「和光」补一份可执行的视觉形象设计记录，供后续生成头像、手绘立绘或接入专属展示资产时使用。该记录只定义形象方向与提示词，不生成图片、不改前端映射、不改后端 Schema，也不把平台生成内容写成店主创作内容。

## What I already know

- 「和光」已经作为 TavernCharacter 放入官方公益酒馆 `pw_community_repair` / 「社区修补铺」。
- 角色定位是“公益沟通调停师”：帮助访客处理关键对话、人际冲突复盘、说服、道歉、协作和行动落地。
- 现有文本设定关键词包括：共同目标、安全感、真诚尊重、事实 / 想法 / 情绪 / 行动区分、低攻击性、行动闭环。
- 场景锚点是修补铺后间圆桌：两杯温水、一叠空白便签、一支细笔。
- 当前 `appearance_id` 是 `museum-docent`，未来若做专属头像，应保持“克制、耐心、引导型”的视觉语义。
- NPC 图像规范要求真实 tavern-themed character art，不能是几何占位、抽象头像、无酒馆背景的泛 anime 头像或既有 IP 仿作。

## Requirements

- 视觉形象必须服务「和光」的已有角色卡语义，不能改写成心理医生、律师、审判者、恋爱导师或平台客服。
- 必须保持公益酒馆语境：温和、低风险、陪访客把对话落到可执行小事。
- 必须有明确酒馆 / 修补铺后间环境线索，至少包含两类 tavern / repair cues。
- 形象设计只能作为 Trellis 记录与后续资产输入，不新增 TavernCharacter 字段，不改 API，不写回用户角色卡。
- 未来若生成图片，应遵守 `docs/IMAGE_ASSETS_SPEC.md` 与 `.trellis/spec/frontend/npc-art-guidelines.md` 的 prompt / asset 约束。

## Acceptance Criteria

- [x] Trellis 任务目录中记录「和光」形象目标、依据、范围与验收标准。
- [x] 提供可直接用于后续图像生成 / 外包手绘的视觉设定与英文 prompt。
- [x] 明确 out of scope，避免误解为本次要生成图片或改运行时映射。
- [x] 记录来源文件和规范依据，便于未来继续实现专属 portrait。

## Definition of Done

- Trellis task docs 完整落地：`prd.md`、`research.md`、`visual-design.md`、`implementation.md`。
- `task.json` 标记为 completed，并列出相关文件。
- 文档自检通过：无占位符、无 Schema/API 承诺、无与 WHAT_NOT_TO_BUILD 冲突的内容。

## Technical Approach

采用“文本形象设计记录”而非本轮生成图片：

1. 从既有「和光」NPC 的角色文本、场景和标签提取视觉锚点。
2. 将视觉拆成身份、轮廓、服装、表情、道具、背景、色彩、构图、负面约束。
3. 输出一份符合 FableMap NPC portrait prompt contract 的英文生成提示词。
4. 把未来实现建议限定为后续任务，不在本次改动运行时代码或资产目录。

## Decision (ADR-lite)

**Context**：用户要求“使用 Trellis 设计之前的和光形象，并记录”。仓库内已有「和光」NPC 内容任务，但没有专属视觉设定。

**Decision**：本次只新增 Trellis 设计记录，不直接生成或接入图片资产。形象方向定为“社区修补铺后间的温和沟通调停师”：人类、克制、低攻击性、坐在圆桌旁，用温水、便签、细笔和修补铺道具体现“把关系修补成可执行行动”。

**Consequences**：后续可以据此生成 `heguang` 专属 portrait 或让画师绘制；但接入运行时、命名资产、修改 portrait catalog、是否给官方 seed 角色配置头像，需要另开实现任务验证。

## Out of Scope

- 本次不调用图像生成工具生成位图。
- 本次不新增 `heguang-a.png` 等资产文件。
- 本次不修改 `portraitCatalog.ts`、`TavernNpcStage` 或任何前端展示逻辑。
- 本次不修改 `backend/src/fablemap_api/core/default_taverns.py` 中的角色字段。
- 本次不新增 Schema 字段、API 端点、依赖或平台级“自动生成 NPC 形象”能力。

## Technical Notes

- 角色来源：`.trellis/tasks/04-24-official-welfare-heguang-npc/prd.md`
- 当前实现：`backend/src/fablemap_api/core/default_taverns.py`
- 图像规范：`docs/IMAGE_ASSETS_SPEC.md`
- 前端视觉约束：`.trellis/spec/frontend/npc-art-guidelines.md`
- 产品边界：`docs/WHAT_NOT_TO_BUILD.md`
