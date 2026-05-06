# Daily Tavern Encounter Gacha Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real backend/API/persistence MVP for one free daily tavern encounter draw that can return tavern cards or character cards, unlock hidden characters per visitor, and persist tavern/character affinity.

**Architecture:** Owner-authored card-pool configuration lives on `Tavern.gacha_config`; visitor-private cadence, draw history, hidden unlocks, and per-character affinity live in a new `_gacha_progress` private bucket keyed by `visitor_id`. `VisitorState.relationship` remains the canonical tavern-level affinity; `TavernCharacter.visibility` and `TavernCharacter.unlock_mode` define normal versus hidden gacha-unlocked characters.

**Tech Stack:** Python dataclasses + FastAPI + Pydantic `FlexibleBody`, JSON-backed `TavernStore`, pytest/TestClient, React Router/Vite frontend, npm script tests, Playwright/in-app browser UI self-check.

---

## Source and fixed contract

- PRD: `D:\work\ai-\.trellis\tasks\05-05-character-gacha-gameplay-brainstorm\prd.md`
- Product guardrails: `D:\work\ai-\AGENTS.md`, `D:\work\ai-\docs\WHAT_NOT_TO_BUILD.md`
- Schema authority: `D:\work\ai-\docs\WORLD_SCHEMA.md`

Data contract:

```json
{
  "TavernCharacter": {
    "visibility": "normal | hidden",
    "unlock_mode": "none | gacha"
  },
  "Tavern": {
    "gacha_config": {
      "enabled": true,
      "weight_mode": "stage_default | owner_custom",
      "daily_draw_limit": 1,
      "tavern_card_weights": { "interaction": 2, "hidden_clue": 1, "affinity_boost": 3 },
      "character_entries": [{ "character_id": "char_host", "weight": 3, "enabled": true }],
      "hidden_character_entries": [{ "character_id": "char_hidden", "weight": 1, "enabled": true, "min_tavern_stage": "acquaintance", "clue": "吧台后的门牌偶尔会亮起。" }],
      "interaction_entries": [{ "id": "bar_ritual", "label": "吧台今日签", "gameplay_id": "gp_bar_ritual", "weight": 1, "enabled": true }]
    }
  },
  "_gacha_progress": {
    "visitor_a": {
      "last_draw_date": "2026-05-06",
      "last_draw_result": { "id": "draw_x", "type": "character_card", "subtype": "hidden", "character_id": "char_hidden" },
      "unlocked_hidden_character_ids": ["char_hidden"],
      "character_affinity": { "char_hidden": { "strength": 0.08, "stage": "stranger", "updated_at": "2026-05-06T00:00:00Z" } },
      "draw_history": []
    }
  }
}
```

Rules:

- Missing `visibility` is `normal`.
- Missing `unlock_mode` is `none` for normal characters and `gacha` for hidden characters.
- Public/anonymous payloads omit hidden gacha characters.
- Owner payloads include hidden characters.
- Visitor payloads include hidden characters only after that visitor unlocks them.
- One draw per visitor per tavern per tavern-local date; second draw returns HTTP `409`.
- Tavern cards add `0.05` to `VisitorState.relationship_strength`, capped at `1.0`.
- Character cards add `0.08` to `_gacha_progress.character_affinity[character_id].strength`, capped at `1.0`.
- No paid draw chance, recharge, pity monetization, tradable card, leaderboard, combat, level, equipment, or platform-generated auto-published NPC.

---

## Task 1: Backend core helpers and core tests

**Files:**

- Create: `D:\work\ai-\backend\src\fablemap_api\core\gacha.py`
- Create: `D:\work\ai-\tests\test_tavern_gacha_core.py`

- [ ] **Step 1: Create failing tests**

Write `D:\work\ai-\tests\test_tavern_gacha_core.py` with tests for:

