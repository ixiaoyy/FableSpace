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
    llm_proxy_url,
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

Optional LLM-only egress and its protected deployment input:

```text
FABLESPACE_LLM_PROXY_URL=http://llm-proxy:7890
GitHub Secret: FABLESPACE_LLM_PROXY_SUBSCRIPTION_URL

printf '<subscription-url>' \
  | sudo python3 deploy/server/configure_llm_proxy.py --subscription-url-stdin
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
- `FABLESPACE_LLM_PROXY_URL` is optional and orthogonal to source selection: it
  is not one of the seven explicit override fields. When present it must be an
  HTTP(S) origin without credentials, path, query, or fragment and is passed in
  `LLMConfig.extra["proxy_url"]`.
- Only `CustomBackend` provider requests use that explicit proxy opener. Do not
  set process-wide `HTTP_PROXY` / `HTTPS_PROXY`; authentication, storage,
  health, and other backend HTTP calls remain direct.
- The subscription URL is a protected deployment secret. Pass it to
  `configure_llm_proxy.py` through standard input, render it only into
  `/opt/fablespace-secrets/llm-proxy/config.yaml`, and keep the directory/file
  modes at `0700` / `0600`. Never write the URL to repository env files or
  deployment output.
- The pinned Mihomo container has no host port, drops Linux capabilities, and
  shares a project-private `llm_egress` network only with backend. Deployment
  validates the generated config and proxy TCP listener before the provider
  contract probe.
- Server deployment tooling must preserve the referenced Key in
  `apps/api/.env`. If an earlier version of that same tool removed it, the tool
  may recover it only from its own sibling `.env.pre-shared-*` backups before
  replacing the backend container. A configured pointer with neither a current
  nor recoverable Key must fail deployment instead of publishing a known-broken
  dialogue path.
- The protected deployment secret with the same provider Key name may be sent
  to the reconciler only through standard input. The reconciler writes it to
  the already referenced server variable atomically, reports only
  `story_llm_key=synced|existing`, and never creates a second runtime config
  source.
- Production deployment must run `build_system_story_llm_config(ApiSettings())`
  inside the newly built backend image with the real Compose environment before
  replacing the running container. It must then call the provider with fixed,
  non-user probe text and require the exact three-string-field dialogue JSON
  contract. A merely non-empty response is insufficient. Neither preflight may
  create the FastAPI app, connect to a database, or read player state.
- Neither source may read a repository JSON file, owner content, StoryWorld
  content, a database row, or a client payload.
- `SystemStoryDialogueResponder` receives only `LLMConfig | None`; it does not
  resolve environment variables or know which source was selected.
- Logs may contain the fixed source label and fixed missing/invalid setting
  names. Provider diagnostics may contain a fixed candidate label, HTTP status,
  or exception class. They must not contain Key values, Key pointer target
  values, URLs, prompts, player messages, or provider response bodies.

## 4. Validation & Error Matrix

| Condition | Required behavior |
|---|---|
| Explicit group absent; shared backend/model/base URL/Key pointer valid | Build shared `LLMConfig` |
| Explicit group absent; shared field, pointer, or referenced Key missing | Return `None`; dialogue request becomes `503 dialogue_unavailable` |
| Any explicit field present; all seven valid | Build explicit `LLMConfig` and ignore shared route |
| Any explicit field present; another explicit field missing/invalid | Return `None`; do not fall back or mix sources |
| Explicit temperature outside `0..2`, max tokens outside `1..4096`, or top-p outside `(0, 1]` | Return `None` with fixed variable-name diagnostic |
| Proxy URL is absent | Build the selected model config without a proxy |
| Proxy URL is used with a non-`custom` backend, is malformed, or contains credentials/path/query/fragment | Return `None` with only `FABLESPACE_LLM_PROXY_URL` in diagnostics |
| Subscription input is empty, non-HTTPS, local, or malformed | Fail proxy reconciliation without writing config or printing the input |
| Mihomo config, listener, or proxied provider probe fails | Fail before backend replacement; do not print proxy config, URL, or node list |
| Provider call fails or returns empty content | Return controlled `dialogue_unavailable`; do not fabricate a Character reply |
| Provider returns non-empty content outside the dialogue JSON contract | Runtime uses policy-owned direct-dialogue replacement; deployment probe fails before replacement |
| Deployment sees a valid public Key pointer and current target value | Preserve it; report only `story_llm_key=existing` |
| Deployment sees a missing target and a tool-owned backup contains it | Restore it; report only `story_llm_key=recovered` |
| Deployment receives a protected Key on standard input | Atomically sync the existing pointer target; report only `story_llm_key=synced|existing` |
| Deployment sees a dangling/invalid pointer with no safe recovery | Fail before backend replacement without logging env values |
| Newly built production image cannot construct `LLMConfig` from real Compose env | Fail before backend replacement |
| Provider probe returns HTTP/network/response failure, empty content, or invalid dialogue JSON | Emit only the redacted category and fail before backend replacement |

## 5. Good / Base / Bad Cases

- Good: an existing deployment with only the shared route and
  `OPENCODE_API_KEY` continues Character dialogue after a code upgrade without
  copying the secret.
- Good: the custom provider alone uses `http://llm-proxy:7890`; SSO
  introspection and media traffic do not inherit that proxy.
- Base: a deployment supplies all seven `FABLESPACE_LLM_*` variables to give
  StoryWorld a deliberate independent override.
- Bad: `FABLESPACE_LLM_MODEL` is present but the missing explicit Key silently
  comes from `FABLEMAP_DEFAULT_FREE_LLM_API_KEY_ENV`.
- Bad: a commit updates `.env.example` but neither supports nor migrates the
  ignored real `.env`, then reports the existing deployment as unconfigured.
- Bad: export global `HTTPS_PROXY`, expose Mihomo on a host port, or place a
  subscription token in Compose, `.env`, a command argument, or logs.

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
- Exercise deployment reconciliation with temporary env files for existing,
  synced, recovered, not-configured, invalid-pointer, and unrecoverable states.
  Assert neither command output nor rendered diagnostics contains the test Key.
- Assert a valid proxy origin reaches `LLMConfig.extra`, an invalid one returns
  `None`, and `CustomBackend` uses a scoped `ProxyHandler` while non-LLM paths
  are unchanged.
- Run `configure_llm_proxy.py --subscription-url-stdin --dry-run` with valid
  and invalid placeholders; assert only fixed status is printed. Validate the
  merged three-file Compose model and the pinned proxy config before a real
  provider probe.
- Run `py -3 -m compileall -q apps/api/src`. A minimal provider probe must send
  fixed non-user test text and assert that the response parses as the exact
  `dialogue` / `narration_before` / `narration_after` contract. The production
  deploy must run this probe with the real Compose environment.

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

For egress, the corresponding correct boundary is:

```python
proxy_handler = urllib.request.ProxyHandler(
    {"http": config.extra["proxy_url"], "https": config.extra["proxy_url"]}
)
response = urllib.request.build_opener(proxy_handler).open(provider_request)
```

The opener belongs to the provider adapter; do not install it globally.
