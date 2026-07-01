# Engagement API Contract

Concise contract for space-local engagement features.

## Scope

Use when touching soft currency, gifts, bonus vouchers/draws, or engagement HUD/API.

## Product boundary

- Engagement is space-local and lightweight.
- No platform recharge, settlement, exchange, cash-out, ad revival, ranking, combat, level, or equipment economy.
- Owner token/API-key data must remain separate from visitor engagement data.

## Backend placement

- Routes: `backend/src/fablespace_api/api/v1/engagement.py`
- Application/store: existing engagement modules.
- Frontend: `frontend/app/lib/engagement.ts` and engagement components.

## Contract

- Scope balances/rewards to space + visitor where applicable.
- Validate gift/bonus action limits server-side.
- Return deterministic, non-monetary labels.
- Keep public/owner/visitor projections separate.
- Do not turn rewards into global currency or platform billing.

## Verification

- Focused backend engagement tests for behavior changes.
- Frontend build/focused helper test when client/UI changes.
- No broad UI regression scripts for incidental copy.
