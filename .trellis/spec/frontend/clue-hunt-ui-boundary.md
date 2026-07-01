# Clue Hunt UI Boundary

## Scope

Use this for owner clue-hunt creation in `/owner`, visitor route `/clue-hunts/:routeId`, and clue-hunt API client helpers in `frontend/app/lib/spaces.ts`.

## Contracts

- Owner UI may create only store-confirmed routes; backend remains the source of truth for ownership, real coordinates, public visibility, and answer hashing.
- Visitor route starts/resumes by `visitor_id`, shows only `current_node` and `visible_nodes`, and never expects answers or answer hashes in frontend payloads.
- Visitor copy must state that rewards are space-local commemorative output, not platform wallet/recharge/ranking value.
- API calls stay centralized in `frontend/app/lib/spaces.ts`; route components must not hand-roll clue-hunt fetches.

## Validation

- `npm --prefix .\frontend run typecheck`
- `npm --prefix .\frontend test`
- `npm --prefix .\frontend run build`

## Affected Files

- `frontend/app/lib/spaces.ts`
- `frontend/app/routes/clue-hunt.tsx`
- `frontend/app/routes/owner.tsx`
- `frontend/app/routes.ts`
