# SillyTavern Copy Migration Inventory

> Status: initial skeleton. Fill this before implementation migration slices.

## Source summary

- Source root: `sillytavern_copy/`
- Tracked files: approximately 964
- Files excluding `node_modules` and `.git`: approximately 1210

## Classification legend

- `migrate`: implement equivalent capability in FableMap native architecture.
- `adapt`: implement FableMap-specific equivalent, not a literal copy.
- `reference-only`: use only as behavior/format reference during implementation.
- `not-applicable`: do not migrate; record product/technical reason.
- `delete`: covered or unnecessary; remove with copy.

## Capability inventory

| Area | Source paths | Target native area | Status | Notes |
| --- | --- | --- | --- | --- |
| Character card parse/export | `src/character-card-parser.js`, `src/charx.js`, `public/scripts/*character*`, `default/content/*` | `backend/domain`, `backend/contracts`, `api/v1/characters`, `frontend/features/character-assets` | migrate/adapt | Preserve SillyTavern compatibility and FableMap TavernCharacter schema. |
| World/lorebook | `default/content/*`, `public/scripts/*world*` | `api/v1/worldinfo`, `domain/world_info_policy.py`, `frontend/features/world-info` | migrate/adapt | Keep WorldInfoEntry semantics aligned with `docs/WORLD_SCHEMA.md`. |
| Prompt/preset/output rules | `default/*`, `public/scripts/*preset*`, `config.yaml` | owner config contracts/application/routes/features | migrate/adapt | Owner-authored configuration only. |
| Chat runtime | `src/endpoints/*`, `public/script.js`, `public/scripts/*chat*` | `api/v1/chat`, chat runtime service, frontend chat feature | migrate/adapt | Must be tavern-scoped and owner-config aware. |
| Group chat | relevant public/src chat modules | native group chat runtime | migrate/adapt | Existing v1 group-chat slice is a baseline; audit parity. |
| Tokenizers | `src/tokenizers/`, `src/transformers.js` | `api/v1/utilities`, tokenizer domain/application | migrate/adapt | Existing v1 tokenizer utility slice is a baseline; audit parity. |
| Memory/vector/embedding | `src/vectors/`, memory-related public scripts | memory/vector domain + infra | migrate/adapt | Sensitive visitor memory boundaries must hold. |
| LLM/provider integrations | `src/endpoints/`, `src/request-proxy.js`, config | infrastructure/provider adapters | adapt | No API key leakage; owner-provided config only. |
| Assets/locales/default content | `public/img`, `public/locales`, `default/content` | FableMap-owned assets/fixtures/docs | reference-only/not-applicable | Do not import upstream product identity wholesale. |
| Plugins/extensions | `plugins.js`, `src/plugin-loader.js`, `plugins/` | likely not-applicable unless explicitly needed | not-applicable | Avoid creating plugin platform unless approved. |
| Upstream server/app shell | `server.js`, `src/server-*`, `public/index.html` | not target architecture | reference-only/delete | FableMap uses FastAPI + React Router/Vite. |
| CI/docker/editor metadata | `.github`, `docker`, `.vscode`, scripts | delete/reference-only | delete | Not part of FableMap runtime after migration. |

## Per-file checklist

To be generated in the first implementation slice. Minimum columns:

| File | Type | Capability | Classification | Target | Test/validation | Notes |
| --- | --- | --- | --- | --- | --- | --- |
