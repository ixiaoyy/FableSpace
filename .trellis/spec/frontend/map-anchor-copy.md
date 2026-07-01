# Map Anchor Emotional Copy

## Scope

Use this when changing map/discovery copy that describes a Space's real-world anchor in `frontend/app/product/`.

The goal is to make real coordinates feel like a cyber-space entrance — a street door, lantern, signboard, or operated nearby space — without turning FableSpace into a traditional map app.

## Contracts

Shared copy helpers live in `frontend/app/product/mapAnchorCopy.js`:

```javascript
formatSpaceAnchorLocation(space)
buildMapAnchorCardCopy(space)
buildMapAnchorMarkerCopy(space)
buildMapAnchorSummaryCopy({ matching, total })
```

Rules:

- Keep `address`, `lat`, and `lon` as presentation input only; do not add persistent fields.
- Prefer owner/product language such as `街角门牌`, `坐标门牌`, `街区灯牌`, `灯牌亮着`, `附近有人经营`.
- Keep the real anchor visible: if address exists show it; otherwise show formatted coordinates; if neither exists show `坐标待确认`.
- User-facing UI should avoid raw implementation wording like `marker`.
- Do not introduce navigation, route planning, POI ratings, rankings, or traditional map-app affordances.
- The helper may reuse `spaceService` access/status label helpers, but must not make network calls or mutate Space payloads.

## Good / Base / Bad

- Good: discovery card shows `街角门牌 · 老街巷口 17 号` and keeps access/status chips as separate facts.
- Base: coordinate fallback shows `坐标门牌 · 31.2304, 121.4737`.
- Bad: adding a persisted `anchor_copy` field, hiding coordinates entirely, or showing `地图显示 12 个 marker` in UI copy.

## Verification

Run after changing this boundary:

```powershell
node frontend/scripts/map-anchor-copy-test.mjs
npm --prefix .\frontend test
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
```

For visible UI changes, run Playwright desktop + narrow viewport self-acceptance and record screenshots/report paths in the task PRD.
