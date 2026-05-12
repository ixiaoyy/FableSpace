# Feedback: product staff DOA critique

## Source

产品人员毒舌审计反馈，记录时间：2026-05-12。

原始评价主题：

> FableMap 毒舌审计报告：为什么你的项目活不过 24 小时？
> Verdict: DEAD ON ARRIVAL（出生即夭折）

## Feedback Summary

该反馈从产品/商业/信任/定位角度给出极端负面判断：当前 FableMap 可能因为店主代付 Token、地图摩擦、定位三不象、SillyTavern 换壳感、API Key 信任鸿沟、单机式记忆无社会价值等问题，在真实市场里无法启动。

这条反馈与此前记录的“0 用户产品批判”“宣传员增长批判”“真人第一印象反馈”高度一致，但更聚焦商业模型与信任风险。

## Core Critiques

### 1. “店主自付 Token”被理解为代付慈善 / 冤大头模型

批评认为：让店主自掏 API Key 和 Token 成本，再允许陌生访客消耗，是一个自相矛盾的财务逻辑。

预期失败路径：

- 没人愿意当店主 → 地图空白；
- 店主设置密码/私密 → 游客进不去；
- 开放空间越多，店主越焦虑成本 → 活跃和留存无法形成。

产品风险：**Owner ROI 不成立，公开空间供给不足。**

### 2. 地图可能是交互累赘，而不是价值

批评认为：用户想聊天时，地图寻宝式入口增加摩擦。如果真实坐标不让 NPC/内容/记忆产生不可替代性，地图就是“为了真实而真实”。

产品风险：**真实锚点没有被用户感知为魔法，而被感知为负担。**

### 3. 定位像“三不象”

批评指出：FableMap 既不做游戏爽感，也不做传统地图工具，也禁止访客社交，于是可能剥离了用户依赖和快感来源。

产品风险：**内部边界清晰，但外部品类心智不清晰。**

Important constraint note:

- 该反馈建议“做成地理社交游戏、抢地盘、互动”等方向，与当前 `docs/WHAT_NOT_TO_BUILD.md` 中“不做访客社交 / 不做战斗等级装备 / 不做传统地图 App”的硬约束存在冲突。
- 因此该建议不能直接执行，只能作为“当前定位缺少爽感/依赖感”的风险信号。

### 4. SillyTavern 劣质换壳风险

批评认为：兼容 SillyTavern 对重度用户不是护城河。重度用户可能更愿意使用本地 SillyTavern，因为插件更多、隐私更强、可控性更高。

产品风险：**FableMap 必须证明“真实地点 + 公开入口 + 回访记忆 + 主人空间”产生 SillyTavern 没有的价值。**

### 5. API Key 信任鸿沟

批评认为：让用户在陌生网页填写 OpenAI/API Key 会触发强烈安全恐惧。

产品风险：**Owner LLM setup 不应成为首次体验前置条件；需要默认可试玩/可验证的公共 demo 路径。**

### 6. 记忆可能变成单向赛博孤独

批评认为：NPC 记住用户但没有外部事件流、社会化价值或可分享结果时，记忆像锁在抽屉里的废纸。

产品风险：**Memory/writeback 必须转化为用户可感知的回访变化、故事进展、可分享片段或 owner feedback，而不仅是系统内部状态。**

## PM Final Verdict Recorded

**Verdict: DEAD ON ARRIVAL, if current model ships without solving first-use, trust, owner ROI, and visible location value.**

This is not accepted as a final project decision; it is recorded as an adversarial product-risk signal.

## Actionable Risk Extraction

### Immediate product questions

1. Why would a stranger trust this product before entering any API Key?
2. Why would a visitor choose map-based tavern chat over normal AI chat?
3. Why would an owner pay for strangers without clear return?
4. Why would SillyTavern users migrate or cross-post here?
5. What does memory visibly change for a returning visitor?
6. What shareable artifact does one chat session produce?

### Recommended follow-up actions within current constraints

1. **One-click no-key demo path**
   - First visitor should not see API Key, token setup, or fallback language.
   - Public demo/公益酒馆 should feel like the main path, not degraded mode.

2. **Owner cost cap and ROI surface**
   - Show budget limit, auto-close, cheap model/default demo options.
   - Show what the owner receives: visitor summaries, reusable content, feedback, share clips, memory changes.

3. **Location value proof**
   - Every demo tavern must prove why it belongs at that coordinate.
   - If moving the tavern to a random coordinate changes nothing, it fails.

4. **Trust-first LLM setup**
   - Avoid requiring personal API Key before value is proven.
   - If API Key input exists, explain storage boundary, visibility, and local/demo alternatives.

5. **Memory-to-wow conversion**
   - Memory should surface as visible return greeting, changed NPC behavior, episode summary, or shareable recap.

## Suggestions that conflict with current constraints

The critique suggests either:

- cutting map logic by 70%; or
- becoming a real geosocial game with territory, player interaction, and stronger social/game loops.

These conflict with current project constraints unless the owner explicitly changes strategy:

- Real coordinate anchoring is currently a core principle.
- Unbounded visitor social is explicitly not allowed.
- Combat/level/equipment/ranking game loops are explicitly not allowed.
- Traditional map app features are explicitly not allowed.

Therefore, the safe extraction is not “immediately pivot to geosocial game,” but:

> FableMap must add stronger first-use payoff, trust, and owner ROI while staying within current boundaries, or else the boundaries will feel like missing features rather than disciplined focus.

## Relationship to existing Trellis records

Related records:

- `.trellis/tasks/05-12-05-12-zero-user-product-critique/prd.md`
- `.trellis/tasks/05-12-05-12-promoter-growth-critique/prd.md`
- `.trellis/tasks/05-12-05-12-human-feedback-tavern-affordance/prd.md`
- `.trellis/tasks/05-12-05-12-map-anchored-space-ugc-critique-brainstorm/prd.md`

This record should inform any follow-up PRD around:

- one-click demo tavern;
- first-use no-key path;
- owner ROI/cost cap;
- visible memory payoff;
- external positioning against SillyTavern.

## Out of Scope

- No code changes in this record.
- No strategy pivot is approved by this record.
- No removal of map anchoring, token owner model, or current hard constraints without explicit owner decision.
- No implementation of forbidden social/game/traditional-map features.

## Status

Recorded as product staff critique. Completed as feedback capture.
