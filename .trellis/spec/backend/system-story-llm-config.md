# System Story LLM Config

## 1. Scope / Trigger

Use this contract when changing StoryWorld dialogue model environment keys,
provider construction, deployment examples, startup diagnostics, or
`dialogue_unavailable` behavior. It prevents a code-only config rename from
breaking real ignored `.env` files that already contain the shared public-
welfare model route.

## 2. Signatures

```python
ApiSettings(
    llm_backend,
    llm_model,
    llm_api_key,
    llm_base_url,
    llm_temperature,
    llm_max_tokens,
    llm_top_p,
    llm_explicitly_configured,
    public_welfare_llm_backend,
    public_welfare_llm_model,
    public_welfare_llm_api_key,
    public_welfare_llm_base_url,
)

build_system_story_llm_config(settings: ApiSettings) -> LLMConfig | None
```

Explicit override environment group:

```text
FABLESPACE_LLM_BACKEND
FABLESPACE_LLM_MODEL
FABLESPACE_LLM_API_KEY
FABLESPACE_LLM_BASE_URL
FABLESPACE_LLM_TEMPERATURE
FABLESPACE_LLM_MAX_TOKENS
FABLESPACE_LLM_TOP_P
```

Existing shared public-welfare route:

```text
FABLEMAP_DEFAULT_FREE_LLM_BACKEND
FABLEMAP_DEFAULT_FREE_LLM_MODEL
FABLEMAP_DEFAULT_FREE_LLM_BASE_URL
FABLEMAP_DEFAULT_FREE_LLM_API_KEY_ENV -> <server-side key environment name>
```

## 3. Contracts

- If any non-empty `FABLESPACE_LLM_*` variable is present, the complete
  explicit group is the only source. Never fill missing or invalid override
  fields from the shared route.
- If the entire explicit group is absent, reuse the existing shared route with
  `temperature=0.8`, `max_tokens=1024`, and `top_p=0.9`.
- Resolve `FABLEMAP_DEFAULT_FREE_LLM_API_KEY_ENV` only when it is a valid
  environment-variable name. The referenced Key remains server-side and is
  stored in `repr=False` settings/config fields.
- Neither source may read a repository JSON file, owner content, StoryWorld
  content, a database row, or a client payload.
- `SystemStoryDialogueResponder` receives only `LLMConfig | None`; it does not
  resolve environment variables or know which source was selected.
- Logs may contain the fixed source label and fixed missing/invalid setting
  names. They must not contain Key values, Key pointer target values, prompts,
  player messages, or provider response bodies.

## 4. Validation & Error Matrix

| Condition | Required behavior |
|---|---|
| Explicit group absent; shared backend/model/base URL/Key pointer valid | Build shared `LLMConfig` |
| Explicit group absent; shared field, pointer, or referenced Key missing | Return `None`; dialogue request becomes `503 dialogue_unavailable` |
| Any explicit field present; all seven valid | Build explicit `LLMConfig` and ignore shared route |
| Any explicit field present; another explicit field missing/invalid | Return `None`; do not fall back or mix sources |
| Explicit temperature outside `0..2`, max tokens outside `1..4096`, or top-p outside `(0, 1]` | Return `None` with fixed variable-name diagnostic |
| Provider call fails or returns empty content | Return controlled `dialogue_unavailable`; do not fabricate a Character reply |

## 5. Good / Base / Bad Cases

- Good: an existing deployment with only the shared route and
  `OPENCODE_API_KEY` continues Character dialogue after a code upgrade without
  copying the secret.
- Base: a deployment supplies all seven `FABLESPACE_LLM_*` variables to give
  StoryWorld a deliberate independent override.
- Bad: `FABLESPACE_LLM_MODEL` is present but the missing explicit Key silently
  comes from `FABLEMAP_DEFAULT_FREE_LLM_API_KEY_ENV`.
- Bad: a commit updates `.env.example` but neither supports nor migrates the
  ignored real `.env`, then reports the existing deployment as unconfigured.

## 6. Tests Required

- Load the current ignored `.env` without creating the FastAPI app or a
  database, then assert `build_system_story_llm_config()` returns the shared
  backend, model, base URL, and `0.8 / 1024 / 0.9` without printing the Key.
- Assert a complete explicit config overrides a simultaneously valid shared
  route.
- Assert a partial or invalid explicit config returns `None` and never falls
  back.
- Assert an invalid Key environment name and a missing referenced Key return
  `None` with diagnostics containing only fixed setting names.
- Run `py -3 -m compileall -q apps/api/src`. A minimal provider probe may send
  non-user test text and assert only that the response is non-empty.

## 7. Wrong vs Correct

Wrong:

```python
api_key = settings.llm_api_key or os.environ.get("OPENCODE_API_KEY", "")
model = settings.llm_model or settings.public_welfare_llm_model
```

This silently assembles one config from two sources and hides incomplete
deployment changes.

Correct:

```python
if explicit_group_is_present(settings):
    return validate_complete_explicit_group(settings)
return validate_existing_public_welfare_route(settings)
```

Source selection happens before field validation, so each resulting config is
complete, attributable, and testable.
