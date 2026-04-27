# brainstorm: visitor hero dream tavern

## Goal

Explore a tavern experience where the visitor can play the hero they imagined as a child: a sincere, slightly embarrassing, long-lost hero dream that adulthood made them put away. The tavern should help the visitor recover that feeling through roleplay, NPC interaction, and owner-authored atmosphere, without turning FableMap into a generic RPG or platform-generated story engine.

## What I Already Know

* The user wants a Trellis brainstorm, not immediate implementation.
* The core fantasy is emotional: visitors grew up, felt embarrassed by old heroic imagination, lost the dream, and hope to find it again in a tavern.
* The visitor is the hero role, not merely watching an NPC hero.
* The experience should still fit FableMap's cyber tavern model: real-coordinate tavern, owner-authored content, AI NPCs, conversation, memory/writeback, and revisit feedback.
* Existing project capability already supports tavern-level light text play through `gameplay_definitions`.
* Existing `layout_style` includes `quest-play`, which can visually host quest/commission style experiences.
* Existing visitor state, affinity, memory atoms, and revisit cues can remember a visitor's "hero name", "oath", "lost dream", and later welcome them back without adding a social graph.
* Existing tavern templates include `街角冒险者公会`, which already uses safe, family-friendly quests, identity rewards, and tavern treatment rather than combat/level/equipment systems.

## Assumptions (Temporary)

* This is best framed as a new tavern/play experience pattern rather than a platform-wide combat or progression system.
* The MVP can use lightweight roleplay prompts, NPC stance, and memory cues before adding any new schema.
* The tone should protect sincerity: heroic without becoming childish parody, power fantasy without combat/level/equipment systems.
* The best first implementation is likely either an owner-authored template or a default public tavern, not a global visitor role system.

## Open Questions

* None for brainstorm. Waiting for final confirmation before implementation/design.

## Requirements (Evolving)

* Visitor can enter a tavern with a clear emotional invitation to recover a lost hero dream.
* Visitor roleplay should make them feel like the protagonist of their own remembered fantasy.
* The design must not violate the project boundary against combat, levels, equipment, platform-generated tavern content, or unanchored fantasy spaces.
* The experience should be safe, low-pressure, and sincere: "you may play again" rather than "you must win".
* NPCs should help the visitor name, repair, and rehearse their hero self instead of judging the visitor's real life.
* MVP will be a complete demonstration tavern, not a generic reusable pack or platform-level hero profile.
* The tavern should include owner-authored scene prompt, NPCs, WorldInfo, and 2-3 published light gameplays around recovering the visitor's childhood hero dream.
* The tavern's first real-world anchor is an old toy/model shop: plastic swords, hero cards, stickers, faded posters, model kits, old display cabinets, and childhood "hero equipment" that adulthood made embarrassing.
* The placement suggestion should fit toy stores, model shops, hobby shops, school-adjacent stationery/toy shops, small shopping streets, or community retail corners.
* The first hero tone is "ordinary small-courage": the visitor does not need to save the world, fight enemies, or perform grand heroics. The tavern helps them recover the ability to do one brave, kind, honest, or protective thing.
* Childhood hero props can appear as emotional anchors, but the actual tasks should land in adult-acceptable small courage, such as saying a true wish, protecting a small boundary, returning to a neglected dream, or encouraging someone without embarrassment.
* The first NPC cast is "model shop owner + after-school child shadow":
  * The model shop owner keeps the experience grounded, gently restores broken toys/models, and treats the visitor's old dream seriously without over-romanticizing it.
  * The after-school child shadow is not another player and not a ghost-horror character; it is a poetic NPC echo of the visitor's younger self, appearing around the display cabinet, sticker drawer, plastic swords, or old hero cards.
  * The contrast should create a dialogue between adult embarrassment and childhood sincerity.
* The tavern name is `放学后英雄补给站`.
* The model shop owner is `阿衡`.
* The child-shadow NPC is `纸剑`.
* The first-session gameplay loop is `找回英雄名`:
  * `纸剑` asks the visitor what their childhood hero was called, or helps them invent/recover a name if they feel embarrassed.
  * `阿衡` treats the answer as real enough to write onto an old hero card, not as a joke.
  * The loop ends with one ordinary-courage prompt: "use this name to do one small brave thing", not combat or victory.
