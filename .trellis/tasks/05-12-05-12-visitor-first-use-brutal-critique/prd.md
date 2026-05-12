# Feedback: brutal visitor first-use experience critique

## Source

普通游客视角恶毒体验点评，记录时间：2026-05-12。

用户提供的评价主题：

> 游客体验恶毒点评报告
> 对“AI赛博酒馆”抱有期待，结果被现实狠狠抽了一耳光。

## Feedback Summary

这条反馈从普通游客 first-use 视角指出：FableMap 当前可能在第一印象、地图探索、进店仪式、NPC 对话、移动端、发现页内容密度、创作者/游客双边定位上同时失分。核心问题不是“页面不好看”，而是用户不知道自己在哪里、能做什么、为什么要留下、为什么要回来。

## Visitor Journey Pain Points

### 1. 第一印象：地图像一片无名墓地

反馈认为游客打开后看到的是一堆图钉：

- 没有引导；
- 没有欢迎；
- 没有教程；
- 坐标点之间缺少差异化；
- 没有什么告诉游客这些地方值得进入。

原始恶评：

> 你的地图不是探索，是一片墓地。每个图钉都是一块无名墓碑，我不知道里面葬了谁。

产品风险：发现页/地图层未建立探索动机，图钉无法转化成兴趣。

### 2. 进入酒馆：没有“推门而入”的上下文

反馈认为从地图点进入酒馆后，体验像直接弹出聊天框：

- 缺少过渡/仪式感；
- 不知道身处哪里；
- 不知道这个空间是什么类型；
- 不知道哪个是店主，哪个是 NPC；
- 不知道能跟谁说话，规则是什么，说了会怎样。

原始恶评：

> 你的“沉浸式体验”让我感觉自己闯入了别人家的会议室——陌生、尴尬、完全不知道规则。

产品风险：酒馆隐喻没有被建立，聊天界面先于场景理解出现，导致用户焦虑。

### 3. NPC 对话：延迟、缺少拟人反馈、记忆感弱

反馈认为 NPC 对话链路可能存在：

- 回复等待 3-8 秒导致流失；
- 缺少“正在输入”的拟人状态；
- 缺少打字机/渐进式回应；
- 文字一次性砸下来，像复制粘贴；
- 用户主观感觉 NPC 没有记住前文。

原始恶评：

> 这不是AI伴侣，这是一个反应迟钝的粘贴板。

产品风险：即使 LLM 回复质量尚可，缺少等待体验设计和可见记忆反馈也会让用户感知失败。

### 4. 移动端体验：布局犯罪现场

反馈认为移动端竖屏存在严重问题：

- 左侧边栏过度占屏；
- NPC 列表、聊天区、上下文面板拥挤；
- 键盘弹出后聊天框/输入区域可能被遮挡或消失；
- 移动端适配被用户感知为不可信。

原始恶评：

> 如果你的产品在手机上的体验是这样，你就不应该有手机用户。你的“移动端适配”是一个谎言。

产品风险：移动端是 first-use 的主战场，如果输入/阅读/切换 NPC 不可靠，游客无法留存。

### 5. 发现页/Search：漂亮橱窗，空纸箱

反馈认可发现页视觉第一眼有吸引力，但认为内容层空洞：

- 酒馆名字像随机生成；
- 描述不足；
- 缺评价/访客数/热度/推荐理由；
- 没有偏好选择依据；
- 点击像随机飞镖。

原始恶评：

> 你做了一个漂亮的橱窗，但橱窗里全是空纸箱。

产品风险：视觉设计无法替代内容密度和决策信息，漂亮卡片如果没有“为什么进这家”，会加重失望。

### 6. 双边用户都没讨好

反馈认为：

- 店主/创作者需要配置 NPC、故事、空间、System Prompt、WorldInfo，门槛偏重度；
- 普通游客只想随便逛和聊，但缺少引导、推荐、最受欢迎、清晰入口；
- 当前像用创作者工具服务游客，又用游客期待绑架创作者。

