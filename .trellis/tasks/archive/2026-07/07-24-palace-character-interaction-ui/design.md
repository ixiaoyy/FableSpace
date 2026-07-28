# Technical Design

## Domain Contract

- Replace `StoryWorld.player_role` with `StoryWorld.player_roles: tuple[PlayerRole, ...]`.
- `StoryWorldRegistry` validates at least one role, every role belongs to the containing world, and PlayerRole IDs remain globally unique inside the registry.
- Add optional `PlayerRole.avatar_url`; multi-role entry surfaces require reviewed avatar URLs for the roles they expose.
- Add `StoryRun.player_role_id` and `story_runs.player_role_id`. A run locks one published role for its lifetime.
- `PlayerStoryState.player_role_id` records the active or most recently selected role for continuity, while the StoryRun column is the durable replay source for each round.

## Trusted Selection Flow

```text
published StoryWorld.player_roles
  -> public character detail projection
  -> player selects one published player_role_id
  -> POST start/restart { character_id, player_role_id }
  -> API validates ID against the current published StoryWorld
  -> transaction stores the same ID on PlayerStoryState and StoryRun
  -> run projection returns the locked public PlayerRole
  -> dialogue prompt resolves the role from StoryRun.player_role_id
```

- `player_role_id` is a stable ID only. The client never submits role text, gender, background, prompt, capability, or `player_id`.
- If an active run exists, `start` resumes it and ignores no mismatched selection: a supplied ID different from the active run returns a conflict instead of silently switching identity.
- Completed runs are immutable. `restart` creates a new run and may use either currently published role.
- Existing pre-migration rows receive the former fixed role ID through migration backfill before the column becomes non-null.

## API Contract

- Public detail changes from `player_role` to `player_roles`.
- `RunEntryRequest` adds required `player_role_id`.
- Run projections add `player_role` with the locked role’s public fields.
- Invalid IDs return a stable `player_role_not_found` client error; active-run mismatches return `player_role_locked`.

## Frontend Flow

- Loader fetches public StoryWorld/Character detail only.
- The route checks authenticated current-run state:
  - active run: render the existing conversation directly;
  - completed run: render ending and allow “再来一轮” to return to the entry selector;
  - no run: render the story entry surface.
- Single-role worlds select the only role automatically.
- Multi-role worlds render compact selectable identity cards with avatar, role name, and short in-world position.
- Character choices are rendered from the local published Character route registry for the same `storyWorldId`, not from hardcoded two-column slots.
- Starting a character combines the selected `player_role_id` and chosen Character ID in one trusted request.

## Visual Direction

- Refined editorial parchment, navy ink, restrained rust accents, and subtle grain.
- Story context carries the visual hierarchy; PlayerRole uses small portrait cards; Character uses compact list rows.
- No large character hero image inside `/characters/:characterSlug/story`.
- Mobile stacks the entry sections without hiding either identity or the first available Character action.
- Product copy stays in-world and concise; implementation explanations do not appear in the UI.

## Media

- Adopt the reviewed generated player-role portraits as immutable WebP objects under:
  - `app/assets/story-worlds/story_palace_snow_edict/player-roles/little-eunuch/v1/avatar.webp`
  - `app/assets/story-worlds/story_palace_snow_edict/player-roles/little-palace-maid/v1/avatar.webp`
- Add one prompt sidecar per role containing the final prompt, negative constraints, dimensions, SHA-256, style source, identity locks, and review timestamp.
- No image binaries enter Git.

## Migration and Rollback

- One migration adds `story_runs.player_role_id`, backfills the existing palace and Annie IDs by `story_world_id`, then marks the column non-null.
- Rollback requires reverting API/domain/frontend together and dropping the new column only after confirming no multi-role run data must be preserved.
- Do not leave a client-only identity switch or a nullable run role that falls back silently.
