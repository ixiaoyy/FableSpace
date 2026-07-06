---
prompt_scope: npc-expression-set
asset_group: apps/web/public/assets/npcs/public-welfare/char_pw_luming/
assets: apps/web/public/assets/npcs/public-welfare/char_pw_luming/neutral.png; apps/web/public/assets/npcs/public-welfare/char_pw_luming/joy.png; apps/web/public/assets/npcs/public-welfare/char_pw_luming/anger.png; apps/web/public/assets/npcs/public-welfare/char_pw_luming/embarrassment.png; apps/web/public/assets/npcs/public-welfare/char_pw_luming/curiosity.png
expressions: neutral, joy, anger, embarrassment, curiosity
asset_count: 5
prompt_type: reverse-engineered
source_type: reverse-engineered-current-asset
character_id: char_pw_luming
widths: neutral=256; joy=256; anger=256; embarrassment=256; curiosity=256
heights: neutral=256; joy=256; anger=256; embarrassment=256; curiosity=256
sha256s: neutral=abac810813ae40b64a7c355586368fbc49f5793e9e1e3803cfbf886b41202334; joy=fb6f652159dcb8d7e17e7d19a3fb973d647812a30aee6c08c33c594f02b17959; anger=5b5e4662684c806e26360641c50280647a69cde58b1f3d22a1f3dbe9c104a0c5; embarrassment=cd08f7d4a2392adaee5531b8f43969c2f49cb6539b1d4cb5b58b8ab3143cc094; curiosity=a065422dd98b07115fefd8e8e44bc45b0b502e42f3577a9b6df66491610a042b
updated_at: 2026-05-03
can_regenerate_higher_quality: true
---

## Final prompt

Generate exactly one square NPC portrait image: one character, one natural/neutral expression, not a contact sheet, not a multi-panel grid, not an expression sheet, not five faces, and not multiple expressions in one image.

Reverse-engineered FableMap public-welfare NPC expression sprite for char_pw_luming, expression neutral. Create an original square cyber-tavern NPC portrait with clear expression/body language, visible tavern or service-counter context, stable identity for future one-at-a-time expression variants, readable anime/game-style finish, role-appropriate prop language, and no generic placeholder background. Preserve current sprite semantics from the repository path and use the existing image as visual reference for silhouette, palette, costume, and signature prop. This is a reverse prompt, not the original generation prompt.

## Expression assets

- `apps/web/public/assets/npcs/public-welfare/char_pw_luming/neutral.png` — `neutral`
- `apps/web/public/assets/npcs/public-welfare/char_pw_luming/joy.png` — `joy`
- `apps/web/public/assets/npcs/public-welfare/char_pw_luming/anger.png` — `anger`
- `apps/web/public/assets/npcs/public-welfare/char_pw_luming/embarrassment.png` — `embarrassment`
- `apps/web/public/assets/npcs/public-welfare/char_pw_luming/curiosity.png` — `curiosity`

## Negative constraints

- No readable brand text, logo, watermark, or existing IP imitation.
- No living-artist imitation and no private data, API keys, visitor secrets, or exact private addresses.
- Preserve FableMap tavern meaning: real-place anchor, owner-authored content, AI NPC/chat/memory support.
- Do not create a contact sheet, multi-panel grid, expression sheet, five faces, or multiple expressions in one image.

## Style recipe / Style DNA source

- image-style-prompt-extractor 15D framework summarized from current repository sprite metadata/path; human visual review recommended before regeneration.

## Identity locks

- character_id: char_pw_luming
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