```python
from datetime import datetime

from fablemap_api.core.gacha import (
    build_draw_seed,
    can_access_gacha_character,
    local_draw_date,
    normalize_character_unlock_mode,
    normalize_character_visibility,
    normalize_gacha_config,
    normalize_gacha_progress,
    pick_weighted_entry,
)


class Character:
    def __init__(self, id, visibility="normal", unlock_mode="none"):
        self.id = id
        self.visibility = visibility
        self.unlock_mode = unlock_mode


class Tavern:
    def __init__(self, timezone=None):
        self.id = "tavern_core"
        self.timezone = timezone


def test_character_visibility_defaults():
    assert normalize_character_visibility(None) == "normal"
    assert normalize_character_visibility("hidden") == "hidden"
    assert normalize_character_unlock_mode(None, visibility="normal") == "none"
    assert normalize_character_unlock_mode(None, visibility="hidden") == "gacha"


def test_config_and_progress_are_compact():
    config = normalize_gacha_config({
        "enabled": "yes",
        "weight_mode": "owner_custom",
        "daily_draw_limit": 9,
        "tavern_card_weights": {"interaction": 2, "hidden_clue": -1, "affinity_boost": "3"},
        "character_entries": [{"character_id": "char_a", "weight": "4"}, {"character_id": "", "weight": 5}],
        "hidden_character_entries": [{"character_id": "char_h", "weight": 2, "clue": "x" * 300}],
        "paid_currency": 100,
    })
    assert config["weight_mode"] == "owner_custom"
    assert config["daily_draw_limit"] == 1
    assert config["tavern_card_weights"]["hidden_clue"] == 0.0
    assert config["character_entries"] == [{"character_id": "char_a", "weight": 4.0, "enabled": True}]
    assert len(config["hidden_character_entries"][0]["clue"]) == 160
    assert "paid_currency" not in config

    progress = normalize_gacha_progress({
        "last_draw_date": "2026-05-06",
        "unlocked_hidden_character_ids": ["char_h", "char_h", 123],
        "character_affinity": {"char_a": {"strength": 1.4, "stage": "friend", "updated_at": "now"}},
        "draw_history": [{"id": f"draw_{idx}"} for idx in range(40)],
    }, visitor_id="visitor_a", tavern_id="tavern_a")
    assert progress["unlocked_hidden_character_ids"] == ["char_h", "123"]
    assert progress["character_affinity"]["char_a"]["strength"] == 1.0
    assert len(progress["draw_history"]) == 30


def test_date_seed_pick_and_access():
    now = datetime.fromisoformat("2026-05-05T16:30:00+00:00")
    assert local_draw_date(Tavern("Asia/Shanghai"), now=now) == "2026-05-06"
    assert local_draw_date(Tavern("Invalid/Zone"), now=now) == "2026-05-05"

    seed = build_draw_seed("tavern_a", "visitor_a", "2026-05-06", 0)
    first = pick_weighted_entry([{"id": "a", "weight": 0}, {"id": "b", "weight": 1}], seed)
    second = pick_weighted_entry([{"id": "a", "weight": 0}, {"id": "b", "weight": 1}], seed)
    assert first == second == {"id": "b", "weight": 1}

    hidden = Character("char_hidden", visibility="hidden", unlock_mode="gacha")
    assert can_access_gacha_character(hidden, unlocked_hidden_character_ids=[]) is False
    assert can_access_gacha_character(hidden, unlocked_hidden_character_ids=["char_hidden"]) is True
```

- [ ] **Step 2: Run failing tests**

Run:

```powershell
py -3 -m pytest -q tests/test_tavern_gacha_core.py --tb=short
```

Expected: import failure for `fablemap_api.core.gacha`.

- [ ] **Step 3: Implement `core/gacha.py`**

Implement these exact public names:

```python
GACHA_WEIGHT_MODES = {"stage_default", "owner_custom"}
TAVERN_CARD_SUBTYPES = {"interaction", "hidden_clue", "affinity_boost"}
CHARACTER_VISIBILITIES = {"normal", "hidden"}
CHARACTER_UNLOCK_MODES = {"none", "gacha"}
DEFAULT_TAVERN_CARD_WEIGHTS = {"interaction": 2.0, "hidden_clue": 1.0, "affinity_boost": 3.0}
DRAW_HISTORY_LIMIT = 30
TAVERN_CARD_AFFINITY_DELTA = 0.05
CHARACTER_CARD_AFFINITY_DELTA = 0.08
normalize_character_visibility(value)
normalize_character_unlock_mode(value, *, visibility="normal")
can_access_gacha_character(character, *, unlocked_hidden_character_ids)
visible_gacha_characters(characters, *, owner, unlocked_hidden_character_ids)
normalize_gacha_config(value)
normalize_gacha_progress(value, *, visitor_id, tavern_id)
local_draw_date(tavern, *, now=None)
build_draw_seed(tavern_id, visitor_id, draw_date, draw_count)
pick_weighted_entry(entries, seed)
```

Implementation anchors:

```python
from __future__ import annotations
import hashlib, random
from copy import deepcopy
from datetime import UTC, datetime
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from fablemap_api.core.affinity import relationship_stage_for_affinity
```

Normalization requirements:

- `_weight(value)` converts invalid values to `0.0`, clamps negatives to `0.0`, clamps large values to `1000.0`.
- `normalize_gacha_config()` returns only the keys in the contract and drops all other keys.
- `normalize_gacha_progress()` de-duplicates unlock ids, clamps affinity strength, and keeps the newest 30 history entries from the provided list order.
- `pick_weighted_entry()` filters zero-weight entries, seeds `random.Random(int(seed[:16], 16))`, and returns a deep copy.

- [ ] **Step 4: Verify core tests**

Run:

```powershell
py -3 -m pytest -q tests/test_tavern_gacha_core.py --tb=short
```

Expected: `3 passed`.

---

