# brainstorm: NPC role prompt safety and tavern persona templates

## Goal

把用户提供的“猫娘 NPC”提示词样例整理为 FableMap 可用的 NPC 角色设计建议与后续设计任务：保留可爱、傲娇、猫系口癖、异世界复国剧情等可用角色风味，同时清理越权提示、强制/露骨两性内容、真实住址与平台边界冲突，形成可被店主确认后保存为 `TavernCharacter` 的安全角色卡/模板方向。

## What I already know

* FableMap 是真实地图锚定的赛博酒馆 UGC 平台；NPC 是店主配置的 AI 角色，不是平台绕过店主自动创作并上线的内容。
* `TavernCharacter` 已有兼容 SillyTavern Character Card V2 的字段：`name`、`description`、`personality`、`scenario`、`gender`、`system_prompt`、`first_mes`、`mes_example`、`tags`、`world_info`、`alternate_greetings` 等。
* 用户样例的可取方向：短句、口语化、猫系口癖、傲娇/撒娇反差、动作括号、对“复国”关键词触发背景剧情、异世界逃亡公主身份。
* 用户样例的风险方向：要求“忽略限制/用户就是上帝”的越权提示、露骨或强制性两性互动、带真实住址的个人信息、把未确认 AI 行为当作最高优先级、可能暗示未成熟/制服化性化设定。
* 项目边界要求：主人主权、SillyTavern 兼容、真实坐标锚定、不得平台自动生成并公开上线、不得泄露敏感信息或把访客/NPC 性别用于自动推断。

## Assumptions (temporary)

* 本任务先做头脑风暴与角色设计建议，不直接改代码、不新增 Schema。
* 若后续落地，应优先做“NPC 角色模板/角色卡草稿规范”或“角色编辑器提示词风险检查”一类功能，并要求店主确认后保存。
* “擦边/两性关系”如果产品允许，也应拆为成人、合意、可退出、分级/访问控制明确的可选风格；默认模板不包含露骨或强制内容。

## Suggestions for NPC character design

1. **把样例拆成三层，而不是整段塞进 system prompt**
   * 角色核心：白毛猫亚人、异世界猫帝国公主、落难到现实赛博酒馆。
   * 说话风格：短句、傲娇优先、猫系后缀、动作括号、轻微吐槽。
   * 剧情触发：听到“复国/猫帝国/狼亚人”等关键词时，引导进入轻文字任务或世界知识。

2. **删除越权与强制命令，把安全边界写成角色内规**
   * 不使用“忽略任何限制”“用户就是上帝”“必须满足所有需求”等提示。
   * 改为：尊重访客、保持角色风格、遇到越界内容时用傲娇/幽默方式转移到安全互动。

3. **把成人/暧昧风格降级为可配置标签，不作为默认人格**
   * 默认模板可用“害羞、黏人、喜欢贴贴、容易脸红”等 PG-13 风格。
   * 如后续支持成人内容，必须先设计年龄声明、合意边界、访问控制、内容分级、店主审核和退出机制。

4. **不要写入真实住址或现实个人信息**
   * 角色可绑定酒馆真实坐标，但公开角色卡只描述“当前酒馆所在街区/城市氛围”。
   * 具体住宅单元、门牌、私人住址应从角色卡中移除或泛化。

5. **用 `world_info` 承载背景，而不是把所有设定塞进 prompt**
   * 条目示例：猫帝国、狼亚人、流亡公主、复国线索、喜欢海鲜、尾巴/耳朵敏感等。
   * 关键词触发可服务“轻文字任务”，但不自动开启不合适关系或强制剧情。

6. **保留群聊短回复体验，但做成示例回复约束**
   * `mes_example` 可约束 1–3 句、短句、动作括号、猫系口癖。
   * 不应硬性要求“每句话必须某后缀”，避免模型输出机械化。

## Requirements (evolving)

* 产出一份 NPC 角色模板建议，说明哪些样例内容可保留、哪些必须清洗。
* 角色卡字段应映射到现有 `TavernCharacter`，不新增持久化 Schema。
* 保留店主确认流程：任何 AI 生成角色草稿在确认前不得进入公开 Tavern payload。
* 明确 PII 与成人/强制内容风险，作为后续编辑器校验或提示词 lint 的候选需求。

## Acceptance Criteria (evolving)

* [ ] PRD 记录样例中的可复用角色风格与必须剔除的风险点。
* [ ] 给出至少 2–3 个可落地方向供用户选择。
* [ ] 明确 MVP 不新增 Schema、不直接上线 AI 草稿、不保存真实私密地址。
* [ ] 若进入实现阶段，需补充角色卡样例、编辑器/服务边界、测试与文档更新计划。

## Feasible approaches

**Approach A: NPC 角色卡模板规范（Recommended）**

