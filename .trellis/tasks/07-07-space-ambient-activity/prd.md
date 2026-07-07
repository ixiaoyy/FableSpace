# Space Ambient NPC Activity

## Goal

Make a Space feel already inhabited when a visitor enters: NPCs can appear to have been chatting, moving, and maintaining their own mood before the visitor sends a message.

## Scope

- Reuse existing NPC simulation fields, group chat settings, and social memory data.
- Add only public-safe entry payload summaries; do not expose owner secrets, visitor-private state, or raw diagnostics.
- Add a read-only UI panel in the current `/space/:spaceId` chat workbench.
- Do not add database fields, new dependencies, platform-generated canonical lore, or public visitor social features.

## Validation

- `py -3 -m compileall -q apps/api/src`
- `npm --prefix .\apps\web run build`
- `npm --prefix .\apps\web run typecheck`
- Playwright smoke check for the current project route.

## Notes

The feature should present ambient activity as runtime atmosphere, not as owner-confirmed canon or an automatically posted public feed.
