# Feedback: promoter growth critique of FableMap

## Source

宣传员 / 增长视角反馈，记录时间：2026-05-12。

用户提供了一段完整诊断，核心观点：FableMap 过去一段时间更像工程体系自我循环，而不是面向真实用户增长的产品开发。

## Feedback Summary

反馈认为当前 FableMap 的主要失败不在技术栈或工程质量，而在于：

- 战略迷失：不清楚是在做用户产品，还是在做引擎/测试体系/文档体系。
- 真实用户增长动作缺失：变更文档、测试脚本、加固很多，但没有外部用户验证。
- 体验门槛高：LLM/API Key/公益酒馆/fallback 让试玩不像主线。
- 入口模糊：`/create`、`/owner` 等路径无法让普通用户自然理解下一步。
- 缺少“哇”时刻：没有可立刻传播的示范截图、NPC 对话或 10 秒 Demo。
- 伪痛点过多：状态卡、关系图谱、世界书等内部工程需求压过了普通用户的核心诉求。
- 缺少数据：没有 DAU/MAU/转化漏斗/A-B 测试/真实用户反馈机制。

## Brutal Diagnosis

> FableMap has a strong internal engineering system but a weak external acquisition loop.

The product may be over-optimized for correctness, protocol stability, and AI-assisted development workflow before proving that a stranger wants to click, chat, and share.

## Key Problems Recorded

### 1. Strategic drift: product or engine?

The project has accumulated many docs, scripts, specs, internal validations, and “hardening” tasks. From a growth perspective, this can look like a research/infra project rather than a consumer-facing product.

### 2. Engineering output is not user output

Large numbers of test scripts and internal contract checks do not prove:

- users understand the product;
- users want to enter a tavern;
- users enjoy the first chat;
- users share the experience;
- owners want to create spaces.

### 3. Trial path is not treated as the main path

If users must understand LLM configuration, API keys, public-welfare/fallback modes, or owner token responsibility before trying the product, the first-use path is broken.

### 4. Entry naming is unclear for normal users

Routes and concepts such as `/create`, `/owner`, “店主”, “空间”, “公益酒馆”, “fallback” may make sense internally but do not automatically communicate what a new visitor should do first.

### 5. No shareable wow moment

The product currently lacks a clear artifact that a promoter can show in 10 seconds and make someone say “I want to try this.”

Potential missing assets:

- one great public tavern;
- one great NPC greeting;
- one surprising conversation clip;
- one mobile-first demo video;
- one shareable hook sentence.

### 6. Possible pseudo-problems

Features like state-card prompt injection, relationship graph diffusion, WorldBook hit testing, and group-chat continuity may be legitimate later, but they are not the first thing a normal user asks for. They risk being engineering-driven complexity before product-market signal.

### 7. No real growth telemetry

The critique says there is no visible evidence of:

- DAU / MAU;
- landing → enter conversion;
- enter → first message conversion;
- first message → second message retention;
- share rate;
- owner create conversion;
- A/B tests;
- external user feedback collection.

## Recommended Immediate Actions

### Stop temporarily

- New feature expansion.
- More internal-only test-script proliferation.
- More docs/spec growth unless tied to a real user validation loop.

### Start immediately

1. **3-user live test**
   - Ask 3 real people to use the current version.
   - Record first sentence, first click, confusion point, and whether they send a message.

2. **One-click public demo tavern**
   - Make public-welfare/demo tavern feel like the main path, not fallback.
   - No API key or owner setup before first visitor chat.

3. **10-second demo video**
   - Send to 5 people.
   - Ask only two questions:
     - “这是啥？”
     - “你想试试吗？”

4. **Collapse complexity**
   - For first-time users, expose only:
     - map / tavern list;
     - public demo tavern;
     - chat with NPC;
     - share.
   - Hide owner tools, prompt systems, state cards, relationship graphs, token details until needed.

## Proposed Growth MVP Metrics

A follow-up growth validation task should define and measure:

- Landing page → demo tavern click-through.
- Demo tavern → first message sent.
- First message → second user message.
- First chat → share/copy link.
- First visitor → return within 24h/7d.
- Visitor → owner creation intent.

## Product Principle Extracted

> A passing build and 60 tests do not equal a product. A product starts when a stranger understands it, tries it, and wants to show someone else.

## Relationship to other Trellis feedback

This feedback strengthens the risks already recorded in:

- `.trellis/tasks/05-12-05-12-zero-user-product-critique/prd.md`
- `.trellis/tasks/05-12-05-12-human-feedback-tavern-affordance/prd.md`
- `.trellis/tasks/05-12-05-12-map-anchored-space-ugc-critique-brainstorm/prd.md`

## Follow-up PRD candidates

1. **One-click Demo Tavern MVP**
   - Goal: a visitor can chat in one click with no configuration.

2. **First 3 Users Live Test Protocol**
   - Goal: collect real confusion points, first action, first words, and drop-off reasons.

3. **10-second Share Demo Asset**
   - Goal: produce a short video/GIF and test whether people understand/want to try.

4. **First-use Complexity Collapse**
   - Goal: hide advanced/internal features from first-time visitor path.

## Out of scope for this feedback record

- No code changes.
- No deletion of tests/docs in this record.
- No change to schema/API/product constraints.
- No claim that all tests/docs are useless; the critique is about priority and growth sequencing.

## Status

Recorded as promoter/growth feedback. Needs follow-up implementation or user-test task if accepted.
