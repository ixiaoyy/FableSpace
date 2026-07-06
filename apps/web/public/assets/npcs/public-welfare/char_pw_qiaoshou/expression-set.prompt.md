---
prompt_scope: npc-expression-set
asset_group: apps/web/public/assets/npcs/public-welfare/char_pw_qiaoshou/
assets: apps/web/public/assets/npcs/public-welfare/char_pw_qiaoshou/neutral.png; apps/web/public/assets/npcs/public-welfare/char_pw_qiaoshou/joy.png; apps/web/public/assets/npcs/public-welfare/char_pw_qiaoshou/anger.png; apps/web/public/assets/npcs/public-welfare/char_pw_qiaoshou/embarrassment.png; apps/web/public/assets/npcs/public-welfare/char_pw_qiaoshou/curiosity.png
expressions: neutral, joy, anger, embarrassment, curiosity
asset_count: 5
prompt_type: original-final
source_type: prompt-manifest
source_manifest: artifacts/04-30-public-welfare-npc-batch-upgrade/batch-1-prompt-manifest/public-welfare-batch-1-prompt-manifest.json
character_id: char_pw_qiaoshou
widths: neutral=256; joy=256; anger=256; embarrassment=256; curiosity=256
heights: neutral=256; joy=256; anger=256; embarrassment=256; curiosity=256
sha256s: neutral=bd08c690feba6ed2d076884be47d1128503061df1f84f37a26a5696cb8e66df6; joy=5c959928bc74ccad4144c1217a0ae7cc5090688d7c58d34dde8248aa7c376c7b; anger=be5b1e35a5ef829344802940f2bdca48d4d3b1149dbbda2ef1908ba73df9ff94; embarrassment=0022d4678d4581e764fb5ea71b72954dabf254a948059c0f40f2228ab8cadf2e; curiosity=aa5c706b467fbf736e1695df859bda86093db85c0d9f2130446c078f30a9560f
updated_at: 2026-05-03
can_regenerate_higher_quality: true
---

## Final prompt

Generate exactly one square NPC portrait image: one character, one natural/neutral expression, not a contact sheet, not a multi-panel grid, not an expression sheet, not five faces, and not multiple expressions in one image.

Create a finished original FableMap cyber-tavern NPC square portrait sprite for 巧手, assistant who sorts messy tasks into recoverable and actionable parts. Subject identity: ordinary human practical assistant, quick bright gesture, utility pouch, buttons/wire rings sorted by color. Identity locks: utility pouch, buttons and wire rings, color-coded string, quick sorting gesture. Signature prop: small parts tray with simulated labels. The portrait is visibly inside 公益·街角修补工坊 with tavern/service cues: bar/counter or service counter, mugs or cups, shelves, lantern or task light, map-table or coordinate card. Style DNA: warm 70/80s street poster collage anime/game portrait, community workshop screenprint texture; palette aged cream paper, muted repair-shop orange, denim blue, graphite gray, tiny brass screw highlights; lighting soft late-afternoon workshop light, small lamp glow on tools, gentle shadows; medium texture silkscreen grain, torn notebook paper, fabric tape, graphite smudges, hand-repair diagram lines; mood practical, kind, slightly humorous, action-oriented; not corporate helpdesk and not combat crafting; symbolic motifs buttons, loose wires, blank sticky labels, round table cups, checklist boxes as simulated marks. Composition: waist-up portrait at a repair counter or round mediation table, props form a triangular role frame; eye-level friendly portrait; hands visible when role requires action; flat poster layers with foreground tools and midground tavern-workshop counter. Quality diversity thesis: three realistic roles differ by job posture: tool repair, mediation, sortable action checklist. No readable text except simulated abstract marks; no logo, no watermark, no existing IP, no living-artist imitation, no private data.

Expression suffix (neutral): neutral expression, attentive but relaxed, mouth closed or soft small smile, readable tavern-service body language

## Expression assets

- `apps/web/public/assets/npcs/public-welfare/char_pw_qiaoshou/neutral.png` — `neutral`
- `apps/web/public/assets/npcs/public-welfare/char_pw_qiaoshou/joy.png` — `joy`
- `apps/web/public/assets/npcs/public-welfare/char_pw_qiaoshou/anger.png` — `anger`
- `apps/web/public/assets/npcs/public-welfare/char_pw_qiaoshou/embarrassment.png` — `embarrassment`
- `apps/web/public/assets/npcs/public-welfare/char_pw_qiaoshou/curiosity.png` — `curiosity`

## Negative constraints

- owner-reviewable draft only until accepted
- original character only
- no existing IP or recognizable franchise species/characters
- no brand logo, no watermark, no readable invented slogan
- no living-artist imitation
- no owner API keys, no visitor-private data, no exact private address
- not a placeholder, not a UI mockup, not a blank gradient avatar
- visible tavern interior cues required
- identity must stay consistent across neutral/joy/anger/embarrassment/curiosity
- Do not create a contact sheet, multi-panel grid, expression sheet, five faces, or multiple expressions in one image.

## Style recipe / Style DNA source

- art_style_and_genre: warm 70/80s street poster collage anime/game portrait, community workshop screenprint texture; palette_color_science: aged cream paper, muted repair-shop orange, denim blue, graphite gray, tiny brass screw highlights; lighting_signature: soft late-afternoon workshop light, small lamp glow on tools, gentle shadows; medium_texture: silkscreen grain, torn notebook paper, fabric tape, graphite smudges, hand-repair diagram lines; mood: practical, kind, slightly humorous, action-oriented; not corporate helpdesk and not combat crafting; era_context: neighborhood repair bulletin, analog craft zine, public-welfare workshop; detail_density: medium around tools and labels, clean face and hand gesture; post_processing: soft print grain and paper edge wear, no heavy glitch; symbolic_motifs: ['buttons', 'loose wires', 'blank sticky labels', 'round table cups', 'checklist boxes as simulated marks']

## Identity locks

- utility pouch
- buttons and wire rings
- color-coded string
- quick sorting gesture
- signature prop: small parts tray with simulated labels

## Provenance notes

This expression-set sidecar records original final prompts or prompt-manifest reconstructions for the grouped NPC sprite set.

The reusable generation prompt above intentionally uses only `neutral` / natural expression. Other expressions are listed only for provenance coverage and should be generated one at a time by changing the expression suffix.

- Reconstructed from the public-welfare batch prompt manifest before sidecar rollout.
