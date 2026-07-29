# Story chat response design QA

## Comparison target

- Source visual truth: `C:\Users\phpxi\AppData\Local\Temp\codex-clipboard-b9143e7c-4242-4065-96f6-7c7f7a3c4b44.png`
- Rendered implementation: `C:\Users\phpxi\AppData\Local\Temp\fablespace-chat-mobile-response-final-settled.jpg`
- Route: `http://127.0.0.1:4173/characters/annie/story`
- State: an active Annie StoryRun immediately after a reviewed choice receives its authored reply.
- Browser viewport override: 390 × 844 CSS px.
- Measured page viewport: `innerWidth=390`, `innerHeight=844`, `devicePixelRatio=1`; document client width is 375 px because of browser scrollbar allocation.
- Source pixels: 1920 × 1398.
- Source normalization: middle app screen cropped at `x=660, y=70, width=590, height=1278`, then resized to 375 × 812.
- Implementation screenshot pixels: 375 × 812 JPEG. The in-app browser capture omits its non-page chrome.

## Evidence

- Full-view comparison: `C:\Users\phpxi\AppData\Local\Temp\fablespace-chat-design-comparison-final.jpg`
- Focused chat/composer comparison: `C:\Users\phpxi\AppData\Local\Temp\fablespace-chat-design-comparison-focused.jpg`
- Immediate pending state: `C:\Users\phpxi\AppData\Local\Temp\fablespace-chat-mobile-pending-final-fixed.jpg`
- Settled response state: `C:\Users\phpxi\AppData\Local\Temp\fablespace-chat-mobile-response-final-settled.jpg`

The focused comparison is required because the message alignment, avatar crop,
choice-chip overflow, and composer visibility are not readable enough in the
three-device source image.

## Findings

No actionable P0, P1, or P2 differences remain for the requested interaction
pattern.

- Fonts and typography: the reference uses a compact sans-serif chat style.
  FableSpace intentionally retains its established serif story typography and
  existing system-font UI labels. Hierarchy and wrapping remain legible at the
  target viewport.
- Spacing and layout rhythm: Character replies are left aligned with an avatar,
  player choices and messages are right aligned, system narration remains
  centered, and the choice chips plus composer stay fully visible.
- Colors and visual tokens: the implementation keeps the existing paper,
  lavender, and orange tokens instead of copying the reference's yellow
  palette. Contrast remains sufficient in enabled, disabled, and pending states.
- Image quality and asset fidelity: the implementation uses the existing
  immutable CDN Character portrait. No placeholder, generated asset, or
  code-drawn substitute was added.
- Copy and content: only authored story text, names, state, choices, and direct
  action labels are visible. The transient copy is limited to `正在回应…`.

Expected scope differences: the source has a compact profile card, voice input,
timer, and dossier entry. Those surfaces were deliberately not copied; the
existing StoryWorld heading, relationship state, text composer, and historical
reference surface remain.

## Comparison history

### Iteration 1

- Evidence: `C:\Users\phpxi\AppData\Local\Temp\fablespace-chat-mobile-initial.png`
- P2: sparse conversations stretched grid rows and created an artificial gap
  between narration and Character reply.
- P2: horizontal choice and timeline scrollbars were visually exposed.
- Fix: aligned the timeline grid to the start and hid scrollbars while
  preserving touch and wheel scrolling.
- Post-fix evidence:
  `C:\Users\phpxi\AppData\Local\Temp\fablespace-chat-mobile-initial-revised.jpg`

### Iteration 2

- Evidence:
  `C:\Users\phpxi\AppData\Local\Temp\fablespace-chat-mobile-response-revised.jpg`
- P2: after a response, the bottom of the text composer could fall below the
  visible mobile viewport.
- Fix: made the active mobile run a bounded three-row chat layout with the
  timeline as the only scrolling row and the action composer as a fixed layout
  row.
- Post-fix evidence:
  `C:\Users\phpxi\AppData\Local\Temp\fablespace-chat-mobile-response-final-settled.jpg`

## Interaction verification

- Reviewed choice: the player bubble appears immediately, then
  `正在回应…`, then the authored Character response.
- Free text: Enter submits, the player bubble appears immediately, the composer
  clears, and the Character response arrives.
- Latest messages scroll into view without moving keyboard focus.
- Choice chips remain horizontally scrollable.
- No page console errors or warnings were present in the final run.

## Follow-up polish

- P3: a later iteration could add a compact Character profile card if the
  StoryWorld heading is intentionally redesigned. It is not required for this
  response-focused change.

final result: passed
