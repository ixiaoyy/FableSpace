# Platform Home API Contract

## Scope

Use this when changing public homepage aggregate endpoints under `/api/v1/platform/*`.

## Signatures

```python
GET /api/v1/platform/stats
GET /api/v1/platform/recent-memories?limit=1..5
```

Frontend callers:

```typescript
getPlatformStats(): Promise<{ stats: PlatformStats; updated_at?: string }>
getPlatformRecentMemories({ limit?: number }): Promise<PlatformRecentMemoriesResponse>
```

## Contract

- `/stats` returns public, non-private platform totals:
  - `stats.coordinates`: count of public, real-coordinate, non-Home spaces.
  - `stats.characters`: total NPC count in those spaces.
  - `stats.visits` / `stats.encounters`: total public visit encounters.
  - `stats.open`: count of open public spaces.
  - `stats.chat_messages`: aggregate message count, for diagnostics only.
- `/recent-memories` returns at most 5 assistant-message snippets from public, real-coordinate, non-Home spaces.
- Recent memory payloads may include `content`, `source`, `space_id`, `character_id`, `character_name`, and `timestamp`.
- Recent memory payloads must not expose `visitor_id`, `visitor_name`, owner LLM config, hidden prompts, user messages, private spaces, or Home records.
- Both endpoints are transport-enveloped by the global `{data, meta}` middleware while retaining transitional top-level keys.

## Validation points

```powershell
py -3 -m pytest backend/tests/test_platform_home_api.py -q --tb=short
py -3 -m compileall -q backend/src
```

Required assertions:

- Private/Home spaces are excluded from homepage platform totals.
- Assistant snippets from public spaces are returned as real text.
- User messages and visitor identifiers are not returned.
