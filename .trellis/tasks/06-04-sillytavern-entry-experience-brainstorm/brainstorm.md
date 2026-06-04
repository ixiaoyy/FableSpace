# Brainstorm notes: learning from SillyTavern without copying it

## Evidence sources

- SillyTavern GitHub README: `https://github.com/SillyTavern/SillyTavern`
- SillyTavern Characters docs: `https://docs.sillytavern.app/usage/characters/`
- SillyTavern Welcome Page Assistants docs: `https://docs.sillytavern.app/usage/welcome-assistants/`
- SillyTavern World Info docs: `https://docs.sillytavern.app/usage/core-concepts/worldinfo/`
- SillyTavern Extensions docs: `https://docs.sillytavern.app/extensions/`
- Character Card V2 spec: `https://github.com/malfoyslastname/character-card-spec-v2`
- User-provided screenshots in this thread: SillyTavern entry/login screen and a long first-message chat screen.

## Screenshot observations

- The first screen sells identity before functionality: strong logo, short category label, tagline, and mood background.
- Primary actions are obvious: login and register dominate; community/forum and character-library links are secondary.
- Feature promises are grouped into four simple cards: AI chat, roleplay, personalization, extensions.
- The UI hints at a power-user product, but the entry screen keeps the first decision simple.
- The visual language is immersive and “tavern-like,” but still acts as a utility gateway.

## User-supplied chat screen screenshot observations

The second screenshot shows a long character opening message inside the main chat UI. It reveals why SillyTavern can feel powerful and intimidating at the same time.

### What works

- The character card is immediately concrete: avatar, character name, timestamp, and message index make it feel like a story record rather than a blank assistant.
- The opening message is not a greeting; it is a full scene. It gives weather, time, location movement, emotional state, an NPC encounter, and a moral hook.
- The background art and translucent chat surface strengthen immersion without needing a separate cutscene.
- The scrollable long-form message supports interactive fiction pacing; the user is meant to read, imagine, then respond.
- The top bar exposes power-user affordances: chat selection, search, character/group tools, edit/delete, and other controls.

### What may confuse newcomers

- The toolbar is icon-heavy and assumes prior knowledge; a new visitor may not know which icons are essential versus advanced.
- The first message is compelling but very long; a user may not know where to reply or what kind of reply is expected.
- The UI presents a complete novel-like passage, but does not clearly separate:
  - “你现在在哪里”
  - “你现在是谁 / 当前处境”
  - “眼前可互动对象”
  - “下一步可以怎么做”
- The text is immersive, but the user may still ask an OOC meta question if the input area does not suggest an in-scene response pattern.
- Power actions such as edit/delete/new chat are visually near story content; for FableMap visitor mode, destructive or authoring controls should not compete with the first response.

### FableMap translation

- Treat the first NPC message as an **opening scene card** with optional long-form prose, not just a chat bubble.
- Add a lightweight “scene digest” before or beside long prose:
  - 地点 / 时间 / 氛围
  - 你刚刚遭遇了什么
  - 眼前 NPC 或事件
  - 推荐下一步
- Keep full prose available because it is the emotional payload, but help impatient users with “读完了吗？可以这样接.”
- Separate visitor-essential controls from owner/power controls:
  - Visitor: continue, starter reply, memory, restart branch.
  - Owner/admin: edit opening, revise character, delete, import/export.
- For mobile, collapse advanced controls behind “更多,” and keep the first-turn action chips visible near the input.
- The visual layer should support the specific tavern/space atmosphere, but must use project-owned or properly recorded assets if implemented.

### Candidate UI pattern: opening scene reader

Purpose: preserve immersive long-form openings while reducing first-turn paralysis.

Possible structure:

1. Character header: avatar, NPC name, role in the space, owner-confirmed status if relevant.
2. Scene digest: 3-4 short bullets extracted from owner-authored opener or manually configured by owner.
3. Full opening prose: expandable/scrollable story text.
4. “How to reply” strip:
   - “用动作 + 对话接续场景”
   - one example matching the space type.
