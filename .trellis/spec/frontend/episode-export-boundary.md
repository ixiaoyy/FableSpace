# Serial Episode Export Frontend Boundary

> Frontend contract for deterministic chat/state-card episode exports.

## Scope / Trigger

Use this guide when changing:

- `frontend/app/lib/spaces.ts` episode export types and `exportEpisode(...)`
- `frontend/app/product/services/spaceService.js` product parity helper
- future UI panels that download/render episode markdown
- `frontend/scripts/episode-export-test.mjs`

## Service boundary

Native route modules must use:

```typescript
exportEpisode(options, userId)
```

Product parity components must use:

```javascript
service.exportEpisode(options, userId)
```

Do not call `/api/v1/spaces/.../episodes/export` directly in components.

## Payload contract

Request options:

```typescript
type EpisodeExportOptions = {
  spaceId?: string
  visitorId?: string
  characterId?: string
  title?: string
  includePending?: boolean
  format?: "markdown" | "json" | string
  limit?: number
}
```

Response:

```typescript
type EpisodeExportResponse = {
  ok: boolean
  space_id: string
  visitor_id: string
  character_id: string
  format: string
  persisted: boolean
  episode: {
    title: string
    summary: string
    markdown: string
    messages: Array<{ role: string; speaker: string; content: string }>
    state_cards: Array<{ category: string; status: string; title: string; summary?: string }>
    message_count: number
    state_card_count: number
  }
}
```

## UI rules

- Copy must call the output a “导出草稿” or “记录导出”, not “AI 自动写好的小说”.
- Require or clearly show a single visitor scope; do not provide an all-visitors one-click export.
- Show `persisted=false` / no-persistence semantics if the user might assume the draft was saved.
- Do not display hidden prompts, owner API keys, private memories, or unrelated visitors' records.
- If pending State Cards are included, label them as pending candidates.

## Validation & Error Matrix

| Case | Expected |
|------|----------|
| Missing visitorId | backend error surfaced to user |
| Non-owner exporting another visitor | backend error surfaced to user |
| Valid export | UI receives markdown and counts |
| User downloads/copies markdown | uses `episode.markdown`; does not mutate space state |
| Future component | no raw fetch and no all-visitors default |

## Good/Base/Bad Cases

- Good: owner selects one chat session row and calls `exportEpisode({ spaceId, visitorId, characterId })`.
- Base: visitor exports their own current session.
- Bad: component hides visitor scope and exports all chat sessions by default.

## Tests Required

```powershell
node .\frontend\scripts\episode-export-test.mjs
npm --prefix .\frontend test
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
```

The script must assert:

- product service method exists;
- endpoint path is `/api/v1/spaces/{id}/episodes/export`;
- method is `POST`;
- request body preserves `visitor_id`, `character_id`, `title`, and `include_pending`;
- native `frontend/app/lib/spaces.ts` exports `EpisodeExportResponse` and `exportEpisode`.

## Wrong vs Correct

### Wrong

```jsx
await fetch(`/api/v1/spaces/${id}/episodes/export`, { method: 'POST' })
```

### Correct

```jsx
const result = await service.exportEpisode({ spaceId, visitorId, characterId }, userId)
copyToClipboard(result.episode.markdown)
```
