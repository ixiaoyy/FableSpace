# Preset Import Preview / Apply API Contract

## Scope

Use this spec when changing preset import parsing or these owner-only endpoints:

```http
POST /api/v1/spaces/{space_id}/preset-import/preview
POST /api/v1/spaces/{space_id}/preset-import/apply
```

This feature is an owner utility for community / SillyTavern-style preset JSON.
Preview produces a risk report only. Apply may persist only an owner-selected
`selected_ids` subset that was classified as `supported`, and only after the
owner has had a diff/impact preview.

## Preview API contract

Request body accepts one of:

```json
{"preset": {"name": "...", "prompts": []}}
{"preset_json": "{\"name\":\"...\",\"prompts\":[]}"}
```

Response shape:

```json
{
  "ok": true,
  "space_id": "...",
  "preview_only": true,
  "applied": false,
  "preset_name": "...",
  "summary": {
    "total_modules": 0,
    "supported": 0,
    "warning": 0,
    "blocked": 0,
    "runtime_parameters": 0
  },
  "supported": [],
  "warnings": [],
  "blocked": [],
  "runtime_parameters": {},
  "notes": []
}
```

## Apply API contract

`POST /preset-import/apply` request body accepts the same preset payload plus:

```json
{
  "selected_ids": ["module_1"],
  "target_map": {"module_1": "prompt_blocks"},
  "include_runtime_parameters": true,
  "confirm": false
}
```

- `confirm=false` returns an apply diff only and must not mutate Space state.
- `confirm=true` applies the exact diff to safe Space fields.
- `selected_ids` must refer only to `supported` preview items. Selecting a
  `warning`, `blocked`, unknown, or runtime-warning item returns HTTP 400.
- Supported targets are `prompt_blocks`, `world_info`, and `characters`; default
  target is `world_info` for world-info items and `prompt_blocks` otherwise.
- Runtime parameters are applied only when `include_runtime_parameters=true`, and
  then only as a custom runtime preset with safe LLM parameters and no API Key.

Response shape includes:

```json
{
  "ok": true,
  "preview_only": false,
  "applied": false,
  "confirm_required": true,
  "selected_ids": [],
  "diff": {
    "prompt_blocks": [],
    "world_info": [],
    "characters": [],
    "runtime_presets": []
  },
  "applied_counts": {
    "prompt_blocks": 0,
    "world_info": 0,
    "characters": 0,
    "runtime_presets": 0
  }
}
```

When `confirm=true`, response sets `applied=true`, `confirm_required=false`, and
returns owner-private `space` after persistence.

## Classification contract

- `supported`: safe style/runtime hints such as style, atmosphere, dialogue
  density, role consistency, world-info placement hints.
- `warning`: model/provider-specific hints, memory/summary/long-term-state
  wording, high-variance runtime parameters, or unknown modules requiring owner
  review.
- `blocked`: jailbreak/absolute obedience, safety bypass, chain-of-thought
  forcing, user impersonation, private address / phone / API key / PII requests,
  explicit NSFW or forced sexual content.

Blocked items must be visible in the report with a reason; they must not be
silently discarded or converted into usable prompt blocks.

## Persistence and security

- Preview must not mutate `Space.runtime_presets`, `prompt_blocks`,
  `world_info`, `characters`, `skill_packs`, State Cards, memory atoms, access
  rules, LLM config, or owner keyvault data.
- Apply must mutate only `runtime_presets`, `prompt_blocks`, `world_info`, and
  `characters`, and only from selected supported items or safe runtime params.
- Endpoints are owner-only because imported preset text may contain private or
  unsafe prompts.
- Response must not include `api_key`, authorization headers, keyvault content,
  or raw secret values from uploaded JSON.
- Invalid embedded JSON returns HTTP 400 with a readable error.

## Good / Base / Bad cases

- Good: owner previews a preset containing one style prompt, one model-specific
  note, and one jailbreak; response has supported/warning/blocked groups and no
  space fields change.
- Good: owner selects supported style/world-info/role-consistency items, previews
  a diff with `confirm=false`, then persists the same safe subset with
  `confirm=true`.
- Base: JSON-string body parses successfully and produces a preview report.
- Bad: preview applies imported prompt blocks or runtime presets automatically;
  apply accepts warning/blocked items; non-owner can inspect private prompt text;
  response echoes uploaded API keys.

## Required verification

```powershell
py -3 -m pytest -q tests/test_preset_import_preview.py backend/tests/test_v1_preset_import_preview.py --tb=short
py -3 -m compileall -q backend/src
```
