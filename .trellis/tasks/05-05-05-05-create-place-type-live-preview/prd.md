# Create place type live preview

## Problem

On `/create`, the left Step 01 place-type cards update the local `placeType` state, but the right-side preview/guidance cards still read like fixed tavern copy: static AI draft helper, static tavern street image caption, generic first NPC card, and generic checklist. This makes the selection feel fake.

## Acceptance

- Right-side preview has a machine-checkable live preview marker.
- The preview visibly uses `activePlaceType` label, tone, description, icon/style, and reserved/private hint.
- The AI draft helper copy is based on the current place type, not hardcoded "酒馆创意".
- The first NPC and checklist cards mention the selected place type.
- Desktop and mobile Playwright checks verify clicking a different place type updates right-side text without horizontal overflow.
