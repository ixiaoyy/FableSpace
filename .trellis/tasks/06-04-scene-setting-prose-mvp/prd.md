# Scene-setting prose and opening reader MVP

## Goal

When a visitor enters a space or starts chatting with an NPC, the UI should answer:

- Where am I?
- What just happened?
- Who is in front of me?
- What can I naturally do next?
- How should I reply without asking OOC questions like “你会做什么？”

This MVP should reduce blank-chat paralysis while preserving FableMap’s constraints: real coordinate anchoring, owner sovereignty, and no platform auto-published content.

## Evidence from current code

- `frontend/app/product/App.jsx` currently renders the active flow through `TavernEntryPanel` and `TavernChatRoom`.
- `frontend/app/product/TavernEntryPanel.jsx` already shows tavern description, play mode card, play prompts, short-drama teaser, character avatars, password gate, and enter button.
- `frontend/app/product/TavernChatRoom.jsx` already:
  - derives entrance reactions from `TavernCharacter.first_mes`;
  - creates a simple host guide message;
  - uses `inferTavernPlayMode` and `playMode.prompts`;
  - merges play prompts with hobby icebreakers into quick actions;
  - keeps entrance reactions local to the visit and does not write them into backend history.
- `frontend/app/product/tavernPlayModes.js` already contains visitor-facing prompt chips, but many are still assistant/help-style rather than in-character scene continuation.
- `docs/WORLD_SCHEMA.md` already has `Tavern.description`, `Tavern.scene_prompt`, `TavernCharacter.first_mes`, `alternate_greetings`, `tags`, and `gameplay_definitions`; MVP does not need new fields.

## MVP scope

Frontend-only, no Schema/API/database changes.

### 1. Entry arrival scene

In `TavernEntryPanel`, add a compact arrival scene card between tavern description and play card.

Inputs:

- `tavern.name`
- `tavern.description`
- `tavern.scene_prompt`
- `tavern.address`
- inferred play mode

Behavior:

- Use only existing owner-authored or public tavern fields.
- Frame the card as UI guidance, not canonical story content.
- Keep it short: about 80-180 Chinese characters.
- Include one “进入后你可以” line based on play prompts.

### 2. Opening scene reader

In `TavernChatRoom`, add an opening scene reader above the chat stream, before the user sends a first message.

Inputs:

- selected character
- `selectedChar.first_mes`
- `tavern.description`
- `tavern.scene_prompt`
- `playMode`
- `entryState` / visitor return state when available

Behavior:

- Show NPC identity and role/description.
- Show a scene digest:
  - 地点
  - 氛围
  - 眼前 NPC
  - 下一步
- Keep the canonical full opener as the existing assistant message or as expandable prose; avoid duplicating a long wall twice.
- Add “怎么接戏” guidance: 动作 + 对话.
- Add in-character starter chips.

### 3. Starter chips: from assistant prompts to in-scene prompts

Add generic visitor-side starter prompt helpers. These prompts should not author tavern lore; they only help the visitor reply.

Candidate starter modes:

- 失忆 / 外来者：`*我揉了揉发痛的额角，环顾四周* 这里是哪里？刚刚发生了什么？`
- 突发危机：`*我压低声音，拉住你的衣袖* 等等，周围好像不太对劲，我们接下来怎么办？`
- 日常闲聊：`*我在你身边坐下，放松地笑了笑* 你刚刚在想什么？接下来有什么安排？`
- 明确任务：`*我检查好随身物品，认真看向你* 再确认一下，我们这次要完成什么目标？`

Implementation rule:

- Merge these with existing `finalQuickPrompts`, but cap visible chips to avoid clutter.
- Prefer in-character chips first on the first turn.
- Keep existing play-mode prompts available, especially for quest/checklist gameplay.

### 4. Entrance message pacing

Current `publicEntranceMessages` can render every character’s `first_mes` plus a host guide. If many NPCs have long openers, this can become a wall of text.

MVP options:

- Safer first pass: keep current messages, but add the opening scene reader and starter chips.
- Better follow-up: in public rooms, show one host/selected character opener first, then collapse other NPC openers behind “看看还有谁在这里.”

Recommended MVP:

- Do not change backend history or persistence.
- Avoid broad behavior change in the first slice.
- If wall-of-text remains obvious in visual testing, collapse non-selected NPC openers as a second small patch.

## Proposed files

Likely implementation files:

- `frontend/app/product/sceneSettingProse.js` — pure helper functions for arrival text, digest, starter prompts, and safe truncation.
- `frontend/app/product/OpeningSceneReader.jsx` — presentational component for scene digest, opener guidance, and starter chips.
- `frontend/app/product/TavernEntryPanel.jsx` — render arrival scene card.
- `frontend/app/product/TavernChatRoom.jsx` — render opening reader and merge starter chips.
- `frontend/app/product/styles.css` — desktop/mobile styles for arrival card, opening reader, digest, chips.

Optional later files:

- `frontend/app/product/CharacterEditor.jsx` — owner-side first-message length/clarity guidance.
- `frontend/app/product/TavernInterior.jsx` — only if this older/alternate path is still used by a route after confirmation.

## Helper/API design notes

All new functions/components must have comments describing purpose, key params, return value/side effects.

Suggested helper names:

- `buildTavernArrivalScene(tavern, playMode)`  
  Purpose: derive a short UI-only arrival scene from existing tavern fields.
