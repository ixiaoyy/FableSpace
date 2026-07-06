---
prompt_scope: npc-expression-set
asset_group: apps/web/public/assets/npcs/public-welfare/char_pw_xingdai/
assets: apps/web/public/assets/npcs/public-welfare/char_pw_xingdai/neutral.png; apps/web/public/assets/npcs/public-welfare/char_pw_xingdai/joy.png; apps/web/public/assets/npcs/public-welfare/char_pw_xingdai/anger.png; apps/web/public/assets/npcs/public-welfare/char_pw_xingdai/embarrassment.png; apps/web/public/assets/npcs/public-welfare/char_pw_xingdai/curiosity.png
expressions: neutral, joy, anger, embarrassment, curiosity
asset_count: 5
prompt_type: reverse-engineered
source_type: reverse-engineered-current-asset
character_id: char_pw_xingdai
widths: neutral=256; joy=256; anger=256; embarrassment=256; curiosity=256
heights: neutral=256; joy=256; anger=256; embarrassment=256; curiosity=256
sha256s: neutral=bc1602319310af83149d06ca76accff365732ccca33de9a5f376dd18bf32a3b0; joy=1a2ba84110c5e7618dedbf9db14adaaaa02439aaf11b4fdf32f288ee220fc026; anger=4ae90fb17b983fccd2d43a6d25b76bc286a14219158bafb68ae7ec79f3db905c; embarrassment=013b3bc2b3a1b18427344f753784a501ad858291667b96101778443730690bf3; curiosity=9a612806ac59035c1b6dede127ef2c0e20f793d8bbd3c7fe0d757e0358067c66
updated_at: 2026-05-03
can_regenerate_higher_quality: true
---

## Final prompt

Generate exactly one square NPC portrait image: one character, one natural/neutral expression, not a contact sheet, not a multi-panel grid, not an expression sheet, not five faces, and not multiple expressions in one image.

Reverse-engineered FableMap public-welfare NPC expression sprite for char_pw_xingdai, expression neutral. Create an original square cyber-tavern NPC portrait with clear expression/body language, visible tavern or service-counter context, stable identity for future one-at-a-time expression variants, readable anime/game-style finish, role-appropriate prop language, and no generic placeholder background. Preserve current sprite semantics from the repository path and use the existing image as visual reference for silhouette, palette, costume, and signature prop. This is a reverse prompt, not the original generation prompt.

## Expression assets

- `apps/web/public/assets/npcs/public-welfare/char_pw_xingdai/neutral.png` — `neutral`
- `apps/web/public/assets/npcs/public-welfare/char_pw_xingdai/joy.png` — `joy`
- `apps/web/public/assets/npcs/public-welfare/char_pw_xingdai/anger.png` — `anger`
- `apps/web/public/assets/npcs/public-welfare/char_pw_xingdai/embarrassment.png` — `embarrassment`
- `apps/web/public/assets/npcs/public-welfare/char_pw_xingdai/curiosity.png` — `curiosity`

## Negative constraints

- No readable brand text, logo, watermark, or existing IP imitation.
- No living-artist imitation and no private data, API keys, visitor secrets, or exact private addresses.
- Preserve FableMap tavern meaning: real-place anchor, owner-authored content, AI NPC/chat/memory support.
- Do not create a contact sheet, multi-panel grid, expression sheet, five faces, or multiple expressions in one image.

## Style recipe / Style DNA source

- image-style-prompt-extractor 15D framework summarized from current repository sprite metadata/path; human visual review recommended before regeneration.

## Identity locks

- character_id: char_pw_xingdai
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