5. Starter chips:
   - “靠近询问”
   - “观察四周”
   - “提出帮助”
   - “请求确认目标”
6. Branch controls:
   - “继续这个支线”
   - “从入口重开”
   - “不带入长期记忆试游” only if product approves.

Risk: scene digest must not become platform-authored story. It should be owner-authored, imported, or generated only as an owner-reviewed draft.

### Product principle: scene prose should frame entry and chat turns

Yes: entering a space and starting a chat should usually include enough scene prose to prevent “blank chat paralysis.” The goal is not simply “more text,” but **clear situational framing**:

- Where am I?
- What just happened?
- Who is in front of me?
- What can I naturally do next?
- What emotional tone should I respond with?

This is especially important for FableMap because the product promise is “enter a real-location anchored AI space,” not “open a general chatbot.”

Recommended pattern:

- On space entry: use a **cinematic arrival paragraph** to transition from map/place into scene.
- On first NPC chat: use a **longer first-message scene** when the space is story/roleplay/exploration oriented.
- During ordinary chat: do not force every reply to be long. Mix concise dialogue with sensory/context reminders when the scene changes.
- When the user hesitates: show starter replies and “what you can do next.”

Length guidance:

- Entry arrival: 80-180 Chinese characters by default.
- First opener: 200-600 Chinese characters for immersive spaces; shorter for utility/companion spaces.
- Scene change / quest beat: 120-300 Chinese characters.
- Normal NPC reply: as short or long as the character style requires, but should not bury the next actionable cue.

Anti-patterns:

- A blank chat box after “进入空间.”
- A giant wall of prose with no digest, no obvious reply affordance, and no next action.
- Every single NPC reply becoming a novel, causing slow pacing.
- Platform-generated scene prose that publishes without owner review.

FableMap-safe implementation idea:

- Owner configures or confirms `entry_scene`, `first_scene_opener`, and optional `scene_digest`.
- Platform can provide generic visitor reply templates, but not auto-author tavern lore as final published content.
- If AI helps draft scene prose, it stays in owner review as an AI 草稿.
- Visitor UI can add non-content scaffolding: “当前场景 / 你可以 / 推荐回复,” without changing the owner-authored story.

## User-supplied newcomer tutorial lessons

The supplied SillyTavern newcomer guide highlights a different problem than UI polish: many new users bring a ChatGPT mental model into a roleplay product.

### 1. Set the product frame before the user chats

Newcomers need to know that “tavern” is not a productivity assistant for code, email, or factual search. It is closer to solo roleplay, interactive fiction, script-kill, or tabletop roleplay.

FableMap translation:

- Say “这是一个可进入、可回访的 AI 空间” before showing a blank chat box.
- Explain that the visitor is entering a scene and should respond as a participant.
- Avoid a generic assistant prompt that invites “你会做什么？”.

### 2. Teach the anti-pattern explicitly: do not ask the NPC “你会做什么？”

The guide names this as an OOC / out-of-character break. The failure is predictable: the user asks a meta assistant question, and the NPC either hallucinates capabilities or exits the story frame.

FableMap translation:

- Add a light “入戏提示” near the first message: “不要问 NPC 会做什么，试着接住当前场景。”
- Detect or discourage first-turn meta questions like “你是谁 / 你会做什么 / 介绍一下世界观” only as UX guidance, not hard blocking.
- Offer in-character starter chips so the user never faces an empty input first.

### 3. First message is the scene contract

The guide emphasizes that the character card’s First Message establishes time, place, mood, and the current dramatic beat. The user’s job is to continue that scene.

FableMap translation:

- Treat TavernCharacter `first_mes` as a visible “scene opener,” not just the first assistant message in chat history.
- Add copy such as “接续这段开场，而不是重新提问.”
- For FableMap spaces, the opener should also mention location flavor and the immediate play affordance.

