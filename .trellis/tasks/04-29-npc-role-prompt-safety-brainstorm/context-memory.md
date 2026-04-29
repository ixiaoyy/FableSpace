# Context Memory: NPC / Preset / Tavern Continuity Brainstorm

## Snapshot

Task: `04-29-npc-role-prompt-safety-brainstorm`
Status: `planning`
Purpose: collect product ideas around NPC role prompts, importable roleplay presets, and normal AI tavern gameplay experience for future FableMap features.

## Inputs captured

1. **Catgirl/NPC prompt sample**
   - Useful: cute/tsundere cat persona, short chat style, actions in parentheses, lore trigger such as “复国”.
   - Must clean: override/jailbreak language, forced/explicit sexual content, real private address, absolute obedience, unsafe user-control clauses.

2. **Importable preset URL**
   - User clarified it is a preset file that can be downloaded and imported into its target roleplay client.
   - Product implication: treat it as a community preset format, not just prose inspiration.
   - Useful patterns: modular prompt layers, style toggles, perspective/dialogue controls, world-info slots, event summaries.
   - Blocked/risky patterns: jailbreak modules, absolute obedience, explicit NSFW packs, chain-of-thought forcing, user impersonation / 抢话.

3. **Normal AI tavern player experience + screenshots**
   - Key fun: AI acts like a lightweight GM, creating difficulty, conflict, strong enemies, and drama.
   - Key pain: long sessions drift; AI forgets resources, character qualifications, planted/owned objects, relationship/task state.
   - Product implication: durable facts must live in structured cards/ledger, not only chat context.

## Core product memory

FableMap should preserve its real-map cyber tavern identity. Do not turn it into a generic cultivation/RPG simulator. Borrow the **state-card discipline** from the example:

- Character cards: NPC identity, personality, role, relationship style.
- Visitor state cards: affinity, promises, visit facts, unresolved conflicts.
- Task/quest cards: commissions, investigations, rumors, restoration arcs.
- Resource/asset cards: clues, recipes, local specialties, room props, owner-confirmed objects.
- Location cards: coordinates, nearby taverns, local atmosphere, owner-approved lore.
- Conflict/opportunity cards: rivals, blockers, debts, mysteries, reputation risks.
- Log cards: observable event summaries, not hidden chain-of-thought.

## Recommended roadmap

1. **State Cards for Tavern Continuity** — recommended next real feature.
   - Solve the core continuity problem before adding more generative power.
   - AI may propose updates, but durable canon must be validated/confirmed.

2. **Preset Import Preview / Safe Converter**
   - Owner uploads/imports preset.
   - System classifies modules as supported / needs review / blocked.
   - Converts safe pieces into unpublished `TavernCharacter` or style-template draft.

3. **Tavern GM Layer**
   - AI proposes conflict/opportunity/resource updates as structured candidates.
   - System validates against known state before applying.

4. **Serial Novel Export / Episode Builder**
   - Convert session logs into reviewed chapters using only confirmed facts.
   - Depends on continuity ledger/state cards.

## Hard boundaries

- No jailbreak / 破甲 / provider-specific safety bypass implementation.
- No raw import of unsafe community preset modules into live system prompts.
- No persistent Schema additions until a concrete implementation design is approved.
- No public exposure of owner API keys, private visitor memories, hidden system prompts, or private addresses.
- AI drafts remain unpublished until owner confirmation.
- AI can propose drama; authoritative canon belongs to structured records and validation.

## Completeness check

Current Trellis task is **complete as a brainstorm capture**, but **not complete as an implementation-ready design**.

Complete:

- Goal recorded.
- User inputs and clarifications recorded.
- Reference preset analysis recorded.
- Player-experience analysis recorded.
- Product candidates and recommendations recorded.
- Constraints and non-goals recorded.
- Relevant context files linked in `implement.jsonl` / `check.jsonl`.

Still missing before implementation:

- User has not approved one MVP scope.
- No child task has been created for the recommended next feature.
- No final design doc or implementation checklist exists.
- No data/API/UI decisions are locked.
- No tests or validation commands are applicable yet because no code changed.

## Suggested next Trellis action

Ask user to choose one MVP:

A. `state-cards-for-tavern-continuity` — recommended.
B. `preset-import-preview-safe-converter`.
C. `tavern-gm-layer-structured-conflict-candidates`.
D. `serial-novel-export-episode-builder`.

After user chooses, create a child task and write a focused PRD/design for that MVP.

## NanoMate reference added

New external reference: NanoMate (`nanobot × SillyTavern`) shows a strong pattern: character card = soul, preset = voice, agent skills = actions, memory = continuity, assets = face/voice. For FableMap, this suggests a future **Tavern Skill Packs** layer after State Cards.

Potential skill packs:

- `local-rumor`: NPC mentions nearby tavern rumors.
- `revisit-care`: opt-in follow-up on visitor-approved memories/events.
- `visual-souvenir`: private tavern postcard/shared-moment image.
- `voice-greeting`: optional NPC voice greeting.
- `quest-gm`: structured conflict/opportunity proposals.

Hard constraints: no unrestricted companion stalking, no public-by-default user photos, no unauthorized voice/face cloning, no raw jailbreak/NSFW preset copying, no provider key leakage. Proactive behavior requires opt-in, quiet hours, caps, and visible controls.

Updated roadmap memory: State Cards / Canon Ledger first; Preset Import Preview and Tavern Skill Packs next; visual souvenirs, TTS, and multi-NPC rooms later.

## Child task created (2026-04-29)

Created child task: `.trellis/tasks/04-29-state-cards-for-tavern-continuity/`

Purpose: turn the top recommendation — **State Cards / Canon Ledger first** — into a focused follow-up task with its own PRD and implementation context.