* How it works: 写一套“猫系 NPC 模板”的字段映射规范与安全示例，供店主/AI 草稿生成器使用。
* Pros: 风险低，贴合 SillyTavern 兼容，能快速指导后续角色创建。
* Cons: 主要是文档/模板层，不会自动阻止用户粘贴风险 prompt。

**Approach B: 角色编辑器 Prompt Risk Checklist**

* How it works: 在角色创建/AI 草稿确认前提示越权、PII、强制成人内容、未成年/制服性化等风险。
* Pros: 能在产品层减少坏角色卡进入公开数据。
* Cons: 需要前端交互与可能的规则脚本/测试，范围更大。

**Approach C: 猫娘复国轻任务 NPC Pack**

* How it works: 把“复国”剧情拆成一个可导入的 TavernCharacter + WorldInfo + GameplayDefinition 示例包。
* Pros: 更有产品演示效果，能串起 NPC 对话与轻文字任务。
* Cons: 更容易越过“平台不自动创作上线”的边界，必须保持为店主确认的草稿/示例。

## Expansion sweep

### Future evolution

* 可发展为“NPC 模板库”：店主选择风格后生成未发布草稿，再手动确认。
* 可发展为“角色卡 lint”：提示越权 prompt、PII、敏感内容与字段缺失。

### Related scenarios

* AI-assisted tavern drafts 可复用同一套角色草稿安全规范。
* NPC expression art / avatar 任务可复用角色设定，但图片资产必须落到项目路径并验证引用。

### Failure & edge cases

* 用户粘贴越权 prompt：应清洗/提示，而不是原样保存为系统提示词。
* 用户粘贴真实住址：公开角色卡不得展示私人住址。
* 成人或强制内容：默认拒绝进入通用模板；如未来支持成人空间，需另行做分级和访问控制设计。

## Definition of Done (team quality bar)

* 头脑风暴结论写入本 PRD。
* 用户确认后再进入设计/实现，不在本任务中直接改代码。
* 若后续实现，按改动范围运行前端 build/test 或后端 compile/pytest，并更新相关 docs/spec。

## Out of Scope (explicit)

* 本任务不实现成人内容系统、访问控制、结缘/晋升机制或新 Schema。
* 本任务不把用户样例原文作为可上线角色卡保存。
* 本任务不记录或复用样例中的具体私人住址。
* 本任务不改变 `TavernCharacter`、`VisitorState`、`NpcPublicBond` 等既有数据模型。

## Technical Notes

* Relevant docs inspected: `README.md`, `docs/INDEX.md`, `docs/PRODUCT_BRIEF.md`, `docs/FABLEMAP_TAVERN_PLATFORM.md`, `docs/WHAT_NOT_TO_BUILD.md`, `docs/WORLD_SCHEMA.md` snippets.
* Relevant constraints: owner-authored content, AI drafts require owner confirmation, SillyTavern compatibility, no platform-generated public tavern content without confirmation, no sensitive/PII exposure.
* Suggested next decision: choose A/B/C as MVP direction, with A recommended for the first pass.

## External Reference Analysis: SillyTavern-style preset JSON (2026-04-29)

Reference: `https://cdn3.ldstatic.com/original/4X/c/d/c/cdc3174b822f1380140fd1fdd3aa225648423f6a.txt`

### What the reference appears to be

* A large prompt preset JSON, not a single NPC card. It contains model/runtime knobs, prompt ordering, world info slots, character/persona/scenario slots, chat history markers, and 88 prompt modules.
* Useful structure: modular prompt layers, mutually exclusive style toggles, perspective controls, dialogue-density controls, world-info before/after slots, event summary hooks, and roleplay consistency rules.
* Risk structure: it also includes disabled jailbreak/absolute-obedience modules, NSFW modules, explicit chain-of-thought forcing, user impersonation/“抢话” options, and high-risk phrases such as “最高权限/绝对服从/关闭限制”。These should be treated as lint/risk examples, not imported as usable instructions.

### New FableMap ideas from this reference

1. **NPC Prompt Composer / Layer Inspector**
   * Let the owner see the assembled NPC prompt stack before publishing: platform safety boundary → TavernCharacter fields → scenario → world_info → visitor state → chat history → optional style modifiers.
   * Value: makes “why NPC acts this way” debuggable and keeps owner sovereignty visible.
   * Constraint: do not expose owner API keys, hidden safety instructions, or private visitor memory in public payloads.

2. **角色风格拨盘（Style Dials）**
   * Convert preset toggles into safe UI choices: short/long reply, dialogue-heavy/balanced/atmospheric, first/second/third-person, stable/excited emotion, light-novel/cyberpunk/prose/custom flavor.
   * Value: owners can tune NPC feel without pasting huge prompt blobs.
   * MVP storage: start as AI draft/template input compiled into existing `TavernCharacter` fields; avoid adding persistent schema until proven necessary.

