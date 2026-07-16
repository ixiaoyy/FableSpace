# 角色优先三世界改造

## Goal

Make meeting story characters the primary product goal while keeping every character inside a complete, coordinate-anchored Space. Launch three original worlds with two characters each, then retire and clean the former default content in safe phases.

## Requirements

- The visitor explicitly selects the private play identity `beggar` and self-declared `male` or `female` before entering the visitor flow.
- The homepage discovers characters first and always shows the full Space each character belongs to.
- A character deep link opens that character's Space with the character preselected.
- Initial public content contains exactly three original system-owned Spaces: palace intrigue, ancient supernatural, and modern campus.
- Each initial Space contains exactly two simple, strongly differentiated characters:
  - powerful chief eunuch and willful princess;
  - fox spirit cultivated into human form and the scholar who once saved her;
  - dedicated gentle female teacher and lawless rich male student.
- Space remains a complete independent story world with real coordinates, stable rules, a current incident, and consequences.
- The visitor identity affects NPC reactions but does not override Space canon, access control, character cards, or user ownership.
- Former system defaults may be removed from active code. Existing stored system records are retired as `private + closed` without deleting history.
- Old images and frontend mappings are removed only after reference inventory and replacement portraits prevent broken UI.
- All launch story content is original and does not copy protected books, films, scripts, characters, or dialogue.

## Out of Scope

- Combat, levels, equipment, economy, matchmaking, visitor social networking, or a global cross-Space canon.
- A new era/story/schema field solely for these launch worlds.
- Deleting user-owned content or historical conversations during cleanup.
- Expanding beyond two launch characters per Space before the six-character MVP is validated.

## Acceptance Criteria

- [x] All four child tasks are accepted and their cross-child integration checks pass.
- [x] Public discovery returns the three current story Spaces and six launch characters; retired defaults do not appear.
- [x] Identity selection, character-first discovery, character-targeted entry, chat request fields, and private persistence form one coherent flow.
- [x] Each Space exposes a distinct premise and each pair reacts differently to the same visitor identity in offline rules evidence.
- [x] Existing system seed migration is idempotent and does not mutate a user-owned record with a retired ID.
- [x] Desktop/narrow responsive contracts and the cyber-purple/pink token usage are present in the changed UI; no browser visual PASS is claimed.
- [x] Backend compile, frontend typecheck/build, focused seed/continuity checks, and optional-browser scope are recorded.

## Notes

- The current dirty workspace contains a candidate implementation created before Trellis adoption. It is evidence to review, not proof that any acceptance item is complete.
- Product authority remains in `docs/PRODUCT_BRIEF.md` and `docs/FABLESPACE_SPACE_PLATFORM.md`; Trellis owns the execution flow.
- Real-LLM behavior remains explicitly BLOCKED because launch seeds use the local rules backend; this does not invalidate the verified offline fallback contract.