## Task 2: Tavern model, private bucket, and hidden filtering

**Files:**

- Modify: `D:\work\ai-\backend\src\fablemap_api\core\tavern.py`
- Modify: `D:\work\ai-\backend\src\fablemap_api\contracts\characters.py`

- [ ] **Step 1: Import gacha helpers in `core/tavern.py`**

Add:

```python
from fablemap_api.core.gacha import (
    can_access_gacha_character,
    normalize_character_unlock_mode,
    normalize_character_visibility,
    normalize_gacha_config,
    normalize_gacha_progress,
    visible_gacha_characters,
)
```

- [ ] **Step 2: Extend `TavernCharacter`**

Add dataclass fields after `talkativeness`:

```python
    visibility: str = "normal"
    unlock_mode: str = "none"
```

Add to `to_dict()`:

```python
            "visibility": normalize_character_visibility(self.visibility),
            "unlock_mode": normalize_character_unlock_mode(
                self.unlock_mode,
                visibility=normalize_character_visibility(self.visibility),
            ),
```

Add to `from_dict()`:

```python
            visibility=normalize_character_visibility(d.get("visibility")),
            unlock_mode=normalize_character_unlock_mode(
                d.get("unlock_mode"),
                visibility=normalize_character_visibility(d.get("visibility")),
            ),
```

Add to `_character_from_payload()` and `update_character()` with the same normalization rules.

- [ ] **Step 3: Extend `Tavern`**

Add field after `gameplay_definitions`:

```python
    gacha_config: dict[str, Any] = field(default_factory=dict)
```

Normalize in `__post_init__()`, include in `to_dict()`, include in `from_dict()`, and allow `TavernService.update_tavern()` to set it:

```python
        self.gacha_config = normalize_gacha_config(self.gacha_config)
```

```python
            "gacha_config": normalize_gacha_config(self.gacha_config),
```

```python
            gacha_config=normalize_gacha_config(d.get("gacha_config", {})),
```

```python
        if "gacha_config" in data:
            tavern.gacha_config = normalize_gacha_config(data.get("gacha_config"))
```

- [ ] **Step 4: Add `_gacha_progress` store methods after visitor-state methods**

Add:

```python
    def get_gacha_progress(self, tavern_id: str, visitor_id: str) -> dict[str, Any]:
        data = self._load_taverns()
        tavern_data = data.get(tavern_id, {})
        progress_map = tavern_data.get("_gacha_progress", {})
        if not isinstance(progress_map, dict):
            progress_map = {}
        return normalize_gacha_progress(progress_map.get(visitor_id, {}), visitor_id=visitor_id, tavern_id=tavern_id)

    def save_gacha_progress(self, tavern_id: str, visitor_id: str, progress: dict[str, Any]) -> dict[str, Any]:
        data = self._load_taverns()
        if tavern_id not in data and self._is_seed_fallback_tavern(tavern_id):
            return normalize_gacha_progress(progress, visitor_id=visitor_id, tavern_id=tavern_id)
        tavern_data = data.setdefault(tavern_id, {})
        progress_map = tavern_data.setdefault("_gacha_progress", {})
        if not isinstance(progress_map, dict):
            progress_map = {}
            tavern_data["_gacha_progress"] = progress_map
        normalized = normalize_gacha_progress(progress, visitor_id=visitor_id, tavern_id=tavern_id)
        progress_map[visitor_id] = normalized
        self._save_taverns(data)
        return normalized
```

Existing `update_tavern()` already preserves private `_` buckets; confirm `_gacha_progress` is preserved by that loop.

- [ ] **Step 5: Filter hidden characters in public/get/enter payloads**

In `Tavern.to_dict_public()`, overwrite `result["characters"]` with only normal-access characters.

In `TavernService.get_tavern()`, for non-owner user payloads, load `self.store.get_gacha_progress(tavern_id, user_id)` and replace `tavern_dict["characters"]` with `visible_gacha_characters(... owner=False ...)`.

In `TavernService.enter_tavern()`, compute `visible_characters` before the return payload and use it for both `characters` and `first_mes`.

- [ ] **Step 6: Extend character write contract**

In `D:\work\ai-\backend\src\fablemap_api\contracts\characters.py`, add:

```python
    visibility: str | None = None
    unlock_mode: str | None = None
```

- [ ] **Step 7: Compile changed backend files**

Run:

```powershell
py -3 -m compileall -q backend/src/fablemap_api/core/tavern.py backend/src/fablemap_api/contracts/characters.py
```

Expected: exit code `0`, no errors.

---

## Task 3: Gacha API service and routes

**Files:**

- Create: `D:\work\ai-\backend\src\fablemap_api\contracts\gacha.py`
- Create: `D:\work\ai-\backend\src\fablemap_api\application\services\gacha.py`
- Create: `D:\work\ai-\backend\src\fablemap_api\api\v1\gacha.py`
- Modify: `D:\work\ai-\backend\src\fablemap_api\application\taverns.py`
- Modify: `D:\work\ai-\backend\src\fablemap_api\api\v1\router.py`

