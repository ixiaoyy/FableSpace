---
prompt_scope: npc-expression-set
asset_group: apps/web/public/assets/npcs/public-welfare/char_pw_xiaozhou/
assets: apps/web/public/assets/npcs/public-welfare/char_pw_xiaozhou/neutral.png; apps/web/public/assets/npcs/public-welfare/char_pw_xiaozhou/joy.png; apps/web/public/assets/npcs/public-welfare/char_pw_xiaozhou/anger.png; apps/web/public/assets/npcs/public-welfare/char_pw_xiaozhou/embarrassment.png; apps/web/public/assets/npcs/public-welfare/char_pw_xiaozhou/curiosity.png
expressions: neutral, joy, anger, embarrassment, curiosity
asset_count: 5
prompt_type: original-final
source_type: prompt-manifest
source_manifest: artifacts/04-30-public-welfare-npc-batch-upgrade/batch-2-prompt-manifest/public-welfare-batch-2-prompt-manifest.json
character_id: char_pw_xiaozhou
widths: neutral=256; joy=256; anger=256; embarrassment=256; curiosity=256
heights: neutral=256; joy=256; anger=256; embarrassment=256; curiosity=256
sha256s: neutral=42b30fe731ed7484695ae6f10e17598b36ebccae6b6e1cfa3a59012c2826175f; joy=80d8548d358e66be401c43912a409c724342c49476a9697ef0406d0d02cbec83; anger=6e7adff85c5defb3f5a4aae0389d115be9be787358ef9e6c356e302a015697c2; embarrassment=c641a6bcc477fbe8f80b592165546910bdf3d200df2d40928ee050d40e95244b; curiosity=e753731567e06d3279e131142876cc7caaffadebcc543c5f24ed8048d39534a2
updated_at: 2026-05-03
can_regenerate_higher_quality: true
---

## Final prompt

Generate exactly one square NPC portrait image: one character, one natural/neutral expression, not a contact sheet, not a multi-panel grid, not an expression sheet, not five faces, and not multiple expressions in one image.

Create a finished original FableMap cyber-tavern NPC square portrait sprite for 小舟 (char_pw_xiaozhou). Subject identity: ordinary human volunteer guide with crisp map-table posture, small lantern pin, route-card fan. Identity locks: map-table guide posture, white service lamp, route-card fan, calm step-by-step gesture. Signature prop: blank route-step cards with abstract marks. The portrait is visibly inside pw_lantern_helpdesk with tavern/service cues: bar or service counter, cups, shelves, lantern/task light, map-table or coordinate card. Style DNA: civic lantern wayfinding anime/game portrait, clean map-table collage; palette and light: warm paper white, soft lighthouse yellow, civic cyan, leaf green, graphite linework / clear desk-lamp glow and gentle map reflection; medium/texture: paper map layers, sticky-note blocks without readable text, translucent route lines, clean cel-shaded character core. Anti-repetition rule: no generic museum docent bust; must show map-table/lantern/helpdesk wayfinding cues and practical guidance posture. Composition: square waist-up or half-body portrait, clear face and expression, foreground prop depth cue, background tavern rhythm, no centered same-face template. No readable text except simulated abstract marks; no logo, no watermark, no existing IP, no living-artist imitation, no private data, no API keys.

Expression suffix (neutral): neutral expression, attentive but relaxed, mouth closed or soft small smile, readable tavern-service body language

## Expression assets

- `apps/web/public/assets/npcs/public-welfare/char_pw_xiaozhou/neutral.png` — `neutral`
- `apps/web/public/assets/npcs/public-welfare/char_pw_xiaozhou/joy.png` — `joy`
- `apps/web/public/assets/npcs/public-welfare/char_pw_xiaozhou/anger.png` — `anger`
- `apps/web/public/assets/npcs/public-welfare/char_pw_xiaozhou/embarrassment.png` — `embarrassment`
- `apps/web/public/assets/npcs/public-welfare/char_pw_xiaozhou/curiosity.png` — `curiosity`

## Negative constraints

- No readable brand text, logo, watermark, or existing IP imitation.
- No living-artist imitation and no private data, API keys, visitor secrets, or exact private addresses.
- Preserve FableMap tavern meaning: real-place anchor, owner-authored content, AI NPC/chat/memory support.
- Do not create a contact sheet, multi-panel grid, expression sheet, five faces, or multiple expressions in one image.

## Style recipe / Style DNA source

- style_family: civic lantern wayfinding anime/game portrait, clean map-table collage; palette_light: warm paper white, soft lighthouse yellow, civic cyan, leaf green, graphite linework / clear desk-lamp glow and gentle map reflection; material_system: paper map layers, sticky-note blocks without readable text, translucent route lines, clean cel-shaded character core; anti_repetition: no generic museum docent bust; must show map-table/lantern/helpdesk wayfinding cues and practical guidance posture

## Identity locks

- map-table guide posture
- white service lamp
- route-card fan
- calm step-by-step gesture
- signature prop: blank route-step cards with abstract marks

## Provenance notes

This expression-set sidecar records original final prompts or prompt-manifest reconstructions for the grouped NPC sprite set.

The reusable generation prompt above intentionally uses only `neutral` / natural expression. Other expressions are listed only for provenance coverage and should be generated one at a time by changing the expression suffix.

- Reconstructed from the public-welfare batch prompt manifest before sidecar rollout.
