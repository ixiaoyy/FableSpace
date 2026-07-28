# Execution Plan

- [x] Update product brief, platform mainline, world schema, negative boundary, README, and project collaboration contract from “exactly one fixed role” to “one or more system-reviewed story roles; one locked per StoryRun”.
- [x] Change StoryWorld/PlayerRole domain types and registry validation; update Annie and palace content and bump palace content version.
- [x] Add the palace-maid PlayerRole and both approved role avatar URLs.
- [x] Add one SQL migration and SQLAlchemy/domain projection changes for `StoryRun.player_role_id`.
- [x] Update persistence, start/restart validation, run projection, and dialogue prompt construction to use the run-locked role.
- [x] Update public detail and TypeScript API contracts from one role to role collection plus locked run role.
- [x] Refactor the character story route so no-run state renders the story context, PlayerRole selector, and dynamic same-world Character list before creating a run.
- [x] Keep active-run restoration, message/choice handling, relationship state, endings, and login/session failure behavior intact.
- [x] Convert the two approved PNG drafts to WebP outside Git, upload immutable objects, update manifest, add prompt sidecars, and verify CDN bytes/hash/content.
- [x] Run StoryWorldRegistry content validation and a focused no-database service verification for valid/invalid/locked role selection.
- [x] Run `py -3 -m compileall -q apps/api/src`.
- [x] Run `npm --prefix .\apps\web run typecheck`.
- [x] Run `npm --prefix .\apps\web run build`.
- [x] Run React Doctor changed-scope diagnostics and fix confirmed regressions.
- [x] Perform desktop and `390×844` browser visual QA against the production CSS with intercepted static content, without connecting to a database.
- [x] Audit changed UI for explanatory copy, hardcoded role/character counts, untracked image binaries, and stale singular `player_role` assumptions.

## Validation Record — 2026-07-28

- Content registry: PASS — Annie publishes one PlayerRole; palace publishes two PlayerRoles and two Characters.
- Public detail projection: PASS — both palace role IDs, both Character IDs and two absolute HTTPS avatar URLs returned.
- Temporary SQLite integration with foreign keys enabled: PASS — two StoryRuns retained distinct locked roles; four CharacterRelationship rows and four authored events committed with valid parents.
- Active-run identity switch: PASS — mismatched role rejected as `player_role_locked`.
- CDN verification: PASS — both public URLs returned HTTP 200, `image/webp`, expected byte counts and exact SHA-256.
- React Doctor: PASS — 100/100, no changed-scope findings.
- Desktop and narrow-layout render: PASS — no repeated character hero, compact identity portraits, and a three-item Character list demonstrated count-independent wrapping.
- Historical-content integrity: PASS — this change adds only reviewed fictional adult PlayerRole presentation and runtime identity locking; it does not alter palace chapters, historical facts, real-person claims, outcomes, or canon classification.

## Risky Files

- `apps/api/src/fablespace_api/domain/story_world.py`
- `apps/api/src/fablespace_api/application/story_worlds.py`
- `apps/api/src/fablespace_api/infrastructure/player_story_state_store.py`
- `apps/api/src/fablespace_api/infrastructure/story_state_models.py`
- `apps/web/app/routes/character-story.tsx`
- `apps/web/app/routes/story-world-character.css`
- `deploy/cdn/media-manifest.json`

## Validation Commands

```powershell
py -3 -m compileall -q apps/api/src
npm --prefix .\apps\web run typecheck
npm --prefix .\apps\web run build
npx -y react-doctor@latest apps/web --verbose --scope changed
```

## Rollback Points

- Domain/API migration is atomic: revert plural roles, run column, request field, and frontend selector together.
- Media objects are immutable and may remain unreferenced after rollback; remove only code/manifest references after confirming no published consumer.
- Preserve all pre-existing uncommitted changes in shared files; never restore whole files.
