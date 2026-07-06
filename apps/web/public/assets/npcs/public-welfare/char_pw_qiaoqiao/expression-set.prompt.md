---
prompt_scope: npc-expression-set
asset_group: apps/web/public/assets/npcs/public-welfare/char_pw_qiaoqiao/
assets: apps/web/public/assets/npcs/public-welfare/char_pw_qiaoqiao/neutral.png; apps/web/public/assets/npcs/public-welfare/char_pw_qiaoqiao/joy.png; apps/web/public/assets/npcs/public-welfare/char_pw_qiaoqiao/anger.png; apps/web/public/assets/npcs/public-welfare/char_pw_qiaoqiao/embarrassment.png; apps/web/public/assets/npcs/public-welfare/char_pw_qiaoqiao/curiosity.png
expressions: neutral, joy, anger, embarrassment, curiosity
asset_count: 5
prompt_type: reverse-engineered
source_type: reverse-engineered-current-asset
character_id: char_pw_qiaoqiao
widths: neutral=256; joy=256; anger=256; embarrassment=256; curiosity=256
heights: neutral=256; joy=256; anger=256; embarrassment=256; curiosity=256
sha256s: neutral=08c3a9ce963709c72a5489e397f10802ed56c070e24b9c3413d24ae0d160064c; joy=80a2a2f6c90f11c8b88a5edda7279382bec4207a9745bdde3d97958a4bc30e90; anger=10042f316d77e6a431e125b294f2aac79d81af937ec1c8b62e372e7d740bf727; embarrassment=559d7667b0f5dad509feb3266e3cc5d33660494d2b0813cd54f0b9a9fea1d601; curiosity=18d09cd05f32b504521d96fb32cd899749140a64d748daf2514c24d0854bdc98
updated_at: 2026-05-03
can_regenerate_higher_quality: true
---

## Final prompt

Generate exactly one square NPC portrait image: one character, one natural/neutral expression, not a contact sheet, not a multi-panel grid, not an expression sheet, not five faces, and not multiple expressions in one image.

Reverse-engineered FableMap public-welfare NPC expression sprite for char_pw_qiaoqiao, expression neutral. Create an original square cyber-tavern NPC portrait with clear expression/body language, visible tavern or service-counter context, stable identity for future one-at-a-time expression variants, readable anime/game-style finish, role-appropriate prop language, and no generic placeholder background. Preserve current sprite semantics from the repository path and use the existing image as visual reference for silhouette, palette, costume, and signature prop. This is a reverse prompt, not the original generation prompt.

## Expression assets

- `apps/web/public/assets/npcs/public-welfare/char_pw_qiaoqiao/neutral.png` — `neutral`
- `apps/web/public/assets/npcs/public-welfare/char_pw_qiaoqiao/joy.png` — `joy`
- `apps/web/public/assets/npcs/public-welfare/char_pw_qiaoqiao/anger.png` — `anger`
- `apps/web/public/assets/npcs/public-welfare/char_pw_qiaoqiao/embarrassment.png` — `embarrassment`
- `apps/web/public/assets/npcs/public-welfare/char_pw_qiaoqiao/curiosity.png` — `curiosity`

## Negative constraints

- No readable brand text, logo, watermark, or existing IP imitation.
- No living-artist imitation and no private data, API keys, visitor secrets, or exact private addresses.
- Preserve FableMap tavern meaning: real-place anchor, owner-authored content, AI NPC/chat/memory support.
- Do not create a contact sheet, multi-panel grid, expression sheet, five faces, or multiple expressions in one image.

## Style recipe / Style DNA source

- image-style-prompt-extractor 15D framework summarized from current repository sprite metadata/path; human visual review recommended before regeneration.

## Identity locks

- character_id: char_pw_qiaoqiao
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
