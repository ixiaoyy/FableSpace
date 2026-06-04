# Doorway copy density polish

## Goal

Make the `/tavern/:id` first viewport feel like entering a playable space, not reading a product explanation.

## User evidence

- Screenshot highlighted the doorway title, how-to-play block, and long paragraph.
- Visible issue: the page surfaced explanatory strings such as `先知道怎么玩，再开始`, `这个空间怎么玩`, and demo-seed boundary copy.

## Scope

- Frontend-only.
- No API, Schema, database, dependency, or owner-content contract changes.
- Keep real-coordinate anchoring and owner-authored content sovereignty.

## Planned change

- Shorten `buildTavernFirstMinuteGuide` defaults into action-oriented visitor copy.
- Avoid using demo/policy seed text as first-minute scene copy.
- Render the doorway as compact anchor + immediate action buttons + host NPC, with less explanatory prose.
- Remove the duplicate mobile shell route guide for Tavern pages so the doorway is the first mobile experience.
- Add mobile dock clearance so the fixed bottom navigation does not sit on top of doorway controls.
- Shorten story-branch safety copy without changing behavior.

## Result

- The doorway left card now shows `入口`, `推门，找线索`, coordinate anchor, `现在做`, and three immediate action buttons.
- Demo/policy seed copy is filtered out of visitor-facing first-minute scene hints.
- Tavern mobile shell guide was removed so mobile opens directly on the doorway.
- Mobile doorway spacing leaves room for the fixed bottom dock between the action card and host card.
- Story-branch safety copy was shortened without changing behavior.

## Validation

- `npm --prefix .\frontend run typecheck` passed after sandbox Tailwind/Vite spawn EPERM required escalation.
- `npm --prefix .\frontend run build` passed after the same sandbox limitation required escalation.
- `git -c safe.directory=D:/work/ai- diff --check` passed.
- `.trellis\tmp\scene-setting-prose-visual-acceptance.cjs` passed against `http://127.0.0.1:8950`.
- Screenshots: `.trellis/tmp/scene-setting-prose-evidence/doorway-desktop.png`, `doorway-mobile.png`, `chat-desktop.png`, `chat-mobile.png`.
- In-app Browser DOM check found 3 doorway action buttons, no old explanatory terms, and no horizontal overflow.
