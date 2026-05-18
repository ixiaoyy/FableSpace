# brainstorm: CyberPersona-inspired 1:1 NPC relationship loop

## Goal

Adapt the CyberPersona / love.yydes.ggff.net reference into FableMap without turning the product into a standalone AI girlfriend app.

- Preserve FableMap's core loop: real coordinate → tavern/space → owner-authored NPC → chat → memory → revisit feedback.
- Capture the useful interaction fantasy: random-feeling first encounter, relationship progress, persistent memory, milestones, media/voice moments, and explicit breakup/reset.
- Keep all generated or dynamic content under owner sovereignty and existing privacy boundaries.

## Reference takeaways

- CyberPersona emphasizes a structured roleplay loop: personality seed, relationship dimensions, memory, voice/image/gif triggers, milestones, achievements, and session persistence.
- The provided screenshots emphasize mobile-first romance presentation: match wall, detail page, chat bubbles, voice cards, image moments, relationship/breakup controls, and a lightweight debug/status checklist.
- For FableMap, these are inspiration for interaction pacing and UI surfaces, not a directive to copy product category, schema, branding, or automatic content generation.

## Functional implementation reference

Reference code was inspected from `C:\tmp\CyberPersona-reference` cloned from `harrylarryxyz/CyberPersona`.

### 1. Chat turn architecture

CyberPersona does not let a raw LLM reply directly mutate state. It uses a strict turn pipeline:

1. `scripts/build-turn-prompt.js`
   - reads persisted state;
   - builds a single prompt containing profile, relationship state, short-term mood, memories, world context, and recent chat context.
2. LLM produces a structured `TurnResultPayload`.
3. `scripts/apply-turn-result.js` / `src/turn.js`
   - safely parses JSON;
   - validates booleans, enum deltas, memory updates, image/voice flags;
   - falls back to a safe text response if parsing or validation fails.
4. `src/controller.js applyTurnResultPayload`
   - appends user/assistant history;
   - applies state/memory deltas;
   - records gamification;
   - emits a delivery manifest for text / voice / image / sticker.

**FableMap mapping**

- Current FableMap chat already has prompt building, affinity update, memory atoms, fallback degradation, and response mode.
- The missing mature piece is a **validated turn envelope** between model output and persistence.
- Recommended future contract:

```ts
interface TavernNpcTurnResult {
  visible_text: string
  mood?: string
  relationship_delta?: "major_decrease" | "minor_decrease" | "neutral" | "minor_increase" | "major_increase"
  memory_candidates?: MemoryCandidate[]
  voice_intent?: { enabled: boolean; style_hint?: string }
  media_intent?: { enabled: boolean; type: "owner_asset" | "image_draft"; reason?: string; prompt?: string }
  milestone_candidates?: MilestoneCandidate[]
}
```

Backend must validate this envelope before updating `VisitorState`, `MemoryAtom`, public-bond cues, or media/voice jobs. Fallback/degraded replies must remain non-persistent for relationship and memory progress.

### 2. Relationship/state model

CyberPersona uses four state layers:

- immutable seed: Big Five, archetype, opening strategy, appearance, voice style;
- dynamic relationship axes: trust, security, closeness, neediness, possessiveness;
- short-term mood/stress: unresolved emotion, interaction trend, recent voice/image pattern, emotion history;
- long-term revealed state: facts, events, emotional memories, character-card KV.

It lets the LLM choose coarse enum deltas, then deterministic code applies personality and mood factors:

`effective_delta = raw_delta_enum × personality_factor × mood_factor`

**FableMap mapping**

- Keep existing `VisitorState.relationship.strength` / `AffinityStage` as the canonical public/simple relationship value.
- Do not add five new public schema fields in MVP.
- If deeper behavior is needed, store it as **private runtime metadata** scoped to visitor + tavern + character, or compute it transiently from MemoryAtom / RelationshipGraph / chat context.
- Deterministic backend should own numeric updates; LLM should only suggest coarse intent (`minor_increase`, `neutral`, etc.).

### 3. Memory system

CyberPersona combines:

- recent context: last 10 chat entries;
- persisted history: capped at 40 entries;
- session summaries: last 5 session summaries;
- structured memory update from the LLM;
- character-card KV updates where new identity / preference / habit facts are gradually revealed;
- conflict rule: immutable `setting` facts keep old value, mutable `experience` facts can revise with revision history.

FableMap already has a stronger base than the current UI shows:

