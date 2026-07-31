# Backend Logging

## Local Pattern

Use the standard library:

```python
import logging

logger = logging.getLogger(__name__)
logger.info("Seeded %s managed StoryWorld documents", count)
```

Use parameterized messages rather than f-strings so formatting is deferred and
values stay separately reviewable. Module loggers are defined near imports.

## Levels

- `debug`: local diagnostic detail that is disabled in normal operation.
- `info`: startup mode, redacted backend selection, safe counts, or a completed
  operational transition.
- `warning`: a recoverable dependency/policy degradation where the request may
  continue or return a controlled error.
- `error`: a known operation cannot proceed and the caller will receive a
  failure.
- `exception`: only inside an active exception handler when a traceback is
  necessary, such as the global unhandled API boundary.

## Safe Context

Log stable operational identifiers only when needed: request method/path,
StoryWorld or Character ID, safe counts, adapter type, or exception class.
Redact connection URLs with `redact_database_url()` before logging them.

Never log:

- API keys, SSO/session secrets, cookies, authorization headers, or full
  database URLs;
- player messages, memories, private state, relationship details, or endings;
- full LLM prompts/responses or arbitrary upstream response bodies;
- local file contents or media upload bytes.

`ApiSettings.llm_api_key` uses `repr=False`; do not defeat that protection by
serializing the dataclass or environment.

## Failure Examples

Correct:

```python
logger.warning("Dialogue backend unavailable for world=%s: %s", world_id, exc.__class__.__name__)
```

Wrong:

```python
logger.error(f"Request failed with key={settings.llm_api_key}: {exc}")
```

For unexpected API errors, follow `app_factory.unhandled_exception_handler`:
log method/path with `logger.exception` and return a generic client message.