- [ ] **Step 1: Add request contracts**

`contracts/gacha.py`:

```python
from __future__ import annotations
from typing import Any
from .common import FlexibleBody

class GachaConfigWriteRequest(FlexibleBody):
    enabled: bool | None = None
    weight_mode: str | None = None
    daily_draw_limit: int | None = None
    tavern_card_weights: dict[str, Any] | None = None
    character_entries: list[dict[str, Any]] | None = None
    hidden_character_entries: list[dict[str, Any]] | None = None
    interaction_entries: list[dict[str, Any]] | None = None

class GachaDrawRequest(FlexibleBody):
    client_nonce: str | None = None
```

- [ ] **Step 2: Add `GachaApplicationMixin`**

`application/services/gacha.py` must expose:

```python
class GachaApplicationMixin:
    def get_gacha_config(self, tavern_id: str, user_id: str = "") -> dict[str, Any]: ...
    def save_gacha_config(self, tavern_id: str, data: dict[str, Any], user_id: str = "") -> dict[str, Any]: ...
    def get_gacha_status(self, tavern_id: str, user_id: str = "") -> dict[str, Any]: ...
    def draw_gacha(self, tavern_id: str, data: dict[str, Any] | None = None, user_id: str = "") -> dict[str, Any]: ...
```

Behavior:

- Config routes require `_ensure_owner()`.
- Status/draw require `_require_user_id()` and `_ensure_visible()`.
- `draw_gacha()` rejects disabled config with `400`.
- `draw_gacha()` rejects same local date with `409`.
- Draw seed is `build_draw_seed(tavern_id, visitor_id, today, len(progress["draw_history"]))`.
- Owner custom mode uses explicit `character_entries` and `hidden_character_entries`.
- Stage default mode creates weights from normal characters plus hidden characters; hidden character weight is `0` for `stranger`, `1` for `acquaintance/familiar`, and `2` for higher stages.
- Empty pool falls back to a tavern `affinity_boost` card.
- `_apply_gacha_entry()` returns result payload with `id`, `draw_date`, `seed`, `type`, `subtype`, `affinity_delta`, and result-specific fields.
- Hidden character result appends `character_id` to `progress["unlocked_hidden_character_ids"]`.
- Character result updates `progress["character_affinity"][character_id]`.
- Tavern card result updates `VisitorState.relationship_strength`.
- Saved progress is returned as `progress`.

- [ ] **Step 3: Register mixin**

In `application/taverns.py`:

```python
from .services.gacha import GachaApplicationMixin
```

Add `GachaApplicationMixin` immediately after `GameplayApplicationMixin` in the `TavernApplicationService` bases.

- [ ] **Step 4: Add routes**

`api/v1/gacha.py`:

```python
from __future__ import annotations
from typing import Any
from fastapi import APIRouter, Request
from ...contracts.gacha import GachaConfigWriteRequest, GachaDrawRequest
from .common import get_user_id, taverns_service

router = APIRouter(prefix="/taverns", tags=["gacha"])

@router.get("/{tavern_id}/gacha-config")
def get_gacha_config(request: Request, tavern_id: str) -> dict[str, Any]:
    return taverns_service(request).get_gacha_config(tavern_id, get_user_id(request))

@router.put("/{tavern_id}/gacha-config")
def save_gacha_config(request: Request, tavern_id: str, data: GachaConfigWriteRequest) -> dict[str, Any]:
    return taverns_service(request).save_gacha_config(tavern_id, data.to_payload(), get_user_id(request))

@router.get("/{tavern_id}/gacha/status")
def get_gacha_status(request: Request, tavern_id: str) -> dict[str, Any]:
    return taverns_service(request).get_gacha_status(tavern_id, get_user_id(request))

@router.post("/{tavern_id}/gacha/draw")
def draw_gacha(request: Request, tavern_id: str, data: GachaDrawRequest | None = None) -> dict[str, Any]:
    return taverns_service(request).draw_gacha(tavern_id, data.to_payload() if data else {}, get_user_id(request))
```

In `api/v1/router.py`, import `gacha` and call:

```python
api_router.include_router(gacha.router)
```

- [ ] **Step 5: Compile service and router**

Run:

```powershell
py -3 -m compileall -q backend/src/fablemap_api/application/services/gacha.py backend/src/fablemap_api/api/v1/gacha.py backend/src/fablemap_api/application/taverns.py backend/src/fablemap_api/api/v1/router.py
```

Expected: exit code `0`, no errors.

---

## Task 4: Hidden character access guard in app services

**Files:**

- Modify: `D:\work\ai-\backend\src\fablemap_api\application\services\characters.py`
- Modify: `D:\work\ai-\backend\src\fablemap_api\application\services\runtime.py`

