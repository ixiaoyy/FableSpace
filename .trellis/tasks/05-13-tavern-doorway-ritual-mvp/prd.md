# Tavern Doorway Ritual MVP

## Result

Implemented one visitor immersion beat before chat workbench controls.

## Completed Scope

- Non-owner visitors see `data-tavern-doorway-ritual` before public/private channel controls and composer.
- Doorway shows a real-coordinate anchor, visitor-facing `whyHere` copy, host NPC greeting, and one CTA.
- CTA switches to the selected NPC private chat, fills/focuses the composer, and does not auto-send.
- Owner view bypasses the ritual; password-gated spaces still require password first.

## Validation

- `node frontend/scripts/tavern-doorway-ritual-test.mjs`: PASS.
- `npm --prefix .rontend run typecheck`: PASS.
- `npm --prefix .\frontend test`: PASS; `npm --prefix .\frontend run build`: PASS.

## Spec

- `.trellis/spec/frontend/tavern-doorway-ritual-ui.md`
