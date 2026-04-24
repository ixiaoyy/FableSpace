# Research

## Relevant Specs

- `.trellis/spec/frontend/npc-art-guidelines.md`: NPC portrait 必须是真实酒馆主题角色图，owner/imported art 优先，project fallback art display-only，不写回 TavernCharacter。
- `docs/IMAGE_ASSETS_SPEC.md`: 角色头像规格为 256×256 PNG，原创 anime / game-style tavern NPC portrait，半身或腰部以上，背景应为酒馆内景。
- `docs/WHAT_NOT_TO_BUILD.md`: 不实现平台自动生成酒馆 / NPC / 故事内容，不做脱离真实锚点的自由空间。
- `.trellis/tasks/04-24-official-welfare-heguang-npc/prd.md`: 「和光」应位于官方公益酒馆内，保持 TavernCharacter / SillyTavern 兼容，不新增 Schema 字段。

## Source Character Facts

From `backend/src/fablemap_api/core/default_taverns.py`:

- Tavern: `pw_community_repair` / 「社区修补铺」。
- Character: `char_pw_heguang` / 「和光」。
- Role: 社区修补铺后间的沟通调停师。
- Personality: 温和、克制、真诚；极少批评、指责或抱怨；强调共同目标与安全感。
- Scenario: 后间圆桌，两杯温水，一叠空白便签，一支细笔。
- Tags: 公益、关键对话、调停、沟通、关系修补、行动落地。
- Current appearance cue: `appearance_id="museum-docent"`。

## Design Constraints Found

- 形象不能像审判者：避免法槌、法袍、过度权威姿势。
- 形象不能像医疗 / 心理诊疗：避免白大褂、诊疗室、医疗符号、诊断姿态。
- 形象不能像营销客服：避免 headset、客服工牌、企业办公室。
- 形象不能离开酒馆 / 修补铺空间：背景应有圆桌、工具墙、旧收音机、针线盒、温水、木架、灯光等锚点。
- “和光”中的光应表现为柔和漫反射或桌面暖光，不应做成神圣光环、超能力或宗教化符号。

## Feasible Approaches

### Approach A: Trellis 文本视觉设计记录（本次采用）

- How: 只新增任务文档，沉淀人物视觉、prompt、负面约束。
- Pros: 快速、低风险、不触碰运行时代码或资产；符合用户“设计并记录”。
- Cons: 不产生可见头像，需要后续实现任务生成 / 接入图片。

### Approach B: 直接生成并接入专属 portrait

- How: 生成 `heguang` 专属 PNG，并修改前端或角色 seed 指向它。
- Pros: UI 立刻可见。
- Cons: 涉及资产命名、fallback 映射、build 验证与官方 seed 内容边界；本轮需求未明确要求生成位图。

### Approach C: 只更新全局图片规范

- How: 把「和光」加入 `docs/IMAGE_ASSETS_SPEC.md` 的角色头像列表。
- Pros: 正式文档可见。
- Cons: 会把单个官方 NPC 的局部需求抬成全局图片规范，违反“不要把局部规则污染成全局规则”。

## Decision

选择 Approach A。本次在 Trellis task 内落地专属视觉设计，不污染全局规范、不引入新资产，也不改变「和光」当前产品行为。

## Files to Modify

- `.trellis/tasks/04-24-heguang-visual-design/prd.md`: 目标、要求、范围。
- `.trellis/tasks/04-24-heguang-visual-design/research.md`: 来源依据、约束、方案选择。
- `.trellis/tasks/04-24-heguang-visual-design/visual-design.md`: 形象设计正文与生成 prompt。
- `.trellis/tasks/04-24-heguang-visual-design/implementation.md`: 完成记录与验证。
- `.trellis/tasks/04-24-heguang-visual-design/task.json`: Trellis 元数据。
