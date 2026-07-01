# Revisit-care Notification Boundary

> Frontend boundary for proactive revisit-care notification design and previews.

## Scope

Use this guide when touching revisit-care, return-visit reminders, proactive notification copy, notification scheduling previews, or any UI that suggests reaching out to a visitor after a space visit.

Current product status:

- `docs/ARCHITECTURE.md` and `docs/WORLD_SCHEMA.md` keep real proactive `revisit-care` notification scheduling outside the current schema/API version.
- Frontend may show a **design / policy preview** only.
- No component may enable push/email/SMS, persistent scheduling, or backend delivery without a separate schema/API task.

## Contracts

Any future revisit-care notification design must satisfy all of these before it can send anything:

1. **Default off / opt-in required** — the visitor must actively subscribe before any proactive contact.
2. **Quiet hours required** — no active contact during visitor-local quiet hours.
3. **Frequency cap required** — use a weekly cap and minimum interval between touches.
4. **Unsubscribe required** — cancellation must be available and respected.
5. **In-app first** — current frontend previews may only model `in_app`; no OS push, email, SMS, or cross-channel delivery.
6. **No marketing/social growth loops** — no advertising, resurrection campaigns, friend-online pings, rankings, public feeds, or visitor-to-visitor social graph.
7. **No platform-authored content publishing** — reminders may reference existing owner/visitor-visible facts, but must not auto-generate or publish space/NPC/story content.

## Approved helper pattern

Keep policy/rule logic in a pure helper under `frontend/app/lib/` and test it with a script test:

```javascript
import {
  normalizeRevisitCarePolicy,
  evaluateRevisitCareCandidate,
} from "../app/lib/revisit-care-notification-policy.js"

const policy = normalizeRevisitCarePolicy({ optIn: true })
const result = evaluateRevisitCareCandidate({
  trigger: "owner_replied_feedback",
  channel: "in_app",
  now: "2026-05-04T21:00:00+08:00",
}, policy)
```

Expected behavior:

- Missing opt-in blocks.
- Unsubscribe blocks.
- Quiet hours block.
- Weekly cap / minimum interval block.
- Marketing/social/growth triggers block.
- Non-`in_app` channels block.
- Generated/published content flags block.

## UI rules

- Clearly label current surfaces as “未启用设计预览” / preview-only.
- Say that the UI does **not** send notifications and does **not** write schema.
- Keep preview controls local with `useState`; do not introduce global state or persistence for this design.
- Use polished FableSpace cards/panels and keep mobile/narrow screens usable.

## Required checks

For frontend revisit-care notification preview changes:

```powershell
node .\frontend\scripts\revisit-care-notification-policy-test.mjs
npm --prefix .\frontend test
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
npm --prefix .\frontend run test:revisit-care-ux
```

Playwright acceptance must capture desktop and narrow/mobile screenshots and record them in the task PRD or final report.
