# Visual Souvenir Preview Frontend Boundary

> Frontend contract for no-image shared-moment souvenir prompt previews.

## Scope / Trigger

Use this guide when changing:

- `frontend/app/lib/spaces.ts` `previewVisualSouvenir(...)`
- `frontend/app/product/services/spaceService.js` product parity helper
- future UI panels that show souvenir prompts
- `frontend/scripts/visual-souvenir-test.mjs`

## Service boundary

Native route modules must use:

```typescript
previewVisualSouvenir(spaceId, data, userId)
```

Product parity components must use:

```javascript
service.previewVisualSouvenir(spaceId, data, userId)
```

Do not call `/visual-souvenir/preview` directly in components.

## UI rules

- Treat the result as prompt preview, not generated artwork.
- Do not claim “已生成图片” when `image_generated=false`.
- If a future UI adds generation, generated files must be moved into project asset paths before being referenced.
- Do not show visitor ids, private contact data, owner API keys, or hidden prompts.
- Keep an explicit review step before generation.

## Payload contract

```typescript
type VisualSouvenirPreviewResponse = {
  ok: boolean
  preview_only: boolean
  applied: boolean
  image_generated: boolean
  requires_confirmation: boolean
  souvenir: {
    prompt: string
    negative_prompt: string
    source_summary: string
    style: string
  }
  privacy_notes: string[]
  next_action: string
}
```

## Validation & Error Matrix

| Case | Expected |
|------|----------|
| Valid preview | UI receives prompt and `image_generated=false` |
| Missing visitor/character/text | backend error surfaced to user |
| Future generation UI | must not use preview response as image asset |
| Image generated in future | must satisfy image asset guidelines before completion |

## Good/Base/Bad Cases

- Good: UI displays prompt and negative prompt with a “review before generation” state.
- Base: UI copies prompt for manual owner review.
- Bad: UI saves generated image from chat/temp preview and reports it as shipped asset.

## Tests Required

```powershell
node .\frontend\scripts\visual-souvenir-test.mjs
npm --prefix .\frontend test
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
```

The script must assert:

- product service method exists;
- endpoint path is `/api/v1/spaces/{id}/visual-souvenir/preview`;
- method is `POST`;
- request body preserves `visitor_id`, `character_id`, and message text;
- native `frontend/app/lib/spaces.ts` exports `VisualSouvenirPreviewResponse` and `previewVisualSouvenir`.

## Wrong vs Correct

### Wrong

```jsx
setImageUrl(preview.souvenir.prompt)
```

### Correct

```jsx
setPromptDraft(preview.souvenir.prompt)
setRequiresReview(true)
```
