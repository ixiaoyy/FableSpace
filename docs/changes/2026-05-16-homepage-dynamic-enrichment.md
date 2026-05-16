# 2026-05-16 Homepage Dynamic Enrichment

## Summary

The homepage now has public platform aggregate endpoints for global stats and recent assistant snippets.

## API

- `GET /api/v1/platform/stats`
  - Counts public, real-coordinate, non-Home taverns.
  - Returns coordinate, character, visit/encounter, open-tavern, and chat-message totals.
- `GET /api/v1/platform/recent-memories?limit=1..5`
  - Returns recent assistant-message snippets from public, real-coordinate, non-Home taverns.
  - Excludes user messages, visitor identity fields, private taverns, Home records, owner LLM config, and hidden prompts.

Both endpoints use the transitional global `{data, meta}` transport envelope while preserving top-level legacy keys.

## Frontend

- `/` fetches tavern cards, platform stats, and recent memories in parallel.
- Stats/memory failures are non-blocking and fall back to existing local homepage content.
- The hero current-coordinate badge now reflects the first featured real coordinate and client-side current time.
