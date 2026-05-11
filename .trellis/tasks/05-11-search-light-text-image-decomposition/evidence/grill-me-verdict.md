# Grill-Me Verdict: Discover light text+image decomposition

Verdict: PASS

Source of truth:
- User request: “拆解搜索页light样式，把图片改成文字和图片”。
- Design/style reference: `.trellis/tasks/05-10-05-10-ui-ux-design-audit-and-polish/reference-designs/search_light.png` (`1536x1024`).
- Project constraints: `AGENTS.md`, `.trellis/spec/frontend/component-guidelines.md`, `.trellis/spec/frontend/image-asset-guidelines.md`.

Evidence:
- `frontend/app/components/soul-link-reference-artboards.tsx` no longer imports `../assets/soul-link-05-10/discover-light/main*` or `right-rail*`.
- `frontend/app/routes/discover.tsx` no longer imports `../assets/soul-link-05-10/discover-light/main-2x.png`.
- `node .\frontend\scripts\soul-link-reference-artboards-test.mjs` passed.
- `node .\frontend\scripts\discover-view-mode-test.mjs` passed.
- `npm --prefix .\frontend run build` passed.
- `node .trellis\tasks\05-11-search-light-text-image-decomposition\playwright-discover-light-text-image-check.mjs` passed and asserts no rendered light full main/right-rail slice dimensions (`1018x1024`, `318x1024`).
- Screenshots:
  - `.trellis/tasks/05-11-search-light-text-image-decomposition/evidence/discover-light-text-image-desktop.png`
  - `.trellis/tasks/05-11-search-light-text-image-decomposition/evidence/discover-light-text-image-mobile.png`

Problems:
1. [medium] This is a style decomposition, not a pixel-perfect 1:1 match to `search_light.png`. DOM sections follow the light visual language and layout but copy/spacing/right-rail content are adapted to existing FableMap data and shared component constraints.
2. [medium] When search filtering returns fewer taverns than the eight visual card slots, remaining slots use deterministic fallback coordinate cards. This preserves the reference grid but means search results are visually padded.
3. [low] Black/dark discover still uses its existing full screenshot slice path. Out of scope because request targeted light style only.
4. [blocked-unrelated] `npm --prefix .\frontend run typecheck` fails in untouched `frontend/app/product/CharacterEditor.jsx`; full `npm test` stops at untouched `mini-games-test.mjs` (`9 !== 6`). These are not caused by this task but block claiming full repo health.

Questions / decisions needed:
- If the target is strict 1:1 reference reproduction, confirm whether we should further tune exact coordinates, typography, and content counts against `search_light.png`.

Smallest safe next step:
- Human visual review the desktop/mobile screenshots above; if acceptable, keep scope as decomposition complete. If not, provide exact mismatch points to tune.
