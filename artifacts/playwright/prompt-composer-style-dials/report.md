# Prompt Composer Style Dials Playwright Check

Date: 2026-05-04

## Assertions

- CharacterEditor renders a Prompt Composer / Style Dials panel.
- Desktop and mobile/narrow viewport can expand the panel.
- Style dial buttons update the local draft.
- Applying dials writes a managed FableMap style block into the existing `system_prompt` field.
- Prompt risk panel remains visible after applying style dials.

## Screenshots

- `D:\work\ai-\artifacts\playwright\prompt-composer-style-dials\desktop-prompt-composer.png`
- `D:\work\ai-\artifacts\playwright\prompt-composer-style-dials\mobile-prompt-composer.png`

## Limits

- Harness renders CharacterEditor through Vite/Playwright without backend calls.
- No Tavern schema/API/storage behavior changed.
