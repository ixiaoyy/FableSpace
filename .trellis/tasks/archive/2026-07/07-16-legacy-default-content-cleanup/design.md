# Cleanup Design

## Phase A: Runtime Retirement

- Keep the nine former Space IDs in one explicit tuple.
- During JSON/database seeding, load an existing record by ID.
- Mutate only when `owner_id == system_public_welfare`.
- Set only `access=private` and `status=closed`; preserve all embedded and relational state.

## Phase B: Dead Backend Content

Remove content that cannot be reached by active defaults:

- old nine-Space builder payloads;
- old extra-character and role-division tables;
- old Space-specific rules backend responses;
- old backend public-welfare NPC ID/expression maps.

Keep the retirement IDs because older installations still need recognition.

## Phase C: Frontend and Binary Assets

Inventory these roots before deletion:

- `apps/web/public/assets/npcs/public-welfare/`
- `apps/web/app/assets/npc-style-cast/`
- `apps/web/app/features/space-npc-stage/portraitCatalogConfig.ts`
- docs, artifacts, manifests, and any persisted seed fixtures.

Classify each asset:

- **retain**: still used as a generic archetype or active UI fallback;
- **replace**: active surface depends on it until a launch portrait exists;
- **delete**: old-character-only and unreferenced after replacement.

## Compatibility Window

The retirement ID tuple is removed only in a later explicit migration task after supported deployments have executed the retirement path. That removal is not implied by deleting code or images.