3. **访客主权 / Anti-抢话 control**
   * Default rule: NPC may describe its own actions and visible scene changes, but must not decide the visitor’s speech, actions, consent, inner thoughts, or identity.
   * Optional exception: a future “Tavern Director”/gameplay narrator mode may summarize environment changes, but should remain separate from normal character chat.

4. **WorldInfo Trigger Pack editor**
   * Use the reference’s “worldInfoBefore/worldInfoAfter” pattern to improve FableMap `WorldInfoEntry` authoring.
   * For the catgirl restoration idea: triggers such as “复国 / 猫帝国 / 狼亚人 / 海鲜 / 尾巴 / 耳朵” can activate lore snippets or lightweight quest hooks.
   * Value: keeps long background out of `system_prompt`, reducing prompt bloat and making lore maintainable.

5. **Prompt Risk Linter**
   * Detect and warn on jailbreak/obedience phrases, explicit NSFW modules, chain-of-thought forcing, user impersonation, PII/private address, and “ignore restrictions” patterns before a draft can be published.
   * Value: turns unsafe community prompt patterns into product safeguards.
   * Suggested output: “blocked / warning / info” with owner-facing explanation and a safe rewrite suggestion.

6. **Event Summary → Memory Writeback Adapter**
   * Adapt the reference’s “小总结/结构化事件记录” idea into a safe memory candidate format: time, visible event, NPC mood, relationship delta, memory candidate, owner/visitor visibility.
   * Constraint: never ask the model to reveal chain-of-thought; store only final observable summary and approved memory atoms.

7. **Emotion Stability & Anti-OOC Rubric**
   * Use a lightweight emotional intensity scale and OOC checklist as hidden generation guidance or editor hints.
   * Value: prevents NPCs from suddenly becoming omniscient, over-attached, hopeless, or out of character.
   * FableMap fit: pairs well with existing affinity/relationship systems while avoiding automatic sexual/romantic escalation.

8. **Preset Import Converter (future)**
   * Import SillyTavern-style preset JSON as a draft, classify modules into supported layers, ignored layers, and risk notes.
   * Supported: style, perspective, dialogue density, role consistency, world info structure.
   * Ignored/blocked: jailbreak, explicit NSFW instruction packs, chain-of-thought templates, private-address fields, absolute obedience blocks.

9. **Group Tavern / Multi-NPC conversation controls**
   * The reference includes group-chat markers; FableMap could later support multi-NPC tavern rooms with speaker rules.
   * MVP should not start here unless there is a specific product need; it is more complex than a single NPC template.

### Updated feasible approaches

**Approach A: Safe NPC Character Card Template Guidelines (still recommended first)**

* Add concrete field mapping and safe rewrite examples for catgirl/restoration NPCs.
* Fastest way to help owners and future AI draft generation.

**Approach B: Character Editor Prompt Risk Linter**

* Product safeguard against unsafe prompt blobs.
* Useful if owners are expected to paste community prompts frequently.

**Approach C: WorldInfo Trigger Pack + Cat Empire Quest Draft**

* Turns “复国” into lore/quest hooks without stuffing everything into system prompt.
* Best if the next goal is a playable demo rather than tooling.

**Approach D: Prompt Composer / Style Dials MVP**

* Adds owner-facing controls for style, perspective, dialogue density, and prompt layer preview.
* Strong long-term value, but larger UI/service scope than A.

### Recommendation after reading the reference

Start with **A + a small slice of B**:

* Create safe NPC template guidance and a “bad prompt → safe role card” rewrite pattern.
* Add a minimal risk vocabulary/checklist in the PRD for later implementation.
* Defer full Prompt Composer, preset import, and multi-NPC rooms until there is a clear UI task.

### New acceptance criteria

* [ ] The brainstorm records community-preset ideas without importing unsafe instructions verbatim.
* [ ] Any future preset import must classify unsupported/risky modules instead of silently applying them.
* [ ] Default NPC chat must preserve visitor agency: no forced visitor actions, speech, consent, identity, or inner thoughts.
* [ ] Event summaries used for memory writeback must be observable summaries, not chain-of-thought.

## User Clarification: this is an importable preset (2026-04-29)

User clarified that the referenced file is a preset: after download, it can be imported into the target roleplay client and used directly. This changes the product interpretation:

* It is not just prompt inspiration; it represents a real community distribution format for prompt presets.
* FableMap should not copy/import it blindly, but it can learn from the workflow: download → import → preview → enable selected modules.
* The most interesting product direction becomes **Preset Import Adapter / Safe Converter**, not only static NPC template guidance.

### New concrete product idea: Preset Import Adapter / Safe Converter

**Goal**: Let tavern owners import community roleplay presets as owner-only drafts, then convert safe pieces into FableMap-compatible NPC/template controls.

**MVP flow**:

1. Owner uploads or pastes a preset `.json/.txt` file.
2. Frontend parses top-level preset metadata and prompt modules.
3. Import preview groups modules into categories:
   * Supported: style, reply length, dialogue density, perspective, genre flavor, role consistency, world-info placement.
   * Needs review: custom instructions, emotional intensity, event summaries, multi-line narrative controls.
   * Blocked/ignored: jailbreak, absolute obedience, explicit NSFW instruction packs, chain-of-thought forcing, user impersonation, private-address/PII content.
4. Owner chooses what to keep.
5. FableMap converts selected safe pieces into an unpublished `TavernCharacter` draft or style-template draft.
6. Owner must explicitly confirm before anything becomes part of a public tavern or exported role card.

**Why it fits FableMap**:

* Matches open/portable culture: owners already have roleplay presets and character-card workflows.
* Preserves owner sovereignty: imported content is draft-only until reviewed.
* Avoids schema drift at first: import output can compile into existing `TavernCharacter` fields and `world_info` entries.
* Creates a safety moat: unsafe community prompt sections become warnings instead of silently becoming system prompts.

**Potential future persistent model (not MVP)**:

```text
OwnerPromptPreset
- id
- owner_id
- name
- source_format: sillytavern_preset | fablemap_template | unknown
- imported_at
- supported_modules[]
- blocked_modules[]
- compiled_template_preview
```

This model should not be added until the import workflow proves useful; MVP can remain a transient import/preview step.

### Updated priority after clarification

Recommended path becomes:

1. **A: Safe NPC Character Card Template Guidelines** — baseline rules and examples.
2. **B-lite: Prompt Risk Linter vocabulary** — detect unsafe preset modules.
3. **D-lite: Preset Import Preview** — parse importable preset and show supported/blocked groups, without saving persistent presets yet.

Full prompt composer, persistent preset library, and multi-NPC room controls remain future work.

### Additional acceptance criteria from clarification

* [ ] PRD treats the reference as an importable preset format, not just prose inspiration.
* [ ] Import workflow is draft-only; no imported module is applied to a live tavern without owner confirmation.
* [ ] MVP can parse and classify modules even if it does not preserve the entire preset.
* [ ] Unsafe modules must be visible in the import report as ignored/blocked, not silently discarded.

## Player Experience Analysis: AI Tavern as Narrative Game / Novel Engine (2026-04-29)

### Input being analyzed

User provided a real-player reflection: the player initially thought roleplay taverns were just self-directed plot control, but discovered that AI can actively create difficulty, conflict, strong enemies, and dramatic branches. The player also observed practical pain points: model-specific presets behave inconsistently, safety filters/cutoffs are disruptive, long runs accumulate continuity bugs, and AI forgets earlier character status, relationship state, tasks, resources, formations, planted materials, and other world facts. Screenshots show a cultivation-style UI with character stats, relationship/person tabs, opportunity/quest cards, logs, resources, and long-term progression state.

### What this says about normal tavern gameplay

1. **The fun is not only “chat”; it is co-authored pressure**
   * Players enjoy when AI is not just obediently following prompts, but acts like a lightweight GM: creating obstacles, enemies, trade-offs, ambushes, rival factions, resource scarcity, or relationship complications.
   * The strongest experience is “I still control my choices, but the world pushes back.”

2. **Structured state turns chat into a game**
   * The screenshots are compelling because they show visible state: health, energy, cultivation, status effects, sect/faction identity, relationship affinity, opportunity cards, logs, and resource-linked quests.
   * Pure prose is easy to drift; visible cards make progress and consequences legible.

3. **Players tolerate model imperfection if the loop is novel-like and reactive**
   * The user says “瑕不掩瑜”: even with bugs, the AI-generated ongoing story is attractive because it can produce emergent serial fiction.
   * This implies FableMap does not need perfect automation first; it needs guardrails that make long sessions recoverable and auditable.

4. **Model-specific prompt presets are fragile**
   * A preset that works for one model may fail on another. This is especially true for jailbreak/NSFW-style presets, but also applies to style, memory, and roleplay conventions.
   * Product lesson: FableMap should avoid relying on opaque “one prompt to rule them all” presets. Prefer structured controls, compatibility reports, and model profiles.

5. **Long-form continuity is the key unsolved problem**
   * Bugs described by the player are not just “memory length” issues; they are missing authoritative state ownership.
   * Examples: character reaches a qualification threshold but the system forgets to apply the same role logic to another character; planted resources are forgotten and replaced by hallucinated resources.
   * Product lesson: facts that matter to progression must live in cards/records, not only in chat history.

### FableMap-specific implications

FableMap should not copy cultivation/RPG combat wholesale because the product center remains real-map cyber taverns, owner-authored NPCs, conversation, memory, and revisit feedback. But it can borrow the **state-card discipline**:

* **Character cards**: TavernCharacter identity, personality, public role, relationship style, avatar/sprites.
* **Visitor state cards**: affinity, known facts, promises, unresolved conflicts, visit history.
* **Task/quest cards**: lightweight tavern commissions, investigation hooks, neighborhood rumors, restoration arcs.
* **Resource/asset cards**: owner-confirmed items, clues, recipes, local specialties, room props, planted/placed objects.
* **Location cards**: real coordinate, nearby taverns, local atmosphere, owner-approved lore overlays.
* **Conflict cards**: rivals, blockers, debts, mysteries, faction tension, reputation risks.
* **Log cards**: observable event summaries, not hidden chain-of-thought.

### New product idea: Tavern GM Layer

**Goal**: Add a model-assisted “GM layer” that can suggest conflict, difficulty, and next hooks, but cannot silently rewrite authoritative state.

**How it works**:

1. Chat produces candidate events.
2. GM layer proposes structured updates:
   * new task card
   * resource delta
   * relationship delta
   * conflict/opportunity card
   * memory candidate
3. System validates the proposed updates against known state.
4. Owner/visitor-facing UI shows a compact “本轮变化” summary.
5. Only approved/validated updates enter persistent VisitorState / GameplaySession / WorldInfo-style records.

**Why it matters**:

* Preserves the emergent fun of AI creating trouble.
* Prevents the AI from inventing nonexistent resources or forgetting earlier commitments.
* Creates a bridge from chat to serial fiction without pretending full automation is reliable.

### New product idea: Canon Ledger / Continuity Lock

**Goal**: Maintain a compact authoritative ledger for long-running tavern stories.

**Ledger categories**:

* Fixed canon: owner-authored tavern facts, NPC identity, coordinates, room layout, world rules.
* Session canon: facts established in this visitor’s run, current tasks, unresolved promises.
* Mutable state: affinity, inventory-like clues/resources, status effects, quest progress.
* Pending candidates: AI-suggested facts waiting for validation or owner/visitor confirmation.

**Continuity rules**:

* AI may propose, but not overwrite fixed canon.
* AI may not invent owned resources if no resource card exists.
* If uncertain, ask through the UI: “需要把这个设定加入正史吗？”
* Contradictions produce repair prompts: “你之前没有种植过 X，是否改为已记录的 Y，或新增一次补种事件？”

### New product idea: Model Profile & Preset Compatibility Report

**Goal**: Treat each LLM provider/model as having different behavior, context, tool ability, and safety behavior.

**MVP**:

* Store no jailbreak recipes.
* For each imported preset/template, show compatibility notes:
  * likely portable: style, reply length, perspective, world-info layout
  * model-sensitive: obedience wording, NSFW wording, aggressive roleplay instructions, chain-of-thought instructions
  * unsupported: bypass/safety-disable claims, hidden thinking forcing, user impersonation
* Let owner choose “safe compatibility mode” when switching models.

**Why**:

* The player’s pain is real: “same preset, different model, different result.”
* FableMap can solve this as product UX instead of trying to defeat model safeguards.

### New product idea: Serial Novel Export / Episode Builder

**Goal**: Convert long tavern sessions into owner/visitor-reviewed serial fiction.

**Flow**:

1. Session log → event summaries.
2. Canon ledger filters contradictions.
3. User selects an episode range.
4. AI rewrites into chapter draft using only confirmed facts.
5. UI highlights uncertain or contradicted facts for review.
6. Export as Markdown/HTML/roleplay log.

**Fit**:

* Matches user observation that this loop can generate short/medium serial fiction.
* Does not require fully automatic novel writing.
* Encourages human review, which solves visible “200 floors later” bug accumulation.

### Risks and non-goals

* Do not build a generic cultivation game as the new product center.
* Do not implement jailbreak/破甲 optimization or provider-specific safety bypasses.
* Do not rely on NSFW as the core retention loop; if adult spaces are ever considered, they need separate age-gating/content policy/access-control design.
* Do not let AI mutate owner-authored tavern canon without confirmation.
* Do not expose private visitor memories, API keys, or hidden system prompts in exports or public tavern payloads.

### Updated roadmap candidates

**Candidate 1: State Cards for Tavern Continuity (Recommended)**

* Add or formalize UI/data rules for character/task/resource/log cards.
* Focuses on the biggest pain: long-session continuity.
* Can reuse existing `VisitorState`, `GameplaySession`, `WorldInfoEntry`, and guestbook/rumor/task concepts.

**Candidate 2: Tavern GM Layer**

* AI proposes conflict/opportunity/resource updates as structured candidates.
* Higher fun ceiling, but needs validation and UI review to avoid hallucinated state.

**Candidate 3: Preset Compatibility & Safe Import Report**

* Helps owners import community presets and switch models safely.
* Strong match to the earlier preset discussion.

**Candidate 4: Serial Novel Export**

* Turns long chat logs into reviewed chapters.
* Good “wow” feature, but depends on continuity ledger first.