### 4. Provide universal “in-character rescue” starters

The tutorial’s strongest reusable pattern is: if the user does not understand the world, wrap the question inside the fiction instead of asking meta questions.

Reusable starter modes:

- 失忆 / 外来者流：适合自然套取地点、背景、当前危机。
- 突发危机流：适合快速打破僵局，让 NPC 按设定推进事件。
- 日常闲聊流：适合恋爱、治愈、陪伴、日常空间。
- 明确任务流：适合冒险、调查、委托、跑团式空间。

FableMap translation:

- Map starter modes to tavern type or gameplay template.
- Keep examples generic and visitor-side; they do not auto-publish owner content.
- Let owners customize or hide starter chips if they want stronger authorial control.

### 5. Teach roleplay syntax without making it homework

The guide teaches `*动作/神态* + 对话` as a simple interaction grammar.

FableMap translation:

- Use one compact example in the input empty state: `*推开门，小声问* 这里发生了什么？`
- Show “动作描写 + 对话” as a tappable helper, not a modal wall of text.
- For mobile, a one-tap “帮我入戏” can insert a starter draft into the input for user editing.

### 6. Reframe reset/new chat as parallel story control

The guide explains that “新聊天” restarts from the first message and can create a different parallel-universe story.

FableMap translation:

- Label reset controls in story terms: “开启新支线 / 从门口重新开始.”
- If return memory exists, distinguish:
  - Continue with memory.
  - Start a new branch without carrying this run.
  - Trial mode without long-term memory, if product approves that direction.

### 7. Onboarding should explain buttons in context

The guide starts from user confusion about what the product is and what UI buttons do.

FableMap translation:

- Add optional “新手模式” labels for first-run UI: 空间卡、NPC、玩法、记忆、重开、继续.
- Prefer contextual helper text over a separate manual.
- Owner/admin power tools should remain hidden from visitor onboarding.

## External lessons to translate

### 1. Welcome screen as “first-minute host”

SillyTavern supports a welcome screen with a designated assistant, quick links, temporary chat, and recent chats. For FableMap, this maps better to a **location-bound greeter**:

- A tavern can choose one owner-configured NPC as “door host.”
- The host explains “this space怎么玩” and offers one starter action.
- Recent/return visits should show “continue from last memory” instead of generic recents.
- Temporary chat maps to “试游 / 不写入长期记忆 unless confirmed,” but this must be explicit to preserve trust.

### 2. Character management as supply-side power

SillyTavern character docs emphasize create/import/export, search/sort/filter, tags, favorites, token size, lore links, duplication, and gallery view.

FableMap translation:

- Keep power tools in owner/admin context, not visitor first path.
- Use tags for UI filtering and import hygiene, not prompt engineering.
- Preserve character-card export/import as a trust feature for creators.
- Surface token-size and missing-field warnings before publish.

### 3. Lorebook / World Info as layered context

SillyTavern World Info behaves like conditional context insertion, with global, character, persona, and chat-bound sources. FableMap already has `WorldInfoEntry`; the opportunity is product clarity:

- Tavern lore: space-level facts, rules, atmosphere.
- NPC lore: character-specific memory and secrets.
- Visitor state: private relationship / return-visit continuity.
- Gameplay session state: current task, clue, ritual, or creative progress.

The key UX lesson is not “add more fields,” but “make context scope visible so owners know what will affect replies.”

### 4. Extensions as optional capability packs

SillyTavern exposes built-in and installable extensions such as expression images, summarization, vectorization, TTS, quick replies, token counter, and background/ambient capabilities.

FableMap-safe translation:

- Treat these as owner-enabled “space capability packs.”
- Do not make global plugin sprawl part of visitor navigation.
- Capability packs should show cost/privacy effects: token cost, stored memory, external API use, generated assets.
- Good early candidates: quick replies, state cards, voice greeting preview, expression sprites, and owner token visibility.