- [ ] **Step 1: Filter `list_characters()`**

Replace `CharacterApplicationMixin.list_characters()` with logic that loads the tavern, checks visibility, checks owner, loads progress for visitors, and returns only `visible_gacha_characters(...)` plus `count`.

- [ ] **Step 2: Add chat access helper**

In `RuntimeApplicationMixin`, add `_ensure_character_accessible_for_chat(tavern, character_id, visitor_id, user_id)`:

```python
character = next((item for item in tavern.characters if item.id == character_id), None)
if not character:
    raise HTTPException(status_code=404, detail="角色不存在")
if self._is_owner(tavern, user_id):
    return character
progress = self.store.get_gacha_progress(tavern.id, visitor_id) if visitor_id else {"unlocked_hidden_character_ids": []}
if not can_access_gacha_character(character, unlocked_hidden_character_ids=progress.get("unlocked_hidden_character_ids", [])):
    raise HTTPException(status_code=404, detail="角色不存在或尚未解锁")
return character
```

Use this helper in `send_chat()` in place of the direct `next(...)` lookup.

- [ ] **Step 3: Filter group chat speakers**

In `send_group_chat()`, compute `group_characters = visible_gacha_characters(...)` and use that list for adding `GroupMember` speakers and for speaker lookup. If empty, raise `400` with `酒馆没有可参与群聊的角色`.

- [ ] **Step 4: Compile**

Run:

```powershell
py -3 -m compileall -q backend/src/fablemap_api/application/services/characters.py backend/src/fablemap_api/application/services/runtime.py
```

Expected: exit code `0`, no errors.

---

## Task 5: Backend API tests

**Files:**

- Create: `D:\work\ai-\tests\test_tavern_gacha_api.py`

- [ ] **Step 1: Write API tests**

Test with `fastapi.testclient.TestClient` and `create_web_app(ApiSettings(...))`.

Required test cases:

1. Owner can `PUT /api/v1/taverns/tavern_gacha/gacha-config`; visitor gets `403`.
2. Hidden character is absent from `GET /api/v1/taverns/tavern_gacha` before draw.
3. With custom config weighted only to hidden character, `POST /api/v1/taverns/tavern_gacha/gacha/draw` returns `character_card`, `subtype=hidden`, `unlocked_hidden=True`.
4. Same visitor can see the hidden character after draw; another visitor cannot.
5. Same visitor’s second draw returns `409`.
6. Tavern `affinity_boost` card increases `VisitorState.relationship.strength` by at least `0.05`.
7. `GET /api/v1/taverns/tavern_gacha/package` includes `gacha_config` and excludes `_gacha_progress`.

Seed tavern JSON:

```python
{
    "id": "tavern_gacha",
    "name": "抽卡测试酒馆",
    "lat": 31.23,
    "lon": 121.47,
    "access": "public",
    "status": "open",
    "timezone": "Asia/Shanghai",
    "characters": [
        {"id": "char_host", "name": "吧台招待", "first_mes": "欢迎光临。", "visibility": "normal", "unlock_mode": "none"},
        {"id": "char_hidden", "name": "暗门旅人", "first_mes": "你终于抽到这扇门了。", "visibility": "hidden", "unlock_mode": "gacha"}
    ],
    "gameplay_definitions": [{"id": "gp_bar", "title": "吧台今日签", "status": "published", "nodes": [{"id": "start", "choices": []}]}]
}
```

- [ ] **Step 2: Run backend tests**

Run:

```powershell
py -3 -m pytest -q tests/test_tavern_gacha_core.py tests/test_tavern_gacha_api.py --tb=short
```

Expected: all tests in both files pass.

---

## Task 6: Frontend API client and service methods

**Files:**

- Modify: `D:\work\ai-\frontend\app\lib\taverns.ts`
- Modify: `D:\work\ai-\frontend\app\product\services\tavernService.js`
- Create: `D:\work\ai-\frontend\scripts\gacha-test.mjs`

- [ ] **Step 1: Add frontend types**

In `taverns.ts`, add:

```ts
export type GachaWeightMode = "stage_default" | "owner_custom"
export type GachaTavernCardSubtype = "interaction" | "hidden_clue" | "affinity_boost"
export type TavernCharacterVisibility = "normal" | "hidden"
export type TavernCharacterUnlockMode = "none" | "gacha"
export type GachaConfig = {
  enabled: boolean
  weight_mode: GachaWeightMode
  daily_draw_limit: 1
  tavern_card_weights: Record<GachaTavernCardSubtype, number>
  character_entries: Array<Record<string, unknown>>
  hidden_character_entries: Array<Record<string, unknown>>
  interaction_entries: Array<Record<string, unknown>>
}
export type GachaResult = Record<string, unknown> & { type: "tavern_card" | "character_card"; character_id?: string; character?: TavernCharacter }
export type GachaStatusResponse = { ok: boolean; draw_available: boolean; enabled: boolean; last_draw_result?: GachaResult | null; visible_characters: TavernCharacter[]; character_affinity: Record<string, unknown>; unlocked_hidden_character_ids: string[] }
export type GachaDrawResponse = { ok: boolean; draw_available: boolean; result: GachaResult; progress: Record<string, unknown> }
```

