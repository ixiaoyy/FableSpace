# Feedback: NPC reply feels too robotic

## Source

真实体验者反馈，记录时间：2026-05-12。

用户原话：

> [皱眉]我不喜欢回话的感觉  
> 人机感太重

## Feedback Summary

这条反馈不是在说“页面不好看”，而是在说 FableMap 的核心商品——**NPC 回话体验**——没有过关。用户已经进入到最关键的交互层，但得到的主观感受是：不像一个在酒馆里被 NPC 接待和回应，而像在和一个机器模板对话。

## Product Diagnosis

### Primary problem

**NPC response naturalness is failing the human-feel test.**

用户没有抱怨概念、地图、创建流程或按钮文案，而是直接皱眉指出“回话的感觉”不喜欢。这意味着问题已经打到产品心脏：FableMap 的可沟通酒馆如果回话人机感重，就会变成一个包装精致但灵魂廉价的 AI 聊天壳。

### Possible causes to verify

以下是待验证假设，不能直接当作事实：

1. 回复过于模板化：开头/结尾像客服或系统提示，不像角色自然接话。
2. 角色口吻不稳定：NPC 设定、地点氛围、上一轮上下文没有自然融入。
3. 过度解释产品机制：回话可能在解释任务、状态、规则，而不是先回应人的情绪和话头。
4. 缺少短句、停顿、犹豫、动作描写等“人味”节奏。
5. fallback / degraded response 暴露得太明显，让用户感到“机器在糊弄”。
6. 首轮 greeting 与后续回复风格断裂：门口像角色，进入聊天后像模型。
7. 等待/typing/渐进反馈不足，导致即使文本尚可，整体体感仍然像机器输出。

## Why this matters

FableMap 的当前主链路是：真实坐标 → 空间 → NPC 对话 → 记忆 → 回访。这里的反馈击中的不是边缘功能，而是主链路的转化点。

如果 NPC 回话被真实用户判定为“人机感太重”，那么：

- 真实坐标锚点无法补救聊天体验；
- 酒馆门口仪式只能改善第一眼，不能改善第二分钟；
- 记忆/writeback 没有机会被感知，因为用户会先流失；
- 店主配置和 Token 成本更难成立；
- 与 SillyTavern/Character.AI 等已有产品相比没有说服力。

## Related previous critique

This feedback reinforces risks already recorded in:

- `.trellis/tasks/05-12-05-12-visitor-first-use-brutal-critique/prd.md`
- `.trellis/tasks/05-12-05-12-human-feedback-tavern-affordance/prd.md`
- `.trellis/tasks/05-12-05-12-zero-user-product-critique/prd.md`
- `.trellis/tasks/05-12-05-12-product-staff-doa-critique/prd.md`
- `.trellis/tasks/05-12-05-12-tavern-doorway-ritual-mvp/prd.md`

The earlier records focused on first impression, doorway ritual, map value, owner ROI, and cold start. This record adds a deeper warning: **even if the user reaches chat, the NPC reply itself may not feel alive.**

## Follow-up investigation requirements

Before implementing changes, a follow-up task should collect and compare real conversation evidence:

1. Capture at least 3 real user chat transcripts or screenshots where “人机感” appears.
2. Mark which NPC / tavern / model / fallback path produced the reply.
3. Separate LLM quality from product wrapper issues:
   - model output quality;
   - prompt/system prompt quality;
   - character card quality;
   - world info injection;
   - fallback/degraded response;
   - UI waiting/typing behavior.
4. Identify whether the issue is first reply, second-turn continuity, long reply style, or generic fallback.
5. Compare against one manually rewritten “more human” target reply for the same input.

## Candidate follow-up tasks

1. **NPC Reply Human-Feel Audit**
   - Collect real transcripts and score replies on human-feel, role consistency, context use, emotional uptake, and mechanical phrasing.

2. **NPC Reply Style Contract**
   - Define project-level prompt/output rules for natural NPC speech: fewer meta explanations, stronger situational response, shorter first acknowledgement, role-consistent action beats.

3. **Fallback Response De-robotization**
   - If degraded/fallback replies are the culprit, rewrite fallback to sound like a constrained in-character response rather than system failure.

4. **Chat Waiting / Typing Experience MVP**
   - Add typing/thinking/interruption affordances if user-perceived “machine feel” comes partly from output timing.

5. **Human Rewritten Golden Set**
   - Create a small set of user input → expected humanlike NPC response examples for regression testing.

## Acceptance Criteria for a follow-up implementation

- [ ] A sampled first-time user can identify the NPC’s character/personality from the reply alone.
- [ ] Reply starts by responding to the user’s actual intent/emotion, not by dumping rules or feature explanations.
- [ ] Fallback/degraded replies do not expose “template bot” wording.
- [ ] At least one regression test or golden fixture protects the improved response style.
- [ ] If UI timing is changed, desktop and mobile chat screenshots/report are recorded.

## Out of scope for this feedback record

- No code changes in this record.
- No prompt/schema/API changes yet.
- No claim that all NPC replies are bad; this records one real user signal that needs evidence-based reproduction.
- No abandonment of map anchoring, owner sovereignty, token boundary, or SillyTavern compatibility.

## Status

Recorded as real human chat-quality feedback. Needs a focused audit / implementation task if accepted.