### 5. Compatibility is a creator trust signal

Character Card V2 adds fields such as `system_prompt`, `post_history_instructions`, `character_book`, `creator_notes`, `alternate_greetings`, tags, creator, and version. FableMap should keep compatibility visible:

- Import preview should explain mapped / unmapped fields.
- Export should not silently drop creator notes, tags, alternate greetings, or embedded character book data.
- Version and source notes help owners manage multiple variants.

## FableMap product directions

### A. “世界镜像面入口” first screen

Purpose: replace a generic login-first impression with a product promise.

Possible layout:

- Hero line: “进入现实世界的另一面。”
- Subtitle: “基于真实位置，发现可回访的 AI 空间。”
- Primary CTAs:
  - “探索附近空间”
  - “登录 / 继续回访”
  - “开一间空间” as secondary owner path
- Four promise cards:
  - 真实地点锚点
  - NPC 主持第一分钟
  - 角色卡兼容
  - 私密回访记忆

Risk: avoid turning entry into unauthenticated content generation or global social feed.

### B. Door-host NPC first minute

Purpose: solve “进空间后不知道干什么.”

Behavior:

- Owner selects a host NPC from existing TavernCharacter.
- Host shows one sentence premise, one “玩法说明,” and 2-4 starter buttons.
- If returning visitor has state, show one memory cue and one “继续上次” action.
- Host or UI teaches: read opener, reply in-scene, use action + dialogue.
- First-turn starter chips should avoid OOC meta prompts and instead offer in-character ways to ask for context.

Risk: host must be owner-authored/confirmed; platform may suggest drafts only in owner review.

### B2. Newcomer roleplay literacy layer

Purpose: convert users from “ChatGPT question-answering” to “interactive scene participation.”

Behavior:

- One-line framing before first chat: “你正在进入一个由 NPC 主持的空间，不是普通问答助手。”
- Compact anti-pattern hint: “少问‘你会做什么’，多用动作接续场景。”
- Starter chips by mode:
  - 失忆/外来者：`*我揉了揉发痛的额角，环顾四周* 这里是哪里？刚刚发生了什么？`
  - 突发危机：`*我压低声音，拉住你的衣袖* 等等，周围好像不太对劲，我们接下来怎么办？`
  - 日常闲聊：`*我在你身边坐下，放松地笑了笑* 你刚刚在想什么？接下来有什么安排？`
  - 明确任务：`*我检查好随身物品，认真看向你* 再确认一下，我们这次要完成什么目标？`
- A tiny “动作 + 对话” helper in the input placeholder.

Risk: these chips must be framed as visitor reply templates, not platform-authored tavern content. Owner may override per space.

### B3. Opening scene reader

Purpose: make long, literary first messages usable without weakening their immersion.

Behavior:

- Show NPC identity and role before the prose.
- Add a short “scene digest” for place/time/situation/interactive object.
- Keep full first message visible as the canonical owner-authored scene.
- Put “continue the scene” starter chips near the input, not in a separate tutorial page.
- Hide edit/delete/import/power actions from visitor-first mode.

Risk: auto-summarizing an opener would be content generation. If used, it must be an owner-reviewed draft or a local UI-only preview that does not publish.

### B4. Scene-setting prose policy

Purpose: avoid both extremes — blank chatbot entry and unreadable wall-of-text roleplay.

Behavior:

- Space entry should show a short arrival scene before asking the visitor to type.
- First NPC turn can be more literary and immersive, especially for story/exploration spaces.
- UI should always pair scene prose with an actionable cue:
  - “你可以观察四周”
  - “你可以靠近询问”
  - “你可以提出帮助”
  - “你可以继续上次记忆”
- Ordinary chat should respect pacing: not every message needs a huge paragraph.
- Scene prose should change with context: first entry, return visit, new branch, quest beat, emotional climax, or location transition.

