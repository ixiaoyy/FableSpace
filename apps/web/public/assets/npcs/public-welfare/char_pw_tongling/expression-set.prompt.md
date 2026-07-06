---
prompt_scope: npc-expression-set
asset_group: apps/web/public/assets/npcs/public-welfare/char_pw_tongling/
assets: apps/web/public/assets/npcs/public-welfare/char_pw_tongling/neutral.png; apps/web/public/assets/npcs/public-welfare/char_pw_tongling/joy.png; apps/web/public/assets/npcs/public-welfare/char_pw_tongling/anger.png; apps/web/public/assets/npcs/public-welfare/char_pw_tongling/embarrassment.png; apps/web/public/assets/npcs/public-welfare/char_pw_tongling/curiosity.png
expressions: neutral, joy, anger, embarrassment, curiosity
asset_count: 5
prompt_type: reverse-engineered
source_type: reverse-engineered-current-asset
character_id: char_pw_tongling
widths: neutral=256; joy=256; anger=256; embarrassment=256; curiosity=256
heights: neutral=256; joy=256; anger=256; embarrassment=256; curiosity=256
sha256s: neutral=f0421491553233f6f650c18e3d30631f4e11cbd97ecc5239644c46c2caeb1ae7; joy=93a12f40ad2fa1567cc8a6b79e96176e3e7c32c32ac1437f149de7a9bcabf2b6; anger=debe33915be1af75157ed5590e7900b5d0d783410648da0a4c8ca47eedc1e3b7; embarrassment=333f7fc156d974591d306e985b8fbbee6fbf1ed15031090c6e50768b5c88b5fe; curiosity=68ec8e38b1ef8932a93ee641644cbd49889de219633db531873cf229aec81971
updated_at: 2026-05-03
can_regenerate_higher_quality: true
---

## Final prompt

Generate exactly one square NPC portrait image: one character, one natural/neutral expression, not a contact sheet, not a multi-panel grid, not an expression sheet, not five faces, and not multiple expressions in one image.

Reverse-engineered FableMap public-welfare NPC expression sprite for char_pw_tongling, expression neutral. Create an original square cyber-tavern NPC portrait with clear expression/body language, visible tavern or service-counter context, stable identity for future one-at-a-time expression variants, readable anime/game-style finish, role-appropriate prop language, and no generic placeholder background. Preserve current sprite semantics from the repository path and use the existing image as visual reference for silhouette, palette, costume, and signature prop. This is a reverse prompt, not the original generation prompt.

## Expression assets

- `apps/web/public/assets/npcs/public-welfare/char_pw_tongling/neutral.png` — `neutral`
- `apps/web/public/assets/npcs/public-welfare/char_pw_tongling/joy.png` — `joy`
- `apps/web/public/assets/npcs/public-welfare/char_pw_tongling/anger.png` — `anger`
- `apps/web/public/assets/npcs/public-welfare/char_pw_tongling/embarrassment.png` — `embarrassment`
- `apps/web/public/assets/npcs/public-welfare/char_pw_tongling/curiosity.png` — `curiosity`

## Negative constraints

- No readable brand text, logo, watermark, or existing IP imitation.
- No living-artist imitation and no private data, API keys, visitor secrets, or exact private addresses.
- Preserve FableMap tavern meaning: real-place anchor, owner-authored content, AI NPC/chat/memory support.
- Do not create a contact sheet, multi-panel grid, expression sheet, five faces, or multiple expressions in one image.

## Style recipe / Style DNA source

- image-style-prompt-extractor 15D framework summarized from current repository sprite metadata/path; human visual review recommended before regeneration.

## Identity locks

- character_id: char_pw_tongling
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
