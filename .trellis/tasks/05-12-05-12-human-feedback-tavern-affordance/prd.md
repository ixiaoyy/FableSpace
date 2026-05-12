# Feedback: tavern communication affordance unclear

## Source

真人体验反馈，记录时间：2026-05-12。

用户原话：

> 但是我觉得给我第一感觉，我觉得并没有突出这是个可以沟通的酒馆
> 就我一进来看，我感觉是一个赛博朋克风的页面

## Feedback Summary

当前第一屏/第一印象没有让用户立即理解：这是一个“可以进入、可以和 NPC 沟通、像酒馆一样被接待”的产品体验。视觉上更先传达的是“赛博朋克风页面”，而不是“可沟通的酒馆 / 空间入口”。

## Product Diagnosis

### Primary problem

**Communication affordance is weak.**

用户没有先感受到：

- 这里有人 / NPC 在等你；
- 你可以推门进店；
- 你可以开口说话；
- 这是酒馆/空间，而不是单纯展示页或视觉概念页。

### Secondary problem

**Visual style is overpowering product meaning.**

赛博朋克视觉风格抢占了第一认知，导致用户先识别“风格”，后识别“功能”。这会削弱 FableMap 的核心主张：真实地点上的可进入、可对话、可回访空间。

## Why this matters

如果用户第一眼只觉得“这是一个赛博朋克页面”，而不是“这是一个能进去聊天的酒馆”，那么：

- 地图锚点无法转化为入店动机；
- NPC 沟通能力被隐藏；
- 酒馆隐喻没有建立；
- 用户不会自然尝试输入/对话；
- `Why here / Try this first` 也可能被看成装饰文案，而不是行动入口。

## Related previous critique

This feedback reinforces the risk recorded in:

- `.trellis/tasks/05-12-05-12-zero-user-product-critique/prd.md`
- `.trellis/tasks/05-12-05-12-map-anchored-space-ugc-critique-brainstorm/prd.md`

The earlier anti-bullshit MVP added first-minute guidance, but this real feedback says the **visual hierarchy still may not foreground “communicable tavern” strongly enough**.

## Requirements for follow-up UX work

A follow-up implementation should make the first impression say “可沟通的酒馆” before “赛博朋克风格”。 Candidate requirements:

1. First screen must show a clear tavern/doorway/chat affordance:
   - “推门进店” / “和 NPC 打招呼” / “今晚谁在吧台” / “先问一句” must be visually primary.
2. Hero/card language should foreground communication:
   - Not just “探索坐标” or “发现空间”，but “这里有人能回应你”。
3. Tavern card / entry card should show a visible NPC presence signal:
   - avatar / name / first greeting / “正在接待”。
4. The chat action should be perceived before abstract platform concepts:
   - reduce first-screen emphasis on purely cyberpunk decoration, telemetry, radar, generic visual atmosphere.
5. Use visual metaphors closer to tavern/door/bar/counter/lamp/host, not only sci-fi dashboard/radar.

## Acceptance Criteria for a follow-up task

- [ ] A first-time user can tell within 3 seconds that the page leads to an interactive NPC conversation.
- [ ] Primary CTA uses tavern/chat language, not only generic “探索/进入”.
- [ ] At least one visible NPC/persona/greeting appears before or alongside the CTA.
- [ ] Discover/entry UI still preserves real-coordinate anchoring, but it does not bury the conversation affordance.
- [ ] Desktop and mobile screenshots show the communication affordance without requiring scrolling.

## Out of scope for this feedback record

- No code changes in this record.
- No abandonment of the cyberpunk visual style by default; the issue is hierarchy, not necessarily the style itself.
- No change to schema/API/token/social boundaries.

## Status

Recorded as human UX feedback. Needs follow-up implementation task if accepted.
