# Backend Logging Guidelines

> Logging conventions and sensitive-data boundaries for FableSpace backend code.

---

## Overview

Python backend modules use the standard `logging` package. There is no custom structured logging framework. Keep logs useful for local debugging and tests, but do not turn logs into product telemetry or a transcript store.

Existing pattern:

```python
import logging
logger = logging.getLogger(__name__)
```

Seen in modules such as `apps/api/src/fablespace_api/core/web/service.py`, `apps/api/src/fablespace_api/core/llm_clients.py`, `apps/api/src/fablespace_api/core/char_card_parser.py`, and `apps/api/src/fablespace_api/core/world_info_injector.py`.

---

## Log levels

| Level | Use for |
|-------|---------|
| `debug` | Local diagnostic detail that is safe and not noisy. Rare in current code. |
| `info` | Important lifecycle events only; avoid adding noisy request logs. |
| `warning` | Expected external/validation failures that trigger fallback or partial degradation. |
| `error` | Unexpected internal failures where the request can continue only with fallback or fails safely. |

Examples:

```python
logger.warning("Group chat LLM error for %s: %s", speaker.character_id, e)
```

```python
logger.error("Unexpected group chat error for %s: %s", speaker.character_id, e)
```

Prefer printf-style logger formatting (`logger.warning("... %s", value)`) over eager string interpolation when adding new logs.

---

## What to log

Log events that help diagnose backend behavior without exposing content:

- LLM provider failure category, backend name/model if not sensitive, and exception summary.
- Output-rule or prompt-block validation errors without full private prompt content.
- File/path resolution failures for generated static files or backups, after path sanitization.
- Unexpected parser/adapter failures where fallback behavior is used.

---

## What not to log

Never log:

- `api_key`, `Authorization` headers, owner LLM credentials, or space keyvault contents.
- Passwords or `password_hash` values.
- Full visitor chat transcripts, private memories, or raw prompts by default.
- Full space package imports if they may contain private owner content.
- Token/account/billing-like information beyond coarse counts already exposed to owners.

This follows `AGENTS.md` and `docs/ARCHITECTURE.md` rules that LLM config and token/API key data are sensitive and must not be exposed to visitors.

---

## Degradation logs

When a feature has an intentional fallback path, log the failure once at the boundary and return a safe degradation payload. Existing chat/group-chat code uses helper methods such as `_build_degradation(...)` and fallback responses.

Good pattern:

```python
except LLMError as e:
    logger.warning("LLM error for space %s: %s", space_id, e)
    return self._degraded_chat_payload(...)
```

Bad pattern:

```python
except Exception as e:
    print(prompt, api_key, e)
    raise
```

---

## Real examples to follow

1. `apps/api/src/fablespace_api/core/web/service.py`: logs LLM/output-rule failures while returning user-facing degraded results.
2. `apps/api/src/fablespace_api/core/llm_clients.py`: module-level logger lives beside backend adapters; provider-specific errors become `LLMError`.
3. `apps/api/src/fablespace_api/core/char_card_parser.py`: parser logger exists for import/export diagnostics; binary/card parsing should not leak unrelated file content.
4. `apps/api/src/fablespace_api/core/world_info_injector.py`: injection logic has a module logger; logs should describe matching/injection problems without dumping private conversation history.

---

## Common mistakes

- Using `print()` for backend diagnostics instead of logger methods. CLI startup output in `apps/api/src/fablespace_api/core/api.py` is an exception because it intentionally prints server metadata.
- Logging full request payloads for convenience.
- Logging stack traces for expected user input errors that should be `HTTPException`.
- Adding noisy per-token/per-message logs in chat loops.
