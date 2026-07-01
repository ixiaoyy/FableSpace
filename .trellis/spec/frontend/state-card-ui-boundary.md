# State Card Review UI Boundary

> Frontend contract for displaying and deciding Canon Ledger candidates.

## Scope

Use this guide when changing:

- `frontend/app/lib/spaces.ts`
- `frontend/app/product/services/spaceService.js`
- `frontend/app/product/StateCardReviewPanel.jsx`
- `frontend/app/product/SpaceChatRoom.jsx`
- `frontend/scripts/state-cards-test.mjs`

## Service boundary

Components must use service helpers:

```typescript
listStateCards(spaceId, filters, userId)
createStateCard(spaceId, data, userId)
decideStateCard(spaceId, cardId, { status, note }, userId)
```

Do not call `fetch('/api/.../state-cards')` directly in product components.

## UI rules

- Pending cards must be presented as candidate changes, not as already-confirmed facts.
- UI copy must state that AI proposes changes and confirmation writes them to structured canon.
- Confirmation actions are `加入正史` for `confirmed` and `忽略本次` for `rejected`.
- `metadata.contradiction_candidate` must be visible to the user as a caution.
- The panel must be usable on narrow screens; buttons need touch-friendly hit areas.
- Do not expose owner API keys, hidden prompts, or private data beyond the current visitor/owner API response.

## Required tests

```powershell
node .\frontend\scripts\state-cards-test.mjs
npm --prefix .\frontend test
npm --prefix .\frontend run build
```
