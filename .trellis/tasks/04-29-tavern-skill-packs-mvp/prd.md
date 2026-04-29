# Tavern Skill Packs MVP

## Goal

Implement a small, explicit Tavern Skill Packs foundation so a tavern owner can opt in to NPC capabilities without silently changing role identity, durable canon, provider settings, or visitor privacy. This child task follows the parent brainstorm `.trellis/tasks/04-29-npc-role-prompt-safety-brainstorm/` after State Cards.

## MVP Scope

This task implements the **Skill Pack container + first pack**:

1. **Skill Pack configuration**
   - Store owner-managed skill pack settings on a tavern.
   - Expose read/update API under `/api/v1/taverns/{tavern_id}/skill-packs`.
   - Keep settings explicit and inspectable: pack id, enabled flag, owner-facing label/description, visible prompt notes/capabilities.
   - Owner can update; visitor cannot update.

2. **First pack: `local-rumor`**
   - Owner can enable/disable the pack.
   - When enabled, NPC/runtime can surface nearby tavern rumor context using the existing neighborhood rumor system.
   - Runtime prompt/context must make clear that rumors are ambient suggestions, not fixed canon.
   - The pack must not auto-create taverns, characters, memories, state cards, or durable canon.

3. **Owner-visible frontend**
   - Add a compact owner-facing Skill Packs panel in tavern management/product UI.
   - Show available packs, current enabled state, and capability/prompt notes.
   - Persist toggle through the service layer, not direct component fetches.
   - Visitor-facing chat remains stable; no visitor control over owner settings.

4. **Docs/spec/tests**
   - Update schema/architecture/API docs for the new tavern skill pack field and endpoints.
   - Add/update backend and frontend tests covering normalization, permissions, service methods, and build compatibility.
   - Add Trellis backend/frontend spec notes for future skill pack changes.

## Explicitly Out of Scope / Deferred

- `revisit-care` proactive follow-up behavior: deferred until opt-in, quiet-hours, rate-limit, and notification rules are designed.
- `visual-souvenir` generation: deferred because it needs image privacy, asset retention, and cost/provider controls.
- Multi-NPC group skill orchestration or GM conflict tooling.
- Platform-generated tavern/NPC/story content without owner confirmation.
- Any change to owner API key handling, billing, recharge, settlement, or platform token accounting.

## Acceptance Criteria

- [ ] New taverns default to no enabled skill packs or a safe disabled default state.
- [ ] API exposes available pack metadata and current tavern settings.
- [ ] Only tavern owner can update skill pack settings.
- [ ] Invalid/unknown skill pack ids are rejected or normalized safely without crashing.
- [ ] `local-rumor` uses existing rumor data only as optional ambient context and does not write durable canon.
- [ ] Owner UI can enable/disable `local-rumor` and shows what the pack is allowed to do.
- [ ] Service-layer methods exist in both `frontend/app/lib/taverns.ts` and product compatibility service if needed.
- [ ] `docs/WORLD_SCHEMA.md`, `docs/ARCHITECTURE.md`, and Trellis specs document the contract.
- [ ] Verification runs include backend syntax/tests and frontend test/build.

## Technical Notes

- Fullstack task touching schema/API/service/runtime/UI.
- Prefer existing JSON persistence and dataclass serialization patterns in `backend/src/fablemap_api/core/tavern.py`.
- Prefer thin FastAPI routes delegating to application services under `backend/src/fablemap_api/application/services/`.
- Prefer existing typed client pattern in `frontend/app/lib/taverns.ts` and product service wrapper in `frontend/app/product/services/tavernService.js`.
- Do not introduce new dependencies.
