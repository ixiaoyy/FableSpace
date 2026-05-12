# Brainstorm: map-anchored space UGC critique response

## Goal

Turn a harsh visitor-side critique of FableMap's current positioning into actionable product strategy: clarify whether the map anchor, owner-paid token model, and AI NPC space metaphor create real user value or merely add ceremony/cost around chat.

## What I already know

* User provided a deliberately hostile but useful "tourist substitute" critique: current pitch can sound like "a coordinate-tagged web chatroom", "owner pays for bot attention", and "real coordinates artificially constrain AI roleplay".
* The critique attacks five product assumptions: space UGC, owner sovereignty/token cost, real anchor, AI NPC memory, and the overall "cyber bonsai" value proposition.
* Repo docs define the current FableMap主线 as: real map anchor -> space discovery -> enter space -> configure AI NPC -> chat -> memory/writeback -> revisit.
* `docs/PRODUCT_BRIEF.md` and `docs/FABLEMAP_TAVERN_PLATFORM.md` explicitly make `真实锚点`, `主人主权`, `Token 即燃料`, and SillyTavern-compatible NPCs core principles.
* `docs/WHAT_NOT_TO_BUILD.md` forbids abandoning real anchors, platform-level token recharge/settlement, unbounded visitor social, traditional map features, and RPG/game systems.

## Assumptions (temporary)

* We should not pivot to a generic AI chat app or a social network.
* We can adjust product framing and UX proof points without violating the hard constraints.
* The critique should be treated as signal about weak perceived value, not as a reason to discard the whole architecture.

## Open Questions

* Which product risk should this brainstorm converge on first: map anchor value, owner cost/value loop, or visitor first-session fun?

## Requirements (evolving)

* Preserve hard product constraints from docs: real coordinates, owner-confirmed content, no platform token marketplace, no unbounded visitor social.
* Extract product risks and propose MVP-level experiments, not broad architecture churn.
* Convert each insult into a falsifiable product question and possible mitigation.

## Acceptance Criteria (evolving)

* [ ] Produce a concise diagnosis of the critique's strongest points.
* [ ] Propose 2-3 product directions that keep FableMap within documented constraints.
* [ ] Identify one recommended MVP experiment with success/failure signals.
* [ ] Record clear out-of-scope items.

## Definition of Done

* Brainstorm captured in this PRD.
* No implementation until scope is confirmed.
* If a follow-up implementation is selected, create/activate a concrete Trellis task.

## Out of Scope

* Removing real coordinate anchors.
* Adding platform token recharge/settlement.
* Building visitor social feeds, DMs, friends, or global online state.
* Repositioning as a traditional map app or RPG.

## Technical Notes

* Read: `docs/PRODUCT_BRIEF.md`, `docs/FABLEMAP_TAVERN_PLATFORM.md`, `docs/WHAT_NOT_TO_BUILD.md`, `docs/INDEX.md`.
* This is a product/UX strategy brainstorm, not a code change yet.

## Decision (ADR-lite)

**Context**: The critique exposes that FableMap can be perceived as a coordinate-tagged chatbot with extra ceremony and owner-side cost.

**Decision**: Treat the first MVP response as **Visitor First Minute + Location Anchor Proof**. The immediate goal is not to add a large new system, but to make every discoverable space answer two questions before chat starts: "Why is this here?" and "What should I do in the first minute?"

**Consequences**:

* Keeps real coordinates as a hard constraint, but forces the UI/content contract to prove location value.
* Avoids building platform payments, global social, RPG systems, or a generic chatbot app.
* Creates a low-risk UX/product slice that can be implemented with existing tavern metadata and frontend surfaces first.

## MVP Scope Proposal

### In scope

* Add a visitor-facing first-minute module for space cards / entry surfaces:
  * `Why here?` — one short reason this space belongs to this coordinate or place context.
  * `Try this first` — 2-3 suggested opening prompts/actions for visitors.
  * `Experience type` — clear label such as story, comfort chat, mystery, divination, roleplay, archive, local legend.
* Add owner/create-side copy or fields that nudge creators to supply location-linked meaning instead of generic character chat.
* Add regression checks that prevent the entry surface from becoming a bare chat CTA again.

### Out of scope for this MVP

* No change to the real-coordinate requirement.
* No token recharge/payment/settlement system.
* No visitor social network, feed, DM, friends, or global chat.
* No platform auto-publishing space content without owner confirmation.
* No large map-rendering or game-system pivot.

## Success / Failure Signals

### Success signals

* A visitor can decide what to do before opening chat.
* A space feels weaker if moved to a random coordinate.
* The UI no longer sells "enter chat" as the only value.
* Tests can verify the first-minute contract exists on key visitor entry surfaces.

### Failure signals

* `Why here?` becomes generic marketing copy unrelated to location.
* Suggested prompts are generic and would work in any SillyTavern chat.
* Owner setup becomes too heavy and discourages creation.

## Next Blocking Question

Confirm whether to turn this brainstorm into an implementation task for **Visitor First Minute + Location Anchor Proof**.

## Implementation Result (2026-05-12)

### Done

* Added a centralized `buildTavernFirstMinuteGuide()` helper that derives first-minute visitor guidance from existing Tavern metadata only: real anchor copy, place type, special tavern type, scene prompt, description, and characters.
* Added visitor-facing first-minute surfaces:
  * Discover radar cards: compact `Why here` proof.
  * Discover result cards and SoulLink desktop/mobile cards: `Why here`, experience type, and first prompt.
  * Preview modal: `游客第一分钟` panel before entering.
  * Tavern chat workbench: actionable prompt chips that fill the composer.
* Added owner/create-side authoring nudges in both the React Router create route and legacy `TavernCreatePanel`, explicitly guarding against "GPS-tagged generic chat".
* Added `first-minute-guide-test.mjs` and wired it into the frontend test chain.
* Strengthened Playwright discovery visual audit to assert visible first-minute guide cards and updated its report.
* Fixed existing typecheck blockers in `CharacterEditor.jsx` / chat workbench type annotations encountered while running the required frontend typecheck.

### Deliberately not done

* No backend schema/API changes.
* No persisted `why_here` or `try_this_first` fields.
* No platform token payment/recharge/settlement.
* No visitor social feed, friends, DM, ranking, combat, or traditional map navigation.
* No platform auto-publication of tavern/NPC/story content.

### Validation

* `node .\frontend\scripts\first-minute-guide-test.mjs` — PASS
* Focused scripts: `discover-pc-polish-test`, `mobile-critical-flow-test`, `tavern-chat-workbench-test`, `map-anchor-copy-test`, `create-wizard-route-test` — PASS
* `npm --prefix .\frontend run typecheck` — PASS
* `npm --prefix .\frontend test` — PASS
* `npm --prefix .\frontend run build` — PASS
* `git diff --check` — PASS, CRLF warnings only
* Playwright self-acceptance: `node .\frontend\scripts\playwright-discover-visual-audit.mjs` with `FABLEMAP_PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175` — PASS
  * Report: `D:\work\ai-\artifacts\playwright\discover-visual-audit\report.md`
  * Screenshots: `desktop-light-discover-initial.png`, `desktop-black-discover-initial.png`, `mobile-light-discover-initial.png`
