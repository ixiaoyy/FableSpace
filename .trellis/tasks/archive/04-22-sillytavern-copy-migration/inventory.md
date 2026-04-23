# SillyTavern Copy Migration Inventory

> Status: copy deletion checkpoint passed in commit `8fdd837` on 2026-04-23. Remaining items are parent framework-refactor or separately scoped product decisions, not runtime dependencies on `sillytavern_copy/`.

## Source summary

- Source root: `sillytavern_copy/` (deleted after native compatibility slices)
- Historical git tracked files: 964
- Root areas by tracked file count:
  - `public/`: 583
  - `default/`: 196
  - `src/`: 106
  - `.github/`: 25
  - `tests/`: 20
  - `docker/`: 3
- Historical implementation-bearing areas: `src/`, `public/scripts/`, `default/content/`, `tests/`.
- Current state: `git ls-files sillytavern_copy` returns `0`; runtime reference scan outside task/change docs returns no matches.

## Generated per-file checklist

Full checklist: [`per-file-inventory.md`](./per-file-inventory.md)

Generated from:

```powershell
git ls-files sillytavern_copy
```

Checklist coverage:

| Classification | Count | Meaning for next slice |
| --- | ---: | --- |
| `adapt` | 169 | Rebuild as FableMap-shaped behavior, usually owner-config/runtime/provider related. |
| `migrate/adapt` | 75 | Preserve core compatibility but translate into native backend/frontend architecture. |
| `reference-only` | 160 | Use as behavior or test reference only; no runtime dependency. |
| `reference-only/not-applicable` | 244 | Assets/static shell/default content that needs explicit product review before any adoption. |
| `not-applicable` | 258 | Upstream app/plugin/admin/image/social-like scope outside current FableMap mainline. |
| `delete` | 58 | Copy-only tooling/metadata; remove with `sillytavern_copy/` once no references remain. |

Capability counts from the generated checklist:

| Capability | Count | Initial decision |
| --- | ---: | --- |
| SillyTavern app shell or power-user platform | 258 | Mostly not applicable unless separately approved. |
| Assets, locales, static UI shell | 239 | Reference only; do not import upstream product identity wholesale. |
| Prompt, preset, output/runtime config | 154 | Adapt owner-authored pieces into owner config/runtime modules. |
| Uncategorized compatibility source | 140 | Reference-only until a focused audit promotes or retires each file. |
| Upstream project/tooling metadata | 58 | Delete with copy. |
| Character cards, sprites, expressions | 37 | Migrate/adapt; existing native character-assets slice is baseline. |
| Upstream tests | 20 | Reference-only; translate relevant cases into FableMap tests. |
| Tokenizers | 12 | Migrate/adapt; existing native tokenizer slice is baseline. |
| LLM/provider integrations | 11 | Adapt into infrastructure/provider adapters with secret redaction. |
| Chat runtime and group chat | 10 | Migrate/adapt to tavern-scoped runtime. |
| Memory/vector/embedding | 10 | Migrate/adapt with visitor-memory boundaries. |
| World/lorebook | 6 | Migrate/adapt to `WorldInfoEntry`. |
| Default upstream content | 5 | Reference only unless owner-authored fixtures are explicitly approved. |
| Voice, TTS, STT | 4 | Adapt via native runtime/voice APIs. |

## Classification legend

- `migrate`: implement equivalent capability in FableMap native architecture.
- `adapt`: implement FableMap-specific equivalent, not a literal copy.
- `reference-only`: use only as behavior/format reference during implementation.
- `not-applicable`: do not migrate; record product/technical reason.
- `delete`: covered or unnecessary; remove with copy.

## Capability inventory