Extend `TavernCharacter`:

```ts
  visibility?: TavernCharacterVisibility | string
  unlock_mode?: TavernCharacterUnlockMode | string
```

Extend `Tavern`:

```ts
  gacha_config?: GachaConfig
```

- [ ] **Step 2: Add `taverns.ts` functions**

```ts
export function getGachaConfig(tavernId: string, userId = DEFAULT_OWNER_ID) {
  return readApiJson<{ ok: boolean; tavern_id: string; gacha_config: GachaConfig }>(`/api/v1/taverns/${encodeURIComponent(tavernId)}/gacha-config`, { userId })
}
export function saveGachaConfig(tavernId: string, config: Partial<GachaConfig> & Record<string, unknown>, userId = DEFAULT_OWNER_ID) {
  return readApiJson<{ ok: boolean; tavern_id: string; gacha_config: GachaConfig }>(`/api/v1/taverns/${encodeURIComponent(tavernId)}/gacha-config`, jsonInit("PUT", config, userId))
}
export function getGachaStatus(tavernId: string, userId = DEFAULT_VISITOR_ID) {
  return readApiJson<GachaStatusResponse>(`/api/v1/taverns/${encodeURIComponent(tavernId)}/gacha/status`, { userId })
}
export function drawGacha(tavernId: string, userId = DEFAULT_VISITOR_ID) {
  return readApiJson<GachaDrawResponse>(`/api/v1/taverns/${encodeURIComponent(tavernId)}/gacha/draw`, jsonInit("POST", {}, userId))
}
```

- [ ] **Step 3: Add `tavernService.js` methods**

Add `getGachaStatus`, `drawGacha`, `getGachaConfig`, and `saveGachaConfig` methods using the same four endpoint paths and `X-User-Id` header pattern used by gameplay methods.

- [ ] **Step 4: Add script test**

Create `frontend/scripts/gacha-test.mjs` that stubs `globalThis.fetch`, calls the four service methods, and asserts URLs:

```js
assert.ok(captured[0].url.includes('/gacha/status'))
assert.ok(captured[1].url.includes('/gacha/draw'))
assert.equal(captured[1].options.method, 'POST')
assert.ok(captured[2].url.includes('/gacha-config'))
assert.equal(captured[3].options.method, 'PUT')
```

Also read `frontend/app/lib/taverns.ts` and assert it contains `getGachaStatus`, `drawGacha`, `saveGachaConfig`, `visibility?: TavernCharacterVisibility`, and `unlock_mode?: TavernCharacterUnlockMode`.

- [ ] **Step 5: Run script**

Run:

```powershell
node .\frontend\scripts\gacha-test.mjs
```

Expected: `gacha-test: ok`.

---

## Task 7: Visitor draw UI

**Files:**

- Create: `D:\work\ai-\frontend\app\product\TavernGachaPanel.jsx`
- Create: `D:\work\ai-\frontend\app\product\tavernGacha.css`
- Modify: `D:\work\ai-\frontend\app\product\TavernChatRoom.jsx`
- Modify: `D:\work\ai-\frontend\scripts\gacha-test.mjs`

- [ ] **Step 1: Create `TavernGachaPanel.jsx`**

Component props: `status`, `result`, `loading`, `error`, `onDraw`, `onChat`, `onStartGameplay`.

Required UI copy:

- `每日一次免费`
- `今日邂逅卡`
- `隐藏角色只会解锁给你自己`
- `明天再来抽`

Required behavior:

- Button is disabled when loading, disabled config, or `draw_available` is false.
- Character result renders character name/avatar/description and action buttons.
- Tavern card result renders message, tavern affinity, and action buttons.
- Action `type === "chat"` calls `onChat(action)`.
- Other action types call `onStartGameplay(action)`.

- [ ] **Step 2: Create `tavernGacha.css`**

Define these selectors:

```css
.tavern-gacha-panel {}
.tavern-gacha-panel__header {}
.tavern-gacha-panel__copy {}
.tavern-gacha-panel__error {}
.tavern-gacha-result {}
.tavern-gacha-result__character {}
.owner-gacha-manager {}
```

Use responsive flex/grid styles and avoid fixed wide layouts.

- [ ] **Step 3: Integrate in `TavernChatRoom.jsx`**

Import `TavernGachaPanel`, `getGachaStatus`, and `drawGacha`.

Add state:

