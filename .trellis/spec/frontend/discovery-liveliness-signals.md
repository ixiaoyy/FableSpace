# Discovery Liveliness Activity Summary

## Scope

Use this when changing `/discover` liveliness/activity labels that summarize rumor, owner-visible feedback, visits, gameplay, or NPC activity.

The current visitor-facing copy should use FableMap/tavern/coordinate/space wording. Legacy SoulLink-style `signal` / `online entities` wording is not allowed in visible shell labels.

This boundary is specifically for making discovery feel alive without creating a visitor social network.

## Contracts

Shared helper:

```javascript
buildDiscoveryLiveliness(tavern)
getDiscoveryLivelinessSearchText(viewOrTavern)
DISCOVERY_LIVELINESS_FORBIDDEN_COPY
```

Component:

```tsx
<DiscoveryLivelinessStrip tavern={tavern} compact muted />
```

Rules:

- Reuse `buildTavernActivityEchoes(...)` from `frontend/app/lib/tavern-activity-echoes.js` for the aggregate no-social activity model. The exported/helper name is historical; visible labels must remain tavern/space/activity-oriented.
- Use existing Tavern payload fields only: `visit_count`, `characters`, `gameplay_definitions`, and `skill_packs`.
- Treat rumor as an ambient discovery clue only; do not render a public feed.
- Treat feedback as owner-visible governance only; do not display note content, visitor identity, replies, likes, pins, or public guestbook UI.
- Do not add friends, DMs, global social graph, ranking, route planning, POI scoring, combat, levels, or equipment.
- Search text may include safe concepts such as `有人经营`, `环境传闻`, `回访反馈`, `店主可见`, and `聚合到访`.

## Good / Base / Bad

- Good: discovery card shows `附近有人经营`, `环境传闻可用`, `回访反馈给店主`, `24 次到访`.
- Base: quiet tavern shows `等待第一束灯` and encourages entering or sending owner-visible feedback.
- Bad: showing a public visitor wall, visitor names, replies/likes, rankings, a global activity feed, or visible SoulLink/signal-network labels.

## Verification

Run after changing this boundary:

```powershell
node frontend/scripts/discovery-liveliness-test.mjs
npm --prefix .\frontend test
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
```

For visible UI changes, run Playwright desktop + narrow viewport self-acceptance and record screenshot/report paths.
