# Space Skill Pack UI Boundary

## Scope

Use this spec when changing the owner-facing Skill Pack UI, frontend skill-pack service methods, or runtime display of skill-pack state.

## Service contract

Shared typed clients belong in `frontend/app/lib/spaces.ts`:

```typescript
listSkillPacks(spaceId, userId)
saveSkillPacks(spaceId, skillPacks, userId)
```

Product-parity helpers in `frontend/app/product/services/spaceService.js` should expose the same endpoint names when product components or tests need them.

## UI contract

`SkillPackManager` must:

- Be opened from the owner space management surface, not visitor chat controls.
- Show each pack's owner-readable capabilities and prompt/boundary notes.
- For `local-rumor`, expose a small numeric `limit` control (1-5).
- Say that skills do not write canon, do not edit role cards, and do not bypass owner settings.
- Keep loading, error, saving, and saved states visible.

## Forbidden patterns

- Direct `fetch` in owner components instead of service helpers.
- Visitor controls for enabling/disabling owner skill packs.
- UI copy implying platform-generated space/NPC/story content is automatically published.
- Adding image/audio/proactive notification packs without first documenting privacy, retention, opt-in, quiet-hours, rate-limit, and provider-cost rules.

## Required verification

```powershell
node frontend/scripts/skill-packs-test.mjs
npm --prefix .\frontend test
npm --prefix .\frontend run typecheck
npm --prefix .\frontend run build
```
