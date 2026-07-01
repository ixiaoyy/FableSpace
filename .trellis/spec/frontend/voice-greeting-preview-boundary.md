# Voice Greeting Preview Frontend Boundary

> Frontend contract for no-audio NPC opening-line voice previews.

## Scope / Trigger

Use this guide when changing:

- `frontend/app/lib/spaces.ts` `previewVoiceGreeting(...)`
- `frontend/app/product/services/spaceService.js` product parity helper
- future UI play buttons for first greeting / alternate greetings
- `frontend/scripts/voice-greeting-test.mjs`

## Service boundary

Native route modules must use:

```typescript
previewVoiceGreeting(spaceId, { characterId, greetingIndex }, userId)
```

Product parity components must use:

```javascript
service.previewVoiceGreeting(spaceId, { characterId, greetingIndex }, userId)
```

Do not call `/voice-greeting/preview` directly in components.

## UI rules

- Preview is not audio playback. Show it as text + readiness before calling `/tts`.
- A play button should call `/tts` only after explicit user action.
- Do not auto-play just because preview returned `auto_play=true`; `auto_play` is configuration metadata and must be handled deliberately by the existing TTS flow.
- Do not display API keys, provider secrets, or raw error traces.
- Do not add voice cloning/upload UI without a separate retention/consent design.

## Payload contract

```typescript
type VoiceGreetingPreviewResponse = {
  ok: boolean
  preview_only: boolean
  applied: boolean
  audio_generated: boolean
  tts_ready: boolean
  greeting: { text: string; source: string; greeting_index: number }
  voice: { enabled: boolean; tts_provider: string; tts_voice?: string; tts_model?: string; tts_speed?: number; tts_language?: string; auto_play?: boolean }
  tts_request: { text: string; character_id: string }
  notes: string[]
}
```

## Validation & Error Matrix

| Case | Expected |
|------|----------|
| Valid preview | service returns text, `audio_generated=false`, and `tts_request` |
| Voice disabled | UI can show text preview and disabled/secondary play state |
| Unknown character | backend error surfaced to user |
| Future play action | call existing `synthesizeVoice(spaceId, preview.tts_request, userId)` |

## Good/Base/Bad Cases

- Good: UI previews first greeting, then user clicks “播放问候” to synthesize.
- Base: UI copies greeting text even if voice is disabled.
- Bad: UI calls `/tts` automatically on page load or hides that TTS may incur owner provider cost.

## Tests Required

```powershell
node .\frontend\scripts\voice-greeting-test.mjs
npm --prefix .\frontend test
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
```

The script must assert:

- product service method exists;
- endpoint path is `/api/v1/spaces/{id}/voice-greeting/preview`;
- method is `POST`;
- request body preserves `character_id` and `greeting_index`;
- native `frontend/app/lib/spaces.ts` exports `VoiceGreetingPreviewResponse` and `previewVoiceGreeting`.

## Wrong vs Correct

### Wrong

```jsx
useEffect(() => {
  synthesizeVoice(spaceId, { text: character.first_mes })
}, [])
```

### Correct

```jsx
const preview = await service.previewVoiceGreeting(spaceId, { characterId }, visitorId)
// later, after explicit click:
await service.synthesizeVoice(spaceId, preview.tts_request.text, preview.tts_request.character_id, visitorId)
```
