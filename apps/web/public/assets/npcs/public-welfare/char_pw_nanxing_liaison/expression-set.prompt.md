---
prompt_scope: npc-expression-set
asset_group: apps/web/public/assets/npcs/public-welfare/char_pw_nanxing_liaison/
assets: apps/web/public/assets/npcs/public-welfare/char_pw_nanxing_liaison/neutral.png; apps/web/public/assets/npcs/public-welfare/char_pw_nanxing_liaison/joy.png; apps/web/public/assets/npcs/public-welfare/char_pw_nanxing_liaison/anger.png; apps/web/public/assets/npcs/public-welfare/char_pw_nanxing_liaison/embarrassment.png; apps/web/public/assets/npcs/public-welfare/char_pw_nanxing_liaison/curiosity.png
expressions: neutral, joy, anger, embarrassment, curiosity
asset_count: 5
prompt_type: reverse-engineered
source_type: reverse-engineered-current-asset
character_id: char_pw_nanxing_liaison
widths: neutral=512; joy=512; anger=512; embarrassment=512; curiosity=512
heights: neutral=512; joy=512; anger=512; embarrassment=512; curiosity=512
sha256s: neutral=39fd33ae3d38c6aeb56647edd70302a1692f6fe556fc685e73d5a4a540394ae1; joy=358d0ca37290c5bd6fc9e481b7d726e28a9362cca702dc36f67b9c0f76e31ccd; anger=a97449ad4533535416fa89f68876920eb145a262ad06c243284a9fbfb02d37a9; embarrassment=d1a0c2daca966acbaa9b18476ecc32fe3ef3dc7847cbba5d74d68e920eb47fca; curiosity=2883af363d01cb4fc3e2249a47a8bf0df23f6166b2e33893a6ccef989f6446c2
updated_at: 2026-05-03
can_regenerate_higher_quality: true
---

## Final prompt

Generate exactly one square NPC portrait image: one character, one natural/neutral expression, not a contact sheet, not a multi-panel grid, not an expression sheet, not five faces, and not multiple expressions in one image.

Reverse-engineered FableMap public-welfare NPC expression sprite for char_pw_nanxing_liaison, expression neutral. Create an original square cyber-tavern NPC portrait with clear expression/body language, visible tavern or service-counter context, stable identity for future one-at-a-time expression variants, readable anime/game-style finish, role-appropriate prop language, and no generic placeholder background. Preserve current sprite semantics from the repository path and use the existing image as visual reference for silhouette, palette, costume, and signature prop. This is a reverse prompt, not the original generation prompt.

## Expression assets

- `apps/web/public/assets/npcs/public-welfare/char_pw_nanxing_liaison/neutral.png` — `neutral`
- `apps/web/public/assets/npcs/public-welfare/char_pw_nanxing_liaison/joy.png` — `joy`
- `apps/web/public/assets/npcs/public-welfare/char_pw_nanxing_liaison/anger.png` — `anger`
- `apps/web/public/assets/npcs/public-welfare/char_pw_nanxing_liaison/embarrassment.png` — `embarrassment`
- `apps/web/public/assets/npcs/public-welfare/char_pw_nanxing_liaison/curiosity.png` — `curiosity`

## Negative constraints

- No readable brand text, logo, watermark, or existing IP imitation.
- No living-artist imitation and no private data, API keys, visitor secrets, or exact private addresses.
- Preserve FableMap tavern meaning: real-place anchor, owner-authored content, AI NPC/chat/memory support.
- Do not create a contact sheet, multi-panel grid, expression sheet, five faces, or multiple expressions in one image.

## Style recipe / Style DNA source

- image-style-prompt-extractor 15D framework summarized from current repository sprite metadata/path; human visual review recommended before regeneration.

## Identity locks

- character_id: char_pw_nanxing_liaison
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
