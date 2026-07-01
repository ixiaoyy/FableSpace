# Space GM Layer Preview API Contract

> Backend contract for preview-only structured GM suggestions on top of State Cards / Canon Ledger.

## Scope / Trigger

Use this guide when changing:

- `backend/src/fablespace_api/core/gm_layer.py`
- `backend/src/fablespace_api/application/services/state_cards.py` `preview_gm_layer(...)`
- `backend/src/fablespace_api/api/v1/state_cards.py` GM Layer preview route
- frontend callers for `/api/v1/spaces/{id}/gm-layer/preview`

The GM Layer is an AI-adjacent feature, but this MVP is deterministic and preview-only. It must reinforce the State Card confirmation loop instead of silently writing canon.

## Signatures

```python
preview_gm_layer_candidates(
    *,
    space_id: str,
    visitor_id: str,
    character_id: str = "",
    user_message: str = "",
    assistant_message: str = "",
    source_message_ids: list[str] | None = None,
    proposed_by: str = "",
    source: str = "system",
    now: str | None = None,
) -> dict[str, Any]
```

```http
POST /api/v1/spaces/{space_id}/gm-layer/preview
```

Application method:

```python
preview_gm_layer(space_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]
```

## Contracts

Request body supports:

```json
{
  "visitor_id": "visitor_alpha",
  "character_id": "char_keeper",
  "user_message": "observable visitor text",
  "assistant_message": "observable NPC text",
  "source_message_ids": ["msg_user", "msg_assistant"],
  "source": "system"
}
```

Response shape:

```json
{
  "ok": true,
  "space_id": "...",
  "space_name": "...",
  "visitor_id": "...",
  "gm_mode": "structured_conflict_v1",
  "preview_only": true,
  "applied": false,
  "candidates": [
    {
      "category": "conflict",
      "status": "pending",
      "canon_scope": "visitor",
      "fixed_canon": false,
      "metadata": {
        "gm_layer": "structured_conflict_v1",
        "preview_only": true,
        "requires_confirmation": true
      }
    }
  ],
  "summary": {
    "total": 1,
    "task": 0,
    "resource": 0,
    "conflict": 1,
    "event_log": 0
  },
  "notes": ["..."]
}
```

Rules:

- Preview must not call LLM providers.
- Preview must not persist candidates to `_state_cards`.
- Preview must not mutate `Space`, `SpaceCharacter`, `WorldInfoEntry`, owner LLM config, access rules, or role cards.
- All candidates remain `pending` and require the existing State Card decision flow before becoming structured canon.
- Summaries are observable text snippets only; do not store hidden prompts or chain-of-thought.

## Validation & Error Matrix

| Case | Expected |
|------|----------|
| Missing space | `404 {"error": "空间不存在"}` |
| Missing `X-User-Id` / user identity | `401 {"error": "GM Layer 预览需要明确用户身份"}` |
| Private space viewed by non-owner | `403 {"error": "此空间是私人的"}` |
| Visitor previews another `visitor_id` | `403 {"error": "不能为其他访客预览 GM Layer 候选"}` |
| Owner previews any visitor | `200`, response `visitor_id` matches requested visitor |
| Empty user/assistant turn text | `400`, user-facing message mentions 回合文本 |
| Valid task/resource/conflict text | `200`, returns pending candidates and `applied=false` |
| Preview then list state-cards | list remains unchanged; no candidates were saved |

## Good/Base/Bad Cases

- Good: text mentions a commission, key/clue, and rival risk; preview returns task/resource/conflict/event candidates with GM metadata.
- Base: text has no explicit markers; preview returns an empty candidate list plus a note, without failing.
- Bad: endpoint saves preview candidates directly to `_state_cards` or returns them as confirmed canon.

## Tests Required

```powershell
py -3 -m pytest -q tests/test_space_gm_layer.py backend/tests/test_v1_gm_layer.py --tb=short
py -3 -m compileall -q backend/src
```

Assertion points:

- `preview_gm_layer_candidates(...)` emits StateCard-compatible dictionaries with `metadata.gm_layer`.
- API response is `preview_only=true` / `applied=false`.
- API preview does not persist cards.
- Missing identity, wrong visitor scope, and private space visibility are covered.

## Wrong vs Correct

### Wrong

```python
for card in preview_cards:
    self.store.save_state_card(space_id, card)
return {"ok": True, "state_cards": [card.to_dict() for card in preview_cards]}
```

This turns a GM suggestion into durable canon without user confirmation.

### Correct

```python
preview = preview_gm_layer_candidates(...)
return {**preview, "preview_only": True, "applied": False}
```

The user can later confirm or ignore via the existing State Card endpoints.
