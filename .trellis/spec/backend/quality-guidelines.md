# Backend Quality Guidelines

## Required Patterns

- Base conclusions on inspected code, configuration, records, or runtime
  evidence. State evidence gaps instead of inventing behavior.
- Keep new StoryWorld code in the domain/application/API/infrastructure
  boundaries described in `directory-structure.md`.
- Validate reviewed content at registry load and preserve structured,
  attributable, replayable runtime writes.
- Resolve the player only from the trusted server session.
- Add a method-level docstring/comment to every new method, including purpose,
  important parameters, return value, and special business constraints.
- Prefer the standard library and existing `apps/api/requirements.txt`.
- Keep changes scoped; do not mix protocol work, feature work, content edits,
  and legacy retirement when they can be verified independently.

## Forbidden Patterns

- New `/spaces` routes, Space/NPC/VisitorState adapters, client `player_id`, or
  compatibility layers for retired development data.
- Runtime AI directly changing canon, chapters, key flags, reviewed
  relationship outcomes, or permanent endings.
- Silent database clearing/rebuilding, unreviewed migration files, or schema
  changes hidden in application startup.
- Broad exception swallowing, raw secret/private-state logging, or fabricated
  fallback records.
- New pytest directories or test entry points unless the user explicitly
  restores the test system.
- Unapproved dependencies, drive-by formatting, or unrelated refactors.

## Verification Matrix

| Changed scope | Minimum fresh verification |
|---|---|
| Documentation only | Check content, terminology, and links; do not run a build |
| Python source | `py -3 -m compileall -q apps/api/src` |
| API, model, or protocol | Python compile plus authority-doc sync and a scoped real validation |
| Persistence | Above plus transaction/FK/ownership validation; database access still requires explicit permission |
| StoryWorld content | Registry/reference/version validation and source-boundary review |
| Historical content | Record PASS/FAIL/BLOCKED using the historical integrity guide |

The repository currently has no backend lint/type-check/test scripts. Do not
claim they ran. Task-scoped temporary validation scripts may be used when
necessary, then removed or retained only as an intentional production tool.

## Review Checklist

- Are domain names, IDs, enums, required/optional fields, and response privacy
  consistent with `docs/WORLD_SCHEMA.md`?
- Does every private query include the ownership boundary?
- Are writes atomic, ordered, traceable, and replayable?
- Are API status codes stable and client messages safe?
- Are legacy modules referenced only for removal/audit, not as the new
  standard?
- Was the smallest relevant fresh verification run after the final edit?
