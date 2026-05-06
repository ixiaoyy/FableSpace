# Mobile Single-mainline Experience

> Contract for keeping narrow-screen navigation focused on the visitor path: locate/discover → enter tavern → return/owner secondary actions.

---

## Scope / Trigger

Use this contract when changing:

- `frontend/app/shell/product-shell.tsx`
- `frontend/app/routes/tavern.tsx`
- `frontend/app/features/tavern-chat-workbench/index.tsx`
- `frontend/app/features/tavern-layout-showcase/index.tsx`
- mobile navigation, first-screen tavern entry, or tavern secondary-panel visibility

This guide does not introduce new API, schema, persistence, or mobile-framework requirements.

---

## Contracts

- Mobile bottom dock order is exactly `首页 / 发现 / 进店 / 清单 / 管理`.
- Mobile dock `/create` label is `进店`, not `创建空间`; desktop top navigation keeps `创建空间` so owner creation remains discoverable but secondary on mobile.
- Primary top navigation is hidden below `lg` so it does not duplicate the mobile dock or expose owner/create wording in the mobile first line.
- Product shell content keeps enough bottom padding (`pb-28`) so fixed bottom dock does not cover key CTAs or footer actions.
- Mobile tavern route renders `TavernChatWorkbench` as the default `/tavern/:id` mainline; the first screen must expose NPC roster, chat history, and the bottom composer before secondary panels.
- `TavernChatWorkbench` keeps the machine-checkable marker `data-chat-workbench="sillytavern-style"` and accessible regions for `NPC 角色列表` and `聊天记录`.
- Secondary public tavern panels (`TavernShareCard`, `TavernActivitySignalsCard`, `NeighborhoodRumorBubble`, `CreatorConversionCard`) are passed through `publicPanel` and live behind the workbench `更多酒馆功能` details section.
- Owner-only management panels (`RoleplayPanel`, `PlaceHomePanel`, `VisitorNotesPanel`) must not be passed into the visitor chat workbench. They live in the dedicated `/tavern/:id/manage` route, which renders `data-tavern-owner-management="dedicated-route"` and gates display on `currentUserId === tavern.owner_id`.
- The tavern loader must derive the current viewer from `user_id` / `owner_id` / `visitor_id` query params and must not fall back from visitor reads to `DEFAULT_OWNER_ID`.
- No new mobile framework or large route/UI dependency is required for this contract.

---

## Forbidden Drift

- Do not re-label the mobile primary CTA as `创建空间`.
- Do not move owner creation/configuration panels into the mobile first screen.
- Do not expose a public visitor wall, cross-tavern social graph, friend/DM flow, ranking, combat, level, equipment, token recharge, or settlement feature while polishing mobile flow.
- Do not make the mobile path depend on generated platform tavern/NPC/story content; owner-authored/confirmed content remains the boundary.

---

## Validation Matrix

| Case | Expected |
|------|----------|
| Mobile shell | Fixed bottom dock has accessible label, touch-safe items, visitor-first labels, and no duplicate top nav |
| 320px/narrow viewport | Key CTAs remain reachable above the dock; no horizontal overflow from this contract |
| Mobile tavern | Chat workbench is the first mainline: NPC roster, chat history, and composer are reachable before secondary panels |
| Mobile tavern secondary | Public features are hidden by default behind `更多酒馆功能`; owner-only management features are absent from the chat workbench |
| Owner tavern | `/tavern/:id/manage?owner_id=<owner>` renders `data-tavern-owner-management="dedicated-route"`; visitor route does not |
| Desktop tavern | Workbench can use a richer chat layout, but management remains outside the chat page |
| Dependencies | `package.json` does not gain Capacitor/Ionic/React Native/Onsen UI |

---

## Tests Required

Run after changes touching this contract:

```powershell
node frontend/scripts/mobile-single-mainline-test.mjs
node frontend/scripts/tavern-chat-workbench-test.mjs
npm --prefix .\frontend test
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
```

For user-facing visual changes, also run Playwright self-acceptance with at least one desktop and one narrow/mobile viewport and record screenshot/report paths in the Trellis task.

---

## Good / Base / Bad

- Good: `/tavern/:id` opens directly to a SillyTavern-style chat workbench; owner-only management exists only under `/tavern/:id/manage`.
- Base: mobile guide copy points users to the chat mainline anchor; desktop keeps richer chat affordances but routes non-chat owner work to the management page.
- Bad: putting layout showcase, creator conversion, owner tools, or visitor feedback management above the chat composer; or restoring visitor-to-owner loader fallback.
