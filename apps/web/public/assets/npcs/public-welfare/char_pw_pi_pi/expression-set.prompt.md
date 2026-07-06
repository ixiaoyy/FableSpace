---
prompt_scope: npc-expression-set
asset_group: apps/web/public/assets/npcs/public-welfare/char_pw_pi_pi/
assets: apps/web/public/assets/npcs/public-welfare/char_pw_pi_pi/neutral.png; apps/web/public/assets/npcs/public-welfare/char_pw_pi_pi/joy.png; apps/web/public/assets/npcs/public-welfare/char_pw_pi_pi/anger.png; apps/web/public/assets/npcs/public-welfare/char_pw_pi_pi/embarrassment.png; apps/web/public/assets/npcs/public-welfare/char_pw_pi_pi/curiosity.png
expressions: neutral, joy, anger, embarrassment, curiosity
asset_count: 5
prompt_type: original-final
source_type: prompt-manifest
source_manifest: artifacts/04-30-public-welfare-npc-batch-upgrade/batch-1-prompt-manifest/public-welfare-batch-1-prompt-manifest.json
character_id: char_pw_pi_pi
widths: neutral=256; joy=256; anger=256; embarrassment=256; curiosity=256
heights: neutral=256; joy=256; anger=256; embarrassment=256; curiosity=256
sha256s: neutral=0d6051b2443bda33aa5fbe568405a2b68f153a4cac336475348a2be0fb98ceb3; joy=e52919f5b56bf68fcd6f5c4c31411157175fc3e04d492d1af3aafa7e9eaa8eb9; anger=c4cd5e0f3413831e604a1a1556f9673aa70fb01bf00bfcc7d28007817db9a79e; embarrassment=84877967fa5181db046ce3b36ce000017820fec203b5f61967fc387d2ea3fcca; curiosity=3bb254bdd799d0dbf6d4b48ab66e2052a26d67ce078ccb75a2d7517b2918e857
updated_at: 2026-05-03
can_regenerate_higher_quality: true
---

## Final prompt

Generate exactly one square NPC portrait image: one character, one natural/neutral expression, not a contact sheet, not a multi-panel grid, not an expression sheet, not five faces, and not multiple expressions in one image.

Create a finished original FableMap cyber-tavern NPC square portrait sprite for 地球礼仪实习生 Pi-Pi, small etiquette intern learning human greetings. Subject identity: small floating original alien intern with compact multi-limb silhouette, tiny apron, etiquette flashcards, expressive antennae. Identity locks: small floating silhouette, tiny apron, expressive antennae, etiquette flashcards. Signature prop: non-readable etiquette flashcard ring. The portrait is visibly inside 公益·第三货架观测站 with tavern/service cues: bar/counter or service counter, mugs or cups, shelves, lantern or task light, map-table or coordinate card. Style DNA: high-contrast digital industrial glitch anime/game concept portrait, convenience-store sci-fi comedy rather than horror; palette thermal-paper off-white, cool gray, deep black linework, acid green/violet scan accents, tiny warm oden-lamp amber only as local highlight; lighting cold fluorescent shelf light mixed with narrow scanner glow; crisp hard rim light, no generic teal wooden bar glow; medium texture receipt-scan noise, copier grain, subtle pixel sorting, thin vector inventory marks, clean cel-shaded character core; mood absurd, observant, slightly awkward, safe and welcoming; not threatening, not horror; symbolic motifs receipt fragments, inventory scan windows, abstract shelf labels, oden steam glyphs, tiny map-coordinate stickers. Composition: waist-up portrait in asymmetric scan-window frame; foreground shelf/receipt edge acts as depth cue; bust or waist-up, eye-level or slight low angle per role; flattened layers plus rectangular inventory windows; background supplies convenience-tavern rhythm. Quality diversity thesis: each alien role differs by body plan/material: lens-thin scholar, soft failed-disguise clerk, glass/mechanical archive keeper, tiny floating intern. No readable text except simulated abstract marks; no logo, no watermark, no existing IP, no living-artist imitation, no private data.

Expression suffix (neutral): neutral expression, attentive but relaxed, mouth closed or soft small smile, readable tavern-service body language

## Expression assets

- `apps/web/public/assets/npcs/public-welfare/char_pw_pi_pi/neutral.png` — `neutral`
- `apps/web/public/assets/npcs/public-welfare/char_pw_pi_pi/joy.png` — `joy`
- `apps/web/public/assets/npcs/public-welfare/char_pw_pi_pi/anger.png` — `anger`
- `apps/web/public/assets/npcs/public-welfare/char_pw_pi_pi/embarrassment.png` — `embarrassment`
- `apps/web/public/assets/npcs/public-welfare/char_pw_pi_pi/curiosity.png` — `curiosity`

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

- art_style_and_genre: high-contrast digital industrial glitch anime/game concept portrait, convenience-store sci-fi comedy rather than horror; palette_color_science: thermal-paper off-white, cool gray, deep black linework, acid green/violet scan accents, tiny warm oden-lamp amber only as local highlight; lighting_signature: cold fluorescent shelf light mixed with narrow scanner glow; crisp hard rim light, no generic teal wooden bar glow; medium_texture: receipt-scan noise, copier grain, subtle pixel sorting, thin vector inventory marks, clean cel-shaded character core; mood: absurd, observant, slightly awkward, safe and welcoming; not threatening, not horror; era_context: post-digital convenience-store anthropology, low-budget zine sci-fi, public-welfare tavern demo; detail_density: medium-high around props/shelves/receipt fragments, clean readable face and silhouette; post_processing: controlled chromatic edge offsets, thermal-print speckles, no messy overglitch; symbolic_motifs: ['receipt fragments', 'inventory scan windows', 'abstract shelf labels', 'oden steam glyphs', 'tiny map-coordinate stickers']

## Identity locks

- small floating silhouette
- tiny apron
- expressive antennae
- etiquette flashcards
- signature prop: non-readable etiquette flashcard ring

## Provenance notes

This expression-set sidecar records original final prompts or prompt-manifest reconstructions for the grouped NPC sprite set.

The reusable generation prompt above intentionally uses only `neutral` / natural expression. Other expressions are listed only for provenance coverage and should be generated one at a time by changing the expression suffix.

- Reconstructed from the public-welfare batch prompt manifest before sidecar rollout.
