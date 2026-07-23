# Design QA — 首页角色横滑卡

## Evidence

- Source visual truth: `C:\Users\phpxi\.codex\generated_images\019f8cc3-7a26-7702-ae90-61d257a9c26e\call_bnLOgVOzcFAmDTW4l5PFj9ac.png`
- Mobile implementation: `C:\Users\phpxi\AppData\Local\Temp\fablespace-home-carousel-qa\implementation-mobile-wei-final2-390x844.png`
- Desktop implementation: `C:\Users\phpxi\AppData\Local\Temp\fablespace-home-carousel-qa\implementation-desktop-final-1280x900.png`
- Combined mobile comparison: `C:\Users\phpxi\AppData\Local\Temp\fablespace-home-carousel-qa\comparison-mobile-source-vs-final.png`
- State: 魏观海 selected.
- Mobile viewport: 390 × 844 CSS px, device scale factor 1.
- Desktop viewport: 1280 × 900 CSS px, device scale factor 1.
- Source pixels: 852 × 1859.
- Mobile implementation pixels: 390 × 844.
- Density normalization: source resized and top-aligned to 390 × 844 before the side-by-side comparison; implementation remained at its native 390 × 844 capture.

## Full-view Comparison

- Information hierarchy matches the selected direction: warm paper canvas, navy editorial title, orange primary action, lavender selection state, avatar selector, fixed character card, pagination state, and mobile bottom navigation.
- The implementation deliberately omits the mock's explanatory subtitle, decorative book/feather art, and fabricated “上次同行” content. The UI-copy contract forbids explanatory homepage copy, and this task has no truthful continuity payload or approved decorative asset.
- Mobile card width is 348 px for all three characters. Card height is 362.91 px and the action row begins at the same vertical coordinate for all three.
- Desktop uses a 254 px selector rail and one 744 × 520 px fixed character card rather than enlarging the mobile layout.

## Required Fidelity Surfaces

- Fonts and typography: Chinese display headings use the repository-safe Song-style fallback stack; supporting UI uses the existing system sans stack. Hierarchy, weights, wrapping, and truncation remain stable across all three characters. A dedicated bundled display font would be a P3 refinement.
- Spacing and layout rhythm: mobile selector, card, actions, dots, and bottom navigation align without page-level horizontal overflow. Desktop selector and card share the same top and bottom edges. Card radius and action spacing closely follow the selected mock.
- Colors and visual tokens: warm ivory, deep navy, orange, and lavender match the selected direction with readable contrast. No dark legacy bookshelf surface remains in the implemented component.
- Image quality and asset fidelity: the real 1024 × 1024 character assets are used with character-specific object positioning; no placeholder art, CSS illustration, or improvised SVG replaces them.
- Copy and content: character names, story names, tags, descriptions, and destinations come from the real API payload. Mock-only relationship and continuity claims are not fabricated.

## Focused-region Comparison

A separate crop was not needed: the normalized 390 × 844 combined comparison keeps the selector, character copy, portrait crop, and both actions readable at 1:1 implementation density. Desktop layout was captured separately because the source visual does not define a desktop viewport.

## Interaction and Runtime Checks

- Clicking an avatar centers the corresponding mobile card and updates `aria-pressed`.
- Horizontal track scrolling from 魏观海 to 萧明珠 updates the selected avatar.
- All three cards report identical width, height, action-row height, and action-row top position at 390 px.
- The 魏观海 primary action navigates to the existing character-selected story URL.
- 390 px and 1280 px captures report `scrollWidth === clientWidth`.
- Browser console warnings/errors after navigation and return: none.

## Comparison History

1. Initial implementation comparison found an oversized 405 px mobile card and an outer square focus outline that weakened the circular avatar language.
   - Fix: reduced the mobile card to 362.91 px at the target viewport, shifted the card split to 52/48, and kept keyboard focus visible on the portrait ring without the extra square.
   - Post-fix evidence: `implementation-mobile-wei-final-390x844.png`.
2. The post-fix card left a two-character orphan line in the real 魏观海 description.
   - Fix: reduced mobile description clamping from four lines to three while retaining five lines on desktop.
   - Post-fix evidence: `implementation-mobile-wei-final2-390x844.png` and `comparison-mobile-source-vs-final.png`.

## Findings

No actionable P0, P1, or P2 differences remain within this task's accepted scope.

## Follow-up Polish

- P3: add a reviewed paper texture and light editorial ornament assets after they pass the project media pipeline.
- P3: replace the reserved lower mobile space with truthful “上次同行” content when continuity data is implemented.
- P3: bundle a licensed Chinese display font if exact cross-platform typography becomes a release requirement.

final result: passed