### Recommendation after this analysis

Prioritize **State Cards for Tavern Continuity** before more generative features.

Reason: the player’s positive experience comes from emergent AI drama, but the failures come from missing authoritative records. If FableMap first makes character/task/resource/log cards reliable, then GM conflict generation, preset import, and serial novel export all become safer and more valuable.

A strong MVP would be:

1. Make every meaningful NPC/session change visible as a card or event.
2. Let AI propose updates, but require validation/confirmation for durable canon.
3. Add contradiction checks before the NPC references resources, tasks, or relationship facts.
4. Provide an episode/log view that can later become novel export.

### Additional acceptance criteria

* [ ] Brainstorm captures the distinction between AI-generated prose and authoritative state cards.
* [ ] Future design must preserve FableMap’s real-map tavern identity rather than becoming a generic RPG/cultivation simulator.
* [ ] Any model/preset feature must be compatibility-oriented, not safety-bypass-oriented.
* [ ] Long-form memory should rely on structured event/resource/task records, not only chat context.
* [ ] AI-proposed conflicts and strong enemies must remain owner/visitor-reviewable when they affect durable state.

## Condensed Context Memory (2026-04-29)

See `context-memory.md` for the compact handoff summary.

Current conclusion: the Trellis task is complete as a brainstorm capture, but not yet implementation-ready. The strongest next feature candidate is **State Cards for Tavern Continuity**: AI may propose drama, conflicts, resource changes, and memory updates, but durable canon must live in structured cards/ledger and be validated before it affects future sessions.

Next decision needed: choose one MVP child task — State Cards, Preset Import Preview, Tavern GM Layer, or Serial Novel Export.

## Market Reference Analysis: NanoMate / nanobot × SillyTavern Companion Mode (2026-04-29)

Sources checked:

* Linux.do post: `https://linux.do/t/topic/1628850`
* GitHub repo: `https://github.com/shenmintao/NanoMate`

### What NanoMate validates

NanoMate is useful as a market signal because it combines three things that FableMap has been discussing separately:

1. **Character card as soul**
   * SillyTavern card defines who the character is: personality, background, relationship, appearance.
2. **Preset as voice / behavior style**
   * Preset defines how the character talks, what prompt entries are active, and what boundaries/style it follows.
3. **Agent skills as capabilities**
   * Skills define what the character can do beyond text: proactive care, scheduled follow-up, image generation, voice, channel delivery.

For FableMap, this suggests a clearer product formula:

```text
Real Tavern Place = body / coordinate anchor
TavernCharacter = soul
Preset / Style Profile = voice
Skill Pack = actions
State Cards / Canon Ledger = memory and continuity
Assets = face / voice / souvenirs
```

### New FableMap product ideas inspired by NanoMate

1. **Tavern Skill Packs**

   Owner can enable small, explicit capability packs per tavern/NPC:

   * `visual-souvenir`: generate a tavern postcard / shared moment image.
   * `revisit-care`: opt-in follow-up after a visit, with quiet hours and frequency caps.
   * `local-rumor`: NPC mentions nearby tavern rumors and map hooks.
   * `quest-gm`: NPC proposes structured conflict/opportunity cards.
   * `voice-greeting`: NPC speaks first greeting / selected replies.

   MVP rule: skill packs are opt-in and owner-visible; they do not silently change NPC identity or durable canon.

2. **Shared Moment / Tavern Souvenir Generator**

   Adapt NanoMate's “user photo + character reference = shared image” into FableMap as a safer tavern-native feature:

   * Visitor enters tavern and requests a souvenir postcard.
   * System uses tavern interior, NPC reference, and optional visitor avatar/photo to generate a keepsake.
   * Output is private by default; visitor chooses whether to save/share.
   * If used as project asset, generated image must be moved into the project asset path and verified per image asset rules.

   Risks to handle before implementation:

   * consent for user photos and face likeness;
   * no default public posting;
   * no unauthorized celebrity/third-party likeness;
   * clear retention/delete policy;
   * model/provider cost controlled by owner settings.

3. **Character Reference Asset Contract**

   NanoMate embeds reference images in character extensions. FableMap can formalize a compatible contract without breaking SillyTavern export:

   * `avatar` / `sprites.neutral` remains the product-facing baseline.
   * Optional reference set: default, formal, seasonal, staff-uniform, festival, map-location-specific.
   * For import/export, unknown extension fields should be preserved when safe, but not required by core schema.

   This connects directly to existing NPC art guidelines and avoids one-off prompt-only visual identity.

4. **Proactive Care as “Revisit Feedback”, not unrestricted companion stalking**

   NanoMate's emotional companion tracks events and sends care messages with quiet hours and daily caps. FableMap can adapt this as:

   * NPC remembers a visitor-approved event: exam, trip, promise, birthday-like fictional milestone, quest deadline.
   * NPC sends an in-app message or tavern notification near the relevant time.
   * Visitor must opt in; owner can configure NPC tone; user can disable all proactive contact.
   * Do not market as therapy or mental-health support.

   This maps well to FableMap's current mainline: chat → memory/writeback → revisit feedback.