```jsx
const [gachaStatus, setGachaStatus] = useState(null)
const [gachaResult, setGachaResult] = useState(null)
const [gachaLoading, setGachaLoading] = useState(false)
const [gachaError, setGachaError] = useState('')
```

Load status when `tavern.id` and `visitorId` exist. `handleDrawGacha()` calls `drawGacha(tavern.id, visitorId)`, saves `result`, marks `draw_available` false, and appends `result.character` to the visible character state if it is new. `handleGachaChat(action)` selects that character. `handleGachaGameplay(action)` starts published gameplay with the action’s `gameplay_id`.

Render `TavernGachaPanel` above or next to existing gameplay launcher.

- [ ] **Step 4: Extend script assertions**

Update `gacha-test.mjs` to assert `TavernGachaPanel.jsx`, `TavernChatRoom.jsx`, and `tavernGacha.css` include the names and copy above.

- [ ] **Step 5: Run script**

Run:

```powershell
node .\frontend\scripts\gacha-test.mjs
```

Expected: `gacha-test: ok`.

---

## Task 8: Owner hidden flag and gacha config UI

**Files:**

- Modify: `D:\work\ai-\frontend\app\product\CharacterEditor.jsx`
- Modify: `D:\work\ai-\frontend\app\product\CharacterManagementModal.jsx`
- Create: `D:\work\ai-\frontend\app\product\GachaConfigManager.jsx`
- Modify: `D:\work\ai-\frontend\app\product\TavernOwnerPanel.jsx`
- Modify: `D:\work\ai-\frontend\scripts\gacha-test.mjs`

- [ ] **Step 1: Preserve hidden fields in `CharacterEditor.jsx`**

Add to draft normalization and payload:

```jsx
visibility: character.visibility === 'hidden' ? 'hidden' : 'normal'
unlock_mode: character.unlock_mode === 'gacha' ? 'gacha' : 'none'
visibility: draft.visibility === 'hidden' ? 'hidden' : 'normal'
unlock_mode: draft.visibility === 'hidden' ? 'gacha' : 'none'
```

Add a select labeled `访客可见性` with options:

- `普通角色：访客进入酒馆即可看到`
- `隐藏角色：通过今日邂逅抽中后解锁`

When hidden is selected, show copy that this character needs card-pool weight before visitors can draw it.

- [ ] **Step 2: Mark hidden characters in `CharacterManagementModal.jsx`**

In the character list item, show `隐藏 / 抽卡解锁` when `character.visibility === 'hidden'`.

- [ ] **Step 3: Create `GachaConfigManager.jsx`**

Required behavior:

- Loads `getGachaConfig(tavern.id, ownerId)`.
- Saves `saveGachaConfig(tavern.id, parsedConfig, ownerId)`.
- Provides a button `按当前角色生成默认配置`.
- Generated default config maps normal characters to `character_entries` with weight `3` and hidden characters to `hidden_character_entries` with weight `1`, `min_tavern_stage='acquaintance'`, and a short clue.
- Header copy states `每日一次免费` and `不包含付费补抽、充值、交易、排行、战斗、等级或装备`.

- [ ] **Step 4: Integrate owner panel**

In `TavernOwnerPanel.jsx`:

- Import `GachaConfigManager`.
- Add `gachaManagerTavern` state.
- Add `handleGachaUpdated(updatedTavern)`.
- Add `抽卡` button near existing `玩法` owner tool buttons.
- Render `GachaConfigManager` modal when `gachaManagerTavern` is set.

- [ ] **Step 5: Extend script assertions and run**

Update `gacha-test.mjs` to assert `CharacterEditor.jsx`, `GachaConfigManager.jsx`, and `TavernOwnerPanel.jsx` include the labels/functions above.

Run:

```powershell
node .\frontend\scripts\gacha-test.mjs
```

Expected: `gacha-test: ok`.

---

## Task 9: Docs, Trellis spec, and task notes

**Files:**

- Modify: `D:\work\ai-\docs\WORLD_SCHEMA.md`
- Create: `D:\work\ai-\.trellis\spec\backend\gacha-api-contract.md`
- Create: `D:\work\ai-\.trellis\spec\frontend\gacha-ui-boundary.md`
- Modify: `D:\work\ai-\.trellis\tasks\05-05-character-gacha-gameplay-brainstorm\prd.md`
- Modify: `D:\work\ai-\.trellis\tasks\05-05-character-gacha-gameplay-brainstorm\task.json`

- [ ] **Step 1: Update world schema**

Document:

- `TavernCharacter.visibility`
- `TavernCharacter.unlock_mode`
- `Tavern.gacha_config`
- private `_gacha_progress`
- tavern affinity remains `VisitorState.relationship`
- character affinity lives in `_gacha_progress.character_affinity`
- `_gacha_progress` is excluded from public payloads and package export

- [ ] **Step 2: Add backend spec**

