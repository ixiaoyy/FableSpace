# Space Skill Pack API Contract

## Scope

Use this spec when changing `Space.skill_packs`, `/api/v1/spaces/{space_id}/skill-packs`, runtime skill-pack prompt injection, or package import/export of skill-pack settings.

## Data contract

```python
SkillPackSetting = {
    "id": "local-rumor",
    "enabled": bool,
    "config": {"limit": int},  # 1-5, default 3
}
```

- Persist settings on `Space.skill_packs` as a safe list of dicts.
- Unknown pack ids in persisted data are ignored by normalization.
- Unknown pack ids in owner write payloads must return HTTP 400.
- New spaces default to no enabled packs / disabled merged defaults.

## API contract

```http
GET /api/v1/spaces/{space_id}/skill-packs
PUT /api/v1/spaces/{space_id}/skill-packs
```

Response shape:

```json
{
  "space_id": "...",
  "available_packs": [{"id":"local-rumor", "label":"...", "capabilities":[], "prompt_notes":[]}],
  "skill_packs": [{"id":"local-rumor", "enabled": false, "config":{"limit":3}}],
  "enabled_pack_ids": [],
  "owner_view": true
}
```

Permissions:

- `GET`: visible space users may read safe metadata; non-owner view may be filtered to enabled packs only.
- `PUT`: owner only.

## Runtime contract

`local-rumor` may inject existing NeighborhoodRumor text into runtime prompt/context only when enabled.

Required prompt boundaries:

- Rumors are ambient hints, not canon.
- Do not invent target spaces or facts when no rumor is provided.
- Do not write rumors into memory, State Cards, character cards, world info, access rules, or LLM config.

## Good / Base / Bad cases

- Good: owner enables `local-rumor`; rules backend can mention an existing target space when visitor asks for nearby rumors.
- Base: unknown persisted rows are dropped; bad write payloads return 400.
- Bad: generating a new space, memory, StateCard, or WorldInfoEntry from a rumor mention without explicit owner/user confirmation.

## Required verification

```powershell
py -3 -m compileall -q backend/src
py -3 -m pytest -q tests/test_space_skill_packs.py backend/tests/test_v1_skill_packs.py --tb=short
```
