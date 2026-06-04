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

## Implementation child status (2026-06-04 update)

Child task `.trellis/tasks/06-04-visitor-reply-composer-coach/` has been implemented and validated as a frontend-only slice. It adds local visitor composer guidance for native `/tavern/:id` and legacy product chat, including OOC-like question hints and example-fill behavior. No Schema/API/database changes were made.

## Implementation child status (2026-06-04 branching update)

Child task `.trellis/tasks/06-04-new-chat-branching-language/` has been implemented and validated as a frontend-only slice. It adds visitor-facing story branch controls for native `/tavern/:id` and legacy product chat. The action returns to the entrance locally and explicitly does not delete private memory, relationship, or saved progress. No Schema/API/database changes were made.

## Implementation child status (2026-06-04 card compatibility update)

Child task `.trellis/tasks/06-04-character-card-import-export-trust-polish/` has been implemented and validated as a frontend-only slice. It adds owner-confirmed character-card import preview, compatibility review notes, prompt-risk preview state, raw SillyTavern payload preservation for character_book/world_info import, and a deliberate JSON export action for saved characters. No Schema/API/database changes were made.

## Implementation child status (2026-06-04 doorway copy-density update)

Child task `.trellis/tasks/06-04-doorway-copy-density-polish/` has been implemented and validated as a frontend-only correction after user screenshot evidence showed the first viewport was dominated by explanatory copy. It keeps the doorway anchored to the real coordinate and host NPC, moves the first viewport toward immediate actions, removes duplicate Tavern mobile shell guidance, and adds mobile dock clearance. No Schema/API/database changes were made.

## Implementation child status (2026-06-05 return-visit update)

Child task `.trellis/tasks/06-05-return-visit-surface-mvp/` has been implemented and validated as a frontend-only return-visit surface for `home-me`. It adds current-visitor return cards, explicit continue/restart/trial links, and `revisit=continue` doorway skipping. The implementation keeps proactive notification delivery, social graph behavior, Schema/API changes, and persistence changes out of scope.

The panel was adjusted after runtime evidence showed slow memory endpoints could block the first card render. It now renders tavern cards immediately after `listTaverns` returns, then hydrates private memory cues in the background.

## Brainstorm task closure (2026-06-05)

This brainstorm is closed after the implemented child slices above. Remaining ideas such as a full entry-screen IA redesign or owner-curated `scene_digest` / `first_scene_opener` fields should be opened as future standalone tasks if product scope is approved.

## Final validation pass (2026-06-04)

Fresh validation was run after the final filename-sanitizer polish:

- `node --input-type=module -e "...characterCardImportTrust..."` passed.
- `git -c safe.directory=D:/work/ai- diff --check` passed.
- `npm --prefix .\frontend run typecheck` passed after sandbox Tailwind oxide/spawn EPERM required escalation.
- `npm --prefix .\frontend run build` passed after the same sandbox limitation required escalation.
- Playwright self-acceptance passed for scene-setting doorway/chat, starter no-auto-send behavior, visitor reply composer coach, story branch controls, and character-card import preview. Evidence remains under `.trellis/tmp/*-evidence/`.
- In-app Browser sanity check passed on `http://127.0.0.1:8950/tavern/mainline-golden-path-tavern`: doorway, start-chat CTA, starter prompts, composer, reply coach, and story branch controls were visible with no horizontal overflow.
- `npx -y react-doctor@latest . --verbose --diff` could not run: sandbox lacked cached package (`ENOTCACHED`), and escalation was rejected because it would download and execute unpinned third-party npm code.

## Final validation pass (2026-06-05 return-visit)

- `npm --prefix .\frontend run typecheck` passed.
- `npm --prefix .\frontend run build` passed.
- Playwright probe on `http://127.0.0.1:8950/home-me?user_id=return-visit-visual-check` reached `data-return-visit-loaded` in about 6079 ms with 4 cards and no loading text.
- Playwright desktop/mobile visual acceptance passed; evidence:
- `.trellis/tmp/return-visit-surface-evidence/home-desktop.png`
- `.trellis/tmp/return-visit-surface-evidence/home-mobile.png`
- `.trellis/tmp/return-visit-surface-evidence/return-visit-surface-visual-acceptance-report.json`
- Both viewports rendered 4 cards with no horizontal overflow; `继续回访` reached `/tavern/mainline-golden-path-tavern?visitor_id=return-visit-visual-check&revisit=continue` and `doorwayVisible = 0`.
