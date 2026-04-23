# NPC Art Guidelines

> Contract for FableMap NPC portrait generation and frontend fallback usage.

## Scope / Trigger

Use this spec whenever changing:

- `frontend/app/features/tavern-npc-stage/`
- `frontend/app/assets/npc-style-cast/`
- NPC portrait prompts, generated NPC bitmap assets, or visual fallback logic
- Tavern route UI that presents NPC portraits before chat

This is a frontend presentation contract. It must not change API, backend schema, persisted `TavernCharacter` fields, owner permissions, or SillyTavern compatibility.

## Visual Contract

NPC art must be real tavern-themed character art, not symbolic placeholders.

Required:

- Real cartoon/anime/game-style human NPC portrait, bust or waist-up.
- The NPC must visibly belong inside a tavern: bar counter, wooden shelves, mugs, lanterns, menu board, bottles, map-table, glowing terminal, door signage, or equivalent tavern interior cues.
- The role should read as tavern staff, host, guide, storyteller, keeper, attendant, or regular NPC.
- The style can vary by tavern skin, but must preserve FableMap's product meaning: real place → owner-authored tavern → AI NPC → memory/revisit.

Forbidden:

- Circles, squares, geometric dummy avatars, abstract silhouettes, empty profile placeholders.
- Generic anime portraits with no tavern environment or tavern props.
- Platform-generated character content being saved as if it were owner-authored role/card data.
- Specific copyrighted IP, franchise logos/UI, recognizable existing characters, or imitation of a living artist's personal style.

## Frontend Fallback Contract

`TavernNpcStage` chooses portrait imagery in this order:

```typescript
character.sprites?.neutral
  || character.avatar
  || character.image_url
  || style-specific project fallback art
```

Rules:

- Owner-authored or imported character art always wins.
- Project fallback art is display-only. It must not be written back into `TavernCharacter`.
- Style resolution may use `appearance.active_preset_id`, wardrobe IDs, tags, name, description, personality, scenario, first message, and tavern text.
- Fallback images must be real tavern-themed NPC art assets under `frontend/app/assets/npc-style-cast/`.

## Prompt Contract for Generated NPC Assets

Use this structure when generating new NPC fallback art:

```text
Use case: stylized-concept
Asset type: FableMap cyber tavern NPC portrait asset
Primary request: actual finished cartoon/anime/game-style human NPC portrait, not placeholder, not icon, not UI mockup.
Core tavern requirement: the NPC must visibly belong inside a tavern with bar/counter, mugs, shelves, lanterns, menu board, bottles, map-table, cyber terminal glow, or equivalent tavern interior details.
Subject: <role + age range + outfit + tavern job>
Style/medium: polished original anime game concept art, expressive eyes, clean linework, soft cel shading.
Composition/framing: bust or waist-up portrait, tavern interior background visible.
Lighting/mood: cozy indoor tavern lighting with theme-specific accents.
Constraints: original character only; no text; no logos; no watermark; no abstract placeholder; no specific IP; no living-artist imitation.
```

## Good / Base / Bad Cases

Good:

- A warm tavern guide behind a wooden bar with mugs, candlelight, copper apron, and a glowing map tablet.
- A neon night host at a rain-window bar booth with bottle shelves, old microphone, and cyberpunk tavern lighting.

Base:

- A portrait where the person is clear and the background contains at least two tavern cues.

Bad:

- A pretty anime face on a blank gradient background.
- A circular initial avatar or geometric dummy body.
- A fantasy warrior portrait with no tavern role or tavern setting.

## Tests Required

For implementation changes:

```powershell
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
```

Run `npm --prefix .\frontend test` when changing service contracts or rule scripts.

Manual/visual check:

- Confirm the no-avatar path displays a real tavern-themed NPC image.
- Confirm uploaded/imported `sprites.neutral`, `avatar`, or `image_url` still override fallback art.
- Confirm narrow screens keep the portrait and chat usable.

## Wrong vs Correct

### Wrong

```tsx
// Bad: abstract placeholder instead of tavern-themed character art.
<div className="rounded-full bg-cyan-300">{character.name[0]}</div>
```

### Correct

```tsx
// Good: owner art first, then real project tavern NPC art fallback.
const avatar = character.sprites?.neutral || character.avatar || character.image_url
return avatar ? <img src={avatar} alt={character.name} /> : <NpcStyleFallback style={style} />
```