- `MemoryAtom` with scope, dimension, horizon, visibility, visitor/character/place IDs, importance, confidence, source IDs, and metadata.
- auto memory creation and dedupe from chat;
- prompt-time memory selection by relevance, recency, reinforcement, scope, horizon, and token budget;
- privacy filtering via `can_view_memory_atom`.

**Recommended upgrade**

- Replace demo-feeling memory UI with a visible but private "TA 记得" layer backed by existing `MemoryAtom`.
- Add a structured memory candidate pass:
  - LLM suggests memory candidates;
  - backend clamps scope/dimension/horizon/visibility;
  - private visitor-character memories are default;
  - owner-visible or public memories require owner action.
- Add user/owner feedback to mark wrong memories using existing metadata flags (`flagged_wrong`, `excluded_from_prompt`).
- Do not auto-write NPC character-card facts from visitor chat into owner-authored `TavernCharacter`; use pending owner-confirmed drafts if needed.

### 4. Voice / TTS interaction

CyberPersona treats voice as a delivery mode, not a separate conversation brain:

- LLM sets `sendVoiceNow`;
- `visibleText` is the TTS input;
- generated audio is stored in runtime cache;
- if voice is sent, the final text reply is suppressed to avoid duplicate delivery;
- TTS timeout/failure degrades to text;
- singing uses a preset voice path because clone does not support that mode.

**FableMap mapping**

- Add voice as a `response_mode` / delivery manifest after text generation succeeds.
- Owner config should decide allowed TTS provider, voice, auto-play, and cost behavior.
- Voice job should be async/cacheable by `chat_message_id`.
- TTS failure must not retry or duplicate relationship/memory writes; it only changes delivery.
- User audio input should be a separate STT pre-step: audio → transcript → normal chat pipeline.

### 5. Image / media moments

CyberPersona lets the model set `sendImageNow`, `imagePrompt`, `imageWaitText`, `imageFailedText`, and `useReferencePhoto`.

**FableMap mapping**

- Do not let an NPC auto-generate and send new images in public taverns by default.
- MVP should use owner-approved NPC media assets.
- Later: LLM can create `image_draft` requests, but drafts must go through owner approval before becoming reusable/sent assets.
- Any generated NPC image that enters the project must follow project asset rules: repo path + prompt sidecar + hash/size verification.

### 6. Breakup/reset

CyberPersona breakup clears state and history. That is safe in a single-user local app, but too destructive for FableMap.

**FableMap mapping**

- Reset must be scoped to current visitor + tavern + character.
- It may archive or hide private MemoryAtoms and reset private affinity/projection.
- It must not delete owner-authored NPC, Tavern content, public asset files, or other visitors' data.
- If there is an active public bond, use explicit revoke/cancel semantics.

### 7. What makes CyberPersona feel mature

The main maturity is not the romance skin. It is these engineering patterns:

- structured turn output instead of raw free-form chat;
- model suggests, backend validates and persists;
- multimodal output is a delivery manifest;
- memory is typed and pruned, not just full transcript stuffing;
- recent context + session summaries + selected long-term memories are separate layers;
- debug/cheat modes expose internals without leaking them in normal mode;
- all failures have safe fallbacks that do not corrupt relationship state.

## In scope

MVP should be a **1:1 NPC relationship capsule inside a real-coordinate tavern**:

1. **Relationship-first entry**
   - Use an existing or owner-confirmed NPC in a real anchored tavern.
   - Show a compact relationship profile: NPC portrait, tavern anchor, affinity stage, current bond status, last memory cue.
2. **Chat + affinity feedback**
   - Reuse `VisitorState.relationship.strength` / `AffinityStage`.
   - Display small progress beats from real chat results only, not from fallback replies.
3. **Memory continuity**
   - Reuse `ChatMessage` and `MemoryAtom`/memory policy.
   - Show a private "TA 记得" strip only when the current visitor can view those memory atoms.
4. **Milestones**
   - Treat first meeting, first return, close_friend threshold, bond application, approved public bond, and breakup/reset as milestone events.
   - Prefer existing memory/state-card/public-bond surfaces before adding a new persisted table.
5. **Breakup/reset**
   - Visitor can end their own private relationship with an NPC.
   - Reset must not delete owner-authored NPC, tavern content, or asset files.
   - If an active `NpcPublicBond` exists, route through revoke/cancel flow rather than silently deleting public status.
6. **Media/voice as constrained moments**
   - MVP may show owner-approved image/voice assets or placeholders.
   - Auto-generated image/voice must remain a later, owner-configured/approved capability.

## Out of scope

