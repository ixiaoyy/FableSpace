# Cultivation Text Image Card Slots

## Goal

Define the “text + image” version of cultivation taverns as card slots and asset rules before generating or wiring formal images.

## Todo

* Define MVP card types: retreat record, mind-state card, NPC message card, hidden clue card, and place atmosphere card.
* Decide which cards can use existing/static assets versus future AI-generated images.
* For any formal generated image, require project-local placement, prompt sidecar, width/height/hash verification, and frontend build if referenced.
* Define safe image constraints: no real-person likeness, no private exact address, no brands/logos/IP imitation.

## Acceptance Criteria

* [ ] Card slot schema/UI expectations are documented.
* [ ] Asset placement follows `docs/IMAGE_ASSETS_SPEC.md` and frontend image guidelines.
* [ ] MVP can ship with placeholders or existing assets without falsely claiming generated images exist.

## Out of Scope

* Generating final image assets in this planning task.
* Leaving deliverable images in `.codex/generated_images` only.
* Photorealistic real-person NPC portraits.
