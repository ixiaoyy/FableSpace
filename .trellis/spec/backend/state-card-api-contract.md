# State Card / Canon Ledger API Contract

> Backend contract for long-running space continuity records.

## Scope

Use this guide when changing:

- `backend/src/fablespace_api/core/state_cards.py`
- `backend/src/fablespace_api/core/space.py` `_state_cards` store methods
- `backend/src/fablespace_api/application/services/state_cards.py`
- `backend/src/fablespace_api/application/services/runtime.py` chat candidate generation
- `backend/src/fablespace_api/api/v1/state_cards.py`

## Contract

State cards are private runtime records stored in `SpaceStore` under `_state_cards`.

```typescript
type StateCardCategory = "character" | "task" | "resource" | "conflict" | "event_log"
type StateCardStatus = "pending" | "confirmed" | "rejected" | "superseded"
type StateCardScope = "visitor" | "space"
```

Routes:

```http
GET /api/v1/spaces/{space_id}/state-cards
POST /api/v1/spaces/{space_id}/state-cards
PUT /api/v1/spaces/{space_id}/state-cards/{card_id}/decision
```

Chat responses may include:

```json
{
  "state_card_candidates": [
    {
      "category": "task",
      "status": "pending",
      "canon_scope": "visitor",
      "metadata": { "contradiction_candidate": false }
    }
  ]
}
```

## Rules

- AI/chat extraction creates `pending` candidates only.
- Candidate generation must not mutate `Space`, `SpaceCharacter`, `WorldInfoEntry`, access rules, owner LLM config, or other owner-authored canon.
- Non-owner visitors may only create/decide their own `visitor` scope cards.
- `canon_scope=space` and `fixed_canon=true` are owner-only.
- `_state_cards` must be preserved across normal `SpaceStore.update_space(...)`.
- `_state_cards` must not appear in public Space payloads or space package exports.
- Summaries must be observable summaries only; do not store chain-of-thought or hidden prompts.

## Validation matrix

| Case | Expected |
|------|----------|
| Chat mentions task/resource/event | Response includes pending task/resource/event_log candidates |
| Visitor confirms own pending card | Card becomes `confirmed`, `confirmed_by` is visitor ID |
| Other visitor decides card | 403 |
| Owner lists cards | Owner sees visible cards for the space |
| Space metadata update | `_state_cards` survive |
| Space package export | `_state_cards` absent |

## Required tests

```powershell
py -3 -m pytest -q tests/test_space_state_cards.py backend/tests/test_v1_state_cards.py --tb=short
py -3 -m compileall -q backend/src
```

## Scenario: SC-03 Prompt Injection

### 1. Scope / Trigger

Use this contract when changing State Card prompt injection in:

- `backend/src/fablespace_api/core/prompt_builder.py`
- `backend/src/fablespace_api/core/prompt_blocks.py`
- `backend/src/fablespace_api/core/state_cards.py`
- `backend/src/fablespace_api/core/web/service.py` prompt preview / chat prompt construction
- `backend/src/fablespace_api/application/services/owner_config.py` prompt preview construction

### 2. Signatures

```python
PromptBuildConfig.state_cards: list[dict]
format_state_cards_for_prompt(cards: list[StateCard]) -> str
WebService._state_cards_for_prompt(space_id: str) -> list[dict[str, Any]]
OwnerConfigApplicationMixin._state_cards_for_prompt(space_id: str) -> list[dict[str, Any]]
```

Prompt Block:

```json
{
  "id": "state_cards",
  "type": "state_cards",
  "token_budget": 1000
}
```

### 3. Contracts

- Runtime chat prompt construction must load current space `_state_cards` from `SpaceStore.list_state_cards(...)` and pass them into `PromptBuildConfig.state_cards`.
- Owner prompt preview must use the same source so preview output reflects current confirmed fixed canon.
- `PromptBuilder` is responsible for final filtering: only cards with `status == "confirmed"` and `fixed_canon == true` are rendered into the prompt.
- Ordinary `confirmed` cards with `fixed_canon == false`, `pending`, `rejected`, and `superseded` cards must not appear in prompt text.
- Prompt injection must not modify `Space`, `SpaceCharacter`, `WorldInfoEntry`, access rules, LLM config, memories, or `_state_cards`.
- The prompt text may include card title and observable summary only; do not include hidden prompts, chain-of-thought, API keys, or private keyvault contents.

### 4. Validation & Error Matrix

| Case | Expected |
|------|----------|
| confirmed + fixed_canon space card exists | Prompt contains card title and summary |
| confirmed but fixed_canon=false card exists | Prompt does not contain that card |
| pending + fixed_canon card exists | Prompt does not contain that card |
| state-card store is empty/unavailable | Prompt builds without a state-card section |
| card summary exceeds block budget | State-card block is truncated by `token_budget` |

### 5. Good/Base/Bad Cases

- Good: `WebService._build_space_character_prompt(...)` loads store state cards once, passes plain dicts to `PromptBuildConfig`, and lets `PromptBuilder` apply confirmed/fixed filters.
- Base: `preview_prompt_blocks_payload(...)` uses the same state-card loading path, so owner preview and real chat are aligned.
- Bad: adding state cards directly to public space payloads, exporting `_state_cards`, or rendering ordinary visitor confirmed cards as fixed space canon.

### 6. Tests Required

```powershell
py -3 -m pytest -q tests/test_space_prompt_blocks.py tests/test_space_state_cards.py --tb=short
py -3 -m compileall -q backend/src
```

Focused tests must assert:

- Builder/block layer filters confirmed+fixed_canon.
- Runtime chat prompt construction reads `_state_cards` from the store.
- Ordinary confirmed non-fixed cards are absent from prompt text.

### 7. Wrong vs Correct

#### Wrong

```python
config = PromptBuildConfig(
    world_info_entries=[...],
    prompt_blocks=normalize_prompt_blocks(space.prompt_blocks),
)
```

This leaves runtime chat unaware of `_state_cards`; unit tests that manually set `config.state_cards` will pass while real chat does not inject canon.

#### Correct

```python
config = PromptBuildConfig(
    world_info_entries=[...],
    state_cards=self._state_cards_for_prompt(space_id),
    prompt_blocks=normalize_prompt_blocks(space.prompt_blocks),
)
```