- No unanchored standalone dating app route as the product center.
- No platform-generated NPC/persona published without owner review.
- No platform token recharge, billing, or image/TTS cost settlement.
- No cross-visitor dating/social graph, friend system, global inbox, or public exposure of another visitor's identity.
- No automatic deletion of generated NPC images when a visitor breaks up.
- No new relationship schema with 5 CyberPersona dimensions in MVP.
- No automatic "current partner meets ex" event unless it is private to the same visitor and based on that visitor's own relationship archive.

## Affected files/layers for a future implementation

- **Existing data contracts**: `VisitorState.relationship`, `AffinityStage`, `MemoryAtom`, `NpcPublicBond`, `ChatMessage`.
- **Backend likely touched later**:
  - `backend/src/fablemap_api/application/services/runtime.py` for chat response progress/memory/affinity continuity.
  - public-bond endpoints if breakup needs a first-class visitor cancellation/revoke wrapper.
  - memory endpoints if relationship archive/reset needs a privacy-safe filtered action.
- **Frontend likely touched later**:
  - `frontend/app/features/tavern-chat/` or `tavern-chat-workbench/` for the 1:1 chat capsule.
  - `frontend/app/lib/taverns.ts`, `frontend/app/lib/publicBond.ts`, `frontend/app/lib/affinity.js`.
  - Existing `AffinityProgress`, `BondApplyModal`, `TavernEngagementPanel`, and NPC card surfaces.
- **Docs/spec if implemented**:
  - Update focused `.trellis/spec/` files for any new reset contract, public-bond cancellation semantics, or media/voice policy.

## Viable approaches

### A. Standalone CyberPersona clone

- **Shape**: Build a separate dating app flow with generated personas, photos, voice, breakup, and ex interactions.
- **Pros**: Fastest to match the reference fantasy.
- **Cons**: Conflicts with real-coordinate anchor, owner sovereignty, no-social boundaries, and token autonomy. High privacy/safety and schema risk.
- **Verdict**: Do not choose.

### B. Tavern/NPC relationship capsule

- **Shape**: A mobile-first 1:1 mode inside an anchored tavern, powered by existing affinity, memory, public bond, and owner-approved assets.
- **Pros**: Uses current FableMap primitives; preserves map/tavern identity; small enough to implement incrementally.
- **Cons**: Less flashy than CyberPersona; voice/image generation is deferred or asset-only.
- **Verdict**: Recommended MVP.

### C. Deep companion engine

- **Shape**: Add multi-dimensional trust/security/closeness/neediness/possessiveness, structured turn JSON, image/TTS tool calls, achievements, daily tasks.
- **Pros**: Richest simulation and closer to CyberPersona internals.
- **Cons**: New schema, prompt contracts, tests, privacy review, and cost controls; easy to overbuild.
- **Verdict**: Later phase after B proves retention.

## Chosen approach

Choose **B. Tavern/NPC relationship capsule**.

Smallest MVP slice:

1. Add/reshape a mobile-friendly NPC detail/chat entry that feels like "命中注定" but displays FableMap terms: tavern anchor, owner-confirmed NPC, affinity, bond status.
2. In chat, surface 2-3 real progress chips:
   - `记住了 N 件事`
   - `好感：熟面孔/朋友/挚友`
   - `可申请结缘` when `relationship.strength >= 0.70`
3. Add a private "relationship archive" display using existing memory/chat/public-bond data, not a public social feed.
4. Add a clear breakup/reset design spec before code:
   - reset current visitor's private affinity/history projection for this NPC/tavern;
   - do not erase owner-authored character or project image assets;
   - if public bond exists, require explicit revoke/cancel state.

## Validation plan for future implementation

- Backend contract tests for any reset/revoke/cancel endpoint and privacy filtering.
- Existing affinity/public-bond tests must continue to pass.
- Frontend build: `npm --prefix .\frontend run build`.
- If UI changes: Playwright self-check on desktop and narrow/mobile viewport, with screenshots saved under the future implementation task.
- If image/voice assets are added: verify repo asset paths, dimensions/hash, and prompt sidecars for NPC generated images.

## Open questions

1. Should this be a **visitor-facing mode inside existing tavern chat**, or a **SoulLink-themed landing/detail shell that routes into tavern chat**?
2. Should MVP include real breakup/reset backend behavior, or only design the flow and defer destructive data operations?
3. For media moments, should we start with **owner-approved static assets only**, or allow an **owner-configured AI draft queue** that never auto-sends before approval?

## Decision needed before implementation

Proceed only after choosing the first implementation slice. Recommended first slice: **visitor-facing mobile NPC detail/chat capsule using existing affinity + public-bond + memory display, no new backend schema**.