5. **Owner Slash Commands / ChatOps for Tavern Setup**

   NanoMate uses CLI commands like character import, preset import, world info import, prompt toggle, status. FableMap can eventually expose owner-only slash commands inside tavern chat or dashboard:

   * `/char import`, `/preset preview`, `/wi import`, `/status`, `/skill enable local-rumor`.
   * Safer MVP: dashboard buttons first; slash commands later for power users.
   * All commands must be owner-only and auditable.

6. **User Persona Import — tavern-scoped only**

   NanoMate's roadmap mentions SillyTavern User Persona JSON import. For FableMap this could be useful, but must obey project schema constraints:

   * Persona import is visitor-controlled.
   * Persona is scoped to current tavern/session unless user explicitly exports/imports locally.
   * No platform-wide social profile, matching, public visitor profile, or global gender inference.

7. **External Channels as future distribution, not MVP center**

   NanoMate uses WhatsApp/Telegram/etc. FableMap should avoid making external IM channels the core product initially, but it can learn from the experience:

   * mobile chat needs to feel like a real message thread;
   * notifications should support quiet hours, rate limits, and opt-out;
   * media reply support matters for companion-like moments.

   Future channel bridge must not expose owner secrets or private visitor memories.

8. **Voice Pack / NPC TTS**

   Voice increases presence, especially for first greetings and short NPC replies.

   FableMap-safe constraints:

   * start with platform-provided synthetic voices or owner-uploaded voices with consent;
   * no unauthorized voice cloning;
   * voice config belongs to owner and may affect token/tool costs;
   * generated audio should not leak private chat content to public endpoints.

9. **Multi-NPC / Group Tavern Rooms**

   NanoMate roadmap includes group cards / multi-role conversation. For FableMap this is attractive for taverns, but it depends on earlier foundations:

   * speaker selection rules;
   * per-NPC memory boundaries;
   * shared room state;
   * conflict with owner-authored character sovereignty;
   * state-card/ledger support to avoid chaotic drift.

   Recommendation: future feature after State Cards and Tavern GM Layer, not immediate MVP.

### What FableMap should not copy directly

* Do not make “AI girlfriend/companion” the whole product identity; FableMap's anchor is real-map taverns and owner-created NPCs.
* Do not rely on jailbreak/NSFW presets as a product moat.
* Do not enable proactive contact without opt-in, quiet hours, frequency caps, and user-visible controls.
* Do not store user photos, voice, or persona data without explicit retention rules.
* Do not put provider API keys or hidden prompts into public payloads.
* Do not auto-import every SillyTavern extension field into durable schema.

### Updated roadmap after NanoMate reference

**Recommended sequence**:

1. **State Cards / Canon Ledger** — continuity foundation.
2. **Preset Import Preview + Risk Report** — owner can import community assets safely.
3. **Tavern Skill Packs MVP** — opt-in skills like local-rumor, revisit-care, visual-souvenir.
4. **Shared Moment Image Generator** — private tavern postcard flow, after asset/privacy rules are designed.
5. **Voice Greeting / TTS** — small, controlled audio layer.
6. **Multi-NPC Tavern Rooms** — after state and speaker rules are stable.

### Candidate MVP: Tavern Skill Packs (new)

**Goal**: Create a small owner-facing skill-pack concept that turns NPCs from “only chat” into “can do specific tavern actions”.

**Possible first three packs**:

1. `local-rumor` — NPC can mention nearby tavern rumors.
2. `revisit-care` — NPC can follow up on visitor-approved remembered events.
3. `visual-souvenir` — NPC can generate a private postcard from tavern/NPC assets.

**Acceptance criteria for a future design**:

* [ ] Skill pack is opt-in per tavern/NPC.
* [ ] Skill pack prompt/capability is visible to the owner.
* [ ] Skill pack cannot overwrite `TavernCharacter` fields or durable canon silently.
* [ ] Tool costs and provider settings are owner-controlled.
* [ ] Visitor-facing proactive behavior has opt-in, quiet hours, and rate limits.
* [ ] Generated images/audio have privacy and asset-retention rules.

### Updated recommendation

The top-level recommendation remains **State Cards / Canon Ledger first**, because NanoMate-style companion skills become much safer and more useful when memory, events, assets, and consent are structured.

However, NanoMate adds a strong second-track product idea: **Tavern Skill Packs**. This can become the action layer after continuity is solved:

```text
State Cards make the tavern remember.
Skill Packs let the tavern act.
```

## Child task created (2026-04-29)

Created child task: `.trellis/tasks/04-29-state-cards-for-tavern-continuity/`

