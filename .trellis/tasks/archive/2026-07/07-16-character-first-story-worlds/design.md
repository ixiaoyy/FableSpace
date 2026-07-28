# Technical Design

## Scope Boundaries

This parent task coordinates four independently verifiable child deliverables. It owns integration contracts and release gates, not day-to-day child implementation.

## System Shape

```text
Visitor identity selection
  -> character-first homepage
  -> character reference in Space URL
  -> Space access check
  -> normalized identity and gender in request
  -> private VisitorState persistence
  -> Space canon + NPC card + visitor identity prompt
  -> conversation / memory / revisit
```

## Canonical Launch Content

| Space ID | Public name | Characters |
|---|---|---|
| `story_palace_snow_edict` | 长明宫·雪夜诏书 | 魏观海, 萧明珠 |
| `story_ghost_foxfire_debt` | 青槐驿·狐火借命 | 绯月, 宁怀书 |
| `story_campus_last_class` | 临川大学·最后一堂课 | 沈清禾, 顾野 |

The content uses existing `Space`, `SpaceCharacter`, `WorldInfoEntry`, `GameplayDefinition`, `VisitorState`, and memory contracts. Story motive, secret, and fate remain encoded in current character-card text fields rather than new schema.

## Ownership and Migration

- New launch seeds use new Space and Character IDs.
- The nine former default IDs remain in a retirement allow-list during the compatibility window.
- Retirement mutates only records owned by `system_public_welfare`, setting `access=private` and `status=closed`.
- Historical characters, chat messages, memories, gameplay sessions, and state cards are not deleted by runtime seeding.
- User-owned records are never refreshed or retired by system seed logic.

## Frontend Boundary

- Identity storage contains only a versioned identity ID and self-declared gender.
- Homepage cards represent characters but include their Space name, location context, and entry state.
- Character detail routes to the owning Space with a stable `character_ref` query.
- Space chat resolves the reference and sends normalized identity fields on entry, single chat, and group chat.

## Rollout

1. Validate identity and character-targeted entry.
2. Validate the three seed worlds and offline rule fallbacks.
3. Retire old stored system defaults and remove dead backend seed/rule code.
4. Keep old image assets until replacements or verified generic fallbacks exist.
5. Complete conversation, revisit, desktop, and narrow-screen acceptance before release.

## Rollback

- New system Spaces can be made private/closed without deleting them.
- Former system Spaces can be reopened while their stored records remain intact.
- The new visitor-facing route can be rolled back as a unit without using old owner-entry behavior as a compatibility requirement.
- Asset cleanup is a separate gated child so code/content rollback does not depend on deleted images.
