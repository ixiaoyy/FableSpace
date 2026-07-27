# Character Routing

## Canonical public routes

The frontend uses character-first short routes:

- `/characters/:characterSlug` for the anonymous public character detail.
- `/characters/:characterSlug/story` for authenticated story interaction,
  continuity restoration, and endings.

Home cards and internal navigation must generate these routes. Do not add
frontend `/story-worlds/...` deep links or a StoryWorld directory as an
intermediate player step.

## Identity boundary

`characterSlug` is a stable ASCII routing key maintained explicitly in
`apps/web/app/lib/character-routes.ts`. Each entry maps the slug to an existing
`storyWorldId` and `characterId`.

The slug is not:

- a `Character` schema field;
- a persisted domain identity;
- an API parameter replacing `story_world_id` or `character_id`;
- a value derived dynamically from the display name.

Backend APIs continue to use `/api/v1/story-worlds/...` with
`story_world_id` and `character_id`.

## Review checks

- Each published public character has one unique registry slug.
- Public detail and story paths resolve through the same registry entry.
- Unknown slugs render a real unavailable state and do not fall back to mock
  content or legacy Space data.
- Login return targets remain same-origin relative short routes.
