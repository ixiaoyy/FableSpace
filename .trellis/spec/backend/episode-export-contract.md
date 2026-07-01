# Serial Episode Export API Contract

> Backend contract for deterministic chat/state-card episode exports.

## Scope / Trigger

Use this guide when changing:

- `backend/src/fablespace_api/core/episode_builder.py`
- `backend/src/fablespace_api/application/services/runtime.py` `export_episode(...)`
- `backend/src/fablespace_api/api/v1/chat.py` `/episodes/export`
- frontend callers for `/api/v1/spaces/{id}/episodes/export`

Episode export is a record formatting feature. It must not become automatic story generation.

## Signatures

```python
build_episode_export(
    *,
    space_id: str,
    space_name: str = "",
    visitor_id: str,
    character_id: str = "",
    character_name: str = "",
    title: str = "",
    messages: list[Any] | None = None,
    state_cards: list[Any] | None = None,
) -> dict[str, Any]
```

```http
POST /api/v1/spaces/{space_id}/episodes/export
```

Application method:

```python
export_episode(
    space_id: str,
    user_id: str = "",
    *,
    visitor_id: str = "",
    character_id: str = "",
    title: str = "",
    include_pending: bool | str | int = False,
    format: str = "markdown",
    limit: int | str = 200,
) -> dict[str, Any]
```

## Contracts

Request:

```json
{
  "visitor_id": "visitor_alpha",
  "character_id": "char_keeper",
  "title": "桥边委托第一夜",
  "include_pending": false,
  "format": "markdown",
  "limit": 200
}
```

Response:

```json
{
  "ok": true,
  "space_id": "...",
  "space_name": "...",
  "visitor_id": "...",
  "character_id": "...",
  "format": "episode_markdown_v1",
  "requested_format": "markdown",
  "persisted": false,
  "include_pending": false,
  "episode": {
    "title": "...",
    "summary": "导出草稿：...",
    "markdown": "# ...",
    "messages": [],
    "state_cards": [],
    "message_count": 0,
    "state_card_count": 0
  }
}
```

Rules:

- Request must include explicit `visitor_id`; no all-visitor export in this endpoint.
- Export must not call LLM providers.
- Export must not persist generated markdown or mutate Space/StateCard/chat history.
- Export must filter `system` and hidden prompt messages; include only observable user/assistant transcript entries.
- Default StateCard scope is `confirmed` only. `include_pending=true` may include visible pending cards, labeled as pending candidates.
- Do not expose owner API keys, hidden prompts, private memories, or other visitors' records.

## Validation & Error Matrix

| Case | Expected |
|------|----------|
| Missing space | `404 {"error": "空间不存在"}` |
| Missing user identity | `401 {"error": "导出剧集需要明确用户身份"}` |
| Missing `visitor_id` | `400 {"error": "导出剧集需要 visitor_id"}` |
| Visitor exports another visitor | `403 {"error": "不能导出其他访客的剧集"}` |
| Private space viewed by non-owner | `403 {"error": "此空间是私人的"}` |
| Unsupported format | `400 {"error": "剧集导出格式必须是 markdown 或 json"}` |
| Valid visitor export | `200`, `persisted=false`, markdown contains visible chat |
| Confirmed state cards exist | included by default |
| Pending-only cards and `include_pending=false` | excluded |

## Good/Base/Bad Cases

- Good: visitor exports their own session; markdown includes visible user/assistant lines and confirmed task/resource cards.
- Base: no state cards; export still succeeds and says no confirmed cards.
- Bad: owner omits `visitor_id` and receives all visitors' transcripts, or system prompts are included in markdown.

## Tests Required

```powershell
py -3 -m pytest -q tests/test_episode_builder.py backend/tests/test_v1_episode_export.py --tb=short
py -3 -m compileall -q backend/src
```

Assertion points:

- core builder filters `system` role messages;
- endpoint enforces identity and visitor scope;
- default export includes confirmed cards only;
- response says `persisted=false`;
- markdown is deterministic and contains no hidden prompt text.

## Wrong vs Correct

### Wrong

```python
history, _ = self._chat_history_for_scope(space, owner_id, visitor_id="")
return llm.rewrite_as_novel(history)
```

This can expose all visitors and turns export into platform-generated story content.

### Correct

```python
history = self.store.get_chat_history(space.id, visitor_id, character_id)
return build_episode_export(messages=history, state_cards=confirmed_cards, ...)
```

The export is scoped, deterministic, and based on existing observable records.
