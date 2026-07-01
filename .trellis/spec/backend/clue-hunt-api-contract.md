# Clue Hunt API Contract

## Scope

Use this contract for `/api/v1/clue-hunts/*`, route/domain persistence in `backend/src/fablespace_api/core/clue_hunt.py`, and the owner/visitor clue-hunt clients.

## Contracts

- A route belongs to exactly one `owner_id`; normal owners may only include their own public, real-coordinate spaces.
- System/public-welfare routes may only use spaces owned by `system_public_welfare`.
- MVP routes require at least two unique nodes and may not include private/password spaces.
- Public route payload exposes only route summary and the first node; it must not expose full node order beyond currently unlocked nodes or any answer/answer_hash.
- Owner route payload may show node clues and `answer_configured`, but not raw answer hashes.
- Sessions are scoped to `visitor_id`; visitors cannot read or advance another visitor's session.
- Answer checking is backend-only. Normalize with trim/lowercase/whitespace collapse and compare salted SHA-256 hashes.
- Reward claim is idempotent and space-local commemorative output only. It is not a platform wallet, recharge, settlement, ranking, or tradable economy.

## Validation

- `py -3 -m compileall -q backend/src`
- `py -3 -m pytest backend/tests/test_clue_hunt_api.py -q --tb=short`

## Affected Files

- `backend/src/fablespace_api/core/clue_hunt.py`
- `backend/src/fablespace_api/application/clue_hunts.py`
- `backend/src/fablespace_api/api/v1/clue_hunts.py`
- `backend/tests/test_clue_hunt_api.py`
