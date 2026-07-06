---
prompt_scope: npc-expression-set
asset_group: apps/web/public/assets/npcs/public-welfare/char_pw_mika_nurse/
assets: apps/web/public/assets/npcs/public-welfare/char_pw_mika_nurse/neutral.png; apps/web/public/assets/npcs/public-welfare/char_pw_mika_nurse/joy.png; apps/web/public/assets/npcs/public-welfare/char_pw_mika_nurse/anger.png; apps/web/public/assets/npcs/public-welfare/char_pw_mika_nurse/embarrassment.png; apps/web/public/assets/npcs/public-welfare/char_pw_mika_nurse/curiosity.png
expressions: neutral, joy, anger, embarrassment, curiosity
asset_count: 5
prompt_type: reverse-engineered
source_type: reverse-engineered-current-asset
character_id: char_pw_mika_nurse
widths: neutral=512; joy=512; anger=512; embarrassment=512; curiosity=512
heights: neutral=512; joy=512; anger=512; embarrassment=512; curiosity=512
sha256s: neutral=9e58ada036727ffe068572dfddf8a9edcf3c6bf215839d25d331ca335af17405; joy=0bc2abf75053067c3d4a657b12b8c14a073c7e0ce80fd3f9555c40e37fe1bae6; anger=43fa400c8ae1d961c5686949a9176c803e1b9b2dd5cf865d416ff82722a609e6; embarrassment=841f2bb2d551fba83e1bfeaf6822769d0dc674b2f0205b2d1e234c6eb6b762ac; curiosity=bff99b958b9156c35f9c767f3596c70eda4efbfc187e31c6fc42b649059fcbb6
updated_at: 2026-05-03
can_regenerate_higher_quality: true
---

## Final prompt

Generate exactly one square NPC portrait image: one character, one natural/neutral expression, not a contact sheet, not a multi-panel grid, not an expression sheet, not five faces, and not multiple expressions in one image.

Reverse-engineered FableMap public-welfare NPC expression sprite for char_pw_mika_nurse, expression neutral. Create an original square cyber-tavern NPC portrait with clear expression/body language, visible tavern or service-counter context, stable identity for future one-at-a-time expression variants, readable anime/game-style finish, role-appropriate prop language, and no generic placeholder background. Preserve current sprite semantics from the repository path and use the existing image as visual reference for silhouette, palette, costume, and signature prop. This is a reverse prompt, not the original generation prompt.

## Expression assets

- `apps/web/public/assets/npcs/public-welfare/char_pw_mika_nurse/neutral.png` — `neutral`
- `apps/web/public/assets/npcs/public-welfare/char_pw_mika_nurse/joy.png` — `joy`
- `apps/web/public/assets/npcs/public-welfare/char_pw_mika_nurse/anger.png` — `anger`
- `apps/web/public/assets/npcs/public-welfare/char_pw_mika_nurse/embarrassment.png` — `embarrassment`
- `apps/web/public/assets/npcs/public-welfare/char_pw_mika_nurse/curiosity.png` — `curiosity`

## Negative constraints

- No readable brand text, logo, watermark, or existing IP imitation.
- No living-artist imitation and no private data, API keys, visitor secrets, or exact private addresses.
- Preserve FableMap tavern meaning: real-place anchor, owner-authored content, AI NPC/chat/memory support.
- Do not create a contact sheet, multi-panel grid, expression sheet, five faces, or multiple expressions in one image.

## Style recipe / Style DNA source

- image-style-prompt-extractor 15D framework summarized from current repository sprite metadata/path; human visual review recommended before regeneration.

## Identity locks

- character_id: char_pw_mika_nurse
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
