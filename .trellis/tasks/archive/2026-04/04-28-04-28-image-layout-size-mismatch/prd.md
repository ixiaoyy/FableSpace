# Fix image asset and layout size mismatch

## Goal
Improve currently poor-looking image rendering caused by mismatches between image asset aspect ratios/dimensions and frontend layout containers.

## Requirements
- Identify the concrete image surfaces where assets are visibly cropped, stretched, or squeezed because container dimensions do not match asset specs.
- Preserve owner-authored tavern/NPC content and existing public asset paths; do not replace assets unless the referenced project files are actually updated.
- Prefer layout/style fixes over schema or API changes.
- Keep changes scoped to frontend presentation and asset loading unless evidence shows backend seed paths are wrong.
- Maintain mobile/narrow-screen usability.

## Acceptance Criteria
- [x] A focused research note lists affected image surfaces, asset specs, and root cause.
- [x] Fixed surfaces use stable aspect-ratio/object-fit rules matching the intended asset categories.
- [x] No image is stretched by CSS; unavoidable cropping is deliberate and visually centered.
- [x] Frontend build passes after changes.
- [x] Changed files are summarized with verification evidence.

## Technical Notes
- Use `docs/IMAGE_ASSETS_SPEC.md` and `.trellis/spec/frontend/image-asset-guidelines.md` as source of truth for asset dimensions and paths.
- Current likely asset categories: NPC portraits (256x256 square), NPC expression sprites, tavern/place atmosphere images (16:9), and public default NPC images under `frontend/public/assets/npcs/`.
- This task should not introduce new UI libraries or map/rendering dependencies.