* After the first session, the tavern should primarily remember the visitor's recovered `英雄名`.
* `英雄誓言` is not required in the first-session MVP; it can appear later as an optional follow-up or second gameplay.
* The demonstration tavern should include 3 published gameplays:
  * `找回英雄名`: first-session anchor; recover or create the childhood hero name and write it onto an old hero card.
  * `修补旧道具`: choose a worn childhood prop, such as a cracked plastic sword, faded cape, old badge, or broken model part, and translate it into one ordinary courage.
  * `第一件小英雄委托`: complete one adult-acceptable small heroic action, such as saying an honest wish, protecting a small boundary, giving a kind message, or returning to a neglected dream.
* The primary success standard for first implementation is emotional hit: copy, NPCs, scene props, first messages, and gameplay text should clearly evoke recovering a hidden childhood hero dream.

## Acceptance Criteria (Evolving)

* [x] A concrete MVP scope is agreed before implementation.
* [x] The brainstorm identifies which existing product surfaces could host the experience.
* [x] The brainstorm records out-of-scope boundaries to avoid RPG feature creep.
* [x] The MVP can be implemented with owner-authored tavern content, current gameplay/session flow, and memory/revisit cues unless the user explicitly chooses a schema change.
* [x] The demonstration tavern has a clear name, real-world placement suggestion, NPC cast, and first-session loop.
* [x] The demonstration tavern's atmosphere clearly reads as an old toy/model shop rather than a generic fantasy guild.
* [x] The hero fantasy is expressed as ordinary courage and gentle self-recovery, not world-saving combat.
* [x] The two NPCs have distinct roles: one repairs/grounds, one remembers/invites.
* [x] First-session loop lets the visitor recover or create a childhood hero name and attach it to a concrete old hero card.
* [x] Revisit copy and NPC behavior can refer back to the recovered hero name when existing memory/revisit behavior captures it.
* [x] The tavern exposes 3 published gameplays: hero name, old prop repair, and first small hero commission.
* [x] The NPC first messages, tavern description, scene prompt, WorldInfo, and gameplay copy read as a coherent "recover the old hero dream" experience rather than a generic quest board.
* [x] The experience stays sincere without becoming childish parody, self-help lecture, or RPG combat progression.

## Definition Of Done (Team Quality Bar)

* Tests added/updated if code is implemented later.
* Frontend build/type checks run for UI changes later.
* Backend compile/tests run for API or data changes later.
* Docs/notes updated if behavior or product boundaries change.
* Rollout/rollback considered if the implementation touches shared tavern/session flows.

## Implementation Status

Completed on 2026-04-28.

* Seeded `放学后英雄补给站` as a default public-welfare tavern with `quest-play` layout.
* Added NPCs `阿衡` and `纸剑`, project-local PNG portrait assets, WorldInfo, bookmarks, and three published gameplays.
* Added deterministic rules-backend responses for the hero-dream tavern in both compatibility and native runtime service paths.
* Added focused regression coverage for discoverability, emotional content, NPC assets, gameplay publishing/progression, compatibility local rules response, and native `/api/v1` local rules response.
* Verified with backend compile, focused tests, full pytest, frontend build, and frontend script tests.

## Out Of Scope (Explicit)

* Platform-generated taverns, NPCs, or stories without owner confirmation.
* Combat systems, levels, equipment, rankings, or traditional RPG progression.
* A free-floating fantasy world that is not anchored to a real tavern/location.
* Visitor-to-visitor social mechanics.
* Diagnosing or "fixing" a visitor's real life; the tavern provides roleplay and gentle reflection, not therapy or coaching claims.

## Technical Notes

