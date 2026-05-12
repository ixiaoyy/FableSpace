# Feedback: incoming developer codebase critique

## Source

接手开发者视角恶毒点评，记录时间：2026-05-12。

用户提供的评价主题：

> FableMap 接手开发者恶毒点评
> 真正危险的不是烂代码，而是方向上的漂移——而漂移的早期症状，就是任务比用户多。

## Feedback Summary

该反馈从新接手开发者角度批评 FableMap：项目管理、代码结构、产品战略、工程质量、文档密度与用户价值之间严重失衡。核心指控不是“代码烂”，而是项目正在用 AI 和 Trellis 高效堆叠一个缺少真实用户反馈驱动的功能集合。

## Key Critiques

### 1. 规模感知错觉：单人项目伪装成互联网公司

反馈认为：`.trellis/tasks/` 的任务数量和范围给人一种 50 人团队 Sprint 系统的错觉，但 git 历史主要是 `chore: checkpoint ...`，缺少 feature 分支、PR、review 记录和清晰交付链路。

风险信号：

- Trellis 工作流复杂度高于实际团队规模；
- 任务系统很精密，但交付证据弱；
- 项目管理仪式可能替代了产品推进；
- “用企业级项目管理工具管理个人项目，表演给自己看”。

### 2. 代码结构：大文件和样式垃圾桶风险

反馈点名以下风险：

- `TavernOwnerPanel.jsx` 约 2k+ 行；
- `TavernChatRoom.jsx` 约 2k+ 行；
- `CharacterEditor.jsx` 约 1k+ 行；
- `frontend/app/product/styles.css` 超大，样式分层不清；
- `TavernChatRoom.jsx` 混合聊天渲染、语音 STT、表情推断、旁白、农场模式、公会任务、小游戏、状态卡、群聊协议、昵称弹窗等功能。

开发者感受：

> 这不是组件，这是一个带 JSX 语法的单体应用。

需要注意：本记录没有重新审计所有行数；这些作为接手者反馈中的 claim 记录，后续需独立代码审计验证。

### 3. 测试体系与真实覆盖错位

反馈认为：虽然有很多脚本测试/后端测试，但前端产品层缺少真正接近组件/用户行为的测试，`frontend/app/product/` 中大量文件没有就近测试文件。脚本测试数量多不等于用户体验可靠。

风险信号：

- 测试更像“合约存在性检查”，不一定覆盖真实行为；
- Playwright 自验收多是本地验证，不代表真实用户验证；
- 测试数量可能让团队产生虚假的安全感。

### 4. 产品战略漂移：每天一个新方向

反馈列举多个方向：

- 修仙放置游戏；
- 领土地图占领系统；
- 角色扭蛋玩法；
- 宠物/社区/农场；
- 短剧生成；
- 数字人酒馆；
- 成人内容治理等。

批评认为：多个方向在短时间内并行 brainstorm，导致项目像在追逐 AI 提案而不是用户反馈。

风险信号：

- 任务比用户多；
- brainstorm 比真实交付多；
- 功能边界与 `WHAT_NOT_TO_BUILD.md` 的距离变薄；
- 多个 Phase 0 方向同时存在，核心主线被稀释。

### 5. 工程规范掩盖工程质量

反馈认为：AGENTS.md / workflow / spec 文档非常严格，但代码中仍存在生产组件直接 `alert()`、巨型 CSS、巨型组件等问题。规范存在不代表质量达标。

风险信号：

- 项目可能把“写规范”误当成“执行规范”；
- 工作流自我维护任务变多；
- 为整理工具而整理，偏离用户问题。

### 6. 文档密度高，产品密度低

反馈认可文档质量，例如 `WHAT_NOT_TO_BUILD.md` 和 `WORLD_SCHEMA.md` 有真实思考，但指出用户看不到文档。用户只关心打开 App 时：

- 看到什么；
- 能做什么；
- 为什么要回来。

如果用户进入酒馆后看到的是空 NPC、需配置 LLM、未开放聊天功能，那么“主人主权”的哲学无法替代实际可用体验。

### 7. 最残忍的一句话

> 这个项目最大的问题，不是代码质量，不是任务管理，不是缺少测试。
>
> 是它在用 AI 高效地构建一个没有人需要的功能集合。

核心风险：任务驱动力来自 AI 提案和内部想象，而不是真实用户行为数据。

## Product / Engineering Risk Extraction

### Risk A — Workflow theater

Trellis/AGENTS/spec 体系可能形成“流程正确”的幻觉，但没有 PR、review、真实用户测试或可验证交付闭环时，流程无法证明价值。

### Risk B — Monolith frontend entropy

巨型组件和巨型 CSS 会提高接手成本，削弱局部修改信心，并让 AI 反复在错误层级继续堆功能。

### Risk C — Strategy sprawl

任务系统容纳过多方向，导致“什么都能做一点”，但没有一个体验打穿。

### Risk D — Tests not aligned with user value

脚本测试可以防回归，但不能替代：首次理解、第一句对话、是否愿意分享、是否愿意回访。

### Risk E — Developer onboarding pain

新接手开发者第一感受如果是“任务海 + 巨型文件 + checkpoint 历史 + 无 PR 证据”，会降低继续投入意愿。

## Recommended Follow-up Actions

### 1. Codebase intake audit

做一次真实接手审计，不先重构，先产出：

- Top 10 largest frontend/backend files；
- Top 10 most coupled modules；
- files with direct browser globals / `alert()` / direct `fetch` / mixed responsibilities；
- scripts/tests that are contract checks vs behavior checks；
- task count vs completed implementation count。

### 2. Freeze new brainstorm directions temporarily

除非来自真实用户反馈，否则暂停新增玩法/世界观/系统方向。

### 3. Pick one vertical slice and delete/park distractions

围绕 first-use tavern chat path：

- demo tavern；
- visible NPC greeting；
- first message；
- share/return；
- owner ROI feedback。

其他方向进入 parking lot。

### 4. Refactor only after slice is chosen

不要泛化“大重构”。先选择用户路径，再拆对应巨型组件：

- chat entry shell；
- NPC roster；
- composer；
- sidecar/secondary tools；
- owner-only panels。

### 5. Replace checkpoint-only habit with evidence-based change notes

即使不走完整 PR，也应该让 Trellis task 记录：

- changed files；
- why；
- validation；
- user impact；
- screenshots or demo evidence。

## Conflicts / Caveats

- 反馈中“前端测试文件数量 0”等表述需要上下文解释：项目存在大量 `frontend/scripts/*.mjs` 合约/行为脚本测试，但确实可能缺少就近组件测试和真实用户行为测试。
- 反馈中对任务数量、文件行数、git 历史的具体数字需要后续审计命令验证，本记录不直接将其作为已验证事实。
- 该反馈不等于要求立即删除 Trellis、文档或测试；它要求减少流程自嗨，建立用户反馈闭环。

## Relationship to existing Trellis records

Related records:

- `.trellis/tasks/05-12-05-12-zero-user-product-critique/prd.md`
- `.trellis/tasks/05-12-05-12-promoter-growth-critique/prd.md`
- `.trellis/tasks/05-12-05-12-product-staff-doa-critique/prd.md`
- `.trellis/tasks/05-12-05-12-human-feedback-tavern-affordance/prd.md`

This developer critique adds the engineering/onboarding dimension to the same broader issue: **internal output is outpacing validated user value.**

## Out of Scope

- No code changes in this record.
- No immediate deletion of docs/tests/tasks.
- No refactor started without a scoped implementation PRD.
- No claim that all Trellis/process/test assets are useless.

## Status

Recorded as incoming developer critique. Completed as feedback capture.
