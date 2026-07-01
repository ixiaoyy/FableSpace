# Space GM Layer Preview Frontend Boundary

> Frontend contract for calling preview-only structured GM suggestions.

## Scope / Trigger

Use this guide when changing:

- `frontend/app/lib/spaces.ts` GM Layer types and `previewGmLayer(...)`
- `frontend/app/product/services/spaceService.js` product parity helper
- future GM Layer UI panels that display preview candidates
- `frontend/scripts/gm-layer-test.mjs`

## Service boundary

Native route modules must use:

```typescript
previewGmLayer(spaceId, data, userId)
```

Product parity components must use:

```javascript
service.previewGmLayer(spaceId, data, userId)
```

Do not call `fetch('/api/v1/spaces/.../gm-layer/preview')` directly inside components.

## Payload contract

Request:

```typescript
type GmLayerPreviewRequest = {
  visitor_id?: string
  character_id?: string
  user_message?: string
  assistant_message?: string
  source_message_ids?: string[]
  source?: string
}
```

Response:

```typescript
type GmLayerPreviewResponse = {
  ok: boolean
  space_id: string
  space_name?: string
  visitor_id: string
  gm_mode: string
  preview_only: boolean
  applied: boolean
  candidates: StateCard[]
  summary: { total: number; task: number; resource: number; conflict: number; event_log: number }
  notes: string[]
}
```

## UI rules

- Display GM Layer results as suggestions, not facts.
- Copy must say that preview does not write canon and confirmation still happens through State Cards.
- If `candidates` are shown in UI, reuse State Card wording such as `加入正史` / `忽略本次`.
- Do not expose hidden prompts, owner API keys, or private visitor data beyond the current API response.
- Keep narrow-screen buttons touch-friendly if a panel is added.

## Validation & Error Matrix

| Case | Expected |
|------|----------|
| Missing user identity | service surfaces backend error message |
| Empty text | service surfaces backend error message mentioning 回合文本 |
| Valid preview | UI/helper receives `preview_only=true`, `applied=false`, `candidates` |
| Candidate confirmation | must call `decideStateCard`, not `previewGmLayer` |
| Future component display | no raw fetch and no "already saved" wording |

## Good/Base/Bad Cases

- Good: a component calls `previewGmLayer(...)`, then renders candidate cards as pending suggestions.
- Base: a route uses the typed helper for a tool panel without adding UI persistence.
- Bad: component posts preview, then locally treats candidates as confirmed facts or writes them to space payload.

## Tests Required

```powershell
node .\frontend\scripts\gm-layer-test.mjs
npm --prefix .\frontend test
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
```

The script must assert:

- product service method exists;
- endpoint path is `/api/v1/spaces/{id}/gm-layer/preview`;
- method is `POST`;
- request body preserves `visitor_id` and `source_message_ids`;
- native `frontend/app/lib/spaces.ts` exports `GmLayerPreviewResponse` and `previewGmLayer`.

## Wrong vs Correct

### Wrong

```jsx
await fetch(`/api/v1/spaces/${id}/gm-layer/preview`, { method: 'POST' })
setFacts(response.candidates)
```

### Correct

```jsx
const preview = await service.previewGmLayer(id, draft, visitorId)
setPendingSuggestions(preview.candidates)
```

The component keeps preview candidates separate from confirmed canon.
