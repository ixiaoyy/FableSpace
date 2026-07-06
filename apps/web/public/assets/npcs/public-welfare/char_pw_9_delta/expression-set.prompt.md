---
prompt_scope: npc-expression-set
asset_group: apps/web/public/assets/npcs/public-welfare/char_pw_9_delta/
assets: apps/web/public/assets/npcs/public-welfare/char_pw_9_delta/neutral.png; apps/web/public/assets/npcs/public-welfare/char_pw_9_delta/joy.png; apps/web/public/assets/npcs/public-welfare/char_pw_9_delta/anger.png; apps/web/public/assets/npcs/public-welfare/char_pw_9_delta/embarrassment.png; apps/web/public/assets/npcs/public-welfare/char_pw_9_delta/curiosity.png
expressions: neutral, joy, anger, embarrassment, curiosity
asset_count: 5
prompt_type: original-final
source_type: prompt-manifest
source_manifest: artifacts/04-30-public-welfare-npc-batch-upgrade/batch-1-prompt-manifest/public-welfare-batch-1-prompt-manifest.json
character_id: char_pw_9_delta
widths: neutral=256; joy=256; anger=256; embarrassment=256; curiosity=256
heights: neutral=256; joy=256; anger=256; embarrassment=256; curiosity=256
sha256s: neutral=8fc58190aaf8070c5253a7cbbcbf1f0cc84e45f737ab25d1de7fd8e1a7a35c69; joy=17144e065582c11222e104a3aa909e4a41321eebd7c3fdae9afe45fcdfdfd2c0; anger=1db47b403b0e530d52dd44a7b709a092511322404db20f9391bae8ecf26f99de; embarrassment=a66a462a34d0d2f46a1e5bd939f0dbc5e56755dee527d37692e7c5c5196868b1; curiosity=40c294db5b1afd03ad89736307b8e18d40441cb6835293a2c950ecb1ae20c8cb
updated_at: 2026-05-03
can_regenerate_higher_quality: true
---

## Final prompt

Generate exactly one square NPC portrait image: one character, one natural/neutral expression, not a contact sheet, not a multi-panel grid, not an expression sheet, not five faces, and not multiple expressions in one image.

Create a finished original FableMap cyber-tavern NPC square portrait sprite for 社长 9-Delta, alien anthropology club president and store-behavior observer. Subject identity: slender original alien with elongated fingers, layered observation lenses, narrow luminous pupils, clipboard-like analysis slate. Identity locks: tall thin silhouette, multi-layer observation lenses, convenience vest over lab apron, analysis slate. Signature prop: non-readable behavior observation slate. The portrait is visibly inside 公益·第三货架观测站 with tavern/service cues: bar/counter or service counter, mugs or cups, shelves, lantern or task light, map-table or coordinate card. Style DNA: high-contrast digital industrial glitch anime/game concept portrait, convenience-store sci-fi comedy rather than horror; palette thermal-paper off-white, cool gray, deep black linework, acid green/violet scan accents, tiny warm oden-lamp amber only as local highlight; lighting cold fluorescent shelf light mixed with narrow scanner glow; crisp hard rim light, no generic teal wooden bar glow; medium texture receipt-scan noise, copier grain, subtle pixel sorting, thin vector inventory marks, clean cel-shaded character core; mood absurd, observant, slightly awkward, safe and welcoming; not threatening, not horror; symbolic motifs receipt fragments, inventory scan windows, abstract shelf labels, oden steam glyphs, tiny map-coordinate stickers. Composition: waist-up portrait in asymmetric scan-window frame; foreground shelf/receipt edge acts as depth cue; bust or waist-up, eye-level or slight low angle per role; flattened layers plus rectangular inventory windows; background supplies convenience-tavern rhythm. Quality diversity thesis: each alien role differs by body plan/material: lens-thin scholar, soft failed-disguise clerk, glass/mechanical archive keeper, tiny floating intern. No readable text except simulated abstract marks; no logo, no watermark, no existing IP, no living-artist imitation, no private data.

Expression suffix (neutral): neutral expression, attentive but relaxed, mouth closed or soft small smile, readable tavern-service body language

## Expression assets

- `apps/web/public/assets/npcs/public-welfare/char_pw_9_delta/neutral.png` — `neutral`
- `apps/web/public/assets/npcs/public-welfare/char_pw_9_delta/joy.png` — `joy`
- `apps/web/public/assets/npcs/public-welfare/char_pw_9_delta/anger.png` — `anger`
- `apps/web/public/assets/npcs/public-welfare/char_pw_9_delta/embarrassment.png` — `embarrassment`
- `apps/web/public/assets/npcs/public-welfare/char_pw_9_delta/curiosity.png` — `curiosity`

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

- tall thin silhouette
- multi-layer observation lenses
- convenience vest over lab apron
- analysis slate
- signature prop: non-readable behavior observation slate

## Provenance notes

This expression-set sidecar records original final prompts or prompt-manifest reconstructions for the grouped NPC sprite set.

The reusable generation prompt above intentionally uses only `neutral` / natural expression. Other expressions are listed only for provenance coverage and should be generated one at a time by changing the expression suffix.

- Reconstructed from the public-welfare batch prompt manifest before sidecar rollout.
