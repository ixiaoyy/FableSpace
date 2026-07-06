---
prompt_scope: npc-expression-set
asset_group: apps/web/public/assets/npcs/public-welfare/char_pw_dengxin/
assets: apps/web/public/assets/npcs/public-welfare/char_pw_dengxin/neutral.png; apps/web/public/assets/npcs/public-welfare/char_pw_dengxin/joy.png; apps/web/public/assets/npcs/public-welfare/char_pw_dengxin/anger.png; apps/web/public/assets/npcs/public-welfare/char_pw_dengxin/embarrassment.png; apps/web/public/assets/npcs/public-welfare/char_pw_dengxin/curiosity.png
expressions: neutral, joy, anger, embarrassment, curiosity
asset_count: 5
prompt_type: reverse-engineered
source_type: reverse-engineered-current-asset
character_id: char_pw_dengxin
widths: neutral=256; joy=256; anger=256; embarrassment=256; curiosity=256
heights: neutral=256; joy=256; anger=256; embarrassment=256; curiosity=256
sha256s: neutral=c6413a23c8456c6d7bd27ff11969f4c8de6dd3a9d0dd7b14474e35a75801de49; joy=16c96cd93258d60c776bed844aa40621dfed8e32907bf4bb6a3a9c15e320dd2c; anger=e4f2c0d4fbbf18f17c6d2e842c6cf91591f824dd8910fbfdcda324c174680c1a; embarrassment=e8d8d1e4d2696ee6277f7c5dc20c9156516094b92dbc2daffaedefd433f94926; curiosity=ffca2879769502b81234467d4213d8f80505ebeaacb2971f1e68f00a742ffe1e
updated_at: 2026-05-03
can_regenerate_higher_quality: true
---

## Final prompt

Generate exactly one square NPC portrait image: one character, one natural/neutral expression, not a contact sheet, not a multi-panel grid, not an expression sheet, not five faces, and not multiple expressions in one image.

Reverse-engineered FableMap public-welfare NPC expression sprite for char_pw_dengxin, expression neutral. Create an original square cyber-tavern NPC portrait with clear expression/body language, visible tavern or service-counter context, stable identity for future one-at-a-time expression variants, readable anime/game-style finish, role-appropriate prop language, and no generic placeholder background. Preserve current sprite semantics from the repository path and use the existing image as visual reference for silhouette, palette, costume, and signature prop. This is a reverse prompt, not the original generation prompt.

## Expression assets

- `apps/web/public/assets/npcs/public-welfare/char_pw_dengxin/neutral.png` — `neutral`
- `apps/web/public/assets/npcs/public-welfare/char_pw_dengxin/joy.png` — `joy`
- `apps/web/public/assets/npcs/public-welfare/char_pw_dengxin/anger.png` — `anger`
- `apps/web/public/assets/npcs/public-welfare/char_pw_dengxin/embarrassment.png` — `embarrassment`
- `apps/web/public/assets/npcs/public-welfare/char_pw_dengxin/curiosity.png` — `curiosity`

## Negative constraints

- No readable brand text, logo, watermark, or existing IP imitation.
- No living-artist imitation and no private data, API keys, visitor secrets, or exact private addresses.
- Preserve FableMap tavern meaning: real-place anchor, owner-authored content, AI NPC/chat/memory support.
- Do not create a contact sheet, multi-panel grid, expression sheet, five faces, or multiple expressions in one image.

## Style recipe / Style DNA source

- image-style-prompt-extractor 15D framework summarized from current repository sprite metadata/path; human visual review recommended before regeneration.

## Identity locks

- character_id: char_pw_dengxin
- expression: neutral
- same face/body plan/outfit/prop across expression set
- expression: joy
- expression: anger
- expression: embarrassment
- expression: curiosity

## Provenance notes

This expression-set sidecar was reverse-engineered from current repository images and metadata; it is not the original generation prompt unless a source manifest is cited.

The reusable generation prompt above intentionally uses only `neutral` / natural expression. Other expressions are listed only for provenance coverage and should be generated one at a time by changing the expression suffix.

- Original prompt was not found in current manifests; do not relabel this as original-final.
