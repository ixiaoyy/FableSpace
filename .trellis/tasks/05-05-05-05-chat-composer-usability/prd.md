# Chat composer usability

## Problem

The tavern chat workbench reserves a large fixed/min-height chat area. With only one or a few messages, the log expands to fill the area, creating a large blank gap before the composer. The composer also shows visitor name and gender fields as full-width controls above every message, making normal chat input feel cumbersome.

## Acceptance

- Chat history no longer uses a flex filler that creates a large blank gap above the composer.
- The composer sits immediately after the current messages/notice when history is short.
- Long histories still scroll inside a bounded chat log.
- Visitor identity controls remain available but are folded into a compact settings row by default.
- Mobile remains usable; no horizontal overflow in visual self-acceptance.
