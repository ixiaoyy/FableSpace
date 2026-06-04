# SillyTavern-style entry experience brainstorm

## Goal

Create a focused Trellis research/brainstorm task for learning from SillyTavern-style entry, character, lorebook, extension, and welcome-assistant patterns, then translate them into FableMap-safe product directions.

## Assumed brief

- Reference visual: the provided SillyTavern login/entry screenshot with a cinematic background, central glass panel, primary auth actions, community/resource CTAs, and feature cards.
- Product target: FableMap first-screen / first-minute experience, not a direct clone.
- Interactivity level: planning only in this task; no UI implementation yet.

## Guardrails

- Every space direction must keep a real coordinate / location anchor.
- Platform must not auto-publish space, NPC, lore, or story content without owner confirmation.
- No platform token billing / recharge system.
- No unbounded visitor social network, global chat, follower graph, or stranger matching.
- Character card and lorebook ideas should preserve SillyTavern-compatible import/export where practical.

## Current output

- `brainstorm.md` records external-source lessons, screenshot observations, FableMap translation, candidate child tasks, and open decisions.
- Added user-supplied SillyTavern newcomer-guide lessons: explain the roleplay mental model, discourage OOC “你会做什么,” teach first-message continuation, provide in-character rescue starters, and reframe new chat/reset as story branching.
- Added user-supplied chat-screen screenshot lessons: long first messages need an opening-scene reader, scene digest, visible NPC identity, starter chips, and visitor-safe control hierarchy.
- Added scene-setting prose principle: space entry and first chat should usually include situational prose, but pair it with digest/starter actions and avoid making every normal reply a wall of text.

## Next decision

Pick one of these follow-up slices:

1. Entry screen concept: “世界镜像面入口” first-screen information architecture.
2. First-minute NPC host: owner-selected greeter that explains how to play and starts one action.
3. Newcomer roleplay literacy layer: anti-OOC guidance, action/dialogue helper, and starter reply chips.
4. Opening scene reader: scene digest, full prose, starter chips, and simplified visitor controls.
5. Scene-setting prose policy: arrival prose, first opener, scene-change beats, normal reply pacing, and actionable cues.
6. Character/lore compatibility polish: import/export, tags, lore linkage, and owner review.
7. Return visit surface: recent spaces, memory cue, and continue-last-session path.

## Planned implementation child

- `.trellis/tasks/06-04-scene-setting-prose-mvp/` plans the first frontend-only implementation slice for entry arrival prose, opening scene reader, in-character starter chips, and visitor-safe pacing.

## Validation

Docs/Trellis-only change. Validation should confirm paths exist and task JSON is parseable; no frontend/backend tests are required unless a child implementation task is started.

## Implementation child status (2026-06-04)

Child task `.trellis/tasks/06-04-scene-setting-prose-mvp/` has been implemented and validated as a frontend-only slice. It covers native `/tavern/:id` first-minute doorway / chat opening reader plus legacy product entry/chat compatibility. No Schema/API/database changes were made.