* Task created: `.trellis/tasks/04-28-04-28-visitor-hero-dream-tavern/`.
* Relevant existing docs/tasks inspected:
  * `docs/PRODUCT_BRIEF.md`: main loop is map discovery -> tavern entry -> NPC chat -> relationship memory -> revisit feedback.
  * `docs/FABLEMAP_TAVERN_PLATFORM.md`: owner-authored tavern content, AI as NPC engine, token borne by owner.
  * `docs/WHAT_NOT_TO_BUILD.md`: no combat/levels/equipment, no platform-auto-published tavern/NPC/story content, no unanchored free fantasy space, no visitor social network.
  * `.trellis/tasks/04-26-text-adventure-tavern/prd.md`: default public tavern can contain published text game `gameplay_definitions` without schema changes.
  * `.trellis/tasks/04-27-explorer-revisit-cue/prd.md`: frontend can show visitor_state-based revisit feedback.
  * `.trellis/tasks/04-27-tavern-layout-styles/prd.md`: `quest-play` layout exists for quest/play-heavy taverns.
  * `.trellis/tasks/04-27-affinity-system-mvp/prd.md`: affinity/relationship can influence NPC tone and unlocked topics.
  * `frontend/app/product/tavernPlayModes.js`: existing "冒险工会" mode uses local quest board, reputation tier, identity reward, and safe action prompts.
  * `frontend/app/product/tavernTemplates.js`: existing `街角冒险者公会` template is the closest prior art.

## Research Notes

### Constraints From The Project

* The tavern must remain anchored to real coordinates.
* Tavern content must remain owner-authored or owner-confirmed.
* AI can drive NPC conversation and structured text play, but should not become a platform story generator that publishes content by itself.
* Any "hero" mechanics must avoid combat, levels, equipment, rankings, and traditional RPG quest creep.
* Memory must be structured, visible, and privacy-aware if it persists beyond one session.

### Feasible Approaches

**Approach A: Hero-Dream Tavern Template / Default Tavern** (Recommended)

* How it works: create a tavern pattern such as "旧英雄梦酒馆" with owner-authored scene prompt, NPCs, WorldInfo, and 2-3 published light gameplays. Visitors can say what kind of hero they imagined as a child, receive a gentle "hero name/oath/first small quest", and the memory/revisit layer can remember that identity.
* Pros: fits current FableMap architecture; no schema/API change required; easy to demo; protects owner sovereignty; naturally works with `quest-play` layout.
* Cons: the hero identity is mostly content/prompt/memory-driven, not a first-class global product object.

**Approach B: Hero Recovery Gameplay Pack**

* How it works: add a reusable set of `gameplay_definitions` that any tavern owner can install: "找回披风", "命名旧誓言", "三分钟勇气委托". It focuses on structured sessions rather than a new tavern template.
* Pros: reusable across many taverns; lower content burden per tavern; can ride existing gameplay session APIs.
* Cons: less visually/brand emotionally distinctive unless paired with a tavern template; still needs owner packaging UX later.

**Approach C: Visitor Hero Profile**

* How it works: introduce a structured visitor-side hero profile for a tavern, e.g. hero name, old dream, oath, symbol, shame point, recovered courage. NPCs and revisit cues can use it directly.
* Pros: strongest continuity and personalization; better future feature base.
* Cons: schema/API/privacy work; higher risk; more likely to become platform-level RPG identity if not tightly scoped.

## Expansion Sweep

### Future Evolution

* Could evolve into a family of owner-authored "identity recovery" taverns: hero dream, musician dream, detective dream, inventor dream.
* Could later add a small structured "visitor role card" only if memory-only continuity feels too weak.

### Related Scenarios

* First MVP anchor: old toy/model shop.
* Later variants could use school gate, old bookshop, community center, arcade, library, or neighborhood square as real-world anchors.
* Can reuse tavern template import/export and default public tavern seeding patterns.

### Failure And Edge Cases

* Tone can become childish, cringe, or patronizing; NPC prompts need to defend sincerity and avoid mocking the visitor.
* Hero play can drift toward combat or rankings; every quest should be symbolic, social, observational, creative, or restorative.
* Some visitors may describe real harm, regret, or crisis; NPCs should keep boundaries and avoid therapy claims.
* The "ordinary hero" framing can become preachy self-help if overexplained; NPCs should stay concrete, scene-based, and playful enough to feel like a tavern experience.
* The child-shadow NPC must not imply supernatural danger, possession, or mental-health diagnosis; it should read as a safe roleplay device within the toy shop's atmosphere.

## Decision (ADR-lite)

**Context**: The brainstorm considered three implementation directions: a complete hero-dream tavern, a reusable gameplay pack, or a structured visitor hero profile.

**Decision**: Use Approach A for the MVP: build one complete demonstration tavern centered on visitors recovering their childhood hero dream.

