---
prompt_scope: npc-expression-set
asset_group: apps/web/public/assets/npcs/public-welfare/char_pw_yinpiao/
assets: apps/web/public/assets/npcs/public-welfare/char_pw_yinpiao/neutral.png; apps/web/public/assets/npcs/public-welfare/char_pw_yinpiao/joy.png; apps/web/public/assets/npcs/public-welfare/char_pw_yinpiao/anger.png; apps/web/public/assets/npcs/public-welfare/char_pw_yinpiao/embarrassment.png; apps/web/public/assets/npcs/public-welfare/char_pw_yinpiao/curiosity.png
expressions: neutral, joy, anger, embarrassment, curiosity
asset_count: 5
prompt_type: reverse-engineered
source_type: reverse-engineered-current-asset
character_id: char_pw_yinpiao
widths: neutral=256; joy=256; anger=256; embarrassment=256; curiosity=256
heights: neutral=256; joy=256; anger=256; embarrassment=256; curiosity=256
sha256s: neutral=699f2bb07c753d9991969e471c95d53725be245201993bc7f53635a7d9a32f55; joy=0ce234333588ca2c9799a249ea49fe9b500f5953d23520cd2bb63bcf6aa26984; anger=c7fa3cf97c8eced9004bd51838fa692214b7825e8629741ca73e2351b3533f47; embarrassment=d828fc572ed1edc6ea3b69c5a3c8d8bd061897bf98fabf572e9b465efd996e63; curiosity=515eb2c05368c40a3d963b2a446cd3d7d7159fcb9f14d9ee08bb1e3739f5fc46
updated_at: 2026-05-03
can_regenerate_higher_quality: true
---

## Final prompt

Generate exactly one square NPC portrait image: one character, one natural/neutral expression, not a contact sheet, not a multi-panel grid, not an expression sheet, not five faces, and not multiple expressions in one image.

Reverse-engineered FableMap public-welfare NPC expression sprite for char_pw_yinpiao, expression neutral. Create an original square cyber-tavern NPC portrait with clear expression/body language, visible tavern or service-counter context, stable identity for future one-at-a-time expression variants, readable anime/game-style finish, role-appropriate prop language, and no generic placeholder background. Preserve current sprite semantics from the repository path and use the existing image as visual reference for silhouette, palette, costume, and signature prop. This is a reverse prompt, not the original generation prompt.

## Expression assets

- `apps/web/public/assets/npcs/public-welfare/char_pw_yinpiao/neutral.png` — `neutral`
- `apps/web/public/assets/npcs/public-welfare/char_pw_yinpiao/joy.png` — `joy`
- `apps/web/public/assets/npcs/public-welfare/char_pw_yinpiao/anger.png` — `anger`
- `apps/web/public/assets/npcs/public-welfare/char_pw_yinpiao/embarrassment.png` — `embarrassment`
- `apps/web/public/assets/npcs/public-welfare/char_pw_yinpiao/curiosity.png` — `curiosity`

## Negative constraints

- No readable brand text, logo, watermark, or existing IP imitation.
- No living-artist imitation and no private data, API keys, visitor secrets, or exact private addresses.
- Preserve FableMap tavern meaning: real-place anchor, owner-authored content, AI NPC/chat/memory support.
- Do not create a contact sheet, multi-panel grid, expression sheet, five faces, or multiple expressions in one image.

## Style recipe / Style DNA source

- image-style-prompt-extractor 15D framework summarized from current repository sprite metadata/path; human visual review recommended before regeneration.

## Identity locks

- character_id: char_pw_yinpiao
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
