# Voice Greeting Preview API Contract

> Backend contract for no-audio NPC opening-line voice previews.

## Scope / Trigger

Use this guide when changing:

- `backend/src/fablespace_api/core/voice_greeting.py`
- `backend/src/fablespace_api/application/services/runtime.py` `preview_voice_greeting(...)`
- `backend/src/fablespace_api/api/v1/runtime.py` `/voice-greeting/preview`
- frontend callers for `/api/v1/spaces/{id}/voice-greeting/preview`

This feature is a TTS-adjacent preview. It must not synthesize audio or create voice-cloning/storage obligations.

## Signatures

```python
build_voice_greeting_preview(
    *,
    space_id: str,
    space_name: str = "",
    character: SpaceCharacter,
    voice_config: VoiceConfig | None = None,
    greeting_index: int | str = 0,
) -> dict[str, Any]
```

```http
POST /api/v1/spaces/{space_id}/voice-greeting/preview
```

Request:

```json
{
  "character_id": "char_keeper",
  "greeting_index": 0
}
```

Response:

```json
{
  "ok": true,
  "preview_only": true,
  "applied": false,
  "audio_generated": false,
  "tts_ready": false,
  "greeting": {
    "text": "...",
    "source": "first_mes",
    "greeting_index": 0
  },
  "voice": {
    "enabled": false,
    "tts_provider": "edge_tts",
    "tts_voice": "",
    "tts_model": "",
    "tts_speed": 1.0,
    "tts_language": "",
    "auto_play": false
  },
  "tts_request": {
    "text": "...",
    "character_id": "char_keeper"
  },
  "notes": ["..."]
}
```

## Contracts

- `greeting_index=0` selects `first_mes`.
- `greeting_index=N` where `N > 0` selects `alternate_greetings[N-1]` if present.
- Preview does not call `/tts` internally and does not return bytes/blob/audio URLs.
- Preview does not persist anything.
- Response must not include API keys, authorization headers, or owner secrets.
- `tts_ready` is true only when voice is enabled and greeting text is non-empty.
- Private space visibility still applies through `_ensure_visible(...)`.

## Validation & Error Matrix

| Case | Expected |
|------|----------|
| Missing space | `404 {"error": "空间不存在"}` |
| Private space viewed by non-owner | `403 {"error": "此空间是私人的"}` |
| Missing `character_id` | `400 {"error": "语音问候预览需要 character_id"}` |
| Unknown character | `404 {"error": "角色不存在"}` |
| Voice disabled | `200`, `tts_ready=false`, note mentions 语音未启用 |
| Voice enabled | `200`, `tts_ready=true`, `tts_request` returned |
| Alternate greeting index | source is `alternate_greetings[n]` |

## Good/Base/Bad Cases

- Good: preview returns first greeting and safe `/tts` request payload for a UI play button.
- Base: voice disabled still previews text without failing.
- Bad: preview endpoint directly synthesizes audio, logs owner API keys, or stores user voice data.

## Tests Required

```powershell
py -3 -m pytest -q tests/test_voice_greeting.py backend/tests/test_v1_voice_greeting.py --tb=short
py -3 -m compileall -q backend/src
```

## Wrong vs Correct

### Wrong

```python
audio = self.synthesize_voice(space_id, {"text": character.first_mes}, user_id)
return {"audio": audio}
```

This consumes TTS and returns generated audio during a preview.

### Correct

```python
return build_voice_greeting_preview(character=character, voice_config=voice_config)
```

The UI may call `/tts` later after explicit user action.