**Consequences**: This keeps the work product-shaped and demoable while staying inside existing tavern, NPC, gameplay, memory, and `quest-play` layout capabilities. It also avoids early schema/API expansion. The trade-off is that "hero identity" is represented through tavern content and memories rather than a first-class global profile.

## Tavern Concept Draft

### Tavern

* Name: `放学后英雄补给站`
* Anchor: old toy/model shop
* Suggested placement: toy stores, model shops, hobby shops, school-adjacent stationery/toy shops, small shopping streets, community retail corners
* Layout fit: `quest-play`
* Core mood: ordinary small-courage, after-school nostalgia, sincere but not preachy

### NPC Cast

* `阿衡`: model shop owner. Repairs old models and broken toy parts; speaks like someone who has seen many children become adults and return with embarrassment. Grounds the scene and keeps tasks practical.
* `纸剑`: after-school child shadow. A safe poetic echo of childhood sincerity, appearing near old hero cards, sticker drawers, plastic swords, and display cabinets. Invites the visitor to remember what kind of hero they once wanted to be.

### First Session Loop

1. `纸剑` notices the visitor looking at an empty hero card sleeve and asks what name used to belong there.
2. Visitor gives a childhood hero name, hesitates, or asks for help.
3. `阿衡` writes the recovered name onto a worn hero card and asks for one ordinary-courage promise.
4. The tavern records the recovered hero name through existing chat/memory/revisit behavior where possible.
5. On revisit, NPCs can refer to the card and ask whether the visitor still wants to keep that name warm.

### Memory Focus

* MVP memory target: recovered hero name.
* Nice-to-have later: ordinary-courage promise, chosen prop, unfinished small quest.
* Avoid requiring the visitor to reveal sensitive real-life details to make the memory work.

### Published Gameplay Draft

1. `找回英雄名`
   * Purpose: give the visitor a low-pressure first identity anchor.
   * Flow: notice empty card sleeve -> recover/name the hero -> write the name on the card -> receive a small ordinary-courage prompt.
   * Boundary: no combat class, stats, powers, or victory condition.

2. `修补旧道具`
   * Purpose: turn childhood props into adult-safe courage metaphors.
   * Flow: choose one old prop -> describe what broke/faded -> `阿衡` repairs it in-scene -> map it to one practical courage.
   * Boundary: props are emotional anchors, not equipment with bonuses.

3. `第一件小英雄委托`
   * Purpose: make the hero identity usable without grand fantasy stakes.
   * Flow: choose a gentle commission -> take 2-3 safe options -> complete with a sentence or small imagined action -> receive a card stamp.
   * Boundary: no real-world dangerous action, no advice requiring expertise, no ranking.

## Success Standard

First implementation should prioritize emotional clarity over mechanical depth.

The tavern should feel like a place where an adult can safely admit: "I used to imagine being a hero, and I miss that part of myself." The UI/gameplay can be simple, but the writing should make the experience legible within the first minute:

* The name `放学后英雄补给站` immediately signals after-school nostalgia and hero recovery.
* `阿衡` treats the visitor's old dream with practical respect, like repairing a model part.
* `纸剑` carries the visitor's childhood sincerity without becoming horror, diagnosis, or another player.
* The three published gameplays form a small arc: recover name -> repair symbol -> do one small brave thing.

## Technical Approach

Recommended first build:

* Add one default public welfare tavern or seed/demo tavern using existing tavern seed patterns.
* Use existing `layout_style: "quest-play"`.
* Add 2 NPCs using existing TavernCharacter shape.
* Add WorldInfo entries for hero card, old props, sticker drawer, repair counter, ordinary courage, and safety boundaries.
* Add 3 published `gameplay_definitions` using the existing gameplay/session system.
* Prefer existing memory/revisit behavior to capture the recovered hero name before adding schema.
* Add focused tests around discoverability, character count, published gameplay count, and safety boundary copy.

## Implementation Plan (Draft)

1. Seed the tavern content in the existing default/demo tavern source with `放学后英雄补给站`, `阿衡`, `纸剑`, WorldInfo, bookmarks, and `quest-play` layout.
2. Add 3 published gameplay definitions and local fallback/rules responses that preserve the emotional tone.
3. Add focused backend tests for tavern discoverability, published gameplays, fallback progression, and no combat/level/equipment language.
4. Run backend compile/tests; run frontend build if the seeded tavern is surfaced through existing UI paths that need verification.
