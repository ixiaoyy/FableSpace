# Onsite Visitor Brutal Audit Issues

## Goal
Record a fresh, evidence-backed visitor-path critique from an actual local browser run so the next implementation task does not start from vague taste feedback.

## Source of truth
- `README.md`: FableMap is a map-anchored space UGC platform; mainline is coordinates/location → real map → tavern discovery → enter tavern → AI NPC chat → memory/writeback → revisit feedback.
- `docs/PRODUCT_BRIEF.md`: real anchor, owner sovereignty, AI NPC conversation, visitor discovery/entry/chat are the core experience.
- `docs/FABLEMAP_TAVERN_PLATFORM.md`: explorer scenario expects map markers, tavern intro, character list, direct entry, NPC chat, and remembered return visits.
- `docs/WHAT_NOT_TO_BUILD.md`: do not drift into generic social network, traditional map app, or “more game-like” systems that dilute the space/NPC core.
- `.trellis/spec/frontend/index.md`: frontend must preserve real map/coordinate anchoring, owner-authored tavern content, and mobile/narrow-screen usability.

## Fresh evidence from 2026-05-12 audit
- Local backend started with: `$env:PYTHONPATH = "$PWD\backend\src"; py -3 -m fablemap_api api`.
- Browser path tested: `http://127.0.0.1:8950/` → `/discover` → `/tavern/pw_lantern_helpdesk`.
- Build check run after audit: `npm --prefix .\frontend run build` → passed.
- Browser console on runtime pages reported repeated React minified errors `#418` and `#423` after reload.
- Homepage/discover DOM contained visible `SoulLink`, `ONLINE COORDINATE NETWORK`, `ONLINE ENTITIES`, `信号活动`, `数字坐标网络` language.
- Tavern page displayed the real coordinate `35.65810, 139.70160`, `3 NPC`, and “公益 LLM”, but no actual map surface in the tested tavern flow.
- Visitor message sent in tavern: `我第一次来，这里有什么值得我留下？`
- Observed NPC reply: `小舟点了点头，似乎在听你说话，但暂时没有更多回复。`
- Immediately after the fallback reply, UI still displayed progress/continuity labels: `本轮有推进`, `记住了 1 件事`, `关系进入「陌生人」`.

## Problems to track
1. **Brand/product metaphor drift**: visible shell is `SoulLink` / signal-network themed while the product contract is `FableMap` / real-map anchored tavern spaces. This makes the first impression feel like a generic cyber social shell rather than a map UGC platform.
2. **Real-map promise is too weak in the tested visitor path**: the tavern exposes coordinates, but the experience did not feel like “map browsing → place discovery”. It felt like cards and metadata, not spatial exploration.
3. **Discovery page decision overload**: filters, emotional tags, signal state, timeline, feed, online entities, echoes, footprint, and world stats compete before the visitor understands why any tavern is worth entering.
4. **First-minute copy leaks internal acceptance language**: phrases such as “这里的第一分钟要从……开始，而不是泛泛开聊” read like implementation/spec guidance rather than visitor-facing immersion.
5. **Tavern interior exposes workbench mechanics too early**: “公共频道”, “Channels”, “Shift+Enter”, intent chips, identity selector, NPC target chips, and helper accordions appear before the space delivers a strong roleplay hook.
6. **NPC fallback is product-breaking**: the core AI NPC proposition collapses when the first meaningful visitor question gets a generic non-answer.
7. **Memory/relationship feedback is not trustworthy when the NPC did not answer**: showing “本轮有推进 / 记住了 N 件事 / 关系进入陌生人” after a non-answer makes memory feel fake or over-eager.
8. **Runtime hydration errors need root-cause work**: build passes, but the browser console repeatedly reports React `#418` / `#423`, so build success is not enough evidence of runtime quality.

## Acceptance criteria for future fix task(s)
- [ ] First visitor screen consistently says FableMap, not SoulLink, unless SoulLink is explicitly repositioned and documented as a sub-brand.
- [ ] Discovery or entry flow visibly proves the tavern is anchored to a real map/location, not only a coordinate label.
- [ ] Discovery page helps a first-time visitor pick one tavern in under 10 seconds without reading internal jargon.
- [ ] `Why here` / first-minute copy is rewritten as visitor-facing invitation, not PRD text.
- [ ] Tavern first screen prioritizes space hook + one clear NPC action over workbench controls.
- [ ] If LLM/fallback cannot produce a meaningful NPC response, UI must not claim “progress” or “memory” as if roleplay advanced.
- [ ] Hydration errors are reproduced in a focused runtime check and either fixed or recorded with a root-cause blocker.

## Non-goals / constraints
- Do not add platform-generated tavern content that bypasses owner confirmation.
- Do not solve this by adding generic social features, rankings, combat/levels/equipment, or traditional map-app features.
- Do not redesign the whole UI in one sweep; split into scoped follow-up tasks after product decision.
- Do not treat `npm build` alone as visual/runtime acceptance.

## Suggested follow-up slices
1. Brand/metaphor cleanup: FableMap vs SoulLink decision and shell copy alignment.
2. Visitor-first discovery reduction: fewer competing panels, stronger decision signal per tavern.
3. Tavern doorway ritual MVP: one immersive entry beat before exposing chat workbench controls.
4. NPC fallback/memory truthfulness: no progress/memory badge on non-answer fallback.
5. Hydration error reproduction: focused browser/runtime check for React `#418` / `#423`.

## Done / Not Done
- Done: Issue recorded with fresh browser-path evidence and build result.
- Done: 5 child tasks created (2026-05-13) covering all 5 follow-up slices:
  - `05-13-brand-fablemap-shell-consistency` — P1: replace SoulLink shell with FableMap metaphors
  - `05-13-tavern-doorway-ritual-mvp` — P1: one immersive beat before workbench controls
  - `05-13-npc-fallback-memory-truthfulness` — P1: no progress badge on non-answer fallback
  - `05-13-hydration-errors-reproduce` — P1: reproduce and fix React #418/#423
  - `05-13-visitor-first-discovery-reduction` — P2: fewer panels, stronger tavern signal
- Not done: No code, UI, API, schema, or asset changes in this task.
- Risk: Mobile/narrow-screen behavior was not re-audited in this pass; needs separate evidence before mobile-specific fixes.