- `buildOpeningSceneDigest({ tavern, character, playMode, entryState })`  
  Purpose: derive display bullets without inventing lore.
- `getRoleplayStarterPrompts({ playMode, character, tavern })`  
  Purpose: return visitor-side starter reply templates.
- `truncateSceneText(text, maxLength)`  
  Purpose: safe display truncation; no semantic rewrite.

Important boundary:

- These helpers must not call AI.
- These helpers must not save generated text.
- Derived copy must be treated as UI scaffolding, not owner-published canonical content.

## Non-goals

- No new backend endpoint.
- No new persistent fields such as `entry_scene` or `scene_digest`.
- No automatic summarization of owner content into published lore.
- No platform-generated tavern story publication.
- No global social, ranking, token billing, or game combat system.

## Implementation order

1. Add helper module with commented pure functions.
2. Add `OpeningSceneReader` component.
3. Integrate arrival card into `TavernEntryPanel`.
4. Integrate opening reader and starter chips into `TavernChatRoom`.
5. Add responsive CSS.
6. Run build/typecheck.
7. Run browser/Playwright self-acceptance for:
   - desktop entry panel;
   - desktop tavern chat first screen;
   - narrow/mobile entry panel;
   - narrow/mobile tavern chat first screen.

## Acceptance criteria

- A first-time visitor sees scene context before typing.
- The UI says how to continue the scene, not just “send a message.”
- At least three in-character starter chips are visible on first entry/chat.
- Existing owner-authored `first_mes` remains visible and not overwritten.
- No new Schema/API/database changes.
- No owner API Key, hidden prompt, or private memory is exposed.
- Mobile view keeps input/starter actions reachable without burying them below a huge text wall.

## Validation plan for implementation

Minimum after code changes:

```powershell
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
```

Visual/interaction changes also require Playwright self-acceptance before human review, with desktop and narrow/mobile screenshots recorded under `.trellis/tmp/`.

If `npm --prefix .\frontend run test` is still absent from `frontend/package.json`, do not claim it was run; report that package currently exposes `build` and `typecheck`.

## Risks / follow-ups

- Long openers may still overwhelm if multiple NPCs render at once; consider collapsing non-selected NPC openers after visual review.
- Owner-authored scene digest may become desirable; that would require a separate Schema/API task.
- First-turn OOC detection can be useful, but should start as passive guidance, not blocking.
- CharacterEditor could later warn owners when `first_mes` has no location/actor/next-action cue.

## Implementation update (2026-06-04)

Route discovery found that the direct native route `/tavern/:tavernId` renders `frontend/app/features/tavern-chat-workbench/index.tsx`, not only the legacy product `TavernEntryPanel` / `TavernChatRoom` path. The MVP was therefore implemented in both places:

- Native direct tavern flow: `TavernChatWorkbench` now shows first-minute doorway starter replies and an opening-scene reader above the chat stream before the visitor sends the first message.
- Legacy/product compatibility flow: `TavernEntryPanel` now shows an arrival scene card, and `TavernChatRoom` now shows `OpeningSceneReader` plus first-turn in-character starter chips.
- Shared legacy helpers live in `frontend/app/product/sceneSettingProse.js`; no backend, Schema, API, persistence, or owner-authored content contract was changed.

## Validation evidence (2026-06-04)

Passed:

```powershell
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
node .\.trellis\tmp\scene-setting-prose-visual-acceptance.cjs
```

Playwright evidence generated under `.trellis/tmp/scene-setting-prose-evidence/`:

- `doorway-desktop.png`
- `chat-desktop.png`
- `doorway-mobile.png`
- `chat-mobile.png`
- `scene-setting-prose-visual-acceptance-report.json`

The Playwright check covered direct `/tavern/mainline-golden-path-tavern`, desktop and mobile viewports, doorway context, starter chips before first visitor message, opening-scene reader after starting chat, and no horizontal overflow.

Attempted but blocked:

- `npx -y react-doctor@latest . --verbose --diff` could not be completed because downloading/executing the package requires escalation and the escalation request was rejected by auto_review. Do not claim a react-doctor score for this task.

## Follow-up polish (2026-06-04)

After implementation review, the legacy/product `OpeningSceneReader` and quick chips were adjusted so starter prompts are placed into the composer for visitor editing instead of being sent immediately. This matches the native `TavernChatWorkbench` behavior and preserves visitor agency.

Additional validation after this polish:

```powershell
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
node .\.trellis\tmp\scene-setting-prose-visual-acceptance.cjs
```

## Behavior verification (2026-06-04)

Validated the native `/tavern/:id` starter-chip behavior after the no-auto-send polish:

```powershell
node .\.trellis\tmp\scene-setting-starter-behavior.cjs
```

Result: clicking the first opening-scene starter filled the composer with `*我揉了揉发痛的额角，环顾四周* 这里是哪里？刚刚发生了什么？` and produced no `POST /chat` or `POST /group-chat` requests. The visitor must still press Send explicitly.

## Follow-up polish 2 (2026-06-04)

Added an explicit draft-control note to the opening-scene starter area in both native and legacy chat surfaces: starter templates only fill the input and never auto-send. The native behavior script now asserts that this note exists before testing the click behavior.

Additional validation:

```powershell
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
node .\.trellis\tmp\scene-setting-starter-behavior.cjs
node .\.trellis\tmp\scene-setting-prose-visual-acceptance.cjs
```
