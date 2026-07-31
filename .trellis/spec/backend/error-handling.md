# Backend Error Handling

## Error Ownership

- Domain/content validation raises attributable errors with stable `code`,
  `path`, and message. `StoryContentValidationError` in
  `domain/story_world.py` is the reference.
- Application services raise stable use-case errors without importing
  FastAPI. `StoryRuntimeError` in `application/story_worlds.py` carries the
  code that the HTTP boundary maps.
- Infrastructure catches database or adapter failures only when it can add a
  stable domain meaning, then raises with `from exc`.
- API routes translate known application codes into `HTTPException`; the
  global handler and response-envelope middleware shape the HTTP body.

Do not copy the legacy pattern where application or infrastructure modules
raise `HTTPException` directly into new StoryWorld code.

## HTTP Mapping

`api/v1/story_worlds._raise_http()` is the reference mapping:

| Meaning | Status |
|---|---|
| Missing StoryWorld, Character, or StoryRun | `404` |
| Stale/locked/completed state or unavailable choice | `409` |
| Missing or invalid reviewed PlayerRole | `422` |
| Dialogue dependency unavailable | `503` |
| Unclassified internal failure | `500` |

Use Pydantic `Field` constraints for shape/length, then normalize semantic
input such as whitespace before calling the application service. Resolve
`player_id` from the trusted session; never accept it in a request model.

## Response Contract

All `/api/v1` JSON responses pass through
`api/response_envelope.py`. Successful dictionary payloads currently retain
their top-level keys while also exposing `{data, meta}`. Errors expose safe
metadata and never return a traceback, secret, SQL text, or private prompt.

The final exception handler in `app_factory.py`:

- logs the request method/path with `logger.exception`;
- returns `500` with a short safe message;
- does not interpolate the caught exception into the client response.

## Adapter Failures

- Authentication upstream/network failures map to `502` or `503`; invalid or
  expired credentials map to `401`/`403`.
- Generated/media storage failures become a small adapter-specific exception,
  then the API maps them to a safe status/message.
- Preserve exception chaining (`raise ... from exc`) for diagnostics.

## Common Mistakes

- Catching `Exception` and returning success or stale data.
- Returning `str(exc)` for an unknown exception.
- Collapsing every StoryRuntime error to `400`.
- Retrying a non-idempotent write automatically after an uncertain response.
- Logging player messages, memories, cookies, tokens, or LLM keys while
  reporting the failure.
