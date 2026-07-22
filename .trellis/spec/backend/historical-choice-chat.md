# Reviewed Historical Choice Chat

> Executable contract for mirroring a published historical Gameplay choice into private character chat without allowing runtime generation to add historical facts.

## 1. Scope / Trigger

This contract applies when a visitor selects a structured choice in a published historical Gameplay and the UI writes that same choice into private chat. Free-form visitor chat is outside this path and continues through the configured chat backend.

Use this path when live verification shows that prompt-only constraints can still invent names, household details, dates, casualty details, object appearance, or historical causality.

## 2. Signatures

- Frontend: `sendPrivateChat(message, extraContext)` posts the existing `ChatRequest` payload.
- Marker: the system context content starts with `fablespace:reviewed-historical-choice`.
- Backend: `RuntimeApplicationMixin.chat(...)` recognizes the marker only for a space listed in `REVIEWED_HISTORICAL_CHOICE_SPACE_IDS`.
- Response source: `resolve_public_welfare_rules_response(...)` returns the reviewed in-character line for the selected label.

No request field, response field, Gameplay field, or database column is added by this contract.

## 3. Contracts

Request excerpt:

```json
{
  "message": "“你自己说，我在旁边补门牌。”",
  "extra_context": [
    {
      "role": "system",
      "content": "fablespace:reviewed-historical-choice\n..."
    }
  ]
}
```

- `message`: the exact visible Gameplay choice label.
- `extra_context`: uses the existing chat contract; at least one item must have `role: "system"` and content beginning with the exact marker.
- Space ID: must be explicitly allow-listed in `REVIEWED_HISTORICAL_CHOICE_SPACE_IDS`.
- Response: remains the existing chat response shape and is persisted through the normal private-message path.
- Free-form chat, marker-less requests, and non-allow-listed spaces must not be routed to the reviewed-choice resolver.

## 4. Validation & Error Matrix

| Condition | Required behavior |
|---|---|
| Allow-listed space + exact marker + reviewed rule match | Return the deterministic reviewed response; do not call the LLM. |
| Allow-listed space + exact marker + no specific rule match | Return that space's reviewed fallback response. |
| Allow-listed space without the marker | Use the configured chat backend. |
| Marker on a non-allow-listed space | Ignore the marker and use the configured chat backend. |
| Historical Gameplay advance fails after chat succeeds | Surface the existing UI error; do not invent or force a scene transition. |
| Empty choice label or no active session/character | Do not send chat or advance Gameplay. |

## 5. Good / Base / Bad Cases

- Good: a published choice such as `“你自己说，我在旁边补门牌。”` produces the reviewed Annie response and then advances the existing Gameplay session.
- Base: a visitor types a free-form question to Annie; it follows normal chat behavior and receives the historical character prompt constraints.
- Bad: adding a generic system message to `extra_context` must not activate deterministic historical-choice handling.
- Bad: using the marker alone in another Space must not change its response backend.

## 6. Tests Required

For every allow-listed historical Space:

1. Assert a marked structured choice returns the expected reviewed rule response.
2. Assert an overlapping choice label selects the most specific rule before a generic evidence rule.
3. Assert an unmarked free-form request does not enter the reviewed-choice branch.
4. Assert the full Gameplay graph has closed node links and all completion nodes preserve the same public-history outcome.
5. Run the retained Python syntax check and frontend typecheck/build.
6. In a narrow live viewport, complete one path and confirm chat write, scene advance, private relationship ending, source unlock, and revisit.

## 7. Wrong vs Correct

### Wrong

```python
# Any system context silently bypasses the configured chat backend.
uses_reviewed_choice = any(item.get("role") == "system" for item in extra_context)
```

This is too broad and can change unrelated free-form chat behavior.

### Correct

```python
uses_reviewed_choice = (
    space_id in REVIEWED_HISTORICAL_CHOICE_SPACE_IDS
    and any(
        item.get("role") == "system"
        and str(item.get("content") or "").startswith(
            REVIEWED_HISTORICAL_CHOICE_CONTEXT_MARKER
        )
        for item in extra_context
    )
)
```

The exact marker and explicit space allow-list keep this behavior scoped to reviewed structured choices.
