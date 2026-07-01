# Visual Souvenir Preview API Contract

> Backend contract for no-image shared-moment souvenir prompt previews.

## Scope / Trigger

Use this guide when changing:

- `backend/src/fablespace_api/core/visual_souvenir.py`
- `backend/src/fablespace_api/application/services/runtime.py` `preview_visual_souvenir(...)`
- `backend/src/fablespace_api/api/v1/runtime.py` `/visual-souvenir/preview`
- frontend callers for `/api/v1/spaces/{id}/visual-souvenir/preview`

This is not an image generation endpoint. It only prepares a prompt brief for human review.

## Signatures

```python
build_visual_souvenir_preview(
    *,
    space_id: str,
    space_name: str = "",
    character_name: str = "",
    visitor_id: str = "",
    user_message: str = "",
    assistant_message: str = "",
    style: str = "",
) -> dict[str, Any]
```

```http
POST /api/v1/spaces/{space_id}/visual-souvenir/preview
```

Request:

```json
{
  "visitor_id": "visitor_alpha",
  "character_id": "char_keeper",
  "user_message": "...",
  "assistant_message": "...",
  "style": "warm cyber space postcard"
}
```

Response:

```json
{
  "ok": true,
  "preview_only": true,
  "applied": false,
  "image_generated": false,
  "requires_confirmation": true,
  "souvenir": {
    "prompt": "...",
    "negative_prompt": "real person likeness, private address, ...",
    "source_summary": "...",
    "style": "..."
  },
  "privacy_notes": ["..."],
  "next_action": "review_prompt_before_image_generation"
}
```

## Contracts

- Requires explicit `visitor_id`; non-owner callers may only use their own visitor id.
- Requires valid `character_id`.
- Requires observable turn text (`user_message` or `assistant_message`).
- Does not call image generation, does not create files, does not persist prompts.
- Prompt must use generic traveler/访客 language and redact visitor id / common contact data if present.
- Negative prompt must discourage real-person likeness, private data, and readable private text.
- If future work generates images, it must follow `docs/IMAGE_ASSETS_SPEC.md` and `.trellis/spec/frontend/image-asset-guidelines.md`.

## Validation & Error Matrix

| Case | Expected |
|------|----------|
| Missing space | `404 {"error": "空间不存在"}` |
| Missing user identity | `401 {"error": "纪念图预览需要明确用户身份"}` |
| Missing `visitor_id` | `400 {"error": "纪念图预览需要 visitor_id"}` |
| Visitor previews another visitor | `403 {"error": "不能为其他访客预览纪念图"}` |
| Missing/unknown character | `400` / `404` |
| Private space viewed by non-owner | `403 {"error": "此空间是私人的"}` |
| Empty observable text | `400 {"error": "纪念图预览需要可观察回合文本"}` |
| Valid preview | `200`, `image_generated=false`, prompt returned |

## Good/Base/Bad Cases

- Good: visitor previews a shared moment prompt with redacted visitor id and no generated image.
- Base: style omitted, helper falls back to a warm cyber space postcard style.
- Bad: endpoint writes a PNG into a temp folder or returns a prompt with visitor id / private contact info.

## Tests Required

```powershell
py -3 -m pytest -q tests/test_visual_souvenir.py backend/tests/test_v1_visual_souvenir.py --tb=short
py -3 -m compileall -q backend/src
```

## Wrong vs Correct

### Wrong

```python
image = image_client.generate(prompt)
return {"image_url": image.url}
```

### Correct

```python
return build_visual_souvenir_preview(...)
```

Preview stays no-image/no-persistence until a separate asset workflow exists.
