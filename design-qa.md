# Homepage Design QA

## Comparison target

- Source visual truth: `D:\work\ai-\UI稿\index.png`
- Rendered implementation: `D:\work\ai-\design-qa-implementation-final.png`
  (local QA artifact; intentionally excluded from Git)
- Combined comparison: `D:\work\ai-\design-qa-comparison-final.png`
  (local QA artifact; intentionally excluded from Git)
- Route/state: `/`, ready state, Wei Guanhai selected
- CSS viewport: `426 × 922`
- Source pixels: `853 × 1844`
- Source normalization: downsampled to `426 × 922` with Lanczos 3
- Implementation pixels: `426 × 922`
- Browser device pixel ratio: `2`; the browser screenshot API returned CSS-pixel dimensions

## Full-view comparison evidence

The source and implementation were placed in one `860 × 922` comparison image
at the same CSS-pixel scale. The final implementation preserves the source
composition: header, title, three character selectors, centered active card,
pagination, story link, companion row, and fixed bottom navigation all occupy
the same viewport in the same order.

Measured final implementation anchors:

| Region | Bounds |
|---|---|
| Active card | `x=27, y=373.07, w=372, h=318` |
| Pagination | `y=693.07, h=15` |
| Story link | `x=118, y=711.07, w=190, h=29` |
| Companion section | `y=746.07, h=92.40` |
| Bottom navigation | `y=858, h=64` |

The document and viewport are both `426 × 922`; there is no horizontal or
vertical overflow.

## Focused comparison evidence

Separate crops were not required because the normalized combined image keeps
the full page at one CSS pixel per output pixel and the typography, portraits,
card content, icons, and navigation remain legible. Focused visual inspection
covered:

- Header/title: Georgia brand wordmark; Song-style Chinese display type;
  orange underline and sparkle; book-and-quill decoration.
- Character selector: three correct subjects; Wei selected; active orange and
  lavender rings.
- Active card: correct Wei portrait, palace/snow setting, relationship label,
  divider, story copy, and orange action.
- Footer: pagination, story link, companion portraits/copy, and three-item
  navigation.

## Required fidelity surfaces

- Fonts and typography: matching serif hierarchy and weights; runtime
  antialiasing/fallback rendering remains a minor platform-level difference.
- Spacing and layout rhythm: major anchors, card dimensions, section order, and
  bottom-nav placement match the normalized source.
- Colors and visual tokens: paper `rgb(255, 248, 235)`, ink
  `rgb(17, 24, 60)`, orange `rgb(247, 154, 24)`, and lavender
  `rgb(114, 86, 216)`.
- Image quality and asset fidelity: all three character assets load at
  `1024 × 1024`; the UI decoration loads at `263 × 255`; no placeholder image
  is rendered.
- Copy and content: title, subtitle, character names, story metadata, story
  link, companion heading/copy, and navigation labels match the source state.

## Interaction and runtime evidence

- Initial selection: Wei Guanhai, carousel `scrollLeft=386`.
- Annie pagination: selected Annie, `scrollLeft=0`.
- Xiao Mingzhu pagination: selected Xiao Mingzhu,
  `scrollLeft=maxScroll=772`.
- Returning to Wei: selected Wei Guanhai, `scrollLeft=386`.
- Browser console warnings/errors: none.
- All expected images completed with non-zero natural dimensions.

## Comparison history

### Pass 1 — blocked

- Findings: title too narrow, active card six pixels too wide, card portrait
  too large/right-shifted, CTA wider than the source.
- Pixel diagnostic: MAE `31.05`, RMSE `59.27`.

### Pass 2 — blocked

- Fixes: corrected title vertical position, card width/padding, CTA width,
  card-copy vertical rhythm, and Wei crop.
- Remaining finding: portrait composition and title width still visibly
  drifted.
- Pixel diagnostic: MAE `30.87`, RMSE `58.85`.

### Pass 3 — blocked

- Fixes: used the complete square portrait in the card and corrected heading
  proportions.
- Remaining finding: small title/brand width and portrait horizontal-position
  drift.
- Pixel diagnostic: MAE `30.50`, RMSE `58.43`.

### Final pass

- Fixes: final heading/brand proportion adjustment and a ten-pixel Wei portrait
  translation.
- Pixel diagnostic: MAE `30.42`, RMSE `58.37`. These whole-image metrics include
  the source screenshot's paper texture, raster compression, font
  antialiasing, and decorative pixel noise; the pass decision is based on the
  normalized combined visual inspection and measured layout anchors.
- No actionable P0, P1, or P2 mismatch remains.
- Residual P3: platform font antialiasing and small icon-stroke/texture
  differences.

## Final result

final result: passed