产品风险：创作者工具复杂度与游客娱乐预期错位，双边都容易流失。

## Visitor Scorecard Recorded

| 维度 | 评分 | 评语 |
|---|---:|---|
| 第一印象 | 4/10 | 地图有创意，但没有灵魂 |
| 新用户引导 | 1/10 | 几乎不存在 |
| NPC 对话体验 | 3/10 | 延迟高、无记忆感、缺仪式感 |
| 移动端体验 | 2/10 | 一个布局犯罪现场 |
| 内容发现 | 3/10 | 看起来好看，实际上空洞 |
| 整体留存动力 | 2/10 | 没有任何理由回来 |

## Core Question

> 你的产品的第一个 aha moment 在哪里？

如果回答需要超过一句话，就说明没有真正的 aha moment。

## Actionable Risk Extraction

### Risk A — Map does not explain value

地图必须从“点位展示”变成“可理解的目的地”。每个点至少需要：谁在里面、为什么值得进去、第一句能问什么、是否有人/AI正在接待。

### Risk B — Tavern entry lacks doorway ritual

从地图到聊天之间需要一个可感知的“进店”阶段：门牌、灯牌、NPC 迎接、空间规则、第一句话建议。否则聊天框太突兀。

### Risk C — Waiting experience is untreated

LLM 延迟不可避免，但必须被拟人化/仪式化：typing indicator、NPC 正在思考、渐进式输出、可见队列状态、超时友好提示。

### Risk D — Memory must be visible

用户不相信“记忆”存在，除非能看到：记住名字、回访问候、对前文引用、记忆卡/摘要反馈。

### Risk E — Mobile is not optional

移动端输入、键盘、NPC 列表、聊天区、上下文折叠必须作为主路径验证，而不是桌面布局的压缩版。

### Risk F — Discovery needs decision signals

发现页需要帮助用户选择，而不是只展示视觉卡片：热度、最近对话、NPC 招呼、体验类型、推荐理由、首句 prompt、访客回访信号。

## Recommended Follow-up Tasks

1. **Visitor First 3 Seconds / Map Marker Meaning Audit**
   - Verify whether a first-time visitor can tell which tavern is worth entering.

2. **Tavern Doorway Ritual MVP**
   - Add a pre-chat doorway panel: welcome, NPC host, first prompt, rules, visible enter transition.

3. **Chat Waiting Experience MVP**
   - Add typing indicator / thinking state / streaming or typewriter-like response where feasible.

4. **Mobile Chat Keyboard Acceptance**
   - Playwright/mobile manual validation specifically for keyboard, composer visibility, NPC list, scroll behavior.

5. **Discovery Decision Signals**
   - Add visible reason-to-enter: NPC greeting, visitor count/recency, first-minute prompts, experience type.

6. **Visible Memory Proof**
   - Make “NPC remembered me” visible in the next turn or return visit, not just stored internally.

## Relationship to existing Trellis records

Related records:

- `.trellis/tasks/05-12-05-12-human-feedback-tavern-affordance/prd.md`
- `.trellis/tasks/05-12-05-12-promoter-growth-critique/prd.md`
- `.trellis/tasks/05-12-05-12-product-staff-doa-critique/prd.md`
- `.trellis/tasks/05-12-05-12-incoming-developer-codebase-critique/prd.md`
- `.trellis/tasks/05-12-05-12-map-anchored-space-ugc-critique-brainstorm/prd.md`

This visitor critique is the most direct first-use UX signal so far: **the product does not yet make ordinary visitors feel welcomed, oriented, and motivated to chat.**

## Caveats

- This record captures the provided feedback as user-experience evidence, but not every technical claim is freshly verified in this step.
- Mobile layout and NPC memory claims require a dedicated reproduction/Playwright/manual test pass before implementation decisions.
- No code changes are made in this record.

## Out of Scope

- No implementation in this feedback record.
- No schema/API change.
- No abandonment of map anchoring.
- No addition of forbidden visitor social/game/ranking systems.

## Status

Recorded as brutal visitor first-use experience feedback. Completed as feedback capture.