Risk: if scene prose is generated or summarized by AI, owner confirmation is required before it becomes durable public space content.

### C. Character card compatibility cockpit

Purpose: make SillyTavern creators feel safe importing/exporting.

Behavior:

- Import preview groups fields: mapped, preserved metadata, ignored/unsupported.
- Owner can bind imported character book entries to tavern/NPC scope.
- Export can include TavernCharacter plus scoped WorldInfo when selected.

Risk: avoid changing schema before reviewing current import/export implementation.

### D. Space capability packs

Purpose: learn from extensions without making FableMap a plugin marketplace.

Candidate packs:

- Quick replies / starter choices.
- State cards / summary memory.
- Expression sprite display.
- Voice greeting preview.
- Owner token/status panel.

Risk: each pack needs owner enablement and clear privacy/cost labels.

### E. Return-visit surface

Purpose: make “私密回访” visible.

Behavior:

- Recent spaces are sorted by last visit and relationship state.
- Show safe memory cues: “上次你和门口 NPC 约定了……”
- Offer “继续 / 重新开始 / 不带入上次记忆.”

Risk: memory cues must remain private to the visitor and must not leak owner API/config data.

## Candidate child tasks

1. `06-04-entry-screen-information-architecture`
   - Plan a FableMap first screen inspired by the screenshot, without copying SillyTavern branding or layout.
2. `06-04-door-host-npc-first-minute`
   - Specify owner-selected door host, starter actions, return-visit memory cue, and no-memory trial path.
3. `06-04-newcomer-roleplay-literacy-layer`
   - Design first-run copy, anti-OOC guidance, action/dialogue helper, and four in-character starter modes.
4. `06-04-opening-scene-reader`
   - Design scene digest, full opener, starter chips, and visitor-safe control hierarchy for long first messages.
5. `06-04-scene-setting-prose-policy`
   - Specify where FableMap should use arrival prose, long openers, scene-change beats, normal replies, and actionable cues.
6. `06-04-character-card-import-export-trust-polish`
   - Audit current import/export against Character Card V2 fields and create UX copy for mapped/unmapped fields.
7. `06-04-worldinfo-scope-visibility`
   - Design owner-facing scope labels for tavern lore, NPC lore, visitor state, and gameplay session state.
8. `06-04-space-capability-packs-backlog`
   - Convert extension-like ideas into owner-enabled packs with cost/privacy labels.
9. `06-04-new-chat-branching-language`
   - Reframe reset/new chat controls as “start new branch / restart from entrance / continue with memory.”

## Open questions for product review

- Should the first public screen prioritize “explore nearby” or “continue回访” for the MVP?
- Is guest exploration allowed before login, or should all meaningful entry require login?
- Should “temporary / no-memory trial” exist, or would it weaken the memory promise?
- Which compatibility pain is more urgent: character import preview, lorebook mapping, or export confidence?
- Do we want a community/resource CTA, and if yes, is it external docs/card-library only rather than in-product social?
- Should starter chips be platform-provided generic templates, owner-curated per space, or both?
- Should the first-turn OOC guidance be passive helper text or an active suggestion when the user types a meta question?
- What is the safest label for “new chat” in FableMap: 新支线, 重新入场, 平行故事, or another product term?
- Should long first messages get a required owner-authored scene digest, or should digest remain optional to preserve creator freedom?
- In visitor mode, which SillyTavern-like controls should be visible immediately, and which should be owner/admin-only or hidden behind “advanced”?
- What are the default length targets for entry prose, first opener, scene-change prose, and normal NPC replies?
- Should prose length be chosen by tavern type, owner setting, or visitor preference?

## Non-goals for this task

- No UI implementation.
- No Schema/API change.
- No generated image asset.
- No platform auto-generation of spaces/NPCs.
- No community feed, global chat, follower graph, or token billing.
