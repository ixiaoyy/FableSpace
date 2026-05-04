# Voice Greeting TTS Synthesis and Playback Design

## Completion decision

Complete as a boundary design for controlled synthesis/playback. Existing preview and TTS service boundaries already support the safe MVP shape: preview text first, synthesize only after explicit user action, and never auto-play or store audio by default.

## Existing evidence inspected

- `.trellis/spec/backend/voice-greeting-preview-contract.md`: preview selects `first_mes`/alternate greeting and returns `tts_request` without audio bytes or persistence.
- `.trellis/spec/frontend/voice-greeting-preview-boundary.md`: UI must preview first and call `/tts` only after a click.
- `backend/src/fablemap_api/core/voice_greeting.py`: helper sets `audio_generated=false`, `preview_only=true`, and strips provider secrets.
- `frontend/app/product/services/tavernService.js`: product service has `previewVoiceGreeting(...)` and explicit `synthesizeVoice(...)` methods.
- `frontend/app/lib/taverns.ts`: native route client exposes typed preview response and explicit blob synthesis.
- `docs/ARCHITECTURE.md`: voice preview is no-audio and does not consume owner TTS/API key.

## Playback boundary

- Preview state: may display greeting text, readiness, provider label, and notes.
- User action: a play button may call `/tts` with `tts_request` only after the user clicks.
- Audio lifecycle: returned blob URL is ephemeral UI state; do not persist unless a future storage task defines retention/deletion.
- Auto-play: never auto-play on tavern entry or preview load, even if config contains `auto_play` metadata.
- Cost/secrets: owner provider settings and costs remain owner-controlled; API keys are not returned or logged.
- Voice cloning/upload: out of scope until separate consent and retention design exists.

## Deferred future storage

Persistent greeting audio would require a separate owner-scoped asset model, a cache invalidation story when `first_mes` or voice config changes, deletion controls, provider-cost accounting, and tests proving audio URLs do not leak private tavern data.

## Verification

Docs/code-inspection completion. Future code changes must run the backend voice tests, frontend voice script, typecheck, and build listed in the voice preview specs.