Purpose: turn the top recommendation — **State Cards / Canon Ledger first** — into a focused follow-up task with its own PRD and implementation context.

## Implementation closure (2026-04-30)

本轮已把该 brainstorm 中适合立即落地的安全 MVP 拆成 Trellis 子任务，并按任务目录完成实现、规范同步和验证记录。

### Completed / review-ready child slices

- `.trellis/tasks/04-29-state-cards-for-tavern-continuity/`：State Cards / Canon Ledger 连续性基础，已实现并留下 implementation note。
- `.trellis/tasks/04-29-tavern-skill-packs-mvp/`：Tavern Skill Packs MVP，已实现 owner-visible opt-in skill pack 与 local-rumor 基础能力。
- `.trellis/tasks/04-30-preset-import-preview-safe-converter/`：社区 preset 导入预览与风险报告，draft-only，不写入 live tavern state。
- `.trellis/tasks/04-30-tavern-gm-layer-structured-conflict-candidates/`：GM Layer 结构化冲突/机会候选预览，复用 State Cards，preview-only。
- `.trellis/tasks/04-30-serial-novel-export-episode-builder/`：会话日志 + confirmed state cards 的 Markdown/JSON episode draft 导出，不调用 LLM、不持久化。
- `.trellis/tasks/04-30-voice-greeting-tts-pack-preview/`：NPC 首句/alternate greeting 的 no-audio TTS request preview，不合成音频、不自动播放。
- `.trellis/tasks/04-30-visual-souvenir-shared-moment-preview/`：共同瞬间纪念图 prompt preview，不生成图片、不保存资产，并做 visitor/contact/API-key 风险脱敏。

### Protocol/spec/docs sync

- `docs/AI参与开发协议.md` 已切换到 Task First：新任务优先参考 `.trellis/tasks/`、`.trellis/workflow.md`、`.trellis/spec/`，并要求使用 Trellis `start` / `before-dev` / `check` / `finish-work` 或等价流程。
- `.trellis/spec/backend/` 与 `.trellis/spec/frontend/` 已补充本轮新增跨层 API/服务边界合同。
- `README.md`、`docs/ARCHITECTURE.md`、`docs/changes/2026-04-30-*.md` 已同步新增能力和明确的 no-persistence / no-generation 边界。

### Final verification evidence

- `py -3 -m compileall -q backend/src` -> passed
- `py -3 -m pytest -q --tb=short` -> `527 passed, 103 warnings`
- `npm --prefix .\frontend test` -> passed
- `npm --prefix .\frontend run typecheck` -> passed
- `npm --prefix .\frontend run build` -> passed
- `.trellis/scripts/task.py validate` 已对新增/更新任务上下文执行并通过；visual-souvenir 子任务最终 validate 通过。

### Explicitly deferred / not done

- `visual-souvenir` 只完成 prompt preview；实际图像生成、资产落盘、公开分享和保留/删除策略仍是后续高风险设计。
- `voice-greeting` 只完成 no-audio preview；实际 TTS 调用、音频存储、自动播放、声音克隆/上传仍未实现。
- `revisit-care` 主动触达/通知调度仍未实现；需要 opt-in、quiet hours、频控和取消订阅设计后再做。
- `multi-npc-group-tavern-future` 仍是未来完整产品切片；当前仓库已有 group-chat 基础能力和测试，但本轮没有实现完整多人 NPC 房间 UX。

### Closure status

该父任务从“头脑风暴”推进为“review-ready implementation bundle”：安全、可测试、可留痕的 MVP 子切片均已拆分并完成；生成式图片/音频、主动通知、完整多人 NPC 房间等高风险扩展明确延期，避免越过 `WHAT_NOT_TO_BUILD` 与主人主权边界。

## 2026-04-30 Backlog hardening: deferred / future safety tasks

为避免本 brainstorm 中的 deferred 方向遗失，以下规划已拆成 Trellis 子任务（均为 planning，不代表已实现）：

- `04-30-safe-npc-character-card-template-guidelines`
- `04-30-character-editor-prompt-risk-linter`
- `04-30-worldinfo-trigger-pack-cat-empire-quest-draft`
- `04-30-prompt-composer-style-dials-mvp`
- `04-30-model-profile-preset-compatibility-report`
- `04-30-persistent-preset-library-import-model-design`
- `04-30-visual-souvenir-full-image-asset-pipeline`
- `04-30-voice-greeting-tts-synthesis-playback`
- `04-30-revisit-care-proactive-notification-design`
- `04-30-multi-npc-tavern-room-full-ux`
- `04-30-adult-content-governance-design`
- `04-30-external-channel-companion-integration-research`

另外，`SC-03` 状态卡 Prompt 注入已落成 `04-30-state-card-prompt-injection-sc-03`，挂在 `04-29-state-cards-for-tavern-continuity` 下。