| Area | Source paths | Target native area | Status | Notes |
| --- | --- | --- | --- | --- |
| Character card parse/export | `src/character-card-parser.js`, `src/charx.js`, `src/png/`, `src/endpoints/characters.js`, `public/scripts/char-data.js`, expression assets | `backend/domain`, `backend/contracts`, `api/v1/characters`, frontend typed clients | native coverage present | Standard V2/V3 `data` envelopes, world-info aliases, PNG metadata before `IEND`, `ccv3` priority, base64 CharX zip/SFX `card.json`, sprites, and expressions are covered by `backend/tests/test_v1_character_assets.py`. UI feature extraction remains part of parent refactor. |
| World/lorebook | `src/endpoints/worldinfo.js`, `public/scripts/world-info.js`, lorebook templates | `api/v1/worldinfo`, `domain/world_info_policy.py`, frontend typed clients | native coverage present | `uid`, `key`, `keysecondary`, `secondary_keys`, and `{"entries": {...}}` compatibility are covered by `backend/tests/test_v1_world_info_global.py`; owner-config world-info tests also cover tavern-scoped diagnostics. |
| Prompt/preset/output rules | `default/content/presets/`, `public/scripts/PromptManager.js`, `public/scripts/preset-manager.js`, `public/scripts/sysprompt.js`, `config.yaml` | owner config contracts/application/routes/frontend client | native coverage present | Owner-authored config is covered by native output-rules, prompt-blocks, runtime-presets endpoints and `backend/tests/test_v1_owner_config.py`. Upstream preset content is not vendored. |
| Chat runtime | `src/endpoints/chats.js`, `src/endpoints/groups.js`, `public/script.js`, `public/scripts/chats.js`, `public/scripts/group-chats.js` | `api/v1/chat`, chat/runtime services, frontend clients | native baseline present | Tavern-scoped chat/group-chat runtime exists without `sillytavern_copy`; broader app-shell parity remains out of scope. |
| Group chat | `src/endpoints/groups.js`, `public/scripts/group-chats.js` | native group chat runtime | native coverage present | Native config/send/history/talkativeness behavior is covered by `backend/tests/test_v1_runtime_features.py`. |
| Tokenizers | `src/tokenizers/`, `src/transformers.js`, `src/endpoints/tokenizers.js`, `public/scripts/tokenizers.js` | `api/v1/utilities`, tokenizer domain/application | native coverage present | SillyTavern-compatible tokenizer aliases and multi-part message text counting are covered by `backend/tests/test_v1_memory_tokenizer_utilities.py`. Exact upstream tokenizer model assets are not vendored. |
| Memory/vector/embedding | `src/vectors/`, memory extension files | memory/vector domain + infra | partial native coverage; provider matrix deferred | Visitor memory atoms and deterministic memory utilities are covered. Upstream vector-provider parity is a separate product/infrastructure decision because private visitor memory boundaries must be designed per provider. |
| LLM/provider integrations | `src/endpoints/openai.js`, `anthropic.js`, `google.js`, `openrouter.js`, `text-completions.js`, `chat-completions.js`, `request-proxy.js`, `secrets.js` | infrastructure/provider adapters + owner LLM config | partial native coverage; provider matrix deferred | Owner config, runtime probes, private MySQL credential access, and token usage are covered. Provider-specific upstream matrix expansion is not required for copy deletion. |
| Voice / speech | `src/endpoints/speech.js`, audio frontend helpers | runtime voice routes + infrastructure adapters | native coverage present | Voice config, disabled TTS/STT guardrails, and secret handling are covered by `backend/tests/test_v1_runtime_features.py`. |
| Assets/locales/default content | `public/img`, `public/locales`, `public/css`, `default/content/backgrounds`, default character/theme assets | none unless separately approved | retired/reference-only | Upstream assets and default content were deleted with the copy to avoid importing upstream product identity wholesale. |
| Plugins/extensions/power-user platform | `plugins.js`, `src/plugin-loader.js`, `public/scripts/extensions/`, `quick-replies`, slash commands | none unless separately approved | not-applicable | Not part of the coordinate-anchored FableMap tavern mainline; no native runtime dependency retained. |
| Upstream server/app shell | `server.js`, `src/server-*`, `src/middleware/`, `public/index.html`, `public/login.html` | not target architecture | retired | FableMap uses FastAPI + React Router/Vite; upstream runtime shell was deleted. |
| CI/docker/editor metadata | `.github`, `.gemini`, `.vscode`, `docker`, root scripts/config | none | deleted | Copy-only tooling/metadata was removed with the copy. |

## Deletion gate

The deletion gate passed for commit `8fdd837`:

```powershell
git grep -n "sillytavern_copy" -- . ':!.trellis/tasks/04-22-sillytavern-copy-migration/*'
py -3 -m pytest -q --tb=short
npm --prefix .\frontend run build
npm --prefix .\frontend test
```

## Remaining parent-refactor order

1. Split the large native tavern application service by bounded context.
2. Split tavern contracts by API domain.
3. Create `frontend/app/features/*` and migrate UI workflows out of `frontend/app/product/*`.
4. Decide vector/embedding provider parity as a separate product/infrastructure task.
5. Decide provider-specific LLM matrix expansion as a separate product/infrastructure task.
