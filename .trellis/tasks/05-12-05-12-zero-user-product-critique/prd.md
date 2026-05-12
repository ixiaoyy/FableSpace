# Brainstorm: brutal PM critique of zero-user FableMap

## Goal

Record a hostile product-management critique explaining why, under the assumption of zero willing users and all negative feedback, FableMap's current positioning and first-session experience fail to convert curiosity into usage.

## Source of truth

- User asked for a sharp and malicious PM-style critique of the current project: why zero people would want to try it and why all reviews would be negative.
- Product docs currently position FableMap around real-coordinate space UGC, owner sovereignty, AI NPCs, owner-paid tokens, memory/writeback, and revisit loops.
- Hard constraints remain: real coordinates, owner-confirmed content, no platform token marketplace, no unbounded visitor social, no traditional map app, no RPG combat/level/equipment.

## Verdict

**FAIL — product narrative failure, not merely implementation failure.**

The core issue is that FableMap risks wrapping a simple AI chat experience in a concept maze: map, space, owner, coordinate, NPC, token, memory, sovereignty. Users are not refusing the future; they are refusing to take a product-philosophy exam before talking to an AI character.

## Key product failures

### 1. “Space UGC” reads as “chatroom pasted onto a map”

If coordinates do not materially change the experience, the map is decoration rather than a moat. The lethal one-line review is:

> This is just SillyTavern with a map skin.

### 2. Owner sovereignty can feel like owner punishment

The owner currently seems responsible for creation, NPC configuration, LLM setup, token cost, visitor reception, and maintenance. If the owner does not clearly gain status, audience, memory, feedback, or reusable creative assets, the model feels like paying to let strangers consume a bot.

### 3. Visitor first minute is high-friction and socially awkward

A blank AI input box creates cold start, not freedom. If the visitor only sees a space name, NPC list, and chat box, the likely first message is “在吗”, followed by churn.

### 4. Real coordinates currently risk feeling like restriction, not magic

Coordinates must create content difference: place memory, local atmosphere, an NPC that belongs there, return reasons. Otherwise users ask why they are constrained by geography inside a virtual AI experience.

### 5. The product has too many internal concepts before one clear payoff

Space, Tavern, owner, explorer, NPC, SillyTavern card, world book, token, memory, revisit, relationship, map anchor — these may be architecturally useful, but they delay the user’s answer to: “Is this fun right now?”

### 6. AI NPCs alone are no longer scarce

A chat-capable AI role is not enough. FableMap must prove the role is made distinctive by location, owner authorship, and revisit memory.

### 7. UGC cold start is severe

The project asks creators to do high-effort setup before there is visitor demand, while visitors have little to do before creators populate the map. This is a two-sided cold start with unusually high creator cost.

## Predicted negative review themes

- “I don’t understand what this is.”
- “Too much setup before the fun.”
- “The map does not matter.”
- “The NPC/location connection is weak.”
- “Feels like a half-built prototype with too many concepts.”
- “The owner is the sucker paying token costs.”

## What to stop saying externally

Avoid leading with internal architecture language:

- “空间 UGC 平台”
- “每个人都可以在地图上开一间空间”
- “AI NPC + 真实坐标”
- “主人主权”
- “Token 自付”

These may be internal principles, but users may hear them as more work and more cost.

## Better external positioning candidates

- “在真实地点，留下一个会回应、会记住、会等待你回来的角色入口。”
- “把某个真实地点，变成一段可以反复进入的 AI 记忆场景。”

## Recommended rescue strategy

### 1. Seed 10 official high-quality example spaces before expecting UGC

Do not wait for creators to populate an empty map. Build compelling examples where the place and NPC are inseparable:

- 校门口传达室
- 深夜便利店
- 雨天公交站
- 旧书店
- 医院夜班护士站
- 小区门卫室
- 天桥底下算命摊
- 商场闭店广播室
- 海边观景台
- 失物招领处

### 2. Hide token pain from the first visitor experience

Early visitor experience should not expose token anxiety. Demo/public-welfare/system fallback spaces may need free/low-cost bounded trial behavior. Owner cost must have caps and clear return value before being foregrounded.

### 3. Turn owner creation into a five-question fill-in flow

Instead of asking owners to build from scratch, ask:

1. Why must this space be here?
2. Who is the first NPC?
3. What should visitors ask first?
4. What secret or memory lives here?
5. What changes when someone comes back?

### 4. Every space needs a shareable one-line hook

Good: “在你高中门口，那个永远没下班的门卫还记得你。”

Bad: “真实坐标上的 AI NPC 空间。”

## Current related mitigation already implemented

- `05-12-05-12-map-anchored-space-ugc-critique-brainstorm` implemented a frontend-only **Visitor First Minute + Location Anchor Proof** MVP.
- That mitigates visitor cold-start partially by adding `Why here` and `Try this first` surfaces.
- It does not yet solve owner ROI, official seed content, or external positioning.

## Requirements for a follow-up PRD

- Define a first public demo set of 5-10 seeded spaces.
- Define the owner creation five-question flow and how it maps to existing fields without schema churn where possible.
- Define a visitor success metric for first 60 seconds: enters, clicks suggested prompt, sends message, reads response, or bookmarks/returns.
- Define owner ROI surfaces: what did visitors leave, what memory changed, what can be shared.

## Out of scope

- Removing real coordinate requirement.
- Adding token payment/recharge/settlement.
- Adding public visitor social graph, feed, friends, DMs, ranking, combat, levels, or traditional map navigation.
- Platform auto-publishing owner content without confirmation.

## Status

This task records critique and product risk. It is not an implementation task yet.
