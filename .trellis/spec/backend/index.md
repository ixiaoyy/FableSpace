# Backend Development Guidelines

> FableMap backend conventions for the Python/FastAPI side of the cyber tavern platform.

---

## Scope and authority

This guide applies to Python code under `backend/src/fablemap_api/core/` and tests under `tests/`. It does **not** replace the project-level rules in `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/WORLD_SCHEMA.md`, `docs/WHAT_NOT_TO_BUILD.md`, or `docs/AI参与开发协议.md`.

For any backend change, read the relevant product/schema docs first. FableMap's current mainline is:

```text
coordinates/location → real map → tavern discovery → enter tavern → configure AI NPC → chat → memory/writeback → revisit feedback
```

Backend work must preserve these principles:

- Taverns are anchored to real coordinates.
- Tavern content is owner-authored; the platform does not auto-create tavern content.
- LLM/token configuration belongs to the tavern owner and must be treated as sensitive.
- Tavern, TavernCharacter, WorldInfoEntry, VisitorState, ChatMessage, and Gameplay data must stay aligned with `docs/WORLD_SCHEMA.md`.

---

## Guidelines index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Backend modules, boundaries, examples | Current |
| [Database Guidelines](./database-guidelines.md) | JSON persistence, migration/backward-compat rules | Current |
| [Error Handling](./error-handling.md) | FastAPI errors, degradation, client-facing shape | Current |
| [Quality Guidelines](./quality-guidelines.md) | Tests, validation, forbidden patterns | Current |
| [Logging Guidelines](./logging-guidelines.md) | Logging style and sensitive-data rules | Current |
| [Tavern Share API Contract](./tavern-share-api-contract.md) | Public-safe share endpoint contract, errors, and tests | Current |
| [State Card API Contract](./state-card-api-contract.md) | Canon Ledger state-card API, storage, permissions, and tests | Current |
| [Tavern GM Layer Preview API Contract](./gm-layer-preview-contract.md) | Preview-only structured GM suggestions that reuse State Cards without persistence | Current |
| [Serial Episode Export API Contract](./episode-export-contract.md) | Deterministic chat/state-card markdown export with no LLM and explicit visitor scope | Current |
| [Voice Greeting Preview API Contract](./voice-greeting-preview-contract.md) | No-audio NPC first-greeting preview and safe TTS request boundary | Current |
| [Visual Souvenir Preview API Contract](./visual-souvenir-preview-contract.md) | No-image shared-moment prompt preview with privacy redaction | Current |
| [Tavern Skill Pack API Contract](./skill-pack-api-contract.md) | Owner-enabled NPC skill-pack API, runtime boundaries, permissions, and tests | Current |
| [Preset Import Preview API Contract](./preset-import-preview-contract.md) | Draft-only community preset preview parser, risk report, permissions, and no-persistence boundary | Current |
| [Territory API Contract](./territory-api-contract.md) | Territory CRUD, collision detection, map visualization API, permissions, and tests | Current |

---

## Pre-development checklist

1. Read `AGENTS.md` and the docs listed there for medium/high-risk work.
2. If the change touches schema/API/data contracts, read `docs/WORLD_SCHEMA.md` and update tests/docs together.
3. If the change touches tavern CRUD/chat/gameplay, inspect the relevant methods in:
   - `backend/src/fablemap_api/core/tavern.py`
   - `backend/src/fablemap_api/core/gameplay.py`
   - `backend/src/fablemap_api/core/state_cards.py` for Canon Ledger / state-card changes
   - `backend/src/fablemap_api/core/gm_layer.py` for GM Layer preview changes
   - `backend/src/fablemap_api/core/episode_builder.py` for episode export changes
   - `backend/src/fablemap_api/core/voice_greeting.py` for voice-greeting preview changes
   - `backend/src/fablemap_api/core/visual_souvenir.py` for visual-souvenir preview changes
   - `backend/src/fablemap_api/core/skill_packs.py` for Tavern Skill Pack changes
   - `backend/src/fablemap_api/core/preset_import.py` for preset import preview changes
   - `backend/src/fablemap_api/core/web/service.py`
   - `backend/src/fablemap_api/core/web/router.py`
   - `backend/src/fablemap_api/domain/tavern_share_policy.py` for public share payload changes
4. Choose verification before coding:
   - Python syntax: `py -3 -m compileall -q backend/src`
   - Behavior/API: relevant `py -3 -m pytest -q tests/test_*.py --tb=short` or full `py -3 -m pytest -q --tb=short`
5. Do not add dependencies unless the user explicitly approves the reason.

---

## Real examples to follow

- API app shell: `backend/src/fablemap_api/core/web/app.py` builds `FastAPI`, adds CORS, registers `create_api_router(service)`, and normalizes `HTTPException` responses.
- Main routing: `backend/src/fablemap_api/core/web/router.py` keeps route declarations thin and delegates to `WebService` payload methods.
- Tavern domain/persistence: `backend/src/fablemap_api/core/tavern.py` defines dataclasses, JSON serialization, `TavernStore`, and `TavernService`.
- Gameplay domain: `backend/src/fablemap_api/core/gameplay.py` normalizes `GameplayDefinition`, persists `GameplaySession`, and isolates AI Director fallback behavior.
- Tests mirror behavior slices, e.g. `tests/test_tavern_gameplay_api.py`, `tests/test_tavern_chat_history_permissions.py`, `tests/test_tavern_world_info_injection.py`.

---

## Common backend anti-patterns

- Adding schema fields without updating `docs/WORLD_SCHEMA.md`, route/service tests, and frontend service expectations.
- Returning owner-only secrets such as API keys in public tavern payloads.
- Implementing platform-generated tavern/NPC/story content; this violates `docs/WHAT_NOT_TO_BUILD.md`.
- Treating gameplay as combat/level/equipment/ranking logic instead of lightweight tavern text interaction.
- Hiding validation failures behind broad `except Exception` without a deliberate degraded response.