Create `gacha-api-contract.md` with route list, persistence boundary, hidden-character privacy, and forbidden product directions.

- [ ] **Step 3: Add frontend spec**

Create `gacha-ui-boundary.md` with visitor result-card-first flow, owner hidden/config split, and forbidden UI copy.

- [ ] **Step 4: Update Trellis task notes**

Append to PRD:

```markdown
## Implementation Plan

* 2026-05-06: 实施计划已落盘到 `.trellis/tasks/05-05-character-gacha-gameplay-brainstorm/implementation-plan.md`。实现将按 dedicated `_gacha_progress`、`Tavern.gacha_config`、`TavernCharacter.visibility/unlock_mode`、owner/visitor API 分层推进。
```

Set `task.json` status to `in_progress` when implementation begins and `review` after verification succeeds.

- [ ] **Step 5: Boundary grep**

Run:

```powershell
Select-String -Path docs\WORLD_SCHEMA.md,.trellis\spec\backend\gacha-api-contract.md,.trellis\spec\frontend\gacha-ui-boundary.md -Pattern '付费|充值|交易|排行榜|战斗|等级|装备|自动发布'
```

Expected: matches appear as exclusions, not enabled feature statements.

---

## Task 10: Verification

**Files:** no planned source edits unless a command identifies a concrete failure.

- [ ] **Step 1: Python compile**

Run:

```powershell
py -3 -m compileall -q backend/src
```

Expected: exit code `0`, no errors.

- [ ] **Step 2: Backend tests**

Run:

```powershell
py -3 -m pytest -q tests/test_tavern_gacha_core.py tests/test_tavern_gacha_api.py --tb=short
```

Expected: all tests pass.

- [ ] **Step 3: Frontend tests**

Run:

```powershell
npm --prefix .\frontend test
```

Expected: command exits with code `0`; `gacha-test.mjs` is included in the run.

- [ ] **Step 4: Frontend build**

Run:

```powershell
npm --prefix .\frontend run build
```

Expected: output includes `built in` and exits with code `0`.

- [ ] **Step 5: UI self-check**

Use in-app browser or Playwright. Verify desktop and narrow/mobile viewport:

1. Owner can mark a character hidden and open `抽卡` config.
2. Visitor cannot see hidden character before draw.
3. Visitor draw shows result card before chat/gameplay action.
4. Hidden draw reveals the character only for that visitor.
5. Same-day second draw is blocked gracefully.

Save screenshots:

```text
D:\work\ai-\artifacts\gacha-self-check\desktop.png
D:\work\ai-\artifacts\gacha-self-check\mobile.png
```

Record screenshot paths and command outputs in the PRD `Verification` section.

- [ ] **Step 6: Diff review**

Run:

```powershell
git diff --stat
git diff -- .trellis/tasks/05-05-character-gacha-gameplay-brainstorm backend/src/fablemap_api/core/gacha.py backend/src/fablemap_api/core/tavern.py backend/src/fablemap_api/contracts/gacha.py backend/src/fablemap_api/contracts/characters.py backend/src/fablemap_api/application/services/gacha.py backend/src/fablemap_api/application/services/characters.py backend/src/fablemap_api/application/services/runtime.py backend/src/fablemap_api/application/taverns.py backend/src/fablemap_api/api/v1/gacha.py backend/src/fablemap_api/api/v1/router.py tests/test_tavern_gacha_core.py tests/test_tavern_gacha_api.py frontend/app/lib/taverns.ts frontend/app/product/services/tavernService.js frontend/app/product/TavernGachaPanel.jsx frontend/app/product/GachaConfigManager.jsx frontend/app/product/tavernGacha.css frontend/app/product/CharacterEditor.jsx frontend/app/product/CharacterManagementModal.jsx frontend/app/product/TavernChatRoom.jsx frontend/app/product/TavernOwnerPanel.jsx frontend/scripts/gacha-test.mjs docs/WORLD_SCHEMA.md .trellis/spec/backend/gacha-api-contract.md .trellis/spec/frontend/gacha-ui-boundary.md
```

Confirm:

- private `_gacha_progress` is not in public/package payloads;
- hidden access is guarded in get/list/enter/chat/group-chat;
- owner config is separated from visitor progress;
- no forbidden monetization/RPG direction is introduced.

---

## Self-review

- Spec coverage: hidden unlock, mixed tavern/character cards, two affinity lanes, one daily draw, stage/custom weights, owner hidden flag, card-pool config, result-card-first flow, real persistence, and forbidden boundaries all map to Tasks 1–10.
- Placeholder scan: exact paths, routes, method names, field names, commands, and expected results are specified.
- Type consistency: backend and frontend use `visibility`, `unlock_mode`, `gacha_config`, `_gacha_progress`, `character_affinity`, and `unlocked_hidden_character_ids`; routes are `gacha-config`, `gacha/status`, and `gacha/draw`.
